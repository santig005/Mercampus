# T-175 — the seller page and seller modal follow the page locale

Real renders for rule 3, produced by `tests/e2e/seller-modal-i18n.spec.js`
against `next build` + the in-memory Mongo of the standard `npm run test:e2e`
harness. Playwright Chromium, 1280×900.

| | Spanish | English |
|---|---|---|
| `SellerPage.jsx` (`/antojos/sellers/<id>`) | `seller-page-i18n-es.png` | `seller-page-i18n-en.png` |
| `SellerModal.jsx` (cold `/antojos?vendedor=<id>`) | `seller-modal-i18n-es.png` | `seller-modal-i18n-en.png` |

Before this change, only the children T-81 had already migrated
(`AvailabilityBadge`, `TableSchema`) followed the locale. The headings,
contact buttons and share CTA around them were Spanish on `/en`.

**Still Spanish in the English shots, not this task's scope:** the
"🍕 Antojos (18 productos)" section header comes from
`SellerProductsBySection.jsx`, a child component that is still untranslated.
See the rule 9 notes in the ROADMAP entry.
