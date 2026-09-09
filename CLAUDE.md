# CLAUDE.md — Mercampus

Contexto y reglas para cualquier agente que trabaje en este repositorio.
Manténlo corto: se lee en cada ejecución y cuesta tokens.

## Qué es esto

Marketplace de comida entre estudiantes universitarios (Colombia). Next.js 14
App Router + MongoDB (Mongoose) + Clerk para autenticación. Desplegado en Vercel.

El proyecto está en modo **rehabilitación**: se prioriza corrección, seguridad y
calidad del código sobre nuevas funciones.

**Corrección importante (T-12f): aquí decía "no hay usuarios en producción" y es
falso.** Medido contra la base real: **54 vendedores, 79 documentos de usuario y
11 cuentas de Clerk**, y los nombres coinciden con los que sirve
mercampus.vercel.app. Además, **el `.env` local apunta a esa misma base de
producción**, no a un cluster de desarrollo: `npm run seed` la borraría entera
(por eso exige `--yes` fuera de localhost — no le quites esa guarda).

**Y no hay separación de entornos (T-12g):** Production, Preview y Development
comparten **la misma base de Mongo** y **la misma instancia de Clerk**. Los
deployments de preview escriben en producción. Antes de tocar datos, haz
`npm run backup:db` (vuelca a `backups/`, que está ignorado). Ver T-63.

**Ojo con Clerk (T-12h):** hay más de una instancia. Las claves del `.env` y las
del entorno Production de Vercel son de una de **desarrollo** (11 cuentas); la
de producción tiene ~70. Un `clerkId` solo vale dentro de su instancia, así que
**antes de escribir cualquier `clerkId` comprueba con qué instancia hablas**:
`GET https://api.clerk.com/v1/instance` devuelve `environment_type`. Ver T-64.

## Reglas duras

1. **Nunca hagas push ni merge a `main` ni a `develop`.** El trabajo del agente
   se integra en `agent/develop`. Saca `agent/<id-tarea>` desde `agent/develop`,
   abre el PR hacia `agent/develop` y mergéalo tú mismo **solo** con el check
   `quality` en verde: nunca en rojo ni pendiente. La promoción
   `agent/develop → develop` la revisa y mergea un humano.
2. **Una tarea del ROADMAP por ejecución.** No agrupes. Un PR pequeño y
   revisable vale más que uno grande y correcto.
3. **Si no puedes verificar el cambio, no lo hagas.** Cada PR debe pasar
   `npm run verify`. Si la tarea no es verificable todavía, escoge otra.
   **Para color, tema o layout, "verificado" significa una captura real,
   no un test que solo lee el string de la clase.** Pasó en T-100: el test
   comprobaba que `bg-primary` apareciera en el código, y pasó en verde
   mientras esa clase renderizaba casi blanco (ver la convención de abajo).
   Si no puedes tomar la captura en esta sesión (falta `.env`, no hay
   navegador), dilo explícito en el PR — no lo des por verificado.
4. **No inventes migraciones de datos en caliente.** Nada de `updateMany` en
   handlers de lectura. Los scripts de migración van en `scripts/`.
5. **No borres código que no entiendas.** Si algo parece muerto, confírmalo con
   una búsqueda de referencias y déjalo anotado en el PR.
6. **Secretos:** jamás en el código, jamás en logs, jamás en tests.
7. **Confirma que un archivo se usa antes de diseñar alrededor de él.**
   Si algo bloquea el build o parece importante, busca sus importadores
   en todo src/ antes de proponer arreglarlo. Podría ser código muerto.
8. **Pregúntate siempre qué pasa con los datos que ya existen.** Un cambio puede
   estar perfecto para los datos nuevos y dejar fuera a todos los que ya
   estaban. Si tocas la forma de un documento, un índice, o la clave con la que
   se identifica a alguien: mídelo contra la base real (solo lectura), escribe
   la migración en `scripts/` con ensayo por defecto, y déjala anotada como
   requisito para promover a `develop`. Pasó en T-12c: el código era correcto y
   habría bloqueado a las 11 cuentas reales.

## Comandos

```bash
npm run dev        # desarrollo
npm run build      # build de producción
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit (a partir de T-05)
npm run test       # Vitest unitarios
npm run test:e2e   # Playwright
npm run verify     # lint + typecheck + test + build. DEBE pasar antes del PR.
```

## Modelo y effort

Cada tarea del ROADMAP trae un **Modelo** sugerido y una marca **Nocturno**.

- **Modelo** = qué tan capaz. Súbelo cuando el agente tenía todo el contexto,
  claramente lo intentó, y aun así se equivocó.
- **Effort** = qué tan a fondo trabaja en el turno. Súbelo cuando el error fue
  saltarse un archivo, no correr los tests o abandonar a medias. Usa el effort
  por defecto salvo que tengas razón para lo contrario.

`sonnet` para trabajo rutinario y descriptible, `opusplan` para arquitectura en
sesión interactiva, `opus` para seguridad y bugs sutiles. `opusplan` no aplica en
el workflow nocturno: el modo plan solo existe en sesión interactiva.

El agente programado toma **únicamente** tareas marcadas `Nocturno: sí`. Si
ninguna aplica, termina sin abrir PR en vez de inventar trabajo.

## Convenciones de código

- **Server Components por defecto.** `'use client'` solo cuando haya estado,
  efectos o handlers de eventos. Si un componente solo muestra datos, es server.
- **Nada de fetch a la propia API desde el servidor.** Un Server Component
  consulta Mongo directo mediante `src/server/`; las mutaciones usan Server
  Actions. `NEXT_PUBLIC_URL + '/api'` es un antipatrón aquí y se está eliminando.
- **Validación en el borde.** Todo body y todo query param pasa por un schema de
  Zod antes de tocar Mongoose. Nunca `new Model(body)` con datos crudos.
- **Autorización explícita.** Toda ruta o acción que muta datos verifica
  identidad y propiedad. Si ves una verificación comentada, es un bug, no una
  decisión.
- **Sin `console.log` en código que se mergea.** Usa el logger de
  `src/lib/logger`.
- **`bg-primary` no es el naranja de marca.** `public/css/main.css` (línea 62)
  define `.bg-primary { @apply bg-[#f8f8f8]; }`, que gana por orden de cascada
  sobre la utilidad de Tailwind/daisyUI del mismo nombre — en **toda la app,
  en los dos temas**. Para una superficie naranja de marca usa
  `bg-primary-orange` (el que ya usan `Loading`, `ProfileChecklist`,
  `Carousel`; no cambia entre temas, ninguno de esos lo hace). Causó una
  regresión real en T-100: tarjeta y texto casi invisibles en modo claro,
  mergeada con `quality` en verde porque el test solo miraba el string, no el
  render (ver `docs/audits/t-100/README.md`).
- **Nombres y comentarios en inglés en el código y en el ROADMAP.** Decisión
  2026-09-05 (ver T-66): antes decía "comentarios en español"; se revirtió
  porque el portafolio y cualquier colaborador externo leen inglés, no
  español. El copy de producto (lo que ve el estudiante en la UI) sigue en
  español por defecto — es un idioma de negocio, no de código — con inglés
  disponible donde ya se migró a `next-intl` (ver T-46). El español queda
  para la conversación con el humano, no para lo que se escribe en el repo.

## Estructura objetivo

```
src/
  app/            rutas (páginas + API que sobreviva)
  components/     UI. Sin acceso a datos.
  server/         acceso a datos y lógica de negocio. Solo servidor.
  lib/            utilidades puras, validadores Zod, logger
  models/         schemas de Mongoose (movidos desde utils/models)
scripts/          migraciones y tareas de una sola vez
tests/            unitarios (Vitest) y e2e (Playwright)
```

## Cómo reportar en el PR

**En inglés: título, cuerpo, mensajes de commit y comentarios en issues.**
Es la misma decisión de T-66 y por la misma razón — un PR es lo primero que
lee un colaborador externo o alguien mirando el portafolio. Esta sección
estaba escrita en español y con la plantilla en español, así que el agente
la seguía al pie de la letra y escribía PRs en español mientras traducía el
código; corregido el 2026-09-07.

En español queda solo: la conversación con el humano, el copy de producto
(lo que ve el estudiante en la UI) y los nombres de rutas ya existentes
(`/antojos`).

Title: `[T-XX] short description`

Body:
- What changed and why (2-3 lines).
- What was verified (`npm run verify` output).
- Playwright screenshots if you touched the UI.
- Risks or anything left pending.
- Mark the task in `ROADMAP.md` in the same PR.

## Qué NO hacer sin preguntar

- Cambiar de proveedor de autenticación, base de datos o hosting.
- Introducir dependencias nuevas pesadas (>1 por PR, y justifícala).
- Reescrituras masivas. Si una tarea toca más de ~15 archivos, pártela y
  anótalo en el ROADMAP en vez de ejecutarla.
