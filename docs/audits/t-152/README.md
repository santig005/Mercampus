# T-152a — `/antojos` screenshots

Evidence for rule 3: the listing's greeting went from `<h2>` to `<h1>`, so
the render has to be checked, not just the markup.

Taken 2026-09-26 with `npm run test:e2e` (in-memory Mongo + seed, production
build), signed out, `localStorage.theme` forced per shot, at desktop 1280x900
and mobile 390x844. Computed style of the `<h1>` in every shot: 20px,
weight 400 - identical to the old `<h2>`, because `.title` sets both. Light
text colour `oklch(0.278 0.030 256.8)`, dark `oklch(0.928 0.013 71.3)`: legible
on both backgrounds.

| | Light | Dark |
| --- | --- | --- |
| Desktop | `antojos__desktop__light.png` | `antojos__desktop__dark.png` |
| Mobile | `antojos__mobile__light.png` | `antojos__mobile__dark.png` |

The broken product images are the e2e seed's (no ImageKit in that run), not
part of this change.
