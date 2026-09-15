# T-127 — add-product error dialog, dark-mode fix

Real renders for rule 3, taken 2026-09-14 against this task's fix with
`next build` + an in-memory Mongo, the seeded approved seller, and a real
Clerk session created by `scripts/clerk-e2e-user.mjs` (same harness as every
other signed-in spec). Playwright Chromium, `localStorage.theme` forced per
shot. Captured by `tests/e2e/signed-in/product-add-errors.spec.js`, the same
spec T-119 added — it now also asserts a WCAG contrast ratio computed from
the actual painted pixels (canvas `getImageData`, not the CSS string), so a
fix that changes the class name but not the render (T-100's failure mode)
would still fail it.

## The bug (see `docs/audits/t-119/README.md` and `error-state__dark.png`)

`src/app/antojos/product/add/page.jsx`'s error `<dialog>` had `.modal-box`
hardcoded to `bg-[#fde6e6]`, a light pink with no dark-theme variant. Its
heading and list text carried no explicit color, so they fell back to the
ambient `base-content` — `#EDE6DE` in the `dark` theme (`tailwind.config.js`)
— nearly invisible against that pink.

## The fix

Replaced the hardcoded pink with the same themed daisyUI token
`EditProductForm.jsx` already uses for its own error banner: `alert
alert-error` (checked as part of this task — `EditProductForm.jsx` already
used this token and did **not** share the bug, so it needed no change).
`.alert` sets `background-color: var(--alert-bg)`; `.alert-error` sets that
to the theme's `--er` (error) color and text to `--erc` (error-content) —
both come from daisyUI's own `light`/`dark` presets (this project doesn't
override `error`/`error-content` in `tailwind.config.js`, so extending the
built-in theme names falls back to daisyUI's own values, verified below to
have real contrast in both).

The `alert`/`alert-error` classes were put on an inner `<div>`, not on
`.modal-box` itself: `.modal-box` sets its own `background-color` later in
daisyui's stylesheet than `.alert`/`.alert-error` do, so with equal
selector specificity it would have won the cascade and silently kept the
box's background at `base-100` — the same "class present, doesn't do what
it says" trap `bg-primary` is in `CLAUDE.md`. Confirmed by reading
`node_modules/daisyui/dist/styled.css` rule order, then by the render below.

Also dropped the hardcoded `text-red-400` on the close icon — it no longer
needs to fight the box's own text color; it now inherits `alert-error`'s
`erc` color like the rest of the dialog. Also dropped the redundant
`text-red-400` on the `FcHighPriority` icon, which has no effect since
`react-icons/fc` icons are flat multi-color SVGs that ignore `currentColor`
— pure dead className, left off rather than touched further since it was
already inert.

## Screenshots

| File | State |
| --- | --- |
| `error-state__light.png` | Light theme |
| `error-state__dark.png` | Dark theme |

## What they show

- **Fixed, confirmed:** in both themes the box renders a solid red/coral
  background with dark, high-contrast text — heading, generic message and
  the three field bullets are all legible. Dark theme is no longer
  pink-on-near-white-text; light theme is unchanged in spirit (still reads
  as an error) but now theme-driven instead of a hardcoded hex.
- **Contrast, measured, not assumed:** the new e2e assertion reads
  `.alert-error`'s computed `background-color` and `color` through a 1x1
  canvas (so oklch vs rgb serialization differences across browsers don't
  matter) and asserts a WCAG contrast ratio ≥ 4.5:1, for both themes. Passed
  for both light and dark on this run.
