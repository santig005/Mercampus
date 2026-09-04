/**
 * Enlaza cada cuenta de Clerk con su `User` de Mongo, rellenando `clerkId`.
 *
 * Por qué hace falta: hasta T-12b el campo no existía en `userSchema`, así que
 * el webhook nunca pudo guardarlo. Desde T-12c la identidad se resuelve por ahí,
 * de modo que una cuenta sin enlazar no puede mutar nada (403 en productos,
 * vendedores y horarios; 404 al registrarse como vendedor). Y el webhook no lo
 * arregla solo: `user.created` no se vuelve a disparar para una cuenta que ya
 * existe.
 *
 * **Recorre Clerk, no Mongo.** Clerk es la fuente de verdad de la identidad y
 * cada cuenta tiene exactamente un id, así que por construcción no hay
 * ambigüedad. Al revés —recorriendo Mongo y preguntando a Clerk por email— la
 * mayoría de los documentos son restos que no corresponden a ninguna cuenta y
 * el informe se llena de ruido que parece trabajo manual y no lo es.
 *
 *   npm run migrate:clerk-id            # ensayo: no escribe nada
 *   npm run migrate:clerk-id -- --apply # escribe
 *   npm run migrate:clerk-id -- --check # sale con codigo 1 si queda algo por enlazar
 *
 * `--check` es la puerta que conviene correr antes de promover a `develop`: no
 * escribe, solo falla si alguien podría quedarse bloqueado.
 */
import mongoose from 'mongoose';

import { User } from '@/utils/models/userSchema';

export const YA_ENLAZADO = 'ya-enlazado';
export const ENLAZADO = 'enlazado';
export const ENLAZADO_CON_DESEMPATE = 'enlazado-con-desempate';
export const CREADO = 'creado';

/**
 * Con qué documento se queda cuando un email tiene varias copias en Mongo.
 *
 * Pasa porque el `unique` del email sigue comentado (T-11) y el viejo
 * `POST /api/register` creaba usuarios sin autenticación. En los datos reales
 * cada duplicado es la misma persona dos veces: una copia con perfil de
 * vendedor y otra vacía. La que lleva el `sellerId` es la que tiene la
 * información que se perdería; a igualdad, gana la más antigua, que es la que
 * llevan referenciando los demás documentos.
 */
const elegirDocumento = documentos =>
  [...documentos].sort((a, b) => {
    const porVendedor = Number(Boolean(b.sellerId)) - Number(Boolean(a.sellerId));
    if (porVendedor !== 0) return porVendedor;
    return new Date(a.createdAt ?? 0) - new Date(b.createdAt ?? 0);
  })[0];

export async function backfillClerkIds({ listarUsuariosDeClerk, apply = false }) {
  const cuentas = await listarUsuariosDeClerk();
  const resultados = [];
  const emailsDeClerk = new Set();

  for (const cuenta of cuentas) {
    const emails = (cuenta.emails ?? [])
      .filter(Boolean)
      .map(email => email.toLowerCase());
    emails.forEach(email => emailsDeClerk.add(email));

    const yaEnlazado = await User.findOne({ clerkId: cuenta.id })
      .select('_id email')
      .lean();
    if (yaEnlazado) {
      resultados.push({ clerkId: cuenta.id, email: yaEnlazado.email, estado: YA_ENLAZADO });
      continue;
    }

    // Solo candidatos sin enlazar: uno que ya tenga otro clerkId es otra
    // persona, y pisarlo rompería el índice unique además de mezclar cuentas.
    const candidatos = await User.find({
      email: { $in: emails },
      $or: [{ clerkId: { $exists: false } }, { clerkId: null }],
    })
      .select('_id email sellerId createdAt')
      .lean();

    if (candidatos.length === 0) {
      // La cuenta existe en Clerk pero no tiene User: es justo lo que habría
      // hecho el webhook si el campo hubiera existido.
      if (apply) {
        await User.create({
          clerkId: cuenta.id,
          name: cuenta.nombre || emails[0]?.split('@')[0] || 'Usuario',
          lastName: cuenta.apellido || '',
          email: emails[0],
          imageProfile: cuenta.imagen || '',
        });
      }
      resultados.push({ clerkId: cuenta.id, email: emails[0], estado: CREADO });
      continue;
    }

    const elegido = elegirDocumento(candidatos);

    if (apply) {
      await User.updateOne({ _id: elegido._id }, { $set: { clerkId: cuenta.id } });
    }

    resultados.push({
      clerkId: cuenta.id,
      email: elegido.email,
      estado: candidatos.length > 1 ? ENLAZADO_CON_DESEMPATE : ENLAZADO,
      ...(candidatos.length > 1 && {
        copias: candidatos.length,
        motivo: elegido.sellerId ? 'es el que tiene perfil de vendedor' : 'es el más antiguo',
      }),
    });
  }

  // Documentos que no corresponden a ninguna cuenta de Clerk. **No están
  // bloqueados**: sin cuenta en Clerk no pueden ni iniciar sesión, así que no
  // son un problema de esta migración. Son restos del viejo POST /api/register
  // (T-11) y se cuentan aparte para no confundirlos con trabajo pendiente.
  const sinEnlazar = await User.find({
    $or: [{ clerkId: { $exists: false } }, { clerkId: null }],
  })
    .select('email')
    .lean();
  const huerfanos = sinEnlazar.filter(
    u => !emailsDeClerk.has((u.email ?? '').toLowerCase())
  ).length;

  return {
    cuentasDeClerk: cuentas.length,
    resultados,
    huerfanos,
    // Lo único que impide promover: cuentas que pueden entrar y no están
    // enlazadas. Después de un --apply correcto tiene que ser cero.
    pendientes: resultados.filter(r => r.estado !== YA_ENLAZADO).length,
    resumen: resultados.reduce((acc, r) => {
      acc[r.estado] = (acc[r.estado] ?? 0) + 1;
      return acc;
    }, {}),
  };
}

// ---------------------------------------------------------------------------
// CLI

async function main() {
  const apply = process.argv.includes('--apply');
  const check = process.argv.includes('--check');

  if (!process.env.MONGO_URI) throw new Error('Falta MONGO_URI.');
  if (!process.env.CLERK_SECRET_KEY) {
    throw new Error('Falta CLERK_SECRET_KEY: hace falta para consultar Clerk.');
  }

  const { createClerkClient } = await import('@clerk/clerk-sdk-node');
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

  const listarUsuariosDeClerk = async () => {
    const cuentas = [];
    for (let offset = 0; ; offset += 100) {
      const respuesta = await clerk.users.getUserList({ limit: 100, offset });
      // v5 devuelve { data, totalCount }; versiones anteriores, un array.
      const lote = respuesta?.data ?? respuesta ?? [];
      cuentas.push(
        ...lote.map(u => ({
          id: u.id,
          emails: (u.emailAddresses ?? []).map(e => e.emailAddress),
          nombre: u.firstName,
          apellido: u.lastName,
          imagen: u.imageUrl,
        }))
      );
      if (lote.length < 100) break;
    }
    return cuentas;
  };

  await mongoose.connect(process.env.MONGO_URI);

  try {
    const informe = await backfillClerkIds({ listarUsuariosDeClerk, apply });

    console.log(`\nCuentas en Clerk: ${informe.cuentasDeClerk}`);
    for (const r of informe.resultados) {
      const extra = r.copias ? ` (${r.copias} copias, ${r.motivo})` : '';
      console.log(`  ${r.estado.padEnd(24)} ${r.email ?? '(sin email)'}${extra}`);
    }
    console.log('\nResumen:', JSON.stringify(informe.resumen));
    console.log(
      `Documentos sin cuenta en Clerk: ${informe.huerfanos} ` +
        '(no pueden iniciar sesión, así que esta migración no les afecta; son de T-11)'
    );

    if (check) {
      if (informe.pendientes > 0) {
        console.error(
          `\nFALLA: ${informe.pendientes} cuenta(s) de Clerk sin enlazar.` +
            ' Corre --apply antes de promover, o se quedan sin poder editar nada.'
        );
        process.exitCode = 1;
      } else {
        console.log('\nOK: todas las cuentas de Clerk están enlazadas.');
      }
      return;
    }

    if (!apply) {
      console.log(
        `\nEnsayo: no se ha escrito nada. ${informe.pendientes} cuenta(s) por enlazar.` +
          ' Vuelve a correrlo con --apply cuando el listado te cuadre.'
      );
    }
  } finally {
    await mongoose.disconnect();
  }
}

// Solo cuando se ejecuta como script, no al importarlo desde los tests.
if (process.argv[1]?.includes('backfill-clerk-id')) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
