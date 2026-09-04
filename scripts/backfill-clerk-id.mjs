/**
 * Rellena `clerkId` en los usuarios que no lo tienen.
 *
 * Por qué hace falta: hasta T-12b el campo no existía en `userSchema`, así que
 * el webhook nunca pudo guardarlo y todos los usuarios anteriores están sin él.
 * Desde T-12c la identidad se resuelve por `clerkId`, de modo que un usuario sin
 * ese campo **no puede mutar nada**: 403 en productos, vendedores y horarios, y
 * 404 al registrarse como vendedor. Y el webhook no lo arregla solo, porque
 * `user.created` no se vuelve a disparar para una cuenta que ya existe.
 *
 * Empareja por email contra Clerk, que es el único puente que queda entre las
 * dos bases. Es exactamente la clave frágil que este cambio quiere abandonar,
 * pero solo se usa una vez y de forma manual, no en cada petición.
 *
 *   node --import ./scripts/register-alias.mjs ./scripts/backfill-clerk-id.mjs
 *   node --import ./scripts/register-alias.mjs ./scripts/backfill-clerk-id.mjs --apply
 *
 * Sin `--apply` no escribe nada: solo cuenta e informa. Es idempotente, así que
 * se puede correr las veces que haga falta.
 */
import mongoose from 'mongoose';

import { User } from '@/utils/models/userSchema';

/** Resultado por usuario, para que quien lo corra sepa qué mirar. */
const SIN_CUENTA = 'sin-cuenta-en-clerk';
const AMBIGUO = 'varias-cuentas-en-clerk';
const RELLENADO = 'rellenado';
const YA_TOMADO = 'clerkId-ya-usado-por-otro';

/**
 * El trabajo, sin nada de Clerk ni de CLI dentro: `buscarClerkIdsPorEmail`
 * recibe un email y devuelve la lista de ids que Clerk tiene para él. Así el
 * script se puede probar entero contra Mongo en memoria.
 */
export async function backfillClerkIds({
  buscarClerkIdsPorEmail,
  apply = false,
}) {
  const pendientes = await User.find({
    $or: [{ clerkId: { $exists: false } }, { clerkId: null }],
  })
    .select('_id email clerkId')
    .lean();

  const resultados = [];

  for (const user of pendientes) {
    const encontrados = await buscarClerkIdsPorEmail(user.email);

    if (encontrados.length === 0) {
      resultados.push({ email: user.email, estado: SIN_CUENTA });
      continue;
    }

    if (encontrados.length > 1) {
      // Con el email duplicado en Clerk no hay forma de decidir sin mirar a
      // mano cuál es. Se deja para una persona.
      resultados.push({
        email: user.email,
        estado: AMBIGUO,
        clerkIds: encontrados,
      });
      continue;
    }

    const [clerkId] = encontrados;

    // `clerkId` es unique: si ya lo tiene otro documento, escribirlo reventaría
    // el índice. Pasa si un mismo email quedó duplicado en Mongo (el unique del
    // email sigue comentado, T-11).
    const ocupado = await User.exists({ clerkId, _id: { $ne: user._id } });
    if (ocupado) {
      resultados.push({ email: user.email, estado: YA_TOMADO, clerkId });
      continue;
    }

    if (apply) {
      await User.updateOne({ _id: user._id }, { $set: { clerkId } });
    }

    resultados.push({ email: user.email, estado: RELLENADO, clerkId });
  }

  return {
    pendientes: pendientes.length,
    resultados,
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

  if (!process.env.MONGO_URI) {
    throw new Error('Falta MONGO_URI.');
  }
  if (!process.env.CLERK_SECRET_KEY) {
    throw new Error('Falta CLERK_SECRET_KEY: hace falta para consultar Clerk.');
  }

  const { createClerkClient } = await import('@clerk/clerk-sdk-node');
  const clerk = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });

  const buscarClerkIdsPorEmail = async email => {
    const respuesta = await clerk.users.getUserList({
      emailAddress: [email],
    });
    // v5 devuelve { data, totalCount }; versiones anteriores, un array.
    const usuarios = respuesta?.data ?? respuesta ?? [];
    return usuarios.map(u => u.id);
  };

  await mongoose.connect(process.env.MONGO_URI);

  try {
    const { pendientes, resultados, resumen } = await backfillClerkIds({
      buscarClerkIdsPorEmail,
      apply,
    });

    console.log(`\nUsuarios sin clerkId: ${pendientes}`);
    for (const r of resultados) {
      console.log(`  ${r.estado.padEnd(26)} ${r.email}${r.clerkId ? ` → ${r.clerkId}` : ''}`);
    }
    console.log('\nResumen:', JSON.stringify(resumen));

    if (!apply) {
      console.log(
        '\nEnsayo: no se ha escrito nada. Vuelve a correrlo con --apply cuando el listado te cuadre.'
      );
    }

    const problematicos = resultados.filter(r => r.estado !== RELLENADO);
    if (problematicos.length > 0) {
      console.log(
        `\nOJO: ${problematicos.length} usuario(s) necesitan una decisión manual.` +
          ' Mientras no la tengan, no podrán editar nada en la aplicación.'
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
