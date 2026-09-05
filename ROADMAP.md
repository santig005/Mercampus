# ROADMAP — Mercampus

Backlog ejecutable. El agente nocturno lee este archivo, escoge la **primera
tarea sin marcar cuyas dependencias estén marcadas**, la implementa, y marca la
casilla en el mismo PR.

Estado: `[ ]` pendiente · `[~]` en progreso (rama abierta) · `[x]` hecho

Cada tarea tiene:

- **Por qué** — qué duele hoy.
- **Hecho cuando** — criterio verificable. Es el contrato.
- **Modelo** — modelo sugerido (ver "Modelo y effort" abajo).
- **Nocturno** — `sí` si el agente programado puede tomarla solo; `no` si
  requiere sesión interactiva contigo.

Si una tarea resulta más grande de lo escrito, pártela en el archivo antes de
ejecutarla.

---

## Modelo y effort

Dos perillas distintas:

- **Modelo** = qué tan capaz. Sube de modelo cuando Claude tenía todo el
  contexto, claramente lo intentó, y aun así se equivocó.
- **Effort** = qué tan a fondo trabaja en el turno: cuántos archivos lee, cuánto
  verifica, hasta dónde empuja antes de devolverte el control. Súbelo cuando el
  error fue saltarse un archivo, no correr los tests o abandonar a medias.

Usa el **effort por defecto** salvo que tengas razón para lo contrario.

| Alias | Cuándo |
|---|---|
| `sonnet` | Trabajo rutinario y descriptible con precisión. El caballo de batalla aquí. |
| `opusplan` | Opus para planear, Sonnet para ejecutar. Ideal para las tareas de arquitectura en sesión interactiva. |
| `opus` | Bugs sutiles, seguridad, dominios nuevos. |
| `fable` | Solo si Opus se estrella repetidamente en lo mismo. Es lo más caro por token. |

`opusplan` **no sirve en el workflow nocturno**: el modo plan solo existe en
sesión interactiva, así que en automatización correría todo con Sonnet. Por eso
el cron toma únicamente tareas marcadas `Nocturno: sí`.

**El reparto:** lo mecánico y verificable lo hace el agente de madrugada; la
arquitectura y la seguridad las haces tú con `opusplan` en la terminal. Esas son
justo las que quieres entender a fondo — delegarlas te ahorra tiempo y te quita
el aprendizaje, que es el objetivo del ejercicio.

---

## Fase 0 — El arnés (bloquea todo lo demás)

Sin esto, ningún agente puede verificar su trabajo y el resto del roadmap es
código a ciegas. Es también la parte más vendible del portafolio: no muchos
juniors saben montar un loop de verificación.

**Toda la Fase 0 hazla tú en sesión interactiva.** No hay red de seguridad
todavía, y es donde aprendes cómo se desvía el agente — información que después
metes en CLAUDE.md.

### [x] T-01 · Arreglar el CI que siempre falla
**Por qué:** `.github/workflows/ci.yml` corre `npm run test`, script que no
existe. Todo PR nace en rojo, así que nadie mira el CI.
**Hecho cuando:** el workflow pasa en verde sobre `develop` sin cambios de
código; corre lint y build; usa `npm ci` en vez de `npm install`; Node 20+.
**Alcance:** `.github/workflows/ci.yml`, `package.json`.
**Modelo:** `sonnet` · **Nocturno:** no (aún no hay arnés)

### [x] T-02 · Vitest + primer test real
**Por qué:** cero tests. Se necesita al menos un caso que falle si se rompe algo.
**Hecho cuando:** `npm run test` corre Vitest; hay tests para `utilFn.js` y para
la validación de categorías por sección del `productSchema`; el CI los ejecuta.
**Alcance:** `vitest.config.mjs` (`.mjs` como el resto de configs del repo,
si no Vite avisa de ESM cargado como CommonJS), `tests/unit/`, `package.json`,
workflow de CI.
**Modelo:** `sonnet` · **Nocturno:** no

### [x] T-03 · Base de datos de prueba y seed
**Por qué:** no hay forma de correr la app sin la Mongo de producción. Un agente
no puede probar nada.
**Hecho cuando:** `mongodb-memory-server` para tests; `scripts/seed.js` que crea
3 usuarios, 2 vendedores (uno aprobado, uno no), 6 productos y horarios;
`npm run seed` documentado en el README; `.env.example` creado.
**Alcance:** `scripts/seed.js`, `tests/setup.js`, `.env.example`.
**Ojo:** el seed apunta a un cluster de desarrollo, NUNCA a producción.
**Corrección (T-12g): eso es un deseo, no un hecho.** El `MONGO_URI` del `.env`
apunta hoy **a producción**, así que `npm run seed` la borraría entera. Lo único
que lo impide es la guarda que exige `--yes` fuera de localhost. No la quites, y
mira T-63 para arreglar la causa.
**Modelo:** `sonnet` · **Nocturno:** no

### [x] T-04 · Playwright + capturas como evidencia
**Por qué:** es la respuesta a "que el agente vea la página". Sin esto no hay
verificación visual automática.
**Hecho cuando:** `npm run test:e2e` levanta la app con datos de seed y recorre
home → listado de antojos → detalle de producto → perfil de vendedor; guarda un
screenshot por pantalla en `test-results/`; el workflow sube esas capturas como
artefacto del run.
**Ojo:** el e2e necesita claves **reales** de Clerk. Su middleware valida contra
los servidores de Clerk y con claves falsas devuelve 400 en todas las rutas,
incluidas las publicas, asi que la app entera queda inalcanzable. El CI las toma
de `vars.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` y `secrets.CLERK_SECRET_KEY`, y el
job se activa con `vars.E2E_ENABLED`. Son claves de una instancia de
**desarrollo**: unas de produccion no funcionarian, porque Clerk las ata al
dominio registrado y rechaza `localhost`. Los secretos no llegan a los PR desde
forks, asi que alli el job se salta.
**Alcance:** `playwright.config.js`, `tests/e2e/`, `scripts/e2e.mjs`, workflow de CI.
**Depende de:** T-03
**Modelo:** `sonnet` · **Nocturno:** no

### [x] T-05 · TypeScript incremental
**Por qué:** todo es JS sin tipos; el agente no tiene red de seguridad al
refactorizar y `npm run typecheck` es el chequeo más barato que existe.
**Hecho cuando:** `tsconfig.json` con `allowJs: true` y `strict: true`;
`npm run typecheck` pasa y queda añadido a `scripts/verify.mjs`; los modelos de
Mongoose y `src/lib/` migrados a `.ts`. El resto migra tarea por tarea, no de
golpe.
**Sin migrar a proposito:** `favoriteSchema.js` (0 importadores, lo borra T-34) y
`clerkUser.js` (0 importadores; al pasarlo a `.ts` afloran cuatro `err.status`
sobre un `Error`, que no tiene esa propiedad, y una opcion `type` inexistente en
`verifyToken` de Clerk — arreglarlo es reescribir autenticacion, T-10/T-12).
**Ojo con Node:** los scripts de `scripts/` importan los modelos, ahora `.ts`.
Node les quita los tipos solo desde la 22.18, asi que el CI y `engines` suben a
Node 22. Con Node 20 se rompen `npm run seed` y `npm run test:e2e`.
**Alcance:** `tsconfig.json`, `src/utils/models/`, `src/utils/lib/`. Los archivos
se migran en su sitio: mover `utils/models` a `models/` tocaria a sus ~20
importadores y es de T-30.
**Modelo:** `opusplan` — decidir qué migrar primero es ambiguo
**Nocturno:** no

### [x] T-06 · Script `verify` y protección de ramas
**Por qué:** el agente necesita un solo comando que diga sí o no.
**Hecho cuando:** `npm run verify` = lint + typecheck + test + build;
`develop` y `main` protegidas exigiendo el check de CI en verde antes de merge.
**Hecho ya:** `scripts/verify.mjs` corre lint + test + build, se planta en el
primer fallo e inyecta los placeholders de ImageKit que el build necesita. El
workflow llama a `npm run verify` en vez de definir los pasos por su cuenta, así
que local y CI no pueden divergir.
**Protección aplicada** en `develop` y `main`: exigen el check `quality`, con
`enforce_admins: true` — sin eso la regla 1 no ataría al agente, que actúa con
permisos de admin. Sin revisiones requeridas: con un solo autor bloquearían al
dueño sin aportar nada. Para quitarla:
`gh api -X DELETE repos/santig005/Mercampus/branches/<rama>/protection`.
**Depende de:** T-01, T-02, T-05
**Modelo:** `sonnet` · **Nocturno:** no

> **A partir de aquí puedes prender el cron.** Mergea `nightly-agent.yml` a la
> rama por defecto solo cuando `npm run verify` pase en verde.

---

## Fase 1 — Seguridad y corrección

Esto es lo que arreglarías primero si el proyecto estuviera vivo. Como es
portafolio, es la sección que mejor se cuenta en una entrevista — razón de más
para hacerla tú.

### [x] T-10 · Restaurar la autorización en mutaciones (crítico)
**Por qué:** en `api/products/[id]` (PUT, DELETE) y `api/sellers/[id]` (PUT) la
verificación de propiedad está **comentada**. Cualquiera con un `fetch` edita o
borra productos ajenos y modifica perfiles de vendedor.
**Hecho cuando:** `verifyOwnershipAndGetSellerId` y `verifySellerId` se invocan
de verdad; `getEmailFromToken` corregido (falta `await` en `auth()` y
`clerkClient()`); tests que comprueban 401 sin sesión, 403 con sesión ajena y
200 con el dueño.
**Matiz sobre el `await`:** sin el, `userId` sale `undefined` y la comprobacion
`if (!userId)` salta siempre, o sea que la ruta responde 401 a todo el mundo.
Fallaba **cerrado**, no abierto: era un bug de funcionalidad, no el agujero. El
agujero era exclusivamente la verificacion de propiedad comentada.
**Alcance:** `src/app/api/products/[id]/route.js`, `src/app/api/sellers/[id]/route.js`, `src/utils/lib/auth.ts`.
**Depende de:** T-02
**Modelo:** `opus` — bug sutil de seguridad, aquí no se ahorra
**Nocturno:** no

### [x] T-10b · Autorización en `POST /api/schedules`
**Por qué:** encontrado en T-13b. La ruta reemplaza (borra e inserta) el
horario completo de cualquier `sellerId` que venga en el cuerpo, sin comprobar
que quien llama sea el dueño de ese vendedor. Cualquiera con sesión puede
vaciar o reescribir el horario de un negocio ajeno.
**Hecho cuando:** usa `getEmailFromToken` + `verifySellerId` (los mismos
helpers de T-10) antes de tocar la base; tests 401/403/200 iguales a los de
T-10.
**Hecho:** identidad primero (sin sesión no se llega ni a mirar el cuerpo) y
propiedad después, que necesita el `sellerId` ya validado porque viene en el
cuerpo. Seis tests en `autorizacion.test.js`, incluido el vaciado del horario
ajeno, que es la forma más destructiva del bug. Con la mutación que quita
`verifySellerId`, los tres casos de 403 devuelven 200 **y el horario del
vendedor ajeno desaparece**: el agujero era real y queda demostrado.
**Ojo con los tests de T-13b:** los cuatro casos de validación de esta ruta no
iniciaban sesión (no hacía falta, no había autorización) y pasaron a fallar con
401. Ahora entran como el dueño: son casos sobre el cuerpo, no sobre el acceso.
**Imports muertos:** la ruta importaba `currentUser`, `User` y `Seller` sin usar
ninguno (comprobado buscando cada identificador en el fichero). Se van; ningún
`populate` dependía de que el modelo quedara registrado.
**`errorResponse` gana un `bodyKey`:** el catch devolvía 500 a todo, así que un
`AppError` de 401/403 salía como 500. Se reutiliza el helper de T-15 en vez de
repetir la política de no filtrar el mensaje de un 500, pero con la clave
`message`, que es la que lee el banner de `Schedule.jsx`. La unificación de
formas sigue siendo de T-32.
**Hallazgo sin arreglar:** el reemplazo es un `deleteMany` seguido de un
`insertMany`, sin transacción. Si el insert falla, el vendedor se queda sin
horario. Arreglarlo de verdad pide una transacción, y `mongodb-memory-server`
corre en modo standalone (sin replica set), así que hoy no es verificable con
el arnés que hay. Candidata para cuando se toque el arnés de base de datos.
**Depende de:** T-10
**Modelo:** `opus` — mismo tipo de bug que T-10
**Nocturno:** no

### [ ] T-11 · Cerrar `POST /api/register`
**Por qué:** crea usuarios sin autenticación ni validación, y el `unique: true`
del email está comentado. Es un vector de spam directo a la base.
**El webhook NO crea usuarios.** Verificado en T-05 contra Mongo en memoria:
`createOrUpdateUser` hace `findOneAndUpdate({ clerkId }, ..., { upsert: true })`
pero `clerkId` no existe en `userSchema`, asi que Mongoose lanza
`StrictModeError: Path "clerkId" is not in schema` y no se crea nada. El
`try/catch` se lo traga y devuelve `undefined`. Es decir: la premisa de "el
webhook ya crea usuarios" es falsa, y hay que arreglar eso antes de decidir si
se borra `/api/register`.
**Actualización (T-12b): el webhook ya crea usuarios de verdad.** Se añadió
`clerkId` al schema y hay ocho tests sobre el endpoint con firma svix. Así que
el bloqueo desaparece: esta tarea ya puede decidir si `/api/register` se borra,
y la respuesta por defecto debería ser sí, porque el alta la hace Clerk.
**Decisión tomada (T-64): se borra.** Con el webhook apuntado a la instancia de
desarrollo (que es donde corre el sitio, ver T-64), `/api/register` es
puramente redundante — y es la ruta que lleva causando cada bug de `clerkId`
faltante de esta serie de tareas (T-12b en adelante). No hay razón para
conservarla ni protegida.
**Hecho cuando:** la ruta y `SignUpForm.jsx: createUserDb()` (la llamada que la
usa) desaparecen; el alta de usuario depende únicamente del webhook; test que
confirma que `/api/register` ya no existe (404). El índice único en `email`
sigue pendiente aparte — necesita migrar los duplicados que ya hay en Mongo, y
no es parte de borrar la ruta.
**Depende de:** que el webhook esté configurado en la instancia que sirve el
sitio (parte de T-64).
**Modelo:** `sonnet` · **Nocturno:** sí

### [x] T-11b · Quitar el prefijo NEXT_PUBLIC_ a las claves de imágenes
**Por qué:** las claves de ImageKit y Cloudinary llevaban prefijo
`NEXT_PUBLIC_`, que es el que Next inyecta en el bundle del navegador.
**Corrección importante:** durante T-03 y T-05 se afirmó aquí que la clave era
visible desde DevTools. **Era falso.** Se comprobó descargando los 24 chunks que
sirve mercampus.vercel.app y buscando los valores reales: cero coincidencias,
con la publishable de Clerk apareciendo como control de que la búsqueda
funcionaba. El código que lee esas variables solo lo importan route handlers, así
que nunca llegaba al cliente. No hubo que rotar ninguna clave.
**Lo que sí era cierto:** el nombre invitaba al accidente. Bastaba que alguien
importara `utils/imagekit.js` desde un componente `'use client'` para publicar la
clave en el siguiente deploy, sin ningún aviso.
**Hecho:** las seis variables renombradas sin prefijo, los SDK instanciados de
forma perezosa (lo que además elimina los placeholders que el CI arrastraba desde
T-01, porque el build ya no necesita valores), y un test que falla si vuelve a
aparecer una `NEXT_PUBLIC_*` con SECRET o PRIVATE en el nombre.
**Modelo:** `sonnet` · **Nocturno:** no

### [x] T-12b · Unir Clerk con Mongo por `clerkId`
**Por qué:** la aplicación une la sesión de Clerk con el usuario de Mongo **por
email**, que es la peor columna posible para unir: el usuario lo cambia en
Clerk y se rompe el vínculo, no es único en la base (el `unique` sigue
comentado, T-11), y obtenerlo cuesta una llamada de red a la Backend API de
Clerk en cada mutación (`clerkClient().users.getUser()` dentro de
`getEmailFromToken`).
**La causa era una sola línea que faltaba.** El webhook siempre buscó por
`clerkId` — `findOneAndUpdate({ clerkId: id }, ..., { upsert: true })`— pero el
campo no estaba declarado en `userSchema`. Comprobado llamando a la función
contra Mongo en memoria antes de tocar nada:

```
createOrUpdateUser devolvio: undefined
usuarios en la base: 0
sin try/catch lanzo: StrictModeError |
  Path "clerkId" is not in schema, strict mode is `true`, and upsert is `true`.
```

O sea: no es que "por clerkId no diera". El diseño era correcto y llevaba años
fallando en silencio por un campo que faltaba y un `catch` que se tragaba el
error. De ahí salió todo lo demás: como el webhook no creaba usuarios, se
resolvió la identidad por email, y de ahí la llamada de red por petición y la
ruta pública `/api/users/user-with-seller/[email]`.
**Hecho:** `clerkId` en `userSchema` (`unique` + `sparse`); `createOrUpdateUser`
deja de tragarse el error, así que un evento que falla devuelve 400 y Clerk lo
reintenta en vez de darlo por entregado; respaldo para `name` porque Clerk
permite registrarse sin nombre y el campo es obligatorio en el schema; el seed
siembra `clerkId` para que las pruebas se parezcan a producción.
**Ocho tests sobre el endpoint entero**, con firma svix de verdad: alta,
actualización sin duplicar, cambio de email conservando el documento (que es
justo lo que el email no puede garantizar), dos cuentas de Clerk con el mismo
email como dos documentos, alta sin nombre, borrado, firma inválida → 400 sin
tocar la base, y evento sin email → 400 en vez del 200 mentiroso de antes.
**Mutación clave:** quitar `clerkId` del schema —el estado histórico exacto—
tumba 5 de los 8 tests.
**Corrección: aquí se escribió "sin migración de datos a propósito, no hay
usuarios en producción". Eso se apoyaba en lo que dice CLAUDE.md, no en
evidencia, y da igual: aunque no haya usuarios *activos*, cualquier documento
`User` que ya exista en la base se queda sin `clerkId`, y desde T-12c eso lo
deja sin poder mutar nada.** La migración es obligatoria y va en T-12e.
**Modelo:** `opus` · **Nocturno:** no (nace de una discusión de diseño)

### [x] T-12c · Resolver la identidad por `clerkId` en el servidor
**Por qué:** con T-12b el `clerkId` ya está en la base, pero nadie lo usa
todavía. Hoy cada mutación hace `auth()` → llamada de red a Clerk para traducir
el id a un email → `User.findOne({ email }).populate('sellerId')`. Con el
`clerkId` eso es **una consulta indexada y cero llamadas de red**:

```js
const { userId } = await auth();
const user = await User.findOne({ clerkId: userId }).select('sellerId role');
```

`User` ya guarda `sellerId`, así que la comprobación de propiedad es comparar
dos ids: sobra el `populate` y sobra `getUserWithSellerByEmail`.
**Hallazgo que se cierra con esto:** `GET /api/users/user-with-seller/[email]`
**no tiene ninguna autenticación**. Comprobado llamando al handler sin sesión
contra Mongo en memoria: responde 200 con el documento completo del usuario
(`_id`, nombre, apellido, email, rol, fechas) y el del vendedor. Es un oráculo
de enumeración de cuentas: cualquiera prueba un email y sabe si está registrado
y con qué rol. El middleware no la cubre — solo protege rutas de página. Existe
únicamente para que `SellerContext` pregunte "¿soy vendedor?" desde el cliente,
que es el `fetch` a la propia API que este ROADMAP quiere eliminar. Con la
identidad resuelta en el servidor, la ruta se borra.
**Hecho cuando:** `getEmailFromToken` y `getUserWithSellerByEmail` desaparecen o
se reducen a una consulta por `clerkId`; las 4 rutas que usan la primera y las 3
que usan `currentUser()` pasan al mismo camino; `/api/users/user-with-seller/`
borrada; tests 401/403/200 iguales a los de T-10 pero sin mockear
`clerkClient()`, porque ya no hace falta.
**Partida, como avisaba el alcance.** Al abrirla se veía que la parte de cliente
(SellerContext + borrar la ruta pública) arrastraba media docena de archivos más
y se solapa con T-30/T-31. Esta tarea se queda con **el servidor**; el cliente va
en T-12d.
**Hecho:** `getEmailFromToken` ya no existe. En su lugar `getClerkUserId()` (el
id que ya viene en el token, sin red) y `getAuthenticatedUser()` (una consulta
indexada por `clerkId`, con `select` de lo justo y **sin `populate`**, porque
`User` ya guarda su `sellerId`). Los tres helpers de propiedad dejan de recibir
el email. Migradas las 4 rutas de `getEmailFromToken` y 2 de las 3 de
`currentUser()`.
**`sellers/admin` se queda fuera a propósito:** su `currentUser()` está metido
dentro del `Map` en memoria y el `setInterval` que T-12 va a borrar. Tocarlo a
medias haría más difícil T-12, no más fácil.
**Bug encontrado y arreglado de camino, en `POST /api/products`:** todo el
cuerpo del handler vivía dentro de un `if (clerkUser)` **sin `else`**, así que
una petición sin sesión salía sin devolver ninguna `Response`. Comprobado
llamando al handler antes de tocarlo: devolvía `undefined`, o sea un error del
framework en vez de un 401. Además `user._id` sobre un usuario inexistente
reventaba con TypeError antes de comprobar si era vendedor. La ruta no tenía
ningún test; ahora tiene 401/403/201.
**Lo que se simplifica de verdad:** `PUT /api/sellers/[id]` por email ya no
vuelve a buscar el `User` (si el email es el de la sesión, el vendedor es el que
esa sesión ya referencia), y `POST /api/products` ya no busca el `Seller` por
`userId` aparte. Los mocks de los tests pasan de simular `auth()` +
`clerkClient()` + `currentUser()` a simular solo `auth()`: buena señal de que
hay menos superficie.
**Cinco mutaciones**, cada una con su diff: quitar la comparación de propiedad
del producto (caen 2), la del vendedor (caen 4), el 401 de `getClerkUserId`
(caen 4), el chequeo de vendedor de productos (cae 1) y su 401 (cae 1).
**Depende de:** T-12b
**Modelo:** `opus` · **Nocturno:** no

### [x] T-12e · Rellenar `clerkId` en los usuarios que ya existen
> **BLOQUEA LA PROMOCIÓN `agent/develop → develop`.** El código está listo y
> probado, pero **la migración hay que correrla contra la base real antes de
> promover**. Si se promueve sin ella, todo usuario que ya exista queda sin
> poder editar nada.

**Por qué:** hasta T-12b el campo `clerkId` no existía en el schema, así que
ningún usuario lo tiene. Desde T-12c la identidad se resuelve por ahí. Medido
llamando a los handlers con un usuario sin `clerkId` y una sesión de Clerk
válida:

```
usuarios sin clerkId: 3
PUT /api/sellers/[id] -> 403 {"error":"No eres usuario registrado."}
POST /api/sellers     -> 404 {"message":"No se encontró un usuario para esta sesión."}
```

Y **el webhook no lo arregla solo**: `user.created` no se vuelve a disparar para
una cuenta que ya existe, así que el bloqueo sería permanente.
**Hecho:** `scripts/backfill-clerk-id.mjs` (`npm run migrate:clerk-id`).
**Recorre Clerk, no Mongo** (T-12f). Clerk es la fuente de verdad de la
identidad y cada cuenta tiene exactamente un id, así que por construcción no hay
ambigüedad. La primera versión iba al revés —recorrer Mongo y preguntar por
email— y por eso el informe se llenaba de casos que parecían trabajo manual sin
serlo.
**Medido contra la base real (ensayo, sin escribir):**

```
Cuentas en Clerk: 11
Resumen: {"enlazado-con-desempate":3,"enlazado":8}
Documentos sin cuenta en Clerk: 65 (no pueden iniciar sesión)
```

Es decir: 11 de 11 se resuelven solas, cero casos manuales.
**CORRECCIÓN GRAVE (T-12h): ese ensayo se hizo contra la instancia equivocada.**
Las claves del `.env` —y las del entorno Production de Vercel— son de una
instancia de **desarrollo** con 11 cuentas; la de producción tiene ~70. Correrlo
con `--apply` habría escrito ids de desarrollo sobre usuarios reales. Desde
T-12h el script se planta antes de escribir. **No corras esto hasta cerrar
T-64.**
Los 3 desempates
son la misma persona duplicada en Mongo —una copia con perfil de vendedor y otra
vacía, restos del viejo `POST /api/register`— y se resuelven con una regla
escrita: gana la que tiene `sellerId`, y a igualdad la más antigua. Los 65
huérfanos **no están bloqueados**: sin cuenta en Clerk no pueden ni iniciar
sesión, así que no son trabajo de esta migración sino de T-11. La primera versión
los contaba como problema y era ruido.
**Ocho tests**, incluido el desempate real de producción y el recorrido entero:
usuario bloqueado con 404 → backfill → 201.
**Cómo correrlo el día de la promoción:**
1. `npm run migrate:clerk-id` — ensayo, no escribe. Revisa el listado.
2. `npm run migrate:clerk-id -- --apply`.
3. `npm run migrate:clerk-id -- --check` — **sale con código 1 si queda alguien
   sin enlazar.** Esta es la puerta: si pasa en verde, se puede promover.
**Depende de:** T-12b, T-12c
**Modelo:** `opus` · **Nocturno:** no

### [ ] T-12d · Borrar la ruta pública por email y sacar `SellerContext` del cliente
**Por qué:** `GET /api/users/user-with-seller/[email]` **no tiene ninguna
autenticación**. Comprobado llamando al handler sin sesión contra Mongo en
memoria: responde 200 con el documento completo del usuario (`_id`, nombre,
apellido, email, rol, fechas) y el del vendedor. Es un oráculo de enumeración de
cuentas: cualquiera prueba un email y sabe si está registrado y con qué rol. El
middleware no la cubre — solo protege rutas de página, nunca `/api`.
**Por qué existe:** solo para que `SellerContext` pregunte "¿soy vendedor?"
desde el cliente, que es exactamente el `fetch` a la propia API que este ROADMAP
quiere eliminar. Con T-12c la respuesta ya se puede dar en el servidor sin
consultar nada por email.
**Hecho cuando:** la ruta y `getUserWithSellerByEmail` desaparecen;
`SellerContext` recibe el usuario y el vendedor desde el servidor en vez de
pedirlos por fetch; un test comprueba que la ruta ya no existe.
**Ojo:** se solapa con T-30/T-31 (capa de datos y Server Components). Si al
abrirla se ve que la forma correcta es hacerlo dentro de T-31, anótalo y
fusiónalas en vez de hacer el trabajo dos veces.
**Depende de:** T-12c
**Modelo:** `opus` · **Nocturno:** no

### [ ] T-12 · Rol de admin en los claims de Clerk
**Por qué:** hoy se resuelve con un `Map` en memoria y un `setInterval` a nivel
de módulo dentro de una ruta. En serverless es caché por instancia y un
intervalo que nunca se limpia.
**Hecho cuando:** el rol vive en `publicMetadata` de Clerk; el middleware protege
`/admin/*` y `/api/**/admin`; el `Map` y el `setInterval` desaparecen.
**Modelo:** `opus` · **Nocturno:** no

### [~] T-13 · Validación con Zod en todos los bordes
**Por qué:** `new Product(body)` acepta lo que mande el cliente. Los query params
tampoco se validan.
**Hecho cuando:** un schema Zod por endpoint en `src/lib/validators/`; los
handlers devuelven 400 con detalle de campos; tests de payload inválido.
**Hecho ya:** `src/lib/validators/` con los schemas de producto y vendedor y el
helper de respuesta 400. Cubiertos `POST /api/products`, `PUT /api/products/[id]`,
`PUT /api/sellers/[id]` y los query params de `GET /api/products`. Zod descarta
lo que no declara, asi que se cierra ademas la asignacion masiva: el cliente ya
no puede mandar `sellerId` ni `approved` en el cuerpo.
**Falta (T-13b):** `POST /api/sellers`, `POST /api/register` (que depende de la
decision de T-11), horarios, pqrs y usuarios. Se parte para no pasarse del
limite de ~15 archivos por PR.
**Estado tras T-13b y T-13c:** cubierto todo menos `POST /api/register`, que
sigue bloqueado por la decision de T-11 (borrar la ruta o protegerla). Esta
tarea queda `[~]` solo por eso.
**Modelo:** `sonnet` — repetitivo y con criterio claro
**Nocturno:** sí

### [x] T-13b · Terminar la validación con Zod
**Por qué:** T-13 cubrió productos y vendedores. El resto de endpoints sigue
aceptando lo que mande el cliente.
**Hecho cuando:** schemas para `POST /api/sellers`, horarios, pqrs y usuarios,
con sus tests de payload inválido. `POST /api/register` va aparte porque su
existencia la decide T-11.
**Corrección:** no existe ningún endpoint de mutación de usuarios aparte de
`POST /api/register` (que queda fuera, como dice el propio criterio) y del
webhook de Clerk, que ya verifica su firma con svix y no necesita Zod además.
"Usuarios" no tenía nada que cubrir.
**Hecho:** `src/lib/validators/schedule.ts` y `src/lib/validators/pqrs.ts`
nuevos; `createSellerSchema` de T-13 por fin se conecta. Cubiertos
`POST /api/sellers`, `POST /api/schedules` y `POST /api/pqrs`.
**Dos bugs encontrados y arreglados, necesarios para que los tests fueran
honestos:**
- `POST /api/sellers` y `POST /api/pqrs` envolvían el guardado en
  `try { ... } catch { logger.debug(error) }` y devolvían éxito **pase lo que
  pase**. Un fallo real de Mongoose (o el usuario sin `User` asociado, que es
  justo el caso que rompe el webhook según T-05) quedaba silenciado y el
  cliente recibía 201/"creado" sin que se hubiera creado nada.
- `POST /api/pqrs` hacía `NextResponse.json({ status: 201 })` **sin segundo
  argumento**: el `status` quedaba como un campo cualquiera del cuerpo, y el
  código HTTP real era 200 siempre.
- En `POST /api/schedules`, un `day` que no coincidiera exactamente con
  `daysES` hacía que `indexOf` devolviera `-1` y el horario se guardara con
  `day: 0`, en silencio. Ahora se rechaza con 400 antes de llegar ahí.
**Hallazgo sin arreglar, anotado para otra tarea:** `POST /api/schedules` no
comprueba que quien llama sea dueño del `sellerId` que manda — cualquiera con
sesión puede borrar y reemplazar el horario de cualquier vendedor. Es del mismo
tipo que T-10, pero en una ruta que T-10 no tocó. Candidata: T-10b.
**Depende de:** T-13
**Modelo:** `sonnet` · **Nocturno:** sí

### [x] T-13c · El teléfono del vendedor viaja como string
**Por qué:** encontrado en T-15b. `createSellerSchema` y `updateSellerSchema`
declaran `phoneNumber: z.number()`, pero el cliente siempre manda un string:
- `sellers/register/page.jsx` guarda `value.replace(/\D/g, '').slice(0, 10)`,
  que es un string de dígitos. Como el schema se conectó en T-13b, **el alta de
  vendedor responde 400 siempre**.
- `sellers/profile/edit/page.jsx` guarda `e.target.value` **sin limpiar**, y el
  valor del input es el texto ya formateado: editar el teléfono manda
  `"(300) 123-4567"` y el PUT responde 400.
Los tests de integración de T-13b no lo atraparon porque mandan
`phoneNumber: 3000000000` (number) a mano, no lo que manda el formulario.
**Evidencia:** `createSellerSchema.safeParse({ businessName: 'Arepas Ana',
phoneNumber: '3001234567' })` → `success: false`,
`"Invalid input: expected number, received string"`. Con `3001234567` pasa.
**Ojo con el `.slice(0, 10)` del register:** repite la lógica que T-15b arregló
dentro de `formatPhone`, así que un `+57` pegado se guarda como `5730012345`.
Al unificar, extraer el normalizador de `utilFn.js` en vez de duplicarlo.
**Hecho cuando:** cliente y servidor coinciden en el tipo — Mongoose
(`sellerSchema2.phoneNumber: Number`) y Zod ya están de acuerdo, así que se
arregla el formulario o se acepta el string con `z.coerce`, no las dos cosas — y
hay un test de integración que manda **el payload real del formulario**, no uno
escrito a mano.
**Hecho:** el normalizador sale de `utilFn.js` a `src/lib/phone.ts`
(`toNationalPhone` + `isNationalPhone`) y ahora lo usan los tres sitios que
tocan un teléfono: `formatPhone` para mostrarlo, el schema de Zod para validarlo
y el alta de vendedor para guardarlo. El campo pasa a normalizar-y-luego-validar
(`union(string, number) → toNationalPhone → isNationalPhone → Number`), así que
acepta lo que mandan los formularios de verdad —`'3001234567'`,
`'(300) 123-4567'`, `'+57 300 123 4567'`— y a Mongoose le sigue llegando un
`Number`.
**Por qué se valida además que no empiece por cero:** el teléfono se guarda como
`Number`, así que un `'0300123456'` se convertiría en `300123456` y perdería un
dígito en silencio. Ahora se rechaza con 400.
**Ojo con `.transform(Number)`:** ningún test de integración lo atrapa, porque
Mongoose convierte el string por su cuenta al guardar. Se mantiene igualmente
—el contrato del validador es entregar el dato con el tipo del modelo, no
depender de una conversión implícita— y se fija con un test unitario sobre el
schema, que sí cae si se quita.
**Sigue sin normalizar:** `sellers/profile/edit/page.jsx` guarda el texto ya
formateado en su estado. Funciona porque el schema lo normaliza, pero el estado
del cliente y lo que hay en la base no coinciden hasta que se recarga. Se deja
así a propósito: arreglarlo bien es que `InputFields` emita el valor limpio en
su `onChange` en vez del evento crudo, y eso toca todos sus consumidores.
**Deuda de fondo, no de esta tarea:** `phoneNumber` como `Number` es frágil
—no admite ceros a la izquierda ni indicativo— y debería ser `string`. Cambiarlo
implica migrar los datos, así que va con T-30.
**Depende de:** T-13b
**Modelo:** `sonnet` · **Nocturno:** sí

### [ ] T-14 · Endpoints muertos y rotos
**Por qué:** el PUT y DELETE de `api/sellers/route.js` usan `req.query`, que no
existe en App Router: nunca funcionaron. `api/sellers/availability` está
comentado entero, así que la disponibilidad automática por horario no funciona.
**Otro candidato, visto en T-13b:** `GET /api/schedules` filtra por
`req.sellerid` (un campo que no existe en `NextRequest`, así que siempre es
`undefined`). Nada del frontend lo llama — `Schedule.jsx` solo usa el `POST`.
`GET /api/schedules/[id]` es la ruta que sí funciona y sí se usa.
**Hecho cuando:** los handlers muertos se eliminan; se decide si la
disponibilidad automática se restaura como cron de Vercel (y entonces
`allowedIPs.js` se reemplaza por un `CRON_SECRET`) o se elimina junto con el
archivo. La decisión queda escrita en el PR.
**Modelo:** `opusplan` — hay una decisión de producto de por medio
**Nocturno:** no

### [x] T-15 · Errores tipados y logger
**Por qué:** `console.log` por todas partes, mensajes de error inconsistentes,
`AppError` usado en un sitio donde ni siquiera está importado
(`api/products/[id]` DELETE, arreglado en T-10).
**Ojo con la cifra:** eran 169; tras los borrados de T-34 quedaban **104**,
repartidas en unos 43 archivos. Por eso se parte.
**Hecho cuando:** un helper de respuesta de error único; logger con niveles que
no imprime en test; cero `console.log` fuera de `scripts/`.
**Hecho ya:** `src/lib/logger.ts` (niveles, silencioso en test, contexto como
objeto aparte) y `src/lib/api-response.ts`, que unifica `invalidPayload` y
`errorResponse` y **nunca devuelve al cliente el mensaje de un 500**. Migrada la
capa de API entera: 34 llamadas en 12 archivos, con un test que impide que
vuelva a colarse un `console.*` ahí.
**Cerrada en T-13c** (contabilidad, no código): las otras 70 llamadas las
migraron T-15c y T-15d, y el criterio se cumple. Comprobado: los únicos
`console.*` que quedan en `src/` son los dos que hay **dentro** de
`src/lib/logger.ts`, que es donde deben estar. El guardián recorre todo `src/`.
**Sobre unificar los cuerpos de error:** los handlers devuelven unas veces
`{ error }` y otras `{ message }`. Cambiarlo altera el contrato que consume el
frontend, así que `errorResponse` solo se usa donde la forma ya coincide.
Unificarlo del todo va con T-32, cuando las mutaciones pasen a Server Actions.
**Modelo:** `sonnet` · **Nocturno:** sí

### [x] T-15c · Logger en componentes y contexto
**Por qué:** quedan 29 `console.*` en `src/components/` y `src/context/`.
**Hecho cuando:** migradas al logger; el test que guarda `src/app/api` se amplía
para cubrir estas carpetas.
**Ojo:** son componentes de cliente, así que el logger corre también en el
navegador. Next sustituye `process.env.X` por undefined en el bundle del
cliente, de modo que `LOG_LEVEL` no aplica allí y el nivel lo decide
`NODE_ENV`. Verificado con el e2e, que carga esos componentes en un Chromium
de verdad.
**Depende de:** T-15
**Modelo:** `sonnet` · **Nocturno:** sí

### [x] T-15d · Logger en servicios, utilidades y páginas
**Por qué:** quedan 41 `console.*` en `src/services/`, `src/utils/` y las páginas
de `src/app/` que no son API.
**Hecho cuando:** migradas al logger; el guardián cubre ya todo `src/`, de modo
que el criterio de T-15 (cero `console.log` fuera de `scripts/`) queda cerrado.
**Hecho:** 41 llamadas migradas en 16 archivos. El guardián ahora recorre todo
`src/` (no solo las carpetas ya migradas) y además cuenta como fallo un
`console.log` **comentado**: se encontraron y eliminaron tres restos de
depuración así. El logger normaliza el contexto (Error, string, número u
objeto) para que un `catch (error)` en TypeScript no necesite casts.
**Depende de:** T-15
**Modelo:** `sonnet` · **Nocturno:** sí

### [x] T-15b · Corregir formato de moneda y teléfono
**Por qué:** `priceFormat` usa `en-US` con `currency: 'USD'` en un
marketplace colombiano (`1500 → '$1,500'` en vez de `'$1.500'`).
`formatPhone` rompe con indicativo de país.
**Hecho cuando:** `priceFormat` usa `es-CO` con `currency: 'COP'`;
`formatPhone` maneja correctamente el prefijo `+57`; los tests
de T-02 actualizados para reflejar el comportamiento correcto.
**Corrección de la premisa:** el resultado de `es-CO` + `COP` **no** es
`'$1.500'` sino `'$ 1.500'`: ICU separa el símbolo del importe con un
espacio duro (U+00A0). Es la forma canónica del locale, así que se deja tal
cual y los tests la afirman con la constante `NBSP` en vez de con un carácter
invisible en el literal.
**Hecho:** `priceFormat` y `formatValue` (que ahora delega en el primero) en
`es-CO`/`COP`; `formatPhone` descarta el indicativo `57` solo cuando quedan más
de 10 dígitos — ningún número nacional colombiano empieza por 57 (los móviles
por 3, los fijos por 60), y la guarda evita comerse los tres primeros dígitos de
un número de 10. Tres mutaciones comprobadas (volver a `en-US`/`USD`, quitar el
descarte del indicativo, descartarlo sin la guarda) tumban un test cada una.
**Ojo con ICU:** el `maximumFractionDigits` por defecto para COP **depende de la
versión de ICU**. Sin fijarlo, `priceFormat(1500.5)` daba `'$ 1.500,5'` en local
(Node 22.20) y `'$ 1.501'` en el runner del CI — el primer intento pasó en local
y tumbó `quality`. Ahora va explícito a 0, que es lo correcto (no circulan
centavos de peso y el precio es entero en `productSchema`) y hace el formato
independiente de la máquina. Si alguna vez hay que formatear moneda en otro
sitio, no confíes en los defaults del locale: fíjalos.
**Ojo con el e2e:** `recorrido.spec.js` afirmaba el precio como `'6,000'`, así
que atrapó el cambio. Ahora afirma `/\$\s*6\.000/` y además que `'6,000'` no
aparece.
**Hallazgo sin arreglar, ver T-13c:** el teléfono llega al servidor como string
y `createSellerSchema` pide `number`.
**Modelo:** `sonnet` · **Nocturno:** sí

---

## Fase 2 — Rendimiento y datos

Casi toda esta fase es apta para el nocturno: criterios inequívocos y tests que
atrapan el error.

### [x] T-20 · Sacar la migración del handler de lectura
**Por qué:** `GET /api/products` corre `updateMany({section: {$exists: false}})`
en **cada** request. Una migración de una sola vez lleva un año ejecutándose en
cada carga de página.
**Hecho cuando:** la migración vive en `scripts/`, el handler solo lee.
**Pendiente de ejecutar:** el script existe (`npm run migrate:product-section`)
pero nadie lo ha corrido contra la base real. Exige `--yes` porque escribe. Al
contrario que el seed, esta migración sí está pensada para producción.
**Modelo:** `sonnet` · **Nocturno:** sí

### [x] T-21 · Índices
**Por qué:** ningún schema define índices. Todo es collection scan.
**Hecho cuando:** índices en `Product.sellerId`, `Product.section`,
`Schedule.sellerId`, `User.email`, `Seller.userId`, `Seller.university`;
verificado con `.explain()` en un test o un script.
**Ojo con `Product.section`:** solo tiene dos valores posibles, asi que como
indice suelto es poco selectivo y Mongo puede ignorarlo. Lo util de verdad seria
un compuesto `{section, sellerId}` o `{section, category}`. Se implemento el
sencillo porque es lo que pide el criterio; el compuesto merece medirse con
datos reales antes de añadirlo.
**Modelo:** `sonnet` · **Nocturno:** sí

### [x] T-22 · Matar el N+1 de horarios
**Por qué:** un `Schedule.find()` por cada producto y por cada vendedor. Con 50
productos son 51 consultas.
**Hecho cuando:** una sola consulta con `$in` (o un `$lookup`) y agrupación en
memoria; test que cuenta las queries emitidas.
**Queda uno sin tocar:** `api/sellers/admin/route.js` tiene el mismo patron,
pero esa ruta la reescribe T-12 entera (el Map en memoria y el setInterval). El
helper `src/utils/lib/schedules.ts` ya esta listo para usarse alli.
**Modelo:** `sonnet` · **Nocturno:** sí

### [ ] T-23 · Paginación de verdad
**Por qué:** `productService` manda `limit` y `offset` que la ruta ignora; se
carga la colección completa, se ordena en JS y se filtra después de poblar.
`react-intersection-observer` está instalado sin usarse.
**Hecho cuando:** la consulta pagina en Mongo con cursor; scroll infinito
funcionando en el listado; test e2e que hace scroll y carga una segunda página.
**Depende de:** T-04, T-21
**Modelo:** `opusplan` para el plan, `sonnet` para ejecutar
**Nocturno:** no

### [ ] T-24 · Búsqueda decente
**Por qué:** `$regex` sin anclar sobre `name`, sin tolerancia a errores ni
acentos. "arepa" no encuentra "Arepas".
**Hecho cuando:** índice de texto de MongoDB (o Atlas Search si el cluster lo
permite), insensible a acentos, con ranking; tests con typos y tildes.
**Modelo:** `opusplan` · **Nocturno:** no

---

## Fase 3 — Arquitectura

La reescritura grande. Toda tuya, con `opusplan` — excepto la limpieza del
final, que sí es del nocturno.

### [ ] T-30 · Capa de datos en el servidor
**Por qué:** hoy la lógica de acceso a datos vive dentro de los route handlers,
así que no se puede reusar desde Server Components.
**Hecho cuando:** `src/server/products.ts`, `sellers.ts`, `schedules.ts` con
funciones puras que consultan Mongo; los route handlers pasan a ser envoltorios
delgados; tests unitarios sobre esa capa.
**Depende de:** T-05, T-13
**Modelo:** `opusplan` · **Nocturno:** no

### [ ] T-31 · Migrar los listados a Server Components
**Por qué:** 44 archivos con `'use client'` y la app pidiéndole datos a su propia
API vía HTTP. En Vercel eso es el servidor llamándose a sí mismo: latencia y una
función extra por request.
**Hecho cuando:** `/antojos`, `/marketplace` y `/antojos/[id]` renderizan en el
servidor consultando `src/server/` directo; los filtros siguen funcionando por
searchParams; e2e verde; comparativa de Lighthouse antes/después en el PR.
**Depende de:** T-30
**Modelo:** `opusplan` · **Nocturno:** no

### [ ] T-32 · Mutaciones con Server Actions
**Hecho cuando:** crear, editar y borrar producto pasan por Server Actions con
validación Zod y `revalidatePath`; `services/api.js` y `services/apiToken.js`
se eliminan.
**Depende de:** T-30, T-10
**Modelo:** `opusplan` · **Nocturno:** no

### [x] T-33 · Deduplicar componentes
**Por qué:** `ProductCard`/`ProductCardAV` difieren en 32 líneas,
`SellerCard`/`SellerCardAV` en 10, `TableSche`/`TableSchema` en 63.
**`TableSche`/`TableSchema` ya no aplicaba:** `TableSche.jsx` tenía 0
importadores y se borró en T-34. Solo `TableSchema.jsx` sigue vivo, sin
duplicado que fusionar.
**Hecho:** `ProductCard` y `SellerCard` ahora aceptan `variant`
(`'standalone'` por defecto, `'embedded'`); `ProductCardAV` y `SellerCardAV`
eliminados y sus dos call sites (edición de productos, admin de vendedores)
apuntan al componente único.
**Límite real del e2e, y cómo se cubrió:** las cuatro pantallas originales del
e2e no ejercitan la variante `'embedded'` de ninguno de los dos componentes —
solo la usan la edición de productos y el panel de admin, rutas autenticadas
que Playwright todavía no puede visitar (no hay sesión de Clerk simulada). Se
añadió una quinta pantalla (`/antojos/sellers/list`) que sí ejercita
`SellerCard` de verdad, y la lógica de className de las dos variantes se
extrajo a `src/lib/card-variant.js` —un módulo sin JSX, aparte— con tests
unitarios que si cubren `'embedded'`, verificados con mutación.
**Hallazgo, sin arreglar:** al escribir la quinta pantalla se comprobó
—primero mal, corregido después— que `GET /api/sellers` **no filtra por
`approved`**: devuelve todos los vendedores. El listado público solo se ve
limpio porque `SellerGrid.jsx` filtra en el cliente; quien llame la API
directo ve también los pendientes de aprobación. No es tan grave como
`T-10b` (no hay escritura de por medio, solo lectura de datos no sensibles),
pero es la misma familia de problema: filtro de negocio que vive solo en el
cliente.
**Modelo:** `sonnet` · **Nocturno:** sí (el e2e con capturas es la red)

### [x] T-34 · Borrar lo muerto
**Por qué:** `SellerContext2.js` no lo importa nadie (todos usan
`SellerContext`); igual `RegisterSellerForm.jsx`, `pqrsService.js`,
`allowedIPs.js` y `favoriteSchema.js` — este último además usa
`module.exports = mongoose.model(...)` sin el guard `mongoose.models ||`, así
que reventaría con `OverwriteModelError` si alguien lo importara.
**Adelantado en T-01:** `src/app/api/categories/route.js` y
`src/utils/models/categorySchema.js` ya se eliminaron. Nadie los importaba y las
categorías salen de `utils/resources/categories.js` y `utils/categoriesList.js`;
además el endpoint era el único con un `GET()` sin argumentos, así que Next lo
prerenderizaba en el build y lo rompía.
**Candidato nuevo:** `src/utils/lib/clerkUser.js`, 0 importadores. Encontrado en
T-05, donde ademas se vio que no compila bajo TS.
**Hecho cuando:** eliminados, con la búsqueda de referencias documentada en el
PR; `knip` o similar añadido al CI para que no vuelva a acumularse.
**Eliminados (10):** los cinco de la lista, mas `lib/clerkUser.js` (T-05) y
cuatro que encontro knip: `TableSche.jsx`, `services/auth/server/seller.js`,
`services/auth/server/user.js` y `utils/auth/client/seller.js`. Los dos ultimos
ademas estaban rotos: importaban simbolos que su origen no exporta.
**knip solo rompe por archivos muertos.** Las 9 dependencias sin usar que
detecta son de **T-35** (next-auth, bcryptjs, jsonwebtoken, cookies y el
proveedor de imagenes que se descarte) y los 10 exports sin usar son de
**T-30**, cuando la capa de datos absorba los services. Quedan como avisos
visibles en el log hasta que toque.
**Modelo:** `sonnet` · **Nocturno:** sí

### [ ] T-35 · Un solo proveedor de imágenes
**Por qué:** Cloudinary e ImageKit están ambos instalados, ambos con su ruta.
También sobran `next-auth`, `bcryptjs`, `jsonwebtoken` y `cookies`, restos de
antes de Clerk.
**Hecho cuando:** se escoge uno, el otro se elimina junto con su ruta y su
dependencia; `package.json` sin dependencias sin usar.
**Modelo:** `sonnet` · **Nocturno:** no (la elección de proveedor es tuya)

### [ ] T-36 · README de verdad
**Por qué:** sigue siendo el de `create-next-app`, con un `## Yes` suelto.
**Hecho cuando:** qué es el proyecto, capturas, stack, variables de entorno,
cómo levantarlo, cómo correr tests, y una sección sobre el pipeline agéntico.
Este archivo es el que van a leer los reclutadores.
**Modelo:** `sonnet` · **Nocturno:** no (escríbelo tú, es tu vitrina)

---

## Fase 4 — Funcionalidad nueva

Aquí ya se construye sobre terreno firme. Cada una es un proyecto en sí misma y
todas son de diseño, así que todas son tuyas.

### [ ] T-40 · Modelo de pedidos
**Por qué:** no existe `Order`. Hoy el flujo termina en un link de WhatsApp, así
que no hay datos de nada.
**Hecho cuando:** schema `Order` con máquina de estados
(`pending → accepted → preparing → delivering → completed | cancelled`),
transiciones validadas en un solo sitio, historial de cambios de estado y tests
que prueben que una transición inválida se rechaza.
**Modelo:** `opusplan` · **Nocturno:** no

### [ ] T-41 · Chat comprador ↔ vendedor
**Por qué:** WhatsApp saca al usuario de la app y se pierde el contexto del
pedido.
**Hecho cuando:** hilo por pedido, historial persistido, indicador de no leídos.
Empezar con polling cada 5 s; migrar a SSE o WebSocket solo si el polling
estorba de verdad. Medir antes de complicar.
**Depende de:** T-40
**Modelo:** `opusplan` · **Nocturno:** no

### [ ] T-42 · Mapa del campus y estado en vivo
**Por qué:** era la función que nunca se hizo. El problema difícil no es el mapa,
es de dónde sale la ubicación: los vendedores caminan por el campus y depender de
GPS en una pestaña abierta es frágil.
**Hecho cuando (v1, sin GPS):** puntos de entrega fijos del campus con
coordenadas conocidas; el vendedor declara su punto y su estado; mapa con
MapLibre + tiles de OpenStreetMap mostrando pines. Cubre casi todo el valor sin
tocar geolocalización.
**v2 (opcional):** ubicación real durante `delivering`, con consentimiento
explícito, y que se apague sola al completar el pedido.
**Depende de:** T-40
**Modelo:** `opusplan` · **Nocturno:** no

### [ ] T-43 · Notificaciones push
**Por qué:** ya hay `manifest.json`, o sea que la PWA está a medio camino.
**Hecho cuando:** Web Push para cambios de estado de pedido y mensajes nuevos;
permisos pedidos en el momento correcto, no al cargar.
**Depende de:** T-40
**Modelo:** `opusplan` · **Nocturno:** no

### [ ] T-44 · Panel del vendedor
**Hecho cuando:** ventas por día, productos más pedidos, horas pico, tasa de
cancelación. Lectura sobre `Order`, sin escribir nada nuevo.
**Depende de:** T-40
**Modelo:** `sonnet` · **Nocturno:** sí

### [ ] T-45 · Reseñas
**Hecho cuando:** calificación por pedido completado (no por producto suelto,
para evitar reseñas falsas), promedio en la tarjeta del vendedor, moderación
básica.
**Depende de:** T-40
**Modelo:** `opusplan` · **Nocturno:** no

### [ ] T-46 · Internacionalización (español e inglés)
**Por qué:** todo el copy está incrustado en español dentro de los componentes.
En una universidad con estudiantes de intercambio, el inglés amplía el público —
y para el portafolio demuestra manejo de rutas por locale y de contenido
dinámico, que es lo que hace difícil de verdad esta tarea.
**Ojo con el tamaño:** hay copy en más de 40 componentes. Hacerlo de una vez
produce un diff imposible de revisar y se salta el límite de ~15 archivos.
**Hecho cuando (v1, solo el andamiaje):** `next-intl` configurado con rutas
`/[locale]/`; middleware que negocia el locale y convive con `clerkMiddleware`;
Clerk cambia de `esMX` a `enUS` según el locale; los diccionarios en
`messages/{es,en}.json`; **una sola pantalla** migrada como prueba, y el e2e
recorriéndola en los dos idiomas.
**Después, una tarea por zona:** listado, detalle de producto, perfil de
vendedor, formularios, panel de vendedor. Cada una con su PR.
**Lo que no resuelve:** el contenido que escriben los vendedores (nombres y
descripciones de producto) seguirá en el idioma en que lo escribieron. Traducirlo
es otra decisión de producto, no de i18n.
**Depende de:** T-04, que da la red para comprobar que no se rompe nada visual
**Modelo:** `opusplan` — la negociación de locale junto al middleware de Clerk
tiene trampa
**Nocturno:** no

---

## Fase 5 — IA como funcionalidad, no como herramienta

Distinto de usar un agente para escribir el código: aquí la IA es parte del
producto. Es lo que diferencia el portafolio.

### [ ] T-50 · Búsqueda semántica
**Por qué:** hoy "algo dulce y barato" no encuentra nada.
**Hecho cuando:** embeddings de nombre + descripción + categoría guardados en el
documento, búsqueda vectorial de Atlas, e híbrido con la búsqueda por texto.
Evaluación con 20 consultas de referencia y sus resultados esperados, para poder
demostrar que mejoró.
**Depende de:** T-24
**Modelo:** `opus` — dominio nuevo, decisiones no obvias
**Nocturno:** no

### [ ] T-51 · Alta de producto desde una foto
**Por qué:** publicar un producto son hoy 6 campos a mano; es la fricción número
uno para un vendedor entre clases.
**Hecho cuando:** el vendedor sube la foto y un modelo propone nombre,
descripción, categoría y rango de precio; **todo editable antes de guardar**, sin
autoguardado. Fallback manual si la API falla.
**Modelo:** `opus` · **Nocturno:** no

### [ ] T-52 · Moderación de publicaciones
**Hecho cuando:** revisión automática de foto y texto al publicar, con cola de
revisión humana para los casos dudosos en lugar de bloqueo automático.
**Modelo:** `opusplan` · **Nocturno:** no

### [ ] T-53 · Evaluaciones de las funciones de IA
**Por qué:** sin evals, "mejoré el prompt" es una opinión. Esto es lo que separa
un demo de un sistema.
**Hecho cuando:** un set de casos con salida esperada para T-50 y T-51, un
comando que lo corre y reporta métricas, y el CI ejecutándolo en los PRs que
tocan esas rutas.
**Depende de:** T-50, T-51
**Modelo:** `opus` · **Nocturno:** no

---

## Fase 6 — Operación

### [ ] T-60 · Observabilidad
**Hecho cuando:** Sentry para errores de cliente y servidor, logs estructurados,
y una alerta cuando la tasa de error del deploy supere un umbral.
**Modelo:** `sonnet` · **Nocturno:** sí

### [ ] T-61 · Presupuesto de rendimiento y accesibilidad
**Hecho cuando:** Lighthouse CI en cada PR con umbrales que rompen el build;
navegación por teclado y contraste revisados en las pantallas principales.
**Modelo:** `sonnet` · **Nocturno:** sí

### [ ] T-63 · Separar los entornos (base de datos y Clerk)
> **El riesgo estructural más grande del proyecto ahora mismo.** No lo puede
> hacer un agente: son decisiones de infraestructura y cuestan dinero.

**Medido con el CLI de Vercel y contra los servicios reales (T-12g):**

| | Production | Preview | Development |
|---|---|---|---|
| `MONGO_URI` | `cluster0.fibip…/mercampus_products` | **el mismo cluster, la misma base, el mismo usuario** | el mismo |
| Clerk | `sacred-shrew-44.clerk.accounts.dev` | **la misma instancia** (`CLERK_SECRET_KEY` idéntica) | la misma |

Vercel tiene dos entradas separadas de `CLERK_SECRET_KEY` y
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (una para Preview, otra para Production),
pero **contienen el mismo valor**, así que la separación es aparente.

**Qué implica, en concreto:**
1. **Cualquier deployment de preview escribe en la base de producción.** El
   preview de `agent/develop` incluido. No hay red de seguridad de datos entre lo
   que prueba el agente y lo que ven los usuarios.
2. **El sitio corre sobre la instancia de _desarrollo_ de Clerk, y así se queda
   a propósito (T-64).** La de producción existe y sus usuarios están intactos,
   pero depende de un dominio (`mercampus.com`) que el equipo decidió no
   renovar. No es una tarea pendiente, es la decisión tomada.
3. `npm run seed` con el `.env` actual borraría la base de producción. La guarda
   de `--yes` fuera de localhost es lo único que lo impide: no la quites.

**Hecho cuando:** hay un cluster de Mongo aparte para preview/desarrollo; el
`.env` de trabajo apunta a ese; y el `.env.example` documenta cuál es cuál.
**Ya no aplica** la mitad de Clerk de esta tarea (una instancia de producción
aparte): ver T-64. El punto 1 (Mongo) sigue siendo el riesgo real y pendiente.
**Modelo:** `opusplan` · **Nocturno:** no (infraestructura y coste)

### [x] T-12h · Guarda de instancia en el backfill
> **Corrige un error mío que habría dañado datos reales.** En T-12f di el
> backfill por listo diciendo "11 de 11 se resuelven solas". Esas 11 son las de
> una instancia de **desarrollo**. La de producción tiene ~70 cuentas.

**Por qué:** un `clerkId` solo significa algo dentro de su instancia. Correr el
backfill con las claves del `.env` habría escrito ids de la instancia de
desarrollo sobre usuarios reales: ids que ninguna sesión va a presentar nunca y
que, al ser `clerkId` un campo `unique`, dejan el hueco ocupado con basura y
obligan a limpiarlo antes de poder enlazar bien.
**Lo que confirma que las claves son las equivocadas** (`GET /v1/instance` con
el secreto del `.env`, que es **el mismo** que tiene Vercel en Production):

```
environment_type: "development"
id: ins_2mH0ZTsikZ8SSYtT1h3WhwJB5Cd
users count: 11
```

Y `GET /v1/domains` sobre esa instancia lista **dos** dominios: el suyo
(`sacred-shrew-44.clerk.accounts.dev`) y `mercampus.vercel.app`, este último
apuntando a un frontend distinto (`pleased-gobbler-74.clerk.accounts.dev`,
creado 2026-01-28). Es decir, **hay más de una instancia en juego** y el sitio
desplegado carga la de desarrollo: la única clave que aparece en el HTML de
`mercampus.vercel.app/auth/login` es la `pk_test_` de `sacred-shrew-44`.
**Hecho:** `comprobarInstancia()` se ejecuta antes de nada y (a) rechaza una
instancia que no sea `production` salvo `--permitir-desarrollo`, y (b) si la
base ya tiene enlaces, comprueba contra Clerk que pertenezcan a **esta**
instancia, para no mezclar dos. El ensayo y `--check` avisan en vez de plantarse
—diagnosticar es justo para lo que sirven— pero `--apply` se planta antes de
tocar la base, y `--check` sale con código 1.
**Comprobado en real:** el ensayo contra producción imprime el aviso, `--check`
devuelve 1, y los usuarios siguen con **0** `clerkId`. Cinco tests nuevos.
**De paso:** `npm run migrate:clerk-id` no cargaba `.env` (fallo al empaquetarlo
en T-12e). A `npm run seed` **no** se le añade `--env-file` a propósito: que no
cargue sola la URI de producción es una protección, no un olvido.
**Corrección (T-64): sí hay CLI de Clerk — `npm install -g clerk`.** Lo que no
existe es el paquete `@clerk/cli`; el real se llama `clerk` a secas. Se instaló
con `winget`, que reportó éxito pero no escribió nada (la cuenta no es
administradora y el MSI necesita elevación); funcionó el ZIP portátil
descargado directo. `clerk users list --instance prod`, `clerk env pull`,
`clerk config pull` reemplazan buena parte de las llamadas a mano con `fetch`
de este PR — quien retome T-64/T-63 debería usar el CLI en vez de repetir eso.
**Modelo:** `opus` · **Nocturno:** no

### [x] T-64 · Apuntar la aplicación a la instancia correcta de Clerk — INTENTADO Y REVERTIDO
**Corrección (T-12h): la pregunta no era "dónde están las cuentas que faltan".
Las cuentas estaban.** Estaban en la instancia de **producción** de Clerk (70,
confirmadas una a una con `clerk users list --instance prod`, coinciden 100%
con los 76 emails únicos de Mongo). El sitio desplegado autenticaba contra la
de **desarrollo** (11 cuentas).
**Se intentó el cambio completo** (backfill `--apply` contra producción,
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`/`CLERK_SECRET_KEY` de Production a
`pk_live_`/`sk_live_`, webhook nuevo en la instancia de producción, redeploy) y
**tumbó el sitio en producción**: `clerk.mercampus.com` (el Frontend API de esa
instancia) no resuelve, porque está atado al dominio `mercampus.com`, que
**expiró en enero de 2026** y el equipo decidió no renovarlo (sin retorno que
justifique el gasto). Sin ese dominio, ninguna instancia de producción de Clerk
puede cargar en el navegador — **no es un problema de configuración, es que la
instancia de producción no tiene dónde vivir.**
**Revertido de inmediato:** claves de Production devueltas a las de desarrollo,
redeploy, sitio verificado en 200 con `sacred-shrew-44.clerk.accounts.dev`
cargando bien.
**Investigado y descartado:** usar el propio `*.clerk.accounts.dev` de Clerk
como dominio de producción. Confirmado con la documentación oficial de
Clerk — *"Production instances require that you associate a production
domain... You will need to have a domain you own"* — es exclusivo de
instancias `development`, Clerk lo bloquea técnicamente, no es negociable.
**Decisión del equipo, con el dato que la sustenta:** lo más probable es no
tener dominio propio en 1-3 años. La actividad real de usuarios (últimos
registros y último login de un estudiante/vendedor real, no del equipo) se
detuvo en seco el **2025-09-30**; el único acceso posterior fue del equipo
(2025-10-23, 2026-01-26). Con ese dato, **se decide quedar corriendo sobre la
instancia de desarrollo indefinidamente** en vez de perseguir un dominio.
Sigue T-64b para la parte de datos que esto deja pendiente.
**Modelo:** `opus` · **Nocturno:** no

### [ ] T-64b · Recuperación de cuenta para los usuarios de la instancia vieja
**Por qué:** de los 79 `User` en Mongo, **63 solo existen en la instancia de
producción** de Clerk (7 más están en ambas — el equipo probando). Como Clerk
no comparte usuarios entre instancias, esas 63 personas no pueden iniciar
sesión con su cuenta de siempre: si se registran de nuevo en desarrollo, Clerk
les da un `clerkId` nuevo que no es el que ya está en su `User` de Mongo (que
apunta a la instancia de producción), así que el webhook les crea un `User`
**nuevo y vacío** — entran como comprador sin su tienda ni sus productos, que
siguen existiendo pero huérfanos.
**Por qué no se resuelve dentro del webhook:** cruzar por email en el momento
de la escritura es exactamente la fragilidad que T-12c quitó (el email es
mutable y, con el `unique` aún comentado en T-11, ni siquiera único). Con un
puñado de personas a lo largo de 1-3 años, no hace falta automatizarlo — y
automatizarlo sería la clase de "migración de datos en caliente" que la regla 4
de CLAUDE.md pide evitar.
**Bien tratado, esto es reversible en las dos direcciones:** el Backend API de
Clerk **no depende del dominio** — funcionó sin problema durante todo el
incidente de T-64. Los usuarios que nunca se reclamen mantienen su `clerkId`
de producción tal cual (ya se les puso en T-12h/T-12f), listo por si algún día
se recupera un dominio. Solo hace falta re-mapear a quien sí se reclame.
**Hecho cuando:** un script (`scripts/reclaim-account.mjs`, junto a
`backfill-clerk-id.mjs`) que, dado el `clerkId` nuevo de alguien que se acaba
de registrar y su email, busca su `User`/`Seller` viejo entre el snapshot de
las 70 cuentas de producción, y si hay coincidencia exacta de email, actualiza
el `clerkId` del `User` viejo al nuevo (conservando `sellerId`, `role`, y todo
lo demás) en vez de dejar el `User` nuevo y vacío que creó el webhook. Ensayo
por defecto, `--apply` explícito, igual que el resto de `scripts/`. Tests con
Mongo en memoria: caso feliz, caso sin coincidencia (no toca nada), caso con
el `clerkId` nuevo ya usado por otro documento.
**Fuera de alcance a propósito:** una pantalla de autoservicio ("recupera tu
cuenta") no vale la pena para el volumen esperado. Si esto se vuelve frecuente,
reconsiderar.
**Depende de:** T-64
**Modelo:** `opus` · **Nocturno:** no

### [x] T-64c · Google login — ya estaba armado y ya funciona
**Hallazgo, no trabajo:** `ProvidersButton.jsx` ya existe, ya está importado en
`SignInForm.jsx`/`SignUpForm.jsx`, y ya usa `signIn.authenticateWithRedirect`
con `oauth_google` y `oauth_microsoft`. En la instancia de desarrollo, Google
está `enabled: true` con credenciales propias ya configuradas (no las
compartidas de Clerk) — alguien del equipo lo dejó listo hace tiempo.
Verificado sirviendo en `mercampus.vercel.app/auth/login` ahora mismo.
**Por qué nunca se vio funcionar:** hasta este cambio, el sitio corría con las
claves correctas de todos modos (las de desarrollo, sin querer), así que esto
ya funcionaba; simplemente nadie lo probó después de que el dominio de
producción se rompiera y quedara la duda.
**No hay tarea que hacer aquí.** Dejado documentado para que nadie vuelva a
preguntarse si Google login "es cosa de producción" — no lo es, en Clerk
`development` viene con credenciales propias o compartidas sin configurar
nada, y `production` es lo que exige credenciales propias verificadas por
Google.

### [ ] T-62 · Deuda del agente
**Por qué:** el pipeline nocturno también genera deuda: PRs abandonados, ramas
`agent/*` viejas, tareas mal partidas.
**Hecho cuando:** limpieza automática de ramas mergeadas, cierre de PRs sin
actividad, y una revisión mensual del propio roadmap.
**Modelo:** `sonnet` · **Nocturno:** sí
