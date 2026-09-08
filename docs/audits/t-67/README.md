# T-67 — UI/UX audit screenshots (2026-09-07)

Evidence for [`findings.md`](findings.md) — the full 27-item list (screen +
issue + suggested fix), also in [PR #275](https://github.com/santig005/Mercampus/pull/275).
Diagnosis only: no product code changed in that PR.

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

## Not covered

The authenticated screens (seller registration, profile edit, product CRUD,
schedules, admin) are not here: Playwright has no Clerk session, so every one of
them redirects to `/auth/login`. T-84 (signed-in Playwright fixture) is filed
to unblock that half of the audit.

## Follow-up status

F5 (no visible focus indicator) is fixed, in T-86; F16 (`/about` sticky header
over the section text) in T-87; F17 (`/about` hero unreadable in dark) in T-75.
The rest of `findings.md` has no task yet.
