# T-67 — UI/UX audit screenshots (2026-09-07 and 2026-09-08)

Evidence for [`findings.md`](findings.md) — 53 items (screen + issue + suggested
fix), in two passes over one numbering:

- **F1–F27, the public screens** (T-67, 2026-09-07), also in
  [PR #275](https://github.com/santig005/Mercampus/pull/275).
- **F28–F53, the seller screens** (T-94, 2026-09-08), the half T-67 could not
  reach without a session. See [below](#how-the-seller-half-was-taken-t-94).

Diagnosis only: no product code changed in either PR.

## How these were taken

A throwaway stack, never production: `MongoMemoryServer` + `scripts/seed.mjs` +
`npx next build` + `npx next start`, the same recipe as `scripts/e2e.mjs`, driven
by Playwright. The audit harness itself lives outside the repo (agent
scratchpad) — it is a one-off, and everything it found that matters is written
down in [`findings.md`](findings.md).

Two things worth knowing before reading a shot:

- **Images are stubbed.** The seed points at `ik.imagekit.io/seed/...`, which
  does not exist; those requests are fulfilled with `public/images/logo.png` so
  the layout is what gets audited instead of a wall of broken-image icons. The
  one exception is the product dead-end shot, where the product has no image at
  all — that is the real empty state.
- **The port matters.** `NEXT_PUBLIC_URL` is baked in at build time and the
  client-side listings fetch from it (`src/services/api.js`), so a build served
  on a different port shows empty listings. Every shot here comes from a build
  made for the port it was served on.

Viewports: desktop 1280x900, mobile 390x844. Themes: light, and dark forced via
`localStorage.theme` (the `?theme=dark` override does not survive a redirect —
see the findings).

## How the seller half was taken (T-94)

Same recipe, plus a session. The harness is again a one-off outside the repo
(agent scratchpad): three Playwright spec files dropped into
`tests/e2e/signed-in/` for the run and removed afterwards, so they rode
`npm run test:e2e` and got the whole stack — in-memory Mongo, seed, build,
`next start`, and T-84's signed-in `storageState` — for free.

Three things about these shots specifically:

- **`__bottom` files are the same screen, scrolled.** `/antojos/*` renders inside
  an inner scroll container (`components/layout/Layout.jsx`) and each form's card
  is `absolute` inside an `h-dvh` wrapper, so the document itself never grows and
  a full-page screenshot is exactly one viewport. The `__bottom` shot is the same
  page with the submit button scrolled into view. That is finding F44, and it is
  why the first-half shots are all 1280x900 too.
- **Two screens needed a different identity.** The fixture account is the
  approved seller, and both `register` and `approving` bounce an approved seller
  away. For those, the harness moved the fixture's `clerkId` onto another seeded
  user (the buyer, then the pending seller) in the run's throwaway in-memory
  database and reloaded. Hence the "CM" avatar on a page greeting "Postres
  Laura": Clerk is still the fixture account, Mongo is somebody else.
- **Nothing was written.** No form was submitted, no product deleted, no image
  removed. The findings that depend on a write say so.

Contrast was measured in-page against the real composited background, with every
colour normalised through a 1x1 canvas — daisyUI 4 declares its themes in
`oklch()`, and a checker that only parses `rgb()` silently reads a themed surface
as transparent and reports the wrong background.

## Index

| File | Screen |
| --- | --- |
| `listing__{desktop,mobile}__{light,dark}.png` | `/antojos` — buyer entry point |
| `product-detail__desktop__{light,dark}.png`, `product-detail__mobile__light.png` | `/antojos/[id]` |
| `seller-profile__desktop__light.png`, `seller-profile__mobile__light.png` | `/antojos/sellers/[id]` |
| `seller-directory__desktop__light.png` | `/antojos/sellers/list` |
| `marketplace__desktop__light.png` | `/marketplace` |
| `pqrs__{desktop,mobile}__light.png` | `/antojos/pqrs` |
| `login__desktop__{light,dark}.png` | `/auth/login` |
| `about__desktop__{light,dark}.png` | `/about` hero — the dark-mode problem |
| `about-header-overlap__desktop__dark.png` | `/about` scrolled — header over content |
| `sidebar__desktop__light.png`, `sidebar__mobile__dark.png` | navigation drawer |
| `empty-category__desktop__light.png` | `/antojos?category=Galletas` — empty state |
| `shared-search-url__desktop__light.png` | `/antojos?product=zzzzqq` — search param dropped |
| `deadend-product-bad-id__desktop__light.png` | `/antojos/<unknown id>` — `$ NaN` |
| `deadend-seller-bad-id__desktop__light.png` | `/antojos/sellers/<unknown id>` — spinner forever |

### Seller screens (T-94)

| File | Screen |
| --- | --- |
| `seller-register__{desktop,mobile}__light.png`, `seller-register__desktop__dark__bottom.png` | `/antojos/sellers/register` |
| `seller-approving__{desktop,mobile}__light.png` | `/antojos/sellers/approving` — identical in dark (F47) |
| `seller-profile-edit__desktop__light.png`, `seller-profile-edit__mobile__light.png` | `/antojos/sellers/profile/edit` |
| `seller-profile-edit__desktop__{light,dark}__bottom.png` | the same form scrolled down — the dark one is F45 |
| `seller-schedules__desktop__{light,dark}.png` | `/antojos/sellers/schedules` |
| `seller-schedules__mobile__light__bottom.png` | the schedule rows on mobile — F42 |
| `schedules-empty-row__desktop__light.png` | a new row, saved empty — validation and the duplicated day option |
| `seller-products__{desktop,mobile}__light.png`, `seller-products__desktop__dark.png` | `/antojos/sellers/products/edit` |
| `product-edit__desktop__light.png` | `/antojos/sellers/products/edit/[id]` |
| `product-edit__desktop__{light,dark}__bottom.png` | the same form scrolled down — the delete button |
| `product-add__desktop__{light,dark}.png`, `product-add__mobile__light.png` | `/antojos/product/add` |
| `deadend-product-edit-bad-id__desktop__light.png` | editing an id that is not yours or does not exist — F28 |
| `seller-sidebar__desktop__light.png` | the drawer with the seller-only "Gestionar" section |

## Not covered

**`/admin/*`.** The T-84 fixture signs in as a seller, and the admin role lives
in Clerk's `publicMetadata` (T-12), not in Mongo — so the session cannot open an
admin route no matter what the seed says. Giving the fixture account that role is
test-harness work with its own instance-safety questions, which is why it is a
separate task (T-95) and not a corner of this one.

Also still outside both passes: `/antojos/game`, and anything behind a real
WhatsApp or Instagram click-out. On the seller half, nothing that writes: no
form submitted, no product deleted, no image removed.

## Follow-up status

F5 (no visible focus indicator) is fixed, in T-86; F16 (`/about` sticky header
over the section text) in T-87; F17 (`/about` hero unreadable in dark) in T-75.
F1/F2 in T-90, F3 in T-92, F7/F8 in T-93, F21/F22 in T-88, F26 in T-89. The rest
of `findings.md`, including all of F28–F53, has no task yet.
