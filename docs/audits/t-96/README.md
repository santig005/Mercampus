# T-96 — before/after screenshots

Evidence for the fix to **F45** (`docs/audits/t-67/findings.md`) and its root
cause, **F19**: `InputFields` hardcoded `bg-[#f0f5fa]`, a light panel colour, on
every input and textarea, while the typed value kept the theme's text colour. In
dark mode that was light text on a light box — measured at **1.13:1** on the
seller forms. The fix swaps the hardcoded colour for `bg-base-200
text-base-content`, the same daisyUI tokens every other themed surface in the
app already uses.

Taken the same way as the T-67/T-94 audit shots: desktop 1280x900, a real build
(`npx next build` + `npx next start`), `?theme=dark`/`?theme=light` to force the
theme. `before` is the pre-fix code (via `git stash`), `after` is this PR.
`login`, `auth-register` and `pqrs` are public routes, shot directly. The seller
screens needed T-84's signed-in fixture (`npm run test:e2e`), so only `after` was
taken for those — their `before` is already committed in `docs/audits/t-67/` and
is referenced below for the side-by-side.

| Screen | Before | After |
| --- | --- | --- |
| `/auth/login`, light | `login__desktop__light__before.png` | `login__desktop__light__after.png` |
| `/auth/login`, dark | `login__desktop__dark__before.png` | `login__desktop__dark__after.png` |
| `/auth/register`, dark | `auth-register__desktop__dark__before.png` | `auth-register__desktop__dark__after.png` |
| `/antojos/pqrs`, dark | `pqrs__desktop__dark__before.png` | `pqrs__desktop__dark__after.png` |
| `/antojos/sellers/profile/edit`, dark | `../t-67/seller-profile-edit__desktop__dark__bottom.png` (F45's own evidence) | `seller-profile-edit__desktop__dark__bottom__after.png` |
| `/antojos/sellers/products/edit/[id]`, dark | `../t-67/product-edit__desktop__dark__bottom.png` | `product-edit__desktop__dark__after.png` |
| `/antojos/product/add`, dark | `../t-67/product-add__desktop__dark.png` | `product-add__desktop__dark__after.png` |

**`login`/`auth-register`/`pqrs` fields were filled in before the shot** — the
bug is in the *typed value*, not the placeholder, so an empty field would not
show it. The seller-form `after` shots did not need this: they are prefilled
with the seller's real seeded data (`Arepas El Parche`, `Arepa de queso`).

**Not re-shot: `/antojos/sellers/register`.** Reaching it signed in requires the
account-swap trick `docs/audits/t-67/README.md` describes for T-94 (an approved
seller is bounced off that route, so the harness moves the fixture's `clerkId`
onto another seeded user for the run) — out of scope for a one-line style fix.
The component is identical to the one exercised in every other screenshot here
and its only usage in `src/app/antojos/sellers/register/page.jsx` passes no
extra `className` that would fight the new background, confirmed by reading the
file, not assumed.
