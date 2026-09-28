# T-176 — category labels follow the locale, category values do not

Real renders for rule 3, produced by `tests/e2e/categories-i18n.spec.js` and
`tests/e2e/signed-in/categories-form-i18n.spec.js` against `next build` + the
in-memory Mongo of the standard `npm run test:e2e` harness. Playwright
Chromium, 1280×900.

| | Spanish | English |
|---|---|---|
| `/antojos`: chips and product-card tags | `categories-antojos-es.png` | `categories-antojos-en.png` |
| `/marketplace`: chips and product-card tags | `categories-marketplace-es.png` | `categories-marketplace-en.png` |
| Add product: category picker (signed in) | `categories-add-form-es.png` | `categories-add-form-en.png` |

The Spanish column is pixel-for-pixel what it was: in `es.json`, each label is
the stored value itself, and a unit test enforces that.

What does **not** change, in either locale: the value stored on the product,
the `?category=Galletas` in the URL, the `localStorage` key `CategoryGrid`
remembers, and what Zod, Mongoose and `GET /api/products` validate and
filter on. The spec clicks "Cookies" on `/en/antojos` and asserts the URL
reads `?category=Galletas`. It also loads `/en/antojos?category=Galletas` (a
link shared from the Spanish site) and asserts the "Cookies" chip is active.
