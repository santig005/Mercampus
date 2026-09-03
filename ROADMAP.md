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
**Hecho cuando:** o se elimina la ruta (una vez el webhook funcione de verdad) o
se protege y valida; índice único en `email` restaurado con migración previa de
duplicados en `scripts/`.
**Modelo:** `sonnet` · **Nocturno:** no (implica decidir si se borra la ruta)

### [ ] T-11b · Sacar `NEXT_PUBLIC_PRIVATE_KEY_IMAGEKIT` del bundle del cliente
**Por qué:** una clave privada con prefijo `NEXT_PUBLIC_` la inyecta Next
en el bundle del navegador. Cualquiera con DevTools la ve.
**Hay dos, no una:** `NEXT_PUBLIC_CLOUDINARY_API_SECRET` tiene el mismo problema
(`src/utils/cloudinary.js`). Encontrada al escribir `.env.example` en T-03.
**Hecho cuando:** la variable se renombra sin el prefijo (`IMAGEKIT_PRIVATE_KEY`),
se mueve a un Server Action o route handler donde se necesite, y el
build confirma que no aparece en ningún chunk del cliente.
**Modelo:** `sonnet` · **Nocturno:** no

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
**Modelo:** `sonnet` — repetitivo y con criterio claro
**Nocturno:** sí

### [ ] T-13b · Terminar la validación con Zod
**Por qué:** T-13 cubrió productos y vendedores. El resto de endpoints sigue
aceptando lo que mande el cliente.
**Hecho cuando:** schemas para `POST /api/sellers`, horarios, pqrs y usuarios,
con sus tests de payload inválido. `POST /api/register` va aparte porque su
existencia la decide T-11.
**Depende de:** T-13
**Modelo:** `sonnet` · **Nocturno:** sí

### [ ] T-14 · Endpoints muertos y rotos
**Por qué:** el PUT y DELETE de `api/sellers/route.js` usan `req.query`, que no
existe en App Router: nunca funcionaron. `api/sellers/availability` está
comentado entero, así que la disponibilidad automática por horario no funciona.
**Hecho cuando:** los handlers muertos se eliminan; se decide si la
disponibilidad automática se restaura como cron de Vercel (y entonces
`allowedIPs.js` se reemplaza por un `CRON_SECRET`) o se elimina junto con el
archivo. La decisión queda escrita en el PR.
**Modelo:** `opusplan` — hay una decisión de producto de por medio
**Nocturno:** no

### [ ] T-15 · Errores tipados y logger
**Por qué:** 169 `console.log` en el código, mensajes de error inconsistentes,
`AppError` usado en un sitio donde ni siquiera está importado
(`api/products/[id]` DELETE).
**Hecho cuando:** un helper de respuesta de error único; logger con niveles que
no imprime en test; cero `console.log` fuera de `scripts/`.
**Modelo:** `sonnet` · **Nocturno:** sí

### [ ] T-15b · Corregir formato de moneda y teléfono
**Por qué:** `priceFormat` usa `en-US` con `currency: 'USD'` en un
marketplace colombiano (`1500 → '$1,500'` en vez de `'$1.500'`).
`formatPhone` rompe con indicativo de país.
**Hecho cuando:** `priceFormat` usa `es-CO` con `currency: 'COP'`;
`formatPhone` maneja correctamente el prefijo `+57`; los tests
de T-02 actualizados para reflejar el comportamiento correcto.
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

### [ ] T-33 · Deduplicar componentes
**Por qué:** `ProductCard`/`ProductCardAV` difieren en 32 líneas,
`SellerCard`/`SellerCardAV` en 10, `TableSche`/`TableSchema` en 63.
**Hecho cuando:** un componente por concepto con prop `variant`; los duplicados
eliminados; e2e confirma que nada cambió visualmente.
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

### [ ] T-45 · Reseñas
**Hecho cuando:** calificación por pedido completado (no por producto suelto,
para evitar reseñas falsas), promedio en la tarjeta del vendedor, moderación
básica.
**Depende de:** T-40
**Modelo:** `opusplan` · **Nocturno:** no

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

### [ ] T-62 · Deuda del agente
**Por qué:** el pipeline nocturno también genera deuda: PRs abandonados, ramas
`agent/*` viejas, tareas mal partidas.
**Hecho cuando:** limpieza automática de ramas mergeadas, cierre de PRs sin
actividad, y una revisión mensual del propio roadmap.
**Modelo:** `sonnet` · **Nocturno:** sí
