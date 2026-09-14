# T-122 — availability badge screenshots

Real renders for rule 3. Taken on 2026-09-14 (a Monday in Bogotá) with
`next dev` against an in-memory Mongo: the seed, with its approved seller
changed to open all day, plus two approved sellers, one per state. Playwright
Chromium, `localStorage.theme` forced per shot.

| Product | Seller setup | Badge |
| --- | --- | --- |
| Tinto campesino | no schedule | **Consultar horario** |
| Empanada de pipián | only Tuesday 06:38-11:00 | **Cerrado ahora · abre mar 6:38** |
| Buñuelo, Arepa de queso | open all day | **Disponible** |
| Jugo de mango | open, product switched off | **No disponible** |

| Screen | Light | Dark |
| --- | --- | --- |
| Listing, 1280 px | `listing__desktop__light.png` | `listing__desktop__dark.png` |
| Listing, 400 px | `listing__mobile__light.png` | `listing__mobile__dark.png` |
| Product modal (from the listing) | `modal__desktop__light.png` | `modal__desktop__dark.png` |
| Product page `/antojos/[id]` | `product-page__desktop__light.png` | `product-page__desktop__dark.png` |

Known limits of these shots:

- **"No disponible" is mostly below the fold.** The listing scrolls inside its
  own container, so a full-page capture stops at the viewport. That badge kept
  its colours; only its width changed (fixed `w-20` → `min-w-20 px-2`).
- Product images are broken because the seed uses placeholder ImageKit URLs.
