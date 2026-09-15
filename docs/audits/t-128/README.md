# T-128 — availability filter button colors

Real renders for rule 3, not a class-name string test. Taken 2026-09-14 with
`next dev` against an in-memory Mongo (`scripts/seed.mjs`), Playwright
Chromium, `localStorage.theme` forced per shot (the same mechanism
`ThemeToggle.jsx` writes to, read by the anti-FOUC script before React
mounts). Pointer parked away and focus blurred before each shot, per the
T-123 false-alarm lesson about `:hover`/`:focus` leaking into a screenshot.

## The decision

The human's call (2026-09-14), a soft brand-toned tint per option instead of
both sharing `category-active`'s single orange, and not a literal
traffic-light green/red:

| State | Theme | Text | Background |
| --- | --- | --- | --- |
| Available | light | `#1F6B3A` | `#DCEEDF` |
| Available | dark | `#8FD8A6` | `#23372A` |
| Unavailable | light | `#9A3B2A` | `#F7DFDB` |
| Unavailable | dark | `#E8A28F` | `#3A2620` |

Implemented as `.availability-active-available` / `.availability-active-unavailable`
in `public/css/main.css`, applied in `ProductGrid.jsx` via each
`AVAILABILITY_OPTIONS` entry's new `activeClass` instead of the shared
`category-active`.

## What was checked

`getComputedStyle` was read back from the actual buttons in the running app
(not the class string) for every shot below, confirming the intended hex
values render exactly - no daisyUI/Tailwind cascade override (the `bg-primary`
trap this file's CLAUDE.md calls out, and the reason T-100 shipped invisible
text):

| Shot | Available button | Unavailable button |
| --- | --- | --- |
| `both__light` | bg `rgb(220,238,223)` text `rgb(31,107,58)` | bg `rgb(247,223,219)` text `rgb(154,59,42)` |
| `both__dark` | bg `rgb(35,55,42)` text `rgb(143,216,166)` | bg `rgb(58,38,32)` text `rgb(232,162,143)` |
| `available-only__light` | same tint, selected | plain `bg-base-100`, deselected |
| `unavailable-only__dark` | plain `bg-base-100`, deselected | same tint, selected |

Contrast (WCAG relative luminance, text vs. its own tint background):

| Pair | Ratio |
| --- | --- |
| Available, light | 5.38:1 |
| Available, dark | 7.59:1 |
| Unavailable, light | 5.45:1 |
| Unavailable, dark | 6.76:1 |

All four clear the 4.5:1 AA floor for this button's small text, in both
themes.

## Files

| State | Light | Dark |
| --- | --- | --- |
| Both selected (default) | `both__light.png` | `both__dark.png` |
| Only "Disponibles ahora" selected | `available-only__light.png` | `available-only__dark.png` |
| Only "No disponibles" selected | `unavailable-only__light.png` | `unavailable-only__dark.png` |

Known limits: same fixtures/limits as `docs/audits/t-123/` (seed data only,
no real product images).
