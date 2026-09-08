# T-67 — findings (full text)

This is the findings list from [PR #275](https://github.com/santig005/Mercampus/pull/275)
("[T-67] UI/UX audit across the app's main screens", merged into
`agent/develop` on 2026-09-07), copied here so it doesn't depend on GitHub
access to read. See [README.md](README.md) for what the screenshots show and
how they were taken.

Findings are numbered F1–F27; a few already have follow-up tasks:
- F1 and F2 (dead ends on unknown product/seller ids) → fixed in T-90.
- F5 (no visible focus indicator) → fixed in T-86.
- F16 (`/about` sticky header has no background) → fixed in T-87.
- F21 (marketplace reuses the antojos placeholder) and F22 (dangling
  greeting) → fixed in T-88.
- F26 (sidebar's current item is not a link) → fixed in T-89.
- F17 (`/about` hero unreadable in dark) → fixed in T-75.
- The "authenticated screens not covered" gap → T-84 (signed-in Playwright
  fixture), filed but not yet done.

The rest have no task yet. To act on one, write it up as a normal ROADMAP
entry (one screen/behavior, one PR) and reference its F-number.

---

## Findings

Numbered so follow-up tasks can cite them. Every one was observed on a build
served on its own port, and the ones that could have been flakes were re-checked
(see *Caveats*).

### A. Dead ends and broken states

**F1 — `/antojos/<unknown id>`: a whole product page rendered from nothing.**
An id that does not exist returns HTTP 200 and paints the full product chrome
with empty data: no name, `$ NaN` in the price bar, a "No disponible" badge, a
broken image, "No hay horarios disponibles", and a live **"Contactar por
WhatsApp"** button. There is no way back except the browser's back button.
*Fix:* resolve the product server-side (the page already reads it for
`generateMetadata` since T-69) and `notFound()` when it is missing. Never render
the WhatsApp CTA without a product.
`deadend-product-bad-id__desktop__light.png`

**F2 — `/antojos/sellers/<unknown id>`: spinner forever.**
The console logs `Error fetching seller: {detail: Seller not found}` and the UI
never resolves — no error, no empty state, no exit. Reproduced on both viewports
and both themes. *Fix:* same as F1.
`deadend-seller-bad-id__desktop__light.png`

**F3 — a shared or reloaded search URL silently loses the search.**
`/antojos?product=zzzzqq` returns the complete listing, with an empty search box,
and the param disappears from the URL. `SearchBox` pushes a URL rebuilt from its
own (empty) state on mount, wiping the `product` param that `ProductGrid` reads
one line later. So the search box writes a URL that the app cannot read back —
shared links and reloads both break. *Fix:* seed `SearchBox`'s state from the
`product` param and skip the push on the first render.
`shared-search-url__desktop__light.png`

### B. Accessibility

Lighthouse sits at 0.71–0.93 depending on the page. These are the reasons.

**F4 — no `h1` on any main screen.** Listing, product detail, seller profile,
seller directory, marketplace and both auth screens have zero `h1`; product and
business names are `h2`. The auth screens open with `h3 ¡Atención!` (a hidden
modal, see F9) *before* `h2 Inicia Sesión`, so the outline starts at level 3.
Only `/about`, `/antojos/pqrs` and the game have one.

**F5 — no visible focus indicator.** Tabbing through the listing, the focused
element computes to `outline: solid 2px rgba(0, 0, 0, 0)` — a fully transparent
outline — with no ring shadow: university selector, category chips, sort control,
cards. Keyboard users cannot see where they are. *Fix:* one token-based
`:focus-visible` ring in the global stylesheet.

**F6 — the first two tab stops are invisible.** Both are the drawer toggle
checkboxes (`#my-dibujador`). Every keyboard visit starts on something that is
not on screen. *Fix:* take them out of the tab order and make the hamburger a
real button.

**F7 — icon-only controls with no accessible name.** Header account/login link,
modal back and close buttons, the favourite (heart) button, the auth back arrow.
A screen reader announces "button". *Fix:* `aria-label` on each.

**F8 — form fields with no associated label.** Login e-mail/password, register
name/e-mail, PQRS e-mail and description. PQRS *shows* label text, but it is a
`<p>`, not a `<label for>`, so the association does not exist. Everything else
leans on `placeholder`, which disappears as soon as you type.

**F9 — closed modals stay in the page's text and accessibility tree.** The
listing's product modal is always mounted, and while closed it computes to
`display: grid; visibility: visible; opacity: 0` with no `aria-hidden`. Result:
**"Algo salió mal, por favor intente de nuevo" is part of `document.body.innerText`
on every successful listing load** — an error message a screen reader can reach
on a page where nothing went wrong. Same pattern puts "¡Atención!" on the auth
screens and "Compartir producto / Copiar enlace" on every detail page. *Fix:*
render the modal only when it has content, or mark it `aria-hidden` + `inert`
while closed.

**F10 — duplicate DOM id.** `seller_modal` appears twice on the seller profile,
and the modals are opened with `document.getElementById(...).showModal()`, so the
call can hit the wrong dialog.

**F11 — contrast below WCAG AA (measured, not eyeballed).**

| Where | Ratio | Needs |
| --- | --- | --- |
| "Disponible" badge, every product card, both themes | **1.75:1** @10px | 4.5 |
| "No disponible" badge | 4.11:1 light / 3.46:1 dark | 4.5 |
| White on brand orange `#F97316` — every filled CTA (`Únete ahora`, `Explorar Productos`, `Síguenos en Instagram`, the step numbers, `¡Comenzar Juego!`) | **2.8:1** | 4.5 (3 for large) |
| "Español" language link on `/about` | 3.35:1 | 4.5 |
| Yellow "maestros" on the sellers banner gradient | ~1.9:1 | 3 |

*Fix:* repick the badge colour pair, and settle on a darker orange (or dark text)
for filled buttons — the same orange is used for "Contactar por WhatsApp", the
app's main conversion action.

**F12 — one title for most of the site.** `/antojos`, `/marketplace`, the seller
directory, PQRS and both auth screens all render `<title>Mercampus</title>`. The
detail pages have real titles (T-69/T-76); nothing else does.

### C. Layout and responsive

**F13 — desktop is the mobile layout stretched.** At 1280px the listing is one
full-width card per row with a 128px thumbnail and a vast empty right side; the
schedule tables span the full width; the seller directory shows a single card at
the far left under a full-bleed banner and a centred toggle; the login and
register inputs are ~1230px wide. *Fix:* a max-width container plus a responsive
grid (`sm:grid-cols-2 lg:grid-cols-3`).
`listing__desktop__light.png`, `seller-directory__desktop__light.png`,
`login__desktop__light.png`

**F14 — seller profile on desktop.** The avatar scales into a ~650px-tall hero;
the sticky action bar (Instagram / WhatsApp / Recomendar) is a narrow centred
card floating over the product list, and the last cards sit underneath it with no
bottom padding to clear it. *Fix:* cap the avatar, give the bar the page's
max-width, pad the bottom by its height.
`seller-profile__desktop__light.png`

**F15 — the category rail is clipped with no affordance.** At 1280px "Comida
rápida" and "Otros" are cut off at the right edge: no arrows, no fade, no
scrollbar. On mobile the horizontal scroll is the expected pattern; on desktop
there is room to wrap.

**F16 — `/about`: the sticky header has no background,** so once you scroll the
wordmark and the language switcher sit directly on top of the section text.
`about-header-overlap__desktop__dark.png`

### D. Dark mode (T-73 / T-75 gaps)

**F17 — the `/about` hero never moved to daisyUI tokens.** In dark mode the hero
keeps its light gradient while the text switches to near-white: the "Mercampus"
title, the subtitle, the body copy, the "Explorar productos" button label and the
stats row are all effectively invisible. The rest of the page is fine — it is the
hero only. This is the "nobody looked at /about in dark" case, confirmed.
`about__desktop__dark.png` vs `about__desktop__light.png`

**F18 — cards barely separate from the background in dark.** Product and seller
cards land almost exactly on the page colour; the "No disponible" badge drops to
3.46:1. *Fix:* raise the card surface (`base-200`/`base-300`) or add a border.
`listing__desktop__dark.png`

**F19 — auth screens in dark.** Inputs keep their hardcoded light `#f0f5fa`
(bright white boxes on a dark card), and the disabled "Iniciar Sesión" button is
dark grey text on dark grey — unreadable until both fields are filled. It is
low-contrast in light mode too.
`login__desktop__dark.png`

**F20 — `?theme=dark` does not survive a redirect.** `/` → `/antojos` and any
gated route → `/auth/login?redirect_url=...` drop the query string, so a link
shared "already in dark" lands in light. Minor, but sharing is what the override
is for.

### E. Copy and content

**F21 — marketplace reuses the antojos placeholder:** the search box on
`/marketplace` says "Busca tu antojo más deseado".

**F22 — dangling greeting.** Signed out, the listing reads "Hola, calma tus
antojos" — the comma is there for a name that never comes.

**F23 — empty states have no way out.** Filtering by a category with no products
gives "No se encontraron productos", while the section title still says "Todos"
and the "Galletas" chip is selected. *Fix:* reflect the active filter in the
title and offer "Ver todos".
`empty-category__desktop__light.png`

**F24 — the PQRS form.** "Descripción" is a single-line `input[type=text]` for
free-form text; the labels above the fields alternate weight and style ("Correo
Electrónico" light, "Tipo de Solicitud" bold); the primary "Enviar" is the small
button bottom-right while the secondary WhatsApp button is the large one
bottom-left.
`pqrs__desktop__light.png`

**F25 — inverted hierarchy on the detail pages.** The product name renders
smaller than the "Horario" section heading below it, and the description is a
low-contrast grey — the two things the buyer came for are the quietest text on
the page.
`product-detail__desktop__light.png`

**F26 — the sidebar's current item is an `<a>` with no `href`.** Not focusable,
and nothing marks it as current for a screen reader. *Fix:* keep the link and add
`aria-current="page"`.

**F27 — no fallback for a failed image.** Before the audit stubbed the seed's
image host, cards showed the browser's broken-image icon with the alt text
spilling across the layout. A real product whose ImageKit/Cloudinary URL dies
looks exactly like that today.

## Scope not covered

**The authenticated screens the ticket asks for are missing: seller
registration, profile edit, product CRUD, schedules, admin.** Playwright has no
Clerk session, so all of them redirect to `/auth/login` — I could confirm the
gate works and nothing more. Auditing them needs a signed-in fixture (Clerk
testing tokens or a saved `storageState`) built first, which is its own task; I
did not open it unilaterally.

Also outside this pass: `/antojos/game`, and anything behind a real WhatsApp or
Instagram click-out.

## Suggested follow-ups

Roughly in the order I would take them:

1. **404s for unknown product/seller ids** (F1, F2) — the only findings that can
   send a buyer to a WhatsApp chat about a product that does not exist.
2. **Search survives a URL** (F3).
3. **Focus ring + accessible names + labels** (F5, F6, F7, F8) — one pass, big
   Lighthouse move.
4. **Contrast pass on badges and filled CTAs** (F11).
5. **Desktop grid for the listings and the directory** (F13, F14, F15).
6. **`/about` hero in dark + sticky header** (F17, F16).
7. **Closed modals out of the a11y tree** (F9, F10).
8. **`h1` and per-page titles** (F4, F12).
9. **Signed-in Playwright fixture**, then the seller-side half of this audit.

