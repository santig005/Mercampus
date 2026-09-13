# T-100 — screenshots, and a regression the screenshots caught

Evidence for the fix to **F46** and **F47** (`docs/audits/t-67/findings.md`).
The PR that merged T-100 (`agent/t-100-dark-mode-remainder`) could not capture
these: every server-starting command was refused inside that session's
sandbox. This is that follow-up, taken in a session that could run
`npm run test:e2e`.

Taken the same way as the T-67/T-94/T-96 shots: desktop 1280x900, T-84's
signed-in fixture, `localStorage.theme` forced per shot. `approving` needed
the account-swap trick `docs/audits/t-67/README.md` describes for T-94 (the
fixture is the approved seller, and `approving` bounces an approved seller
away) — the fixture's `clerkId` was moved onto the seeded pending seller
(`Postres Laura`) for that pair of shots, and moved back before the run's own
teardown checked it.

| Screen | Light | Dark |
| --- | --- | --- |
| `/antojos/product/add`, Categoría menu open | `product-add__desktop__light__after.png` | `product-add__desktop__dark__after.png` |
| `/antojos/sellers/approving` | `approving__desktop__light__after.png` | `approving__desktop__dark__after.png` |

## The regression these caught

The first render of `approving__desktop__light__after.png` (not committed)
showed **white text on a near-white card — the "Hola {seller}" heading barely
legible, the rest invisible.** T-100's merged fix had changed the card from
`bg-[#FF7622]` to `bg-primary`, expecting daisyUI's real orange. It rendered
`#f8f8f8` instead: `public/css/main.css` (line 62) has its own
`.bg-primary { @apply bg-[#f8f8f8]; }`, which overrides the Tailwind/daisyUI
utility of the same name **app-wide, in both themes** — `components/layout/
Layout.jsx` has a comment describing the same trap for the exact same class.
Nothing in the merged PR's own diff or tests caught it: the source-level test
added alongside it (`tests/unit/dark-mode-t100.test.js`) only asserted that
`bg-primary` appeared in the source, which it did — the assertion was blind to
what that class actually renders as.

Fixed the same day, before promoting past `agent/develop`: the card now uses
`bg-primary-orange` (the class every other branded-orange surface in the app
already uses — `Loading`'s spinner, `ProfileChecklist`'s progress bar,
`Carousel`'s active dot — none of which differ by theme either), and
`text-white` to pair with it, since there is no daisyUI content-token for a
class that isn't itself a daisyUI token. The page background
(`bg-[#F2F2F2]` → `bg-base-200`) was correct as merged and is untouched — that
class has no such override. `dark-mode-t100.test.js` now asserts the specific
class, not just its presence, and strips JSX comments first so a comment that
has to *name* the broken class (to warn against it) can't trip its own guard.

**The lesson, not just the fix:** `bg-primary` is not safe to reach for in this
codebase for "the theme's real primary color" — it silently renders as
`#f8f8f8`. `bg-primary-orange` is the actual convention, and it does not vary
by theme; nothing in the app currently makes a *branded* orange surface differ
between light and dark, only neutral ones (`base-100`/`200`/`300`) do.
