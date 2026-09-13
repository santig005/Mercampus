# T-67 — findings (full text)

This is the findings list from [PR #275](https://github.com/santig005/Mercampus/pull/275)
("[T-67] UI/UX audit across the app's main screens", merged into
`agent/develop` on 2026-09-07), copied here so it doesn't depend on GitHub
access to read. See [README.md](README.md) for what the screenshots show and
how they were taken.

**Two halves, one numbering.** F1–F27 below are the public screens (T-67,
2026-09-07). F28–F53, in [the second half](#t-94--the-seller-screens-2026-09-08)
at the end of this file, are the seller screens (T-94, 2026-09-08) — the part
T-67 could not reach until T-84 built a signed-in fixture. An F-number means the
same thing in both.

Findings are numbered F1–F27 in this first half; a few already have follow-up
tasks:
- F1 and F2 (dead ends on unknown product/seller ids) → fixed in T-90.
- F3 (a shared search URL loses the search) → fixed in T-92.
- F5 (no visible focus indicator) → fixed in T-86.
- F7 (icon-only controls with no name) and F8 (fields with no label) →
  fixed in T-93.
- F16 (`/about` sticky header has no background) → fixed in T-87.
- F21 (marketplace reuses the antojos placeholder) and F22 (dangling
  greeting) → fixed in T-88.
- F26 (sidebar's current item is not a link) → fixed in T-89.
- F17 (`/about` hero unreadable in dark) → fixed in T-75.
- The "authenticated screens not covered" gap → closed. T-84 built the
  signed-in fixture and T-94 walked the screens: F28–F53 at the end of this
  file. Only `/admin/*` is still unaudited (T-95).

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

*(2026-09-08: the fixture is T-84 and the walkthrough is T-94 — F28–F53 at the
end of this file. Everything above stands as written; only `/admin/*` is still
unaudited.)*

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


---

# T-94 — the seller screens (2026-09-08)

The other half of this audit. T-67 asked for these screens and could not reach
them; T-84's signed-in fixture opened the door and this pass walked through it.
Numbering continues from F27 because it is the same audit, not a new one — see
[README.md](README.md) for the harness and for what the new screenshots show.

Screens walked, desktop (1280x900) and mobile (390x844), light and dark:

| Route | Shots |
| --- | --- |
| `/antojos/sellers/register` | `seller-register__*` |
| `/antojos/sellers/approving` | `seller-approving__*` |
| `/antojos/sellers/profile/edit` | `seller-profile-edit__*` |
| `/antojos/sellers/schedules` | `seller-schedules__*`, `schedules-empty-row__*` |
| `/antojos/sellers/products/edit` | `seller-products__*` |
| `/antojos/sellers/products/edit/[id]` | `product-edit__*`, `deadend-product-edit-bad-id__*` |
| `/antojos/product/add` | `product-add__*` |

**Not walked: `/admin/*`.** The fixture account is a seller, and the admin role
lives in Clerk's `publicMetadata` (T-12), so the session cannot reach it. That
is its own task, not this one — see T-95 in the ROADMAP for why.

---

## Findings

### A. Dead ends and broken states

**F28 — the product edit screen fails to one bare line of text.**
`/antojos/sellers/products/edit/<id>` with an id that is not yours, or does not
exist, renders `Error al cargar los detalles del producto.` as a naked paragraph:
no header band, no form, no link back, and the URL still says you are editing a
product. Both cases were reproduced and look identical on screen. Measured
causes, which are two different bugs behind one symptom:

- an unknown id: `GET /api/products/<id>` answers a clean `404`, and the client's
  `catch` sets the error string.
- **another seller's product: the API answers `500`.** `GET` populates the owner
  with `match: { approved: true }`, so for a product whose seller is not approved
  the populate yields `null` and the next line reads `product.sellerId._id`
  (`Cannot read properties of null (reading '_id')`, in the server log). The
  page's own ownership check (`response.sellerId._id !== seller._id`, which
  redirects to `/antojos`) is never reached, because the request never returns.
  This is not only about other people's products: **an approved seller who is
  later un-approved can no longer open any of their own.**

*Fix:* same shape as F1/F2 — resolve the product server-side, `notFound()` when
it is missing, `403` when it is not yours, and guard the populate result before
dereferencing it.
**Fixed in T-97**, with one deviation: missing and not-yours render the same
404 rather than a distinguishable 403 — a page cannot answer 403 in Next 14,
and a shared answer does not confirm that somebody else's product id exists.
The real 403 is still on PUT/DELETE. See the T-97 entry for the measurement
(17 of 112 products) and for the correction to the last paragraph above.
`deadend-product-edit-bad-id__desktop__light.png`

**F29 — a malformed id returns 500 with the Mongoose error in the body.**
`GET /api/products/not-an-id` answers `500 {"message":"Error getting product",
"error":"Cast to ObjectId failed for value \"not-an-id\" (type string) at path
\"_id\" for model \"Product\""}`. The client is handed the internal model name
and the driver's message. *Fix:* validate the id at the edge (Zod, like every
other param) and answer `400`; never pass a driver message to the client.
**Fixed in T-97**, in all three handlers: the PUT and the DELETE passed the
same unvalidated id to `verifyOwnershipAndGetSellerId` and leaked the same
CastError.

**F30 — `/antojos/sellers/approving` is the one seller route the middleware does
not match.** `isProtectedRoute` in `src/middleware.js` lists `register`,
`profile/edit`, `products/edit`, `schedule` and `product/add`, but not
`approving`. Measured signed out: the other routes are already at
`/auth/login?redirect_url=...` by `DOMContentLoaded`, while `approving` renders
itself first and only lands on `/auth/login` about a second later, when
`useCheckSeller` runs on the client — **and with no `redirect_url`**, so signing
in does not bring the visitor back. *Fix:* add the route to the matcher.

**F31 — three destructive actions, no confirmation, no undo.**

- The `✕` on an uploaded image (`ImageGrid`) calls `DELETE /api/images`
  immediately, on the click, **before the form is saved** — so abandoning the
  edit does not bring the picture back. The button has no accessible name beyond
  the `✕` character, and its failure path is `alert()`.
- `Eliminar Producto` on the product edit screen calls `deleteProduct` straight
  from the click handler.
- `Eliminar` on a schedule row drops it with no way back. That one is local
  state until `Guardar horarios`, with nothing on screen saying so.

Read from the code, not fired in this pass: the first two write to ImageKit and
to the database, and an audit should not do that.
*Fix:* a confirmation step on the two that delete remotely, and either an undo or
an explicit "not saved yet" marker for the schedule row.

### B. Accessibility

**F32 — every availability switch is a checkbox with no name.** `ToggleSwitch`
renders a bare `<input type=checkbox>` inside a `<label>` that contains nothing
else, so there is no text to name it from. Counted: 19 on
`/antojos/sellers/products/edit` (1 for the seller, 18 for the products), 2 on
the profile form, 1 on the product edit form. Tabbing the product list, **every
one of the twenty stops after "Añadir Producto" is an unnamed checkbox** — a
screen reader user gets twenty identical controls with no way to tell which
product each belongs to, for the switch that decides whether that product is on
sale. The visible word "Disponibilidad" beside each one is a `<p>`.
*Fix:* an `aria-label` naming the product (and the state), or a real
`<label for>`.

**F33 — the product cards are `<div onClick>`, so editing a product is
mouse-only.** The card wrapper carries the click handler and no `role`, no
`tabIndex`, no `href`. It never receives focus: the tab order goes from
"Añadir Producto" straight into the toggles. Keyboard and screen-reader users can
flip a product's availability but cannot open it to change its price,
description or photos. *Fix:* make the card a `<Link>` to
`/antojos/sellers/products/edit/<id>`, which is what the handler does anyway.
`seller-products__desktop__light.png`

**F34 — the schedules screen has no labels at all.** The day `<select>` has no
accessible name; neither `<input type=time>` has one — "Hora Inicial" and "Hora
Final" are `<label>` elements with no `for` and no wrapping, exactly the F8
pattern T-93 fixed elsewhere. A screen reader announces three unnamed controls
per row, three rows deep.

**F35 — the first two tab stops are still the invisible drawer checkboxes** (F6),
on every one of the seven screens. Every keyboard visit to the seller area starts
on something that is not on screen.

**F36 — the closed error dialog is in the page text *and* in the tab order.**
On `/antojos/product/add` the `<dialog id="errors">` is always mounted; with no
error it computes to `display: grid; visibility: visible; opacity: 0`, with no
`aria-hidden` and no `inert`. Measured: `¡Atención!` is part of
`document.body.innerText` on a clean form, and the dialog's close button is
**tab stop 6** — before the first field. This is F9 on a screen where it also
steals a tab stop.

**F37 — duplicate DOM id `:r3:` on the profile-edit and register forms.** Two
elements share it: the `instagramUser` input (from `InputFields`' `useId`) and a
bare `<div id=":r3:">` that is a direct child of `<body>` — a portal container
from another React tree, which numbers its own ids from scratch. The
`<label for=":r3:">Usuario de Instagram</label>` resolves by document order, and
today that is the input, so it still works; the document is invalid either way
and the collision is not under our control. Same family as F10.
*Fix:* pass an explicit id prefix to `InputFields` instead of a bare `useId`.

**F38 — the only two controls with no focus ring are react-select's.** Measured
while focused: every native field and button on these screens paints
`outline: solid 2px` (T-86 works here), but the "Sección" and "Categoría"
comboboxes on both product forms compute `outline: none 0px` — react-select ships
its own reset and T-86's rule never reaches it. Tabbing through the add-product
form, focus disappears for two stops and comes back.

**F39 — the heading outline is wrong on all seven screens.** No `h1` at all on
profile edit, register, product add and product edit: they open at `h2`.
`/antojos/sellers/schedules` opens with `h2 Agrega horarios` and *then* an
`h1 Tus horarios`. `/antojos/sellers/products/edit` runs `h1 → h2 → h3 → h2`,
because the section band ("🍕 Antojos") is an `h3` while each product name inside
it is an `h2`. `/antojos/sellers/approving` has **two** `h1`. F4 said the public
screens have no `h1`; the seller screens have them in the wrong order instead.

**F40 — `<title>` is `Mercampus` on all seven** (F12). Nothing in a browser tab
or history tells "edit my profile" from "add a product".

**F41 — the signed-in seller's only header control is announced in English.**
Clerk's `<UserButton>` renders its trigger with the accessible name
"Open user menu" in an interface that is otherwise entirely Spanish, despite
`localization={esMX}` in the root layout. *Fix:* set the key through Clerk's
`localization`, or pass an explicit label.

### C. Layout and responsive

**F42 — on a 390px screen the schedule's end time is cut off the page.**
Measured: the row's content is 411px wide inside a 279px box, and the second
`input[type=time]` is laid out from x=311 to x=467 — 77px past the 390px
viewport — inside a container whose computed `overflow-x` is `hidden`. There is
no horizontal scroll to reach it. The field stays usable only because the visible
sliver happens to include the hour: the value reads `04:00 p` and stops.
`seller-schedules__mobile__light__bottom.png`

**F43 — desktop is the mobile layout stretched, again (F13).** Every field on
every seller form is a single 1232px-wide column: the business name, the slogan,
the price. Above them the `#393939` band is `h-1/4` of the viewport — about 226px
of empty dark space on desktop for one line of title and one of subtitle,
repeated identically on five screens. The one screen that does lay out for
desktop is `/antojos/sellers/products/edit`, which has a real
`md:grid-cols-2 lg:grid-cols-3` grid.
`seller-profile-edit__desktop__light.png`

**F44 — the forms are one and a half to two screens tall and nothing says so.**
`components/layout/Layout.jsx` scrolls the content in an inner container that
also carries `hide-scrollbar`, and each form's card is `absolute` inside an
`h-dvh` wrapper, so the document itself never grows. Measured content vs
viewport: profile edit 1539/836, register 1171/836, product edit 1245/836,
product list on mobile 3440/780. On desktop there is no scrollbar anywhere on the
page to say the form continues below the fold — and the submit button is always
at the bottom of it. (It is also why every full-page screenshot here is exactly
one viewport tall, and why half of them are `__bottom` shots.)

### D. Dark mode

**F45 — in dark mode a seller cannot read their own data.** `InputFields`
hardcodes `bg-[#f0f5fa]` on every input and textarea while the text colour comes
from the theme. Measured on the profile form in dark: `businessName`, `slogan`,
`description`, `instagramUser` and `phoneNumber` all render
`oklch(0.92822 0.013168 71.3245)` on `rgb(240, 245, 250)` — **1.13:1**. The saved
values ("Arepas El Parche", "De la plancha a tu clase", the phone number) are
ghosts on white panels. This is F19's root cause (the auth screens) reaching five
more forms, and here it hits the *values*, not just the chrome.
`seller-profile-edit__desktop__dark__bottom.png`

**F46 — react-select ignores the theme.** The "Sección" and "Categoría"
comboboxes stay pure white with dark text in dark mode, beside the `#f0f5fa`
inputs and the themed page: three different surface colours in one form.
`product-add__desktop__dark.png`

**F47 — `/antojos/sellers/approving` has no dark mode at all.** It hardcodes
`bg-[#F2F2F2]` for the page and `bg-[#FF7622]` for the card, so the screen is
pixel-identical in both themes. It also holds the worst contrast measured in this
pass: white on `#FF7622` is **2.67:1** for the heading and the body copy, and the
WhatsApp button is white on `#22C55E` at **2.28:1**.
`seller-approving__desktop__light.png`

**F48 — contrast below WCAG AA on the seller screens (measured, not eyeballed).**
F11 found these colours on the public half; this is where they land on this one.
Every row was computed against the real composited background.

| Where | Ratio | Needs |
| --- | --- | --- |
| Filled CTAs — `Guardar Cambios`, `Registrar Negocio`, `Añadir Producto`, `Subir Producto`, `+ Agregar horario` (white on `#FF7622`) | **2.67:1** | 4.5 |
| `Eliminar Producto` (`.btn-danger`) | 3.24:1 light / 3.66:1 dark | 4.5 |
| Category chips on the product cards | 2.20:1 | 4.5 |
| "Disponible" badge | 1.85:1 light | 4.5 |
| "No disponible" badge | 4.34:1 light / **2.72:1 dark** | 4.5 |
| Sidebar's current item (orange on its own tint) | 2.19:1 | 4.5 |
| `¡Atención!` inside the closed dialog, dark | 1.04:1 | 4.5 |
| `Guardar horarios` (`.btn-secondary`) | 3.97:1 | 4.5 |

`.btn-danger` deserves its own line: a bespoke class in `public/css/main.css`
(line 53), used exactly once, for the most destructive button in the app, and it
sets only `background-color` and `border-color` — never a text colour, which is
why the label keeps the theme's default and fails in both. The other delete
button on these screens uses daisyUI's `btn-error`.

### E. Copy and content

**F49 — typos and inconsistent field names, in the seller's own forms.**
`Edita tu prodcuto` is the heading of the product edit screen. The same field is
`Descripción` when adding a product and `Descripcion` when editing one, and
`Slogan` when registering but `Eslogan` when editing the profile. The product
list says `🛍️ Marketplace (1 productos)`.

**F50 — an English placeholder in the middle of a Spanish form.** Both
comboboxes show `Select...`. The code passes `classNamePrefix='Selecciona'` to
react-select, which is a CSS class prefix, not a placeholder — the Spanish copy
was written and went to a stylesheet. *Fix:* `placeholder='Selecciona...'`.

**F51 — two identical green switches that mean different things.** The profile
form stacks "Mi disponibilidad" and "Visibilidad de mi tienda": same component,
same colour, same position, one row apart. The first is today's schedule (the
T-14 cron rewrites it), the second is the T-71 pause. Only the second explains
itself; the first offers a badge that repeats its own state. With neither
carrying an accessible name (F32), the two are indistinguishable to a screen
reader.
`seller-profile-edit__desktop__light.png`

**F52 — the approval screen greets the business and hand-builds its WhatsApp
link.** `Hola {businessName}` addresses the shop, not the person waiting for
approval, and the trailing full stop is a separate node after the name. The
`wa.me` URL interpolates the raw business name into an already percent-encoded
query string: the measured href contains `...vendedor%20Postres Laura,%20me...`,
a literal space. A name with `&`, `#` or `?` in it would truncate the message.
*Fix:* `encodeURIComponent` on the name (and greet the seller, not the shop).

**F53 — saving drops the seller out of the seller area.** Read from the code: the
profile form and the add-product form both `router.push('/')` after a successful
save, and the schedules screen pushes `/antojos`. Three of the four saves land
the seller on the buyer's listing with no confirmation that anything was written;
only the product edit form returns where it came from. Not fired in this pass —
these write to the database.

## Caveats and harness artefacts

Read the screenshots knowing these are the harness, not the app:

- **18 antojos.** `scripts/e2e.mjs` adds 15 unavailable "Antojo de scroll N"
  products so the infinite-scroll spec has more than one page. The seller really
  owns 4. `🍕 Antojos (18 productos)` is correct arithmetic on seeded data.
- **The avatar says CM on the register and approval screens.** Those two need a
  session that is *not* the approved seller, so the harness moved the fixture's
  `clerkId` onto another seeded user; Clerk still draws the fixture account's
  initials. The page's own data (the "Postres Laura" greeting) is the identity
  that matters.
- **Images are stubbed**, same as the first half: every product shows the
  Mercampus logo.
- **Nothing was submitted.** No form on these screens was saved, no product
  deleted, no image removed. The findings that depend on a write (F31, F53) say
  so and were read from the code.

## Suggested follow-ups, seller half

Roughly in the order I would take them:

1. **Dark mode on the seller forms** (F45, F46, F47) — the only finding in this
   half where a seller cannot read data they typed. One hardcoded colour in
   `InputFields` accounts for most of it.
2. ~~**The product edit dead end and the 500s** (F28, F29)~~ — fixed in T-97.
   Read that entry for the correction to this line: the un-approved seller is
   stopped by `useCheckSeller` before the fetch, not by the 500. The 500 was
   reached by an approved seller opening a product owned by an un-approved (or
   deleted) seller — 17 of the 112 products in the real database.
3. **Names for the availability switches and a real link on the card** (F32,
   F33) — the product list is the screen a seller uses daily, and half of it is
   unreachable without a mouse.
4. **The mobile schedule row** (F42).
5. **`approving` into the middleware matcher** (F30).
6. **Contrast pass** (F48) — shares its fix with F11.
7. **Confirmation on the destructive actions** (F31).
8. **Copy pass** (F49, F50, F51, F52) — small, and all inside the seller's own
   view.
9. **Headings, titles, the always-mounted dialog** (F36, F39, F40) — shares its
   fix with F4/F9/F12.
