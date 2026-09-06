/**
 * Copia `role: 'admin'` de Mongo a `publicMetadata.role` en Clerk.
 *
 * Por que hace falta: T-12 mueve la fuente de verdad del rol de admin de
 * `User.role` (Mongo) a Clerk `publicMetadata`, porque el middleware puede
 * leer eso sin depender de una consulta a Mongo por request y sin el
 * Map+setInterval en memoria que tenia antes `api/sellers/admin/route.js`.
 * Los admins que ya existen en Mongo hoy no tienen ese campo en Clerk: sin
 * esta migracion, promover T-12 los dejaria bloqueados de `/admin/*` de la
 * misma forma que T-12c dejaba bloqueadas las 11 cuentas reales si no se
 * corria el backfill de `clerkId` primero.
 *
 * **Reusa la guarda de instancia de backfill-clerk-id.mjs.** Un
 * `publicMetadata` solo significa algo dentro de su instancia de Clerk, y
 * este repo ya tiene el historial (T-12h/T-64) de escribir con las claves
 * equivocadas: las del `.env` y las de Production en Vercel son de una
 * instancia de **desarrollo**, no la que tiene a los usuarios reales.
 *
 *   npm run set-admin-metadata            # ensayo: no escribe nada
 *   npm run set-admin-metadata -- --apply # escribe
 *   npm run set-admin-metadata -- --check # sale con codigo 1 si queda algo pendiente
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
    // Un admin de Mongo sin clerkId no puede iniciar sesion (T-12c), asi que
    // no hay a quien escribirle publicMetadata todavia. Es trabajo de
    // migrate:clerk-id, no de este script.
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
      // Merge explicito en vez de confiar en que la API lo haga por su
      // cuenta: no se toca ninguna otra clave que ya tuviera publicMetadata.
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
    // Lo unico que impide promover: admins de Mongo con clerkId cuyo
    // publicMetadata todavia no dice 'admin'. Despues de un --apply correcto
    // tiene que ser cero (sin-clerk-id no cuenta: no es trabajo de este
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

  // Llamadas directas a la Backend API, igual que backfill-clerk-id.mjs: no
  // hay CLI oficial de Clerk para esto y la API REST devuelve los campos en
  // snake_case (`public_metadata`), a diferencia del SDK que los expone en
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
    // El ensayo y el --check avisan en vez de plantarse (son para
    // diagnosticar); el --apply si se planta, porque es el que deja marca.
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

// Solo cuando se ejecuta como script, no al importarlo desde los tests.
if (process.argv[1]?.includes('set-admin-metadata')) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
