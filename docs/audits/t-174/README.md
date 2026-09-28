# T-174 — the product modal follows the page locale

Real renders for rule 3, produced by `tests/e2e/product-modal-i18n.spec.js`
against `next build` + the in-memory Mongo of the standard `npm run test:e2e`
harness. Playwright Chromium, 1280×900.

| | Spanish (`/antojos`) | English (`/en/antojos`) |
|---|---|---|
| Opened from the listing (`?producto=<id>`) | `product-modal-i18n-es.png` | `product-modal-i18n-en.png` |
| Cold `?producto=` for a missing product | `product-modal-error-i18n-es.png` | `product-modal-error-i18n-en.png` |

`ProductModal.jsx` is what a buyer sees when they click a product on the
listing (T-167's modal stack). It postdates T-81's product detail zone, which
translated `ProductPage.jsx` (the direct `/antojos/<id>` URL) only. Before
this change the English column showed the Spanish column's chrome around
already-translated children (`AvailabilityBadge`, `TableSchema`).

The carousel image is broken in every shot: the e2e seed's image URLs don't
resolve offline. It's not related to this change. The seed does the same on
every page.

**Pre-existing, visible in the error shots, not fixed here:** the error
branch renders without a `modal-box`, so the message sits bare at the
viewport's top-left edge, partly under the close and favourites buttons. The
layout is identical in both locales and before this change. See the rule 9
notes in the ROADMAP entry.
