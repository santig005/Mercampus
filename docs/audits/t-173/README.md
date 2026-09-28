# T-173 — sidebar, theme toggle and navbar follow the page locale

Real renders for rule 3, produced by `tests/e2e/sidebar-i18n.spec.js` and
`tests/e2e/signed-in/sidebar-seller-i18n.spec.js` against `next build` + the
in-memory Mongo of the standard `npm run test:e2e` harness. Playwright
Chromium, 1280×900, sidebar opened by clicking the hamburger button.

| | Spanish (`/antojos`) | English (`/en/antojos`) |
|---|---|---|
| Signed out | `sidebar-i18n-es.png` | `sidebar-i18n-en.png` |
| Approved seller (T-84 session) | `sidebar-seller-i18n-es.png` | `sidebar-seller-i18n-en.png` |

Before this change the English column rendered the Spanish column's text:
`SideBar.jsx`, `ThemeToggle.jsx` and `Navbar.jsx` had no `next-intl` at all.
No T-81 zone owned them because they are chrome shared by every zone.

The Spanish column is byte-for-byte the copy it was before (`sidebar-nav`,
`session-context`, `accessible-names`, `dark-mode`, `seller-screens` and
`sidebar-hamburger-gap` pin it by name and all still pass). The one Spanish
change is the drawer overlay's `aria-label`, which was English (`close
sidebar`) on every page and is now `Cerrar menú lateral` / `Close sidebar`.

Control case: `/antojos/game` (unmigrated, served by `src/app/antojos/
layout.jsx`, outside `[locale]`) still renders the Spanish sidebar - the root
`NextIntlClientProvider` resolves it to the default locale.
