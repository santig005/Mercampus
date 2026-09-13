/**
 * Re-maps the old account of someone who signed up again on the wrong Clerk
 * instance.
 *
 * Why it is needed (T-64b): 63 of the 79 `User` documents in Mongo exist
 * only in Clerk's **production** instance (see T-64/T-12h). The site
 * authenticates against the **development** instance, so if that person
 * signs up again there, Clerk hands them a new `clerkId` that is not the one
 * their old `User` already has. The webhook (T-12b) does not find that
 * `clerkId` and creates a **new, empty** `User` - they come in as a buyer
 * with no store, which still exists but is orphaned.
 *
 * Why it does not live in the webhook: joining by email at write time is
 * exactly the fragility T-12c removed on purpose (email is mutable, and with
 * the `unique` still commented out in T-11 it is not even unique).
 * With a handful of claims over 1-3 years there is no need to automate it -
 * it is run by hand when somebody reports they "lost their store", with
 * their email and the new `clerkId` they were just given.
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

  // The schema does not normalise the email (T-11 is still pending), so the
  // old `User` may have different casing from what arrives here.
  const candidatos = await User.find({
    email: { $regex: `^${escaparRegex(emailLower)}$`, $options: 'i' },
  })
    .select('_id email clerkId sellerId createdAt')
    .lean();

  // The new `clerkId` could already be in Mongo for two very different
  // reasons: the empty `User` the webhook created with this same email (the
  // normal case, it resolves itself), or **another** person's document
  // (something went wrong with the input). Only the second is a real conflict.
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
    // The stub is deleted first: `clerkId` is unique, so while it exists
    // with the new id, setting it on the old document would hit the index.
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
