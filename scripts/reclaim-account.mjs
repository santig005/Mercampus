/**
 * Re-mapea la cuenta vieja de alguien que se registró de nuevo en la
 * instancia equivocada de Clerk.
 *
 * Por qué hace falta (T-64b): 63 de los 79 `User` en Mongo solo existen en la
 * instancia de **producción** de Clerk (ver T-64/T-12h). El sitio autentica
 * contra la instancia de **desarrollo**, así que si esa persona se registra de
 * nuevo ahí, Clerk le da un `clerkId` nuevo que no es el que ya tiene su
 * `User` viejo. El webhook (T-12b) no encuentra ese `clerkId` y crea un `User`
 * **nuevo y vacío** — entra como comprador sin su tienda, que sigue
 * existiendo pero huérfana.
 *
 * Por qué no vive en el webhook: cruzar por email en el momento de la
 * escritura es la fragilidad que T-12c quitó a propósito (el email es
 * mutable, y con el `unique` aún comentado en T-11 ni siquiera es único).
 * Con un puñado de reclamos a lo largo de 1-3 años, no hace falta
 * automatizarlo — se corre a mano cuando alguien reporta que "perdió su
 * tienda", con su email y el `clerkId` nuevo que acaba de recibir.
 *
 *   npm run reclaim:account -- --email ana@example.com --clerk-id user_xyz
 *   npm run reclaim:account -- --email ana@example.com --clerk-id user_xyz --apply
 */
import mongoose from 'mongoose';

import { User } from '@/utils/models/userSchema';

export const RECLAMADO = 'reclamado';
export const SIN_COINCIDENCIA = 'sin-coincidencia';
export const YA_RECLAMADO = 'ya-reclamado';
export const CONFLICTO = 'conflicto';

const escaparRegex = texto => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function reclaimAccount({ email, newClerkId, apply = false }) {
  const emailLower = email.toLowerCase();

  // El schema no normaliza el email (T-11 sigue pendiente), así que el
  // `User` viejo puede tener otras mayúsculas que las que llegan aquí.
  const candidatos = await User.find({
    email: { $regex: `^${escaparRegex(emailLower)}$`, $options: 'i' },
  })
    .select('_id email clerkId sellerId createdAt')
    .lean();

  // El `clerkId` nuevo ya podría estar en Mongo por dos razones muy
  // distintas: el `User` vacío que creó el webhook con este mismo email (caso
  // normal, se resuelve solo), o un documento de **otra** persona (algo salió
  // mal con los datos de entrada). Solo lo segundo es un conflicto real.
  const otroConEseId = await User.findOne({ clerkId: newClerkId })
    .select('_id email')
    .lean();
  if (otroConEseId && otroConEseId.email?.toLowerCase() !== emailLower) {
    return {
      estado: CONFLICTO,
      email: emailLower,
      motivo: `clerkId ${newClerkId} ya pertenece a ${otroConEseId.email}, no a ${email}`,
    };
  }

  const viejo = candidatos.find(u => u.clerkId && u.clerkId !== newClerkId);
  const stub = candidatos.find(u => u.clerkId === newClerkId);

  if (!viejo) {
    if (stub) {
      return { estado: YA_RECLAMADO, email: emailLower };
    }
    return { estado: SIN_COINCIDENCIA, email: emailLower };
  }

  if (apply) {
    // El stub se borra primero: `clerkId` es unique, así que mientras exista
    // con el id nuevo, ponérselo al documento viejo chocaría contra el índice.
    if (stub && String(stub._id) !== String(viejo._id)) {
      await User.deleteOne({ _id: stub._id });
    }
    await User.updateOne({ _id: viejo._id }, { $set: { clerkId: newClerkId } });
  }

  return {
    estado: RECLAMADO,
    email: emailLower,
    clerkIdAnterior: viejo.clerkId,
    sellerId: viejo.sellerId?.toString() ?? null,
    stubBorrado: Boolean(stub),
  };
}

// ---------------------------------------------------------------------------
// CLI

function leerArgumento(nombre) {
  const i = process.argv.indexOf(nombre);
  return i === -1 ? null : process.argv[i + 1];
}

async function main() {
  const apply = process.argv.includes('--apply');
  const email = leerArgumento('--email');
  const newClerkId = leerArgumento('--clerk-id');

  if (!email || !newClerkId) {
    throw new Error('Uso: reclaim-account.mjs --email <email> --clerk-id <id> [--apply]');
  }
  if (!process.env.MONGO_URI) throw new Error('Falta MONGO_URI.');

  await mongoose.connect(process.env.MONGO_URI);

  try {
    const resultado = await reclaimAccount({ email, newClerkId, apply });

    switch (resultado.estado) {
      case RECLAMADO:
        console.log(
          `${apply ? 'Reclamado' : 'Se reclamaría'}: ${resultado.email} ` +
            `(clerkId anterior ${resultado.clerkIdAnterior} -> ${newClerkId})` +
            (resultado.stubBorrado ? ', borrando el usuario vacío del webhook.' : '.')
        );
        break;
      case YA_RECLAMADO:
        console.log(`${resultado.email} ya tiene este clerkId. Nada que hacer.`);
        break;
      case SIN_COINCIDENCIA:
        console.log(`No hay un User viejo con el email ${resultado.email}. Nada que hacer.`);
        break;
      case CONFLICTO:
        console.error(`FALLA: ${resultado.motivo}`);
        process.exitCode = 1;
        break;
    }

    if (!apply && resultado.estado === RECLAMADO) {
      console.log('\nEnsayo: no se ha escrito nada. Vuelve a correrlo con --apply.');
    }
  } finally {
    await mongoose.disconnect();
  }
}

if (process.argv[1]?.includes('reclaim-account')) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
