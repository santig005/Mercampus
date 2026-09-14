# T-119 — add-product field-error screenshots

Real renders for rule 3, taken 2026-09-14 against the merged T-119 code
(`agent/develop` at `7883659`) with `next build` + an in-memory Mongo, the
seeded approved seller, and a real Clerk session created by
`scripts/clerk-e2e-user.mjs` — the same harness `scripts/e2e.mjs` uses for
every other signed-in spec. Playwright Chromium, `localStorage.theme` forced
per shot. Captured by `tests/e2e/signed-in/product-add-errors.spec.js`, which
also asserts on the dialog content (so this is a regression test, not just a
one-off script).

The PR that implemented T-119 (#342) could not produce these: its worktree
had no `.env`, and Clerk's middleware answers every route with 400 without a
real publishable key, same blocker as T-100. This audit closes that gap.

## How the error state was reached

Filled "Nombre" and "Precio" (both required client-side), left "Descripción",
"Categoría" and the image upload empty (required server-side only). Submit
reaches `POST /api/products`, which answers 400 with `fields` naming all
three.

| File | State |
| --- | --- |
| `error-state__light.png` | Light theme |
| `error-state__dark.png` | Dark theme |

## What they show

- **Fixed, confirmed:** the dialog now lists `description`, `images` and
  `category` individually, not just the generic "Datos inválidos" — this is
  the actual bug (T-115 looked opaque for ten days because of exactly this).
- **Fixed, confirmed:** the price input is controlled — `$ 15.000` (typed as
  `15000`) survives the failed submit and re-render instead of resetting or
  going blank, which is what an uncommented `value` prop would risk.
- **Pre-existing, not fixed here, found while looking (rule 9 — see T-127):**
  in dark mode the dialog's text is nearly unreadable. `error-state__dark.png`
  shows it plainly; confirmed with computed styles rather than trusting the
  screenshot alone:
  - `.modal-box` background: `rgb(253, 230, 230)` (`bg-[#fde6e6]`, hardcoded,
    not theme-aware).
  - The heading and list text color: `oklch(0.928 0.013 71.3)` — that's
    `base-content` for the `dark` theme (`#EDE6DE` in `tailwind.config.js`),
    an off-white meant for text on the dark theme's near-black surfaces, not
    for a light pink box carried over unchanged from light mode.
  - Same shape as the `bg-primary` caution in `CLAUDE.md`: a color that reads
    fine in one theme and was never checked in the other. Filed as **T-127**;
    not fixed in this PR (rule 2).
