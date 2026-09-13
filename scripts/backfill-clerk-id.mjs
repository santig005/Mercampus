/**
 * Links every Clerk account to its Mongo `User`, filling in `clerkId`.
 *
 * Why it is needed: until T-12b the field did not exist in `userSchema`, so
 * the webhook could never store it. Since T-12c identity is resolved through
 * it, so an unlinked account cannot mutate anything (403 on products,
 * sellers and schedules; 404 when registering as a seller). And the webhook
 * does not fix it on its own: `user.created` does not fire again for an
 * existe.
 *
 * **It walks Clerk, not Mongo.** Clerk is the source of truth for identity
 * and each account has exactly one id, so by construction there is no
 * ambiguity. The other way round - walking Mongo and asking Clerk by email -
 * most documents are leftovers matching no account at all and the report
 * fills with noise that looks like manual work and is not.
 *
 *   npm run migrate:clerk-id            # dry run: writes nothing
 *   npm run migrate:clerk-id -- --apply # escribe
 *   npm run migrate:clerk-id -- --check # exits 1 if anything is still unlinked
 *
 * `--check` is the gate worth running before promoting to `develop`: it does
 * not write, it only fails if somebody could be left locked out.
 */
import mongoose from 'mongoose';

import { User } from '@/utils/models/userSchema';

export const YA_ENLAZADO = 'ya-enlazado';
export const ENLAZADO = 'enlazado';
export const ENLAZADO_CON_DESEMPATE = 'enlazado-con-desempate';
export const CREADO = 'creado';

/**
 * Which document wins when one email has several copies in Mongo.
 *
 * This happens because the email's `unique` is still commented out (T-11)
 * and the old `POST /api/register` created users with no authentication. In
 * the real data every duplicate is the same person twice: one copy with a
 * seller profile and one empty. The one carrying `sellerId` holds the
 * information that would be lost; all else equal the oldest wins, which is
 * the one the other documents have been referencing.
 */
const elegirDocumento = documentos =>
  [...documentos].sort((a, b) => {
    const porVendedor = Number(Boolean(b.sellerId)) - Number(Boolean(a.sellerId));
    if (porVendedor !== 0) return porVendedor;
    return new Date(a.createdAt ?? 0) - new Date(b.createdAt ?? 0);
  })[0];

/**
 * Refuses to write if the keys are not from the right instance.
 *
 * Needed because a `clerkId` only means anything inside its own instance.
 * Mercampus has more than one, and the keys in `.env` - and those in
 * Vercel's Production environment - belong to a **development** instance
 * with 11 accounts, while the production one has ~70. Linking with the wrong
 * keys would write ids no real session will ever present, and since `clerkId`
 * is `unique`, it would leave the slot occupied by garbage.
 */
export async function comprobarInstancia({
  describirInstancia,
  comprobarClerkId,
  permitirDesarrollo = false,
}) {
  const instancia = await describirInstancia();

  if (instancia.environment_type !== 'production' && !permitirDesarrollo) {
    throw new Error(
      `La instancia de Clerk es "${instancia.environment_type}" (${instancia.id}).\n` +
        'Enlazar usuarios reales con ids de una instancia que no es la de producción\n' +
        'los dejaría con un clerkId que ninguna sesión va a presentar. Usa las claves\n' +
        'de la instancia correcta, o pasa --permitir-desarrollo si sabes lo que haces.'
    );
  }

  // If the database already has links, they have to be from this same
  // instance. Otherwise it was run before with different keys, and mixing two
  // instances is worse than never having started.
  const yaEnlazado = await User.findOne({ clerkId: { $exists: true, $ne: null } })
    .select('clerkId')
    .lean();

  if (yaEnlazado && comprobarClerkId) {
    const perteneceAEsta = await comprobarClerkId(yaEnlazado.clerkId);
    if (!perteneceAEsta) {
      throw new Error(
        `La base ya tiene usuarios enlazados a otra instancia de Clerk (por ejemplo ${yaEnlazado.clerkId}).\n` +
          'Corriendo esto se mezclarían dos instancias. Averigua cuál es la buena antes de seguir.'
      );
    }
  }

  return instancia;
}

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

    // Unlinked candidates only: one that already has a different clerkId is
    // another person, and overwriting it would break the unique index as well
    const candidatos = await User.find({
      email: { $in: emails },
      $or: [{ clerkId: { $exists: false } }, { clerkId: null }],
    })
      .select('_id email sellerId createdAt')
      .lean();

    if (candidatos.length === 0) {
      // The account exists in Clerk but has no User: exactly what the webhook
      // would have done if the field had existed.
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

  // Documents matching no Clerk account at all. **They are not locked
  // out**: with no Clerk account they cannot even sign in, so they are not
  // this migration's problem. They are leftovers of the old POST
  // /api/register (T-11), counted separately so they are not mistaken for work.
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
    // The only thing blocking promotion: accounts that can sign in and are not
    // linked. After a successful --apply this has to be zero.
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
      // v5 returns { data, totalCount }; earlier versions, an array.
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

  // Direct calls to the Backend API: there is no official Clerk CLI
  // (`@clerk/cli` does not exist on npm) and the Node SDK is deprecated, so
  // whatever the SDK does not cover uses fetch with the secret in the header.
  const apiClerk = async ruta => {
    const r = await fetch('https://api.clerk.com/v1' + ruta, {
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
    });
    return { ok: r.ok, datos: r.ok ? await r.json() : null };
  };

  const describirInstancia = async () => {
    const { ok, datos } = await apiClerk('/instance');
    if (!ok) throw new Error('No se pudo consultar la instancia de Clerk.');
    return datos;
  };
  const comprobarClerkId = async id => (await apiClerk(`/users/${id}`)).ok;

  await mongoose.connect(process.env.MONGO_URI);

  try {
    // The dry run and --check are for diagnosing, so they warn instead of
    // refusing. --apply does refuse: it is the one that leaves a mark.
    let instanciaMal = null;
    try {
      const instancia = await comprobarInstancia({
        describirInstancia,
        comprobarClerkId,
        permitirDesarrollo: process.argv.includes('--permitir-desarrollo'),
      });
      console.log(
        `\nInstancia de Clerk: ${instancia.id} (${instancia.environment_type})`
      );
    } catch (error) {
      instanciaMal = error;
      if (apply) throw error;
      console.log(`\n⚠  ${error.message}\n`);
    }

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
      if (instanciaMal) {
        console.error('\nFALLA: las claves de Clerk no son las de producción.');
        process.exitCode = 1;
      } else if (informe.pendientes > 0) {
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

// Only when run as a script, not when imported from the tests.
if (process.argv[1]?.includes('backfill-clerk-id')) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
