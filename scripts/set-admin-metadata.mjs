/**
 * Copies `role: 'admin'` from Mongo to `publicMetadata.role` in Clerk.
 *
 * Why it is needed: T-12 moves the source of truth for the admin role from
 * `User.role` (Mongo) to Clerk's `publicMetadata`, because the middleware can
 * read that without a Mongo query per request and without the in-memory
 * Map+setInterval `api/sellers/admin/route.js` used to have.
 * The admins already in Mongo do not have that field in Clerk today: without
 * this migration, promoting T-12 would lock them out of `/admin/*` the same
 * way T-12c locked out the 11 real accounts if the `clerkId` backfill was not
 * run first.
 *
 * **Reusa la guarda de instancia de backfill-clerk-id.mjs.** Un
 * A `publicMetadata` only means anything inside its own Clerk instance, and
 * this repo already has the history (T-12h/T-64) of writing with the wrong
 * keys: the ones in `.env` and in Vercel's Production belong to a
 * **development** instance, not the one holding the real users.
 *
 *   npm run set-admin-metadata            # dry run: writes nothing
 *   npm run set-admin-metadata -- --apply # escribe
 *   npm run set-admin-metadata -- --check # exits 1 if anything is pending
 */
import mongoose from 'mongoose';

import { comprobarInstancia } from './backfill-clerk-id.mjs';
import { User } from '@/utils/models/userSchema';

export const YA_TIENE_ROL = 'ya-tiene-rol';
export const ACTUALIZADO = 'actualizado';
export const SIN_CLERK_ID = 'sin-clerk-id';

/**
 * @param {object} deps
 * @param {() => Promise<Array<{email: string, clerkId?: string}>>} deps.obtenerAdminsDeMongo
 * @param {(clerkId: string) => Promise<Record<string, unknown>>} deps.obtenerMetadataDeClerk
 * @param {(clerkId: string, metadata: Record<string, unknown>) => Promise<void>} deps.actualizarMetadataDeClerk
 * @param {boolean} [deps.apply]
 */
export async function syncAdminMetadata({
  obtenerAdminsDeMongo,
  obtenerMetadataDeClerk,
  actualizarMetadataDeClerk,
  apply = false,
}) {
  const admins = await obtenerAdminsDeMongo();
  const resultados = [];

  for (const admin of admins) {
    // A Mongo admin without a clerkId cannot sign in (T-12c), so there is
    // nobody to write publicMetadata to yet. That is migrate:clerk-id's job,
    // not this script's.
    if (!admin.clerkId) {
      resultados.push({ email: admin.email, estado: SIN_CLERK_ID });
      continue;
    }

    const metadataActual = await obtenerMetadataDeClerk(admin.clerkId);
    if (metadataActual?.role === 'admin') {
      resultados.push({
        email: admin.email,
        clerkId: admin.clerkId,
        estado: YA_TIENE_ROL,
      });
      continue;
    }

    if (apply) {
      // An explicit merge rather than trusting the API to do it: no other key
      // already in publicMetadata is touched.
      await actualizarMetadataDeClerk(admin.clerkId, {
        ...metadataActual,
        role: 'admin',
      });
    }
    resultados.push({
      email: admin.email,
      clerkId: admin.clerkId,
      estado: ACTUALIZADO,
    });
  }

  return {
    admins: admins.length,
    resultados,
    // The only thing blocking promotion: Mongo admins with a clerkId whose
    // publicMetadata does not say 'admin' yet. After a successful --apply this
    // has to be zero (no-clerk-id does not count: not this script's job, see
    // script, ver el comentario de arriba).
    pendientes: resultados.filter(r => r.estado === ACTUALIZADO).length,
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

  // Direct calls to the Backend API, same as backfill-clerk-id.mjs: there is
  // no official Clerk CLI for this and the REST API returns the fields in
  // snake_case (`public_metadata`), unlike the SDK which exposes them in
  // camelCase.
  const apiClerk = async (ruta, init) => {
    const r = await fetch('https://api.clerk.com/v1' + ruta, {
      ...init,
      headers: {
        Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
        ...(init?.body && { 'content-type': 'application/json' }),
      },
    });
    return { ok: r.ok, datos: r.ok ? await r.json() : null };
  };

  const describirInstancia = async () => {
    const { ok, datos } = await apiClerk('/instance');
    if (!ok) throw new Error('No se pudo consultar la instancia de Clerk.');
    return datos;
  };
  const comprobarClerkId = async id => (await apiClerk(`/users/${id}`)).ok;

  const obtenerMetadataDeClerk = async clerkId => {
    const { ok, datos } = await apiClerk(`/users/${clerkId}`);
    if (!ok) return {};
    return datos.public_metadata ?? {};
  };

  const actualizarMetadataDeClerk = async (clerkId, metadata) => {
    const { ok } = await apiClerk(`/users/${clerkId}/metadata`, {
      method: 'PATCH',
      body: JSON.stringify({ public_metadata: metadata }),
    });
    if (!ok) {
      throw new Error(`No se pudo actualizar publicMetadata de ${clerkId}.`);
    }
  };

  const obtenerAdminsDeMongo = async () =>
    User.find({ role: 'admin' }).select('email clerkId').lean();

  await mongoose.connect(process.env.MONGO_URI);

  try {
    // The dry run and --check warn instead of refusing (they are for
    // diagnosing); --apply does refuse, because it is the one that leaves a mark.
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

    const informe = await syncAdminMetadata({
      obtenerAdminsDeMongo,
      obtenerMetadataDeClerk,
      actualizarMetadataDeClerk,
      apply,
    });

    console.log(`\nAdmins en Mongo: ${informe.admins}`);
    for (const r of informe.resultados) {
      console.log(`  ${r.estado.padEnd(16)} ${r.email}`);
    }
    console.log('\nResumen:', JSON.stringify(informe.resumen));

    if (check) {
      if (instanciaMal) {
        console.error('\nFALLA: las claves de Clerk no son las de producción.');
        process.exitCode = 1;
      } else if (informe.pendientes > 0) {
        console.error(
          `\nFALLA: ${informe.pendientes} admin(s) sin publicMetadata.role.` +
            ' Corre --apply antes de promover.'
        );
        process.exitCode = 1;
      } else {
        console.log('\nOK: todos los admins de Mongo tienen publicMetadata.role en Clerk.');
      }
      return;
    }

    if (!apply) {
      console.log(
        `\nEnsayo: no se ha escrito nada. ${informe.pendientes} admin(s) por actualizar.` +
          ' Vuelve a correrlo con --apply cuando el listado te cuadre.'
      );
    }
  } finally {
    await mongoose.disconnect();
  }
}

// Only when run as a script, not when imported from the tests.
if (process.argv[1]?.includes('set-admin-metadata')) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
