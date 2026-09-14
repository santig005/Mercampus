# T-123 — availability filter screenshots

Real renders for rule 3. Taken on 2026-09-14 (a Monday in Bogotá) with
`next dev` against an in-memory Mongo: the seed, with its approved seller
changed to open all day, plus one approved seller closed until Tuesday 06:38
and one with no schedule. Same fixtures as `docs/audits/t-122/`. Playwright
Chromium, `localStorage.theme` forced per shot.

| Product | Badge | Block |
| --- | --- | --- |
| Tinto campesino | Consultar horario | available (the human's call) |
| Buñuelo, Arepa de queso | Disponible | available |
| Empanada de pipián | Cerrado ahora · abre mar 6:38 | unavailable |
| Jugo de mango | No disponible | unavailable |

| State | How it was reached | Light | Dark |
| --- | --- | --- | --- |
| Both selected (default) | `/antojos` | `both__{desktop,mobile}__light.png` | `both__{desktop,mobile}__dark.png` |
| Only "Disponibles ahora" | clicking "No disponibles" | `available-only__{desktop,mobile}__light.png` | `available-only__{desktop,mobile}__dark.png` |
| Only "No disponibles" | a shared link, `?availability=unavailable` | `unavailable-only__{desktop,mobile}__light.png` | `unavailable-only__{desktop,mobile}__dark.png` |

With both selected, "Recomendado" lists the available block first (newest
first within it), then the rest.

## A false alarm these caught, and ruled out

The first take of `available-only` showed the button just deselected
("No disponibles") **filled** in orange/brown, looking more selected than the
selected one. The same deselected style reached by URL (`unavailable-only`)
rendered white. The pointer was still resting on the clicked button, so the
first take showed daisyUI's `:hover` style. The retake parks the pointer away
and blurs focus before the shot, and records the computed background colours
to confirm it (in the PR).

Known limits: product images are broken because the seed uses placeholder
ImageKit URLs; the listing scrolls in its own container, so the last card is
cut at the viewport.
