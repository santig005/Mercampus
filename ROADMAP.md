# ROADMAP — Mercampus

Executable backlog. The nightly agent reads this file, picks the **first
unchecked task whose dependencies are checked**, implements it, and checks
the box in the same PR.

Status: `[ ]` pending · `[~]` in progress (branch open) · `[x]` done

Each task has:

- **Why** — what hurts today.
- **Done when** — verifiable criterion. This is the contract.
- **Model** — suggested model (see "Model and effort" below).
- **Nightly** — `yes` if the scheduled agent can take it on its own; `no` if
  it needs an interactive session with you.

If a task turns out bigger than written, split it in the file before
executing it.

---

## Starting a fresh session? Read this first

Written 2026-09-10, for an agent opening a new conversation with no context
beyond this file. It answers one question: **what can I safely pick up on my
own right now?** Re-check it against the entries themselves before starting -
this index goes stale, the entries are the contract.

### Do not touch these without the human in the conversation

Not because they are hard, but because getting them wrong costs real user
data or real access, and the human has asked for them to wait:

- **The admin-role work: T-107, T-108, T-114**, and anything else that
  reads or writes `publicMetadata`, `User.role`, or the seller approval path.
  T-104, T-105 and T-106 are done; what is left of that chain either guards
  the only approval surface (T-114) or touches real user documents (T-107).
- **Environment separation: T-64/T-12h's Clerk instance work.** T-63 split
  Mongo and T-63b rotated production's credential on 2026-09-14, but one
  Clerk instance still serves every environment, and a preview still writes
  production data through `src/services/api.js` until T-112. Never roll
  production back in Vercel to a deployment from before that day: it has no
  working database credential.
- **T-95** (audit `/admin/*`) - it needs minting a privileged Clerk account
  per run, which is both of the above at once.
- **T-82** (deleting a product's images) - irreversible deletes against an
  external service.
- **T-91** (`notFound()` soft-404s) - the fix runs through the root layout and
  `SellerContext`; read T-12d first, and do it with the human.
- **T-117** (orphan images) - deletes against production media. T-116 is
  done, so its lookup (`findImageFile`) is there to build on.
- **T-118** (ImageKit per environment) - waits on T-63 and a dashboard key.

Everything below still assumes **rule 1**: branch from `agent/develop`, PR
into `agent/develop`, never push to `main` or `develop`.

**Filing a new task? Take its number at the last moment, not the first.**
Two sessions running in parallel on 2026-09-13 both read "the next free
number is T-113" when they started, both filed it, and both PRs merged
cleanly - they edited different parts of this file, so git had nothing to
conflict on. Right before merging, `git fetch` and
`grep -n "^### \[.\] T-NNN" ROADMAP.md` against `origin/agent/develop`; if
the number is taken, bump it before the merge, not after.

### Safe to take alone

One per PR, per rule 2. Ordered by how little can go wrong.

**Refreshed 2026-09-15** - T-36, T-109, T-110 and T-113 shipped (see their
entries); T-111's items 1-3 stopped applying when T-112b deleted
`src/services/api.js`/`apiToken.js` outright, so that row is gone rather than
marked done. T-85 stays, batch 2 only.

| Task | Why it is safe | How you know it worked |
|---|---|---|
| **T-85** (batch 2 only, 20 files listed in the entry) · Spanish left in test descriptions | Renames `describe`/`it` strings only. No source, no behaviour. The entry names the trap: renaming a test is safe, changing a string a test *asserts on* is not. | `npm run verify`. The same tests pass, with English names. |
| **T-127** · The add-product error dialog is unreadable in dark mode | One `<dialog>`, a color problem the screenshots already pinned down (`docs/audits/t-119/`). No data, no auth, no other screen touched. | A real screenshot in both themes (rule 3), text legible in each. |

### Fine for an agent, but read the caveat in the entry first

Not risky in the "loses data" sense - they each carry one decision the entry
already warns about, and getting it wrong wastes a PR:

- **T-83** · Extraordinary availability. `Nightly: yes` and well specified,
  but it adds a field to a document, so **rule 8 applies**: measure against
  the real base read-only first, and remember the `$ne: true` trap T-71 hit -
  existing sellers have no such field, and an equality filter drops every one
  of them.
- **T-81** · i18n, one zone per PR. The copy moves are mechanical; the risk is
  that every zone widens the middleware matcher, which has to keep coexisting
  with `clerkMiddleware`. That is the part that can break auth on routes with
  nothing to do with i18n. If a zone needs the matcher rethought, stop and
  ask.
- **T-124** · Photos over 4.5 MB. Option (a), shrinking in the browser, is
  agent-sized; verifying it needs a real large file in a browser, and option
  (b) must not be taken without checking what the upload signature binds.
- **T-44** · Seller panel. Unblocked (T-40 is done), but it is new UI, and
  CLAUDE.md rule 3 means a real screenshot, not a test that greps for a class
  name. If you cannot render it in your session, say so in the PR instead of
  calling it verified.
- **T-77** · `auth()` without Clerk's middleware context. Re-filed here on
  2026-09-10: it used to say "does not reproduce on demand", and it does now -
  36 times per `lighthouse` CI run, every run. Only the **defensive half** is
  agent-sized: wrap the `auth()` call so a throw degrades to the "no session"
  state that function already models, and log the pathname so the error has an
  address. Diagnosing the root cause, or changing what the root layout awaits,
  is not - that is T-91/T-12d territory.

### Needs the human before an agent can start

- **T-35** · choosing the image provider (T-109 carves out the safe half).
- **T-60** · Observability - needs a Sentry account and a DSN.
- **T-112** · a preview calling production's API - **confirmed** 2026-09-14;
  choosing between removing the self-fetch and pointing previews at
  themselves is the human's call.
- **The dashboard half of T-11b** - six image env vars to rename in Vercel,
  one of them spelled differently there than locally (see the table in
  T-11b), then a redeploy. Image uploads are broken in production until then.
  `CRON_SECRET` (T-14) is done and verified.
- **T-62b** · closing inactive PRs - a community policy call.
- **T-80 batch e** - `scripts/`, where the dangerous warnings live; PR #273 is
  already open awaiting review.
- **T-30/31/32**, and the feature epics (**T-41/42/43/45/50/51/52/53/68**) -
  architecture and product shape, `opusplan` in an interactive session.

---

## Model and effort

Two different dials:

- **Model** = how capable. Bump the model when Claude had all the context,
  clearly tried, and still got it wrong.
- **Effort** = how thoroughly it works in the turn: how many files it reads,
  how much it verifies, how far it pushes before handing control back. Bump
  it when the mistake was skipping a file, not running the tests, or
  abandoning something half-done.

Use **default effort** unless you have a reason not to.

| Alias | When |
|---|---|
| `sonnet` | Routine, precisely describable work. The workhorse here. |
| `opusplan` | Opus to plan, Sonnet to execute. Ideal for architecture tasks in an interactive session. |
| `opus` | Subtle bugs, security, new domains. |
| `fable` | Only if Opus keeps failing at the same thing. The most expensive per token. |

`opusplan` **doesn't work in the nightly workflow**: plan mode only exists in
an interactive session, so in automation it would just run everything on
Sonnet. That's why the cron only picks up tasks marked `Nightly: yes`.

**The split:** the scheduled agent does the mechanical, verifiable work;
you do architecture and security with `opusplan` in the terminal. Those are
exactly the ones you want to understand deeply — delegating them would save
time but cost you the learning, which is the point of the exercise.

---

## Phase 0 — The harness (blocks everything else)

Without this, no agent can verify its work and the rest of the roadmap is
coding blind. It's also the most sellable part of the portfolio: not many
juniors know how to set up a verification loop.

**Do all of Phase 0 yourself, interactively.** There's no safety net yet,
and this is where you learn how the agent goes off the rails — information
you later feed into CLAUDE.md.

### [x] T-01 · Fix the CI that always fails
**Why:** `.github/workflows/ci.yml` runs `npm run test`, a script that
doesn't exist. Every PR is born red, so nobody looks at CI.
**Done when:** the workflow passes green on `develop` with no code changes;
runs lint and build; uses `npm ci` instead of `npm install`; Node 20+.
**Scope:** `.github/workflows/ci.yml`, `package.json`.
**Model:** `sonnet` · **Nightly:** no (no harness yet)

### [x] T-02 · Vitest + first real test
**Why:** zero tests. Need at least one case that fails if something breaks.
**Done when:** `npm run test` runs Vitest; there are tests for `utilFn.js`
and for category validation by section in `productSchema`; CI runs them.
**Scope:** `vitest.config.mjs` (`.mjs` like the rest of the repo's configs,
otherwise Vite warns about ESM loaded as CommonJS), `tests/unit/`,
`package.json`, CI workflow.
**Model:** `sonnet` · **Nightly:** no

### [x] T-03 · Test database and seed
**Why:** no way to run the app without production Mongo. An agent can't
test anything.
**Done when:** `mongodb-memory-server` for tests; `scripts/seed.js` that
creates 3 users, 2 sellers (one approved, one not), 6 products, and
schedules; `npm run seed` documented in the README; `.env.example` created.
**Scope:** `scripts/seed.js`, `tests/setup.js`, `.env.example`.
**Heads up:** the seed points at a development cluster, NEVER at
production.
**Correction (T-12g): that's a wish, not a fact.** The `.env`'s
`MONGO_URI` today points **at production**, so `npm run seed` would wipe it
entirely. The only thing preventing that is the guard requiring `--yes`
outside localhost. Don't remove it, and see T-63 to fix the root cause.
**Model:** `sonnet` · **Nightly:** no

### [x] T-04 · Playwright + screenshots as evidence
**Why:** this is the answer to "have the agent see the page." Without it
there's no automated visual verification.
**Done when:** `npm run test:e2e` starts the app with seeded data and walks
through home → antojos listing → product detail → seller profile; saves one
screenshot per screen to `test-results/`; the workflow uploads those
screenshots as a run artifact.
**Heads up:** e2e needs **real** Clerk keys. Its middleware validates
against Clerk's servers and returns 400 on every route with fake keys,
public ones included, so the whole app becomes unreachable. CI takes them
from `vars.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and
`secrets.CLERK_SECRET_KEY`, and the job is gated by `vars.E2E_ENABLED`.
These are keys from a **development** instance: production keys wouldn't
work, because Clerk ties them to the registered domain and rejects
`localhost`. Secrets don't reach PRs from forks, so the job skips there.
**Scope:** `playwright.config.js`, `tests/e2e/`, `scripts/e2e.mjs`, CI
workflow.
**Depends on:** T-03
**Model:** `sonnet` · **Nightly:** no

### [x] T-05 · Incremental TypeScript
**Why:** everything is untyped JS; the agent has no safety net when
refactoring, and `npm run typecheck` is the cheapest check there is.
**Done when:** `tsconfig.json` with `allowJs: true` and `strict: true`;
`npm run typecheck` passes and is added to `scripts/verify.mjs`; Mongoose
models and `src/lib/` migrated to `.ts`. The rest migrates task by task,
not all at once.
**Deliberately not migrated:** `favoriteSchema.js` (0 importers, deleted by
T-34) and `clerkUser.js` (0 importers; converting it to `.ts` surfaces four
`err.status` accesses on an `Error`, which doesn't have that property, and
a `type` option in Clerk's `verifyToken` that doesn't exist — fixing it
means rewriting authentication, T-10/T-12).
**Watch out with Node:** scripts in `scripts/` import the models, now
`.ts`. Node only strips their types from 22.18 onward, so CI and `engines`
bump to Node 22. On Node 20, `npm run seed` and `npm run test:e2e` break.
**Scope:** `tsconfig.json`, `src/utils/models/`, `src/utils/lib/`. Files
migrate in place: moving `utils/models` to `models/` would touch its ~20
importers and is T-30's job.
**Model:** `opusplan` — deciding what to migrate first is ambiguous
**Nightly:** no

### [x] T-06 · `verify` script and branch protection
**Why:** the agent needs a single command that says yes or no.
**Done when:** `npm run verify` = lint + typecheck + test + build;
`develop` and `main` protected, requiring the CI check green before merge.
**Already done:** `scripts/verify.mjs` runs lint + test + build, stops at
the first failure, and injects the ImageKit placeholders the build needs.
The workflow calls `npm run verify` instead of defining its own steps, so
local and CI can't diverge.
**Protection applied** on `develop` and `main`: require the `quality`
check, with `enforce_admins: true` — without that, rule 1 wouldn't bind the
agent, which acts with admin permissions. No required reviews: with a
single author they'd just block the owner without adding anything. To
remove it:
`gh api -X DELETE repos/santig005/Mercampus/branches/<branch>/protection`.
**Depends on:** T-01, T-02, T-05
**Model:** `sonnet` · **Nightly:** no

> **From here on you can turn on the cron.** Merge `nightly-agent.yml` to
> the default branch only once `npm run verify` passes green.

---

## Phase 1 — Security and correctness

This is what you'd fix first if the project were live. Since it's a
portfolio piece, it's the section that tells the best story in an
interview — all the more reason to do it yourself.

### [x] T-10 · Restore authorization on mutations (critical)
**Why:** in `api/products/[id]` (PUT, DELETE) and `api/sellers/[id]` (PUT)
the ownership check is **commented out**. Anyone with a `fetch` can edit or
delete someone else's products and modify seller profiles.
**Done when:** `verifyOwnershipAndGetSellerId` and `verifySellerId` are
actually invoked; `getEmailFromToken` fixed (missing `await` on `auth()`
and `clerkClient()`); tests checking 401 with no session, 403 with someone
else's session, and 200 with the owner.
**Nuance about the `await`:** without it, `userId` comes out `undefined`
and the `if (!userId)` check always trips, meaning the route responds 401
to everyone. It failed **closed**, not open: it was a functionality bug,
not the hole. The hole was exclusively the commented-out ownership check.
**Scope:** `src/app/api/products/[id]/route.js`,
`src/app/api/sellers/[id]/route.js`, `src/utils/lib/auth.ts`.
**Depends on:** T-02
**Model:** `opus` — subtle security bug, no corners cut here
**Nightly:** no

### [x] T-10b · Authorization on `POST /api/schedules`
**Why:** found in T-13b. The route replaces (deletes and re-inserts) the
full schedule of any `sellerId` sent in the body, without checking that the
caller owns that seller. Anyone with a session can wipe or rewrite another
business's schedule.
**Done when:** uses `getEmailFromToken` + `verifySellerId` (the same
helpers from T-10) before touching the database; 401/403/200 tests same as
T-10's.
**Done:** identity first (no session means the body isn't even looked at)
and ownership second, which needs the `sellerId` already validated because
it comes in the body. Six tests in `autorizacion.test.js`, including
wiping someone else's schedule, the most destructive form of the bug. With
the mutation that removes `verifySellerId`, the three 403 cases return 200
**and the other seller's schedule disappears**: the hole was real and now
it's demonstrated.
**Watch out with T-13b's tests:** the four validation test cases on this
route didn't sign in (no need — there was no authorization) and started
failing with 401. Now they sign in as the owner: they're cases about the
body, not about access.
**Dead imports:** the route imported `currentUser`, `User`, and `Seller`
without using any of them (checked by searching every identifier in the
file). They're gone; no `populate` depended on the model staying
registered.
**`errorResponse` gains a `bodyKey`:** the catch returned 500 for
everything, so a 401/403 `AppError` came out as 500. Reuses the helper
from T-15 instead of repeating the "don't leak a 500's message" policy,
but with the `message` key, which is what `Schedule.jsx`'s banner reads.
Unifying the shapes is still T-32's job.
**Finding, not fixed:** the replacement is a `deleteMany` followed by an
`insertMany`, with no transaction. If the insert fails, the seller is left
with no schedule. Fixing it properly needs a transaction, and
`mongodb-memory-server` runs in standalone mode (no replica set), so it
isn't verifiable today with the harness that exists. Candidate for when
the database harness gets touched.
**Depends on:** T-10
**Model:** `opus` — same kind of bug as T-10
**Nightly:** no

### [x] T-11 · Close `POST /api/register`
**Why:** creates users with no authentication or validation, and the
email's `unique: true` is commented out. It's a direct spam vector into
the database.
**The webhook does NOT create users.** Verified in T-05 against in-memory
Mongo: `createOrUpdateUser` does
`findOneAndUpdate({ clerkId }, ..., { upsert: true })` but `clerkId`
doesn't exist in `userSchema`, so Mongoose throws
`StrictModeError: Path "clerkId" is not in schema` and nothing gets
created. The `try/catch` swallows it and returns `undefined`. In other
words: the premise "the webhook already creates users" is false, and that
has to be fixed before deciding whether to delete `/api/register`.
**Update (T-12b): the webhook now really does create users.** `clerkId`
was added to the schema and there are eight tests on the endpoint with a
svix signature. So the blocker is gone: this task can now decide whether
`/api/register` gets deleted, and the default answer should be yes,
because Clerk handles sign-up.
**Decision made (T-64): delete it.** With the webhook pointed at the
development instance (which is where the site runs, see T-64),
`/api/register` is purely redundant — and it's the route that's been
causing every missing-`clerkId` bug in this task series (T-12b onward).
No reason to keep it, protected or not.
**Done when:** the route and `SignUpForm.jsx`'s `createUserDb()` (the call
that uses it) disappear; user sign-up depends solely on the webhook; a
test confirms `/api/register` no longer exists (404). The unique index on
`email` stays pending separately — it needs migrating the duplicates
already in Mongo, and isn't part of deleting the route.
**Depends on:** the webhook being configured on the instance serving the
site (part of T-64).
**Done:** deleted `src/app/api/register/route.js` and `createUserDb()` in
`SignUpForm.jsx` along with its call. A test confirms the route's module
no longer exists (`register-cerrado.test.js`) — without `route.js`, Next
genuinely responds 404, so the file's absence is the proof.
**Model:** `sonnet` · **Nightly:** yes

### [x] T-11b · Drop the NEXT_PUBLIC_ prefix from image keys
**Why:** the ImageKit and Cloudinary keys carried the `NEXT_PUBLIC_`
prefix, which is what Next injects into the browser bundle.
**Important correction:** during T-03 and T-05 this file claimed the key
was visible from DevTools. **That was false.** Verified by downloading all
24 chunks served by mercampus.vercel.app and searching for the real
values: zero matches, with Clerk's publishable key showing up as a control
proving the search actually worked. The code reading those variables is
only imported by route handlers, so it never reached the client. No key
had to be rotated.
**What was actually true:** the name invited an accident. It only took
someone importing `utils/imagekit.js` from a `'use client'` component to
publish the key in the next deploy, with no warning at all.
**Done:** all six variables renamed without the prefix, the SDKs
instantiated lazily (which also removes the placeholders CI had been
carrying since T-01, because the build no longer needs any values), and a
test that fails if a `NEXT_PUBLIC_*` with SECRET or PRIVATE in the name
ever reappears.
**Correction (2026-09-13): "done" in the repo, never done where it runs, and
it broke production.** Renaming a variable in code is half a change; the
other half is renaming it wherever the value actually lives - Vercel's
environment and every developer's `.env` - and this entry never said so.
`.env.example` got the new names; nothing else did. It sat harmless for ten
days on `agent/develop` and went live with the 136-commit promotion on
2026-09-13, at which point every product image upload on
mercampus.vercel.app answered **500** (`getCloudinary()` configured with
three `undefined`s) - and the one approved seller that day could not add a
first product, so could not become visible. The route's generic "Error al
subir la imagen" hid the cause; see T-113. The renames needed, names only
(values unchanged, nothing to rotate - this entry already proved no key
reached the bundle).
**The first version of this table was built from the human's `.env` alone,
and Vercel turned out to name one of them differently.** Re-read straight
from Vercel with `vercel env ls` on 2026-09-13 (names and environments only,
never values), so the Vercel column is measured, not inferred:
| In Vercel (all three environments) | In the human's local `.env` | Name the code reads |
|---|---|---|
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | same | `CLOUDINARY_CLOUD_NAME` |
| `NEXT_PUBLIC_CLOUDINARY_API_KEY` | same | `CLOUDINARY_API_KEY` |
| `NEXT_PUBLIC_CLOUDINARY_API_SECRET` | same | `CLOUDINARY_API_SECRET` |
| `NEXT_PUBLIC_IMAGEKIT_KEY` | same | `IMAGEKIT_PUBLIC_KEY` |
| **`NEXT_PUBLIC_PRIVATE_KEY_IMAGEKIT`** | `PRIVATE_KEY_IMAGEKIT` | `IMAGEKIT_PRIVATE_KEY` |
| `NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT` | same | `IMAGEKIT_URL_ENDPOINT` |
- **The ImageKit pair changes shape, not just prefix**, and the private key
  had a *third* spelling in Vercel. Look it up by the Vercel column, not by
  the local one - searching Vercel for `PRIVATE_KEY_IMAGEKIT` finds nothing.
- **A private key named `NEXT_PUBLIC_*` is a trap, not a leak - yet.** Next.js
  inlines a `NEXT_PUBLIC_` value into the browser bundle only where source
  code names it, and nothing in this repo has ever named
  `NEXT_PUBLIC_PRIVATE_KEY_IMAGEKIT`, which agrees with this entry's bundle
  audit. But one `process.env.NEXT_PUBLIC_PRIVATE_KEY_IMAGEKIT` in a client
  component would have shipped it on the next deploy. Renaming it closes that.
- **All six are type `Config` in Vercel.** When recreating them under the new
  names, mark `CLOUDINARY_API_SECRET` and `IMAGEKIT_PRIVATE_KEY` as
  *Sensitive* - the other four are identifiers, not secrets.
- **State on 2026-09-13, after the production redeploy for `CRON_SECRET`:**
  still under the old names in Vercel, so uploads are still broken in
  production. Renames only take effect on a new deployment - rename, then
  redeploy once.
**Model:** `sonnet` · **Nightly:** no

### [x] T-12b · Link Clerk to Mongo by `clerkId`
**Why:** the app links the Clerk session to the Mongo user **by email**,
the worst possible column to join on: the user can change it in Clerk and
break the link, it isn't unique in the database (the `unique` is still
commented out, T-11), and fetching it costs a network call to Clerk's
Backend API on every mutation (`clerkClient().users.getUser()` inside
`getEmailFromToken`).
**The cause was a single missing line.** The webhook always looked up by
`clerkId` — `findOneAndUpdate({ clerkId: id }, ..., { upsert: true })` —
but the field wasn't declared in `userSchema`. Verified by calling the
function against in-memory Mongo before touching anything:

```
createOrUpdateUser returned: undefined
users in the database: 0
without try/catch it throws: StrictModeError |
  Path "clerkId" is not in schema, strict mode is `true`, and upsert is `true`.
```

In other words: it's not that "looking up by clerkId didn't work." The
design was correct and had been silently failing for years because of a
missing field and a `catch` that swallowed the error. Everything else
followed from there: since the webhook wasn't creating users, identity got
resolved by email, and from that came the per-request network call and the
public route `/api/users/user-with-seller/[email]`.
**Done:** `clerkId` on `userSchema` (`unique` + `sparse`);
`createOrUpdateUser` stops swallowing the error, so an event that fails
returns 400 and Clerk retries it instead of treating it as delivered; a
fallback for `name` because Clerk allows signing up with no name and the
field is required in the schema; the seed now seeds `clerkId` so tests
resemble production.
**Eight tests on the whole endpoint**, with a real svix signature:
sign-up, update without duplicating, email change while keeping the same
document (exactly what email can't guarantee), two Clerk accounts with the
same email as two documents, sign-up with no name, deletion, invalid
signature → 400 without touching the database, and an event with no
email → 400 instead of the previous, misleading 200.
**Key mutation:** removing `clerkId` from the schema — the exact
historical state — kills 5 of the 8 tests.
**Correction: this used to say "no data migration on purpose, there are no
users in production." That was based on what CLAUDE.md said, not on
evidence, and it doesn't matter either way: even with no *active* users,
any `User` document that already exists in the database is left without a
`clerkId`, and since T-12c that leaves it unable to mutate anything.** The
migration is mandatory and goes in T-12e.
**Model:** `opus` · **Nightly:** no (born from a design discussion)

### [x] T-12c · Resolve identity by `clerkId` on the server
**Why:** with T-12b `clerkId` is already in the database, but nobody uses
it yet. Today every mutation does `auth()` → a network call to Clerk to
translate the id into an email → `User.findOne({ email
}).populate('sellerId')`. With `clerkId` that becomes **one indexed query
and zero network calls**:

```js
const { userId } = await auth();
const user = await User.findOne({ clerkId: userId }).select('sellerId role');
```

`User` already stores `sellerId`, so the ownership check is comparing two
ids: the `populate` becomes unnecessary, and so does
`getUserWithSellerByEmail`.
**Finding this closes:** `GET /api/users/user-with-seller/[email]` **has no
authentication at all**. Verified by calling the handler with no session
against in-memory Mongo: it responds 200 with the user's full document
(`_id`, first name, last name, email, role, dates) and the seller's. It's
an account-enumeration oracle: anyone can try an email and learn whether
it's registered and with what role. The middleware doesn't cover it — it
only protects page routes. It exists only so `SellerContext` can ask "am I
a seller?" from the client, which is exactly the fetch-to-our-own-API
pattern this roadmap wants gone. With identity resolved server-side, the
route gets deleted.
**Done when:** `getEmailFromToken` and `getUserWithSellerByEmail` disappear
or shrink to a single query by `clerkId`; the 4 routes using the former and
the 3 using `currentUser()` move to the same path;
`/api/users/user-with-seller/` deleted; 401/403/200 tests same as T-10's
but without mocking `clerkClient()`, since it's no longer needed.
**Split, as the scope note warned.** Opening it up showed the client-side
part (SellerContext + deleting the public route) dragged in half a dozen
more files and overlaps with T-30/T-31. This task keeps **the server**;
the client goes in T-12d.
**Done:** `getEmailFromToken` no longer exists. In its place,
`getClerkUserId()` (the id already in the token, no network call) and
`getAuthenticatedUser()` (one indexed query by `clerkId`, selecting just
what's needed and **no `populate`**, because `User` already stores its
`sellerId`). The three ownership helpers stop receiving an email. Migrated
the 4 routes off `getEmailFromToken` and 2 of the 3 off `currentUser()`.
**`sellers/admin` deliberately left out:** its `currentUser()` sits inside
the in-memory `Map` and module-level `setInterval` that T-12 is going to
delete. Touching it halfway would make T-12 harder, not easier.
**Bug found and fixed along the way, in `POST /api/products`:** the
entire handler body lived inside an `if (clerkUser)` **with no `else`**,
so a request with no session exited without returning any `Response`.
Verified by calling the handler before touching it: it returned
`undefined`, i.e. a framework error instead of a 401. Also, `user._id` on
a nonexistent user threw a TypeError before even checking whether they
were a seller. The route had no tests at all; now it has 401/403/201.
**What actually gets simpler:** `PUT /api/sellers/[id]` by email no longer
looks up the `User` again (if the email is the session's, the seller is
already the one that session references), and `POST /api/products` no
longer looks up the `Seller` by `userId` separately. The test mocks go
from simulating `auth()` + `clerkClient()` + `currentUser()` to simulating
only `auth()`: a good sign of less surface area.
**Five mutations**, each with its own diff: removing the product's
ownership comparison (kills 2), the seller's (kills 4), `getClerkUserId`'s
401 (kills 4), the product-seller check (kills 1), and its 401 (kills 1).
**Depends on:** T-12b
**Model:** `opus` · **Nightly:** no

### [x] T-12e · Backfill `clerkId` on existing users
> **BLOCKS THE `agent/develop → develop` PROMOTION.** The code is ready and
> tested, but **the migration has to run against the real database before
> promoting**. If promoted without it, every existing user is left unable
> to edit anything.

**Why:** before T-12b the `clerkId` field didn't exist in the schema, so no
user has it. Since T-12c, identity is resolved through it. Measured by
calling the handlers with a user missing `clerkId` and a valid Clerk
session:

```
users without clerkId: 3
PUT /api/sellers/[id] -> 403 {"error":"No eres usuario registrado."}
POST /api/sellers     -> 404 {"message":"No se encontró un usuario para esta sesión."}
```

And **the webhook doesn't fix it on its own**: `user.created` doesn't fire
again for an account that already exists, so the block would be
permanent.
**Done:** `scripts/backfill-clerk-id.mjs` (`npm run migrate:clerk-id`).
**Walks Clerk, not Mongo** (T-12f). Clerk is the source of truth for
identity and each account has exactly one id, so by construction there's
no ambiguity. The first version went the other way — walking Mongo and
querying by email — and that's why the report filled up with cases that
looked like manual work but weren't.
**Measured against the real database (dry run, no writes):**

```
Accounts in Clerk: 11
Summary: {"linked-with-tiebreak":3,"linked":8}
Documents with no Clerk account: 65 (can't sign in)
```

In other words: 11 of 11 resolve on their own, zero manual cases.
**SERIOUS CORRECTION (T-12h): that dry run ran against the wrong
instance.** The keys in `.env` — and in Vercel's Production environment —
belong to a **development** instance with 11 accounts; production has
~70. Running it with `--apply` would have written development ids over
real users. Since T-12h the script refuses to write before that check.
**Don't run this until T-64 is closed.**
The 3 tiebreaks are the same person duplicated in Mongo — one copy with a
seller profile and one empty, leftovers from the old
`POST /api/register` — and are resolved by a written rule: the one with
`sellerId` wins, ties go to the older one. The 65 orphans **aren't
blocked**: with no Clerk account they can't even sign in, so they're not
this migration's job but T-11's. The first version counted them as a
problem, and that was noise.
**Eight tests**, including the real production tiebreak and the full
walk: a blocked user gets 404 → backfill → 201.
**How to run it on promotion day:**
1. `npm run migrate:clerk-id` — dry run, no writes. Review the listing.
2. `npm run migrate:clerk-id -- --apply`.
3. `npm run migrate:clerk-id -- --check` — **exits with code 1 if anyone
   is left unlinked.** This is the gate: if it's green, promotion can
   happen.
**Depends on:** T-12b, T-12c
**Model:** `opus` · **Nightly:** no

### [x] T-12d · Delete the public by-email route and get `SellerContext` off the client
**Why:** `GET /api/users/user-with-seller/[email]` **has no authentication
at all**. Verified by calling the handler with no session against
in-memory Mongo: it responds 200 with the user's full document (`_id`,
first name, last name, email, role, dates) and the seller's. It's an
account-enumeration oracle: anyone can try an email and learn whether it's
registered and with what role. The middleware doesn't cover it — it only
protects page routes, never `/api`.
**Why it exists:** only so `SellerContext` can ask "am I a seller?" from
the client, which is exactly the fetch-to-our-own-API pattern this roadmap
wants gone. With T-12c, the answer can already be given server-side
without querying by email at all.
**Done when:** the route and `getUserWithSellerByEmail` disappear;
`SellerContext` receives the user and seller from the server instead of
fetching them; a test confirms the route no longer exists.
**Heads up:** overlaps with T-30/T-31 (data layer and Server Components).
If opening it up shows the right home is inside T-31, note it and merge
them instead of doing the work twice. **Resolution:** kept inside T-12d —
it's a security fix on identity resolution, not a listing migration, so it
belongs with T-12c rather than waiting for T-31's broader Server Components
work.
**Done:** added `getSellerContextData()` to `src/utils/lib/auth.ts`. Unlike
`getAuthenticatedUser()`, it never throws — no session is a valid outcome
(anonymous visitor), not an error, since this now runs on every request via
the root layout. It resolves identity by `clerkId` (T-12c), populates
`sellerId`, and returns the exact `false`/`'None'`/object sentinels
`SellerContext`'s 9 consumers already expected, so none of them needed
changes. Root layout (`src/app/layout.jsx`) calls it and passes
`initialUser`/`initialSeller` into `SellerProvider`; `SellerContext.js` lost
its `useEffect` fetch, its `useUser()` import, and ~65 lines of an already-
dead, commented-out earlier version of the same provider.
**Serialization, not just auth:** a Mongoose lean+populate result contains
class instances (`ObjectId`, `Date`), and React rejects non-plain objects
crossing the Server → Client Component boundary. `getSellerContextData()`
round-trips the result through `JSON.parse(JSON.stringify(...))` before
returning it — confirmed necessary and sufficient with a dedicated test
asserting `_id` comes out as a `string`, not an `ObjectId`.
**Checked it wouldn't go stale after login:** moving this from a
`useUser()`-driven client fetch to server props resolved once per request
raised one real question — does the root layout re-run after
`setActive()` on a client-side `router.push('/')` (no hard reload), or does
Next's client router cache serve the pre-login layout? Traced it into the
installed `@clerk/nextjs` package: `ClerkProvider` calls `router.refresh()`
after every `setActive()` (`__unstable__onAfterSetActive`), which is
exactly what already made the `auth()` → `userId` prop into `SideBar` (in
`antojos/layout.jsx`/`marketplace/layout.jsx`) safe. Same guarantee here,
not a new assumption.
**Correction (T-125, 2026-09-14): the check above was wrong for
`SellerProvider`.** The refresh does re-render the layout with fresh props,
but the provider stored them with `useState(initialUser)`, which reads its
argument only on mount - so signing in or out without a full page load left
the context describing the previous visitor. `SideBar`'s `userId` is safe
because it uses the prop directly; state is not. The human hit it on a
preview; see T-125.
**Deleted as a consequence, not a target:** `src/services/server/userService.js`
(`getUserWithSellerByEmail` plus an already-unexported, already-dead
`populateSellerIdInUsers`) and `src/services/userService.js` (the client
`fetchAPI` wrapper) both lost their only real caller and had zero
importers left — `npm run deadcode` (knip) would fail on an orphaned file
otherwise. `getUserByEmail`, `services/userService.js`'s other export, was
already dead before this task (only reachable from the same deleted
commented-out block) and disappears with the file.
**Found, not fixed — separate ticket territory:** `GET /api/users/[id]/route.js`
has the same shape of problem (no auth, returns the full `User` by email or
id, 404 otherwise) and is untouched here — out of this task's stated scope,
and its only internal caller (`getUserByEmail`) is now gone too, so it's
reachable only by someone hitting the URL directly.
**Tests:** `tests/integration/user-with-seller-cerrado.test.js` (same
pattern as T-11's `register-cerrado.test.js`: importing the deleted route
module throws, so Next would genuinely 404 it) and
`tests/integration/sellerContextData.test.js` (no session, a `clerkId` with
no matching `User` — lost webhook event, T-12b — a buyer with no seller,
and a seller owner, plus the JSON-serializability check above).
**Model:** `opus` · **Nightly:** no

### [~] T-12 · Admin role in Clerk claims
> **Code is done; the migration can't actually apply yet — this is a T-64b
> situation, not a missing flag.** `npm run set-admin-metadata` found 4
> Mongo `User`s with `role: 'admin'`: 3 have a `clerkId`
> (`sajhdg30@gmail.com` — the project owner's own — `marcogp3510@gmail.com`,
> `victorvillarez12@gmail.com`), 1 (`test@example.com`) has none and can't
> log in anyway (T-12c). Tried `--apply --permitir-desarrollo` (the
> instance the `.env` and Vercel Production point to really is the
> "development" one that serves the live site, per T-64's decision) and
> `comprobarInstancia()`'s cross-instance check refused: an already-linked
> `clerkId` it sampled doesn't resolve against that instance. Checked all
> 3 target admins individually against the Backend API — **all three
> `clerkId`s 404 against the live instance.** They're stale: leftover from
> the old **production** Clerk instance (the one with ~70 accounts, not
> the one currently serving `mercampus.vercel.app`), and none of the three
> has gone through T-64b's reclaim flow yet (confirmed for the owner's own
> account: exactly one `User` document, still holding the pre-T-64
> `clerkId`, no second "fresh" document from a webhook-created sign-in).
> **The actual sequence to unblock this:** each of the 3 has to sign in on
> the live site at least once (creates a fresh `User` via the webhook on
> the *current* instance) → run `npm run reclaim:account` (T-64b) to remap
> the old `User` (role, `sellerId`, everything) onto that new `clerkId` →
> only then does `npm run set-admin-metadata -- --apply
> --permitir-desarrollo` have a valid target. None of that is this task's
> to execute — it needs the actual people to log in — so T-12 stays `[~]`
> with the code merged and the migration script ready and correct, blocked
> on a prerequisite this repo already knew about (T-64b) rather than a new
> problem T-12 introduced.
**Why:** today it's resolved with an in-memory `Map` and a module-level
`setInterval` inside a route. In serverless that's a per-instance cache and
an interval that never gets cleaned up.
**Done when:** the role lives in Clerk's `publicMetadata`; the middleware
protects `/admin/*` and `/api/**/admin`; the `Map` and `setInterval` are
gone.
**Done:** `src/middleware.js` gates `/admin(.*)` and `/api/(.*)/admin(.*)`
before any handler runs: no session → sign-in redirect (pages) or 401
(API); session but `publicMetadata.role !== 'admin'` → redirect home
(pages) or 403 (API). `api/sellers/admin/route.js` lost its `Map`,
`setInterval`, and its own `currentUser()`-based check entirely — the
route now trusts the middleware and only fetches data, the same way
`isProtectedRoute` already gated seller-only pages with no per-page
recheck.
**Why `publicMetadata` and not `sessionClaims`:** reading `publicMetadata`
straight from the session JWT (`sessionClaims`) needs the session token
customized in Clerk's dashboard first — an infrastructure change outside
code, and exactly the kind of global Clerk-instance setting this repo has
been burned by before (T-64). Went with `clerkClient().users.getUser(userId)`
instead: a Backend API call, same cost class the old code already paid via
`currentUser()`, but now only for the userId actually hitting an admin
route (not cached, not needed) instead of every request.
**Kept out of `getSellerContextData()` on purpose:** the admin check isn't
folded into the root layout's per-request user/seller resolution
(T-12d). That runs on every page for every visitor; adding a Backend API
call there to support a feature one user needs would tax everyone else.
Mongo `User.role` still drives the `SideBar`/`SellerGrid` "Administración"
UI hints unchanged — a stale hint fails safe (worst case: a hidden link
that still 403s, or a shown link that redirects home), since the real gate
is the middleware, not the sidebar.
**Regression caught by the build itself:** removing the route's `req`
param and its `currentUser()` call left it with nothing request-specific,
so Next optimized `GET /api/sellers/admin` as a **static** route — it
would have served one Mongo snapshot from build time to every admin
forever. Caught by re-checking the build output after simplifying the
route; fixed with `export const dynamic = 'force-dynamic'`.
**Migration:** `scripts/set-admin-metadata.mjs` (`npm run
set-admin-metadata`), same shape as `backfill-clerk-id.mjs` — reuses its
`comprobarInstancia()` instance guard, dry run by default, `--apply`
explicit. Copies `role: 'admin'` from Mongo into Clerk `publicMetadata`
for every admin that already has a `clerkId`, merging into whatever
`publicMetadata` a user already had instead of overwriting it.
**Tests:** `tests/unit/adminAccess.test.js` covers the pure
allow/signin/redirect-home/401/403 decision table
(`src/utils/lib/adminAccess.ts`, factored out of `middleware.js` so it's
testable without mocking Clerk's request-signing internals);
`tests/integration/middleware-admin.test.js` exercises the real exported
middleware with `clerkMiddleware`/`clerkClient` mocked (route matching
itself stays real); `tests/integration/set-admin-metadata.test.js` covers
the migration's dry-run/apply/idempotency/merge behavior.
**Model:** `opus` · **Nightly:** no

### [x] T-13 · Zod validation on every edge
**Why:** `new Product(body)` accepts whatever the client sends. Query
params aren't validated either.
**Done when:** one Zod schema per endpoint in `src/lib/validators/`;
handlers return 400 with per-field detail; invalid-payload tests.
**Already done:** `src/lib/validators/` with product and seller schemas
and the 400-response helper. Covers `POST /api/products`,
`PUT /api/products/[id]`, `PUT /api/sellers/[id]`, and the query params on
`GET /api/products`. Zod drops whatever it doesn't declare, so this also
closes mass assignment: the client can no longer send `sellerId` or
`approved` in the body.
**Missing (T-13b):** `POST /api/sellers`, `POST /api/register` (pending
T-11's decision), schedules, pqrs, and users. Split off to stay under the
~15-file PR limit.
**Status after T-13b and T-13c:** everything covered except
`POST /api/register`, still blocked on T-11's decision (delete the route
or protect it). This task stays `[~]` only because of that.
**Closed (T-11): the route was deleted.** No mutation edge is left without
Zod — the only pending one was that route, and it no longer exists.
**Model:** `sonnet` — repetitive, with clear criteria
**Nightly:** yes

### [x] T-13b · Finish Zod validation
**Why:** T-13 covered products and sellers. The rest of the endpoints
still accept whatever the client sends.
**Done when:** schemas for `POST /api/sellers`, schedules, pqrs, and
users, with their invalid-payload tests. `POST /api/register` is separate
because T-11 decides whether it even exists.
**Correction:** there's no user-mutation endpoint besides
`POST /api/register` (already out of scope, per its own criteria) and
Clerk's webhook, which already verifies its signature with svix and
doesn't need Zod on top. "Users" had nothing to cover.
**Done:** new `src/lib/validators/schedule.ts` and
`src/lib/validators/pqrs.ts`; T-13's `createSellerSchema` is finally wired
up. Covers `POST /api/sellers`, `POST /api/schedules`, and
`POST /api/pqrs`.
**Two bugs found and fixed, needed to make the tests honest:**
- `POST /api/sellers` and `POST /api/pqrs` wrapped the save in
  `try { ... } catch { logger.debug(error) }` and returned success **no
  matter what**. A real Mongoose failure (or a user with no associated
  `User`, exactly the case that broke the webhook per T-05) was silenced
  and the client got a 201/"created" with nothing actually created.
- `POST /api/pqrs` did `NextResponse.json({ status: 201 })` **with no
  second argument**: `status` ended up as just another field in the body,
  and the real HTTP status was always 200.
- In `POST /api/schedules`, a `day` that didn't exactly match `daysES`
  made `indexOf` return `-1` and the schedule got saved with `day: 0`,
  silently. Now it's rejected with 400 before getting there.
**Finding, not fixed, noted for another task:** `POST /api/schedules`
doesn't check that the caller owns the `sellerId` they send — anyone with
a session can delete and replace any seller's schedule. Same family as
T-10, but on a route T-10 didn't touch. Candidate: T-10b.
**Depends on:** T-13
**Model:** `sonnet` · **Nightly:** yes

### [x] T-13c · Seller phone number travels as a string
**Why:** found in T-15b. `createSellerSchema` and `updateSellerSchema`
declare `phoneNumber: z.number()`, but the client always sends a string:
- `sellers/register/page.jsx` stores
  `value.replace(/\D/g, '').slice(0, 10)`, a string of digits. Since the
  schema got wired up in T-13b, **seller sign-up always responds 400**.
- `sellers/profile/edit/page.jsx` stores `e.target.value` **unformatted**,
  and the input's value is the already-formatted text: editing the phone
  sends `"(300) 123-4567"` and the PUT responds 400.
T-13b's integration tests didn't catch it because they send
`phoneNumber: 3000000000` (a number) by hand, not what the form actually
sends.
**Evidence:** `createSellerSchema.safeParse({ businessName: 'Arepas Ana',
phoneNumber: '3001234567' })` → `success: false`,
`"Invalid input: expected number, received string"`. With `3001234567` it
passes.
**Watch out for register's `.slice(0, 10)`:** it repeats logic T-15b
already fixed inside `formatPhone`, so a pasted `+57` gets saved as
`5730012345`. When unifying, extract the normalizer from `utilFn.js`
instead of duplicating it.
**Done when:** client and server agree on the type — Mongoose
(`sellerSchema2.phoneNumber: Number`) and Zod already agree, so either fix
the form or accept the string with `z.coerce`, not both — and there's an
integration test that sends **the form's real payload**, not one written
by hand.
**Done:** the normalizer moved from `utilFn.js` to `src/lib/phone.ts`
(`toNationalPhone` + `isNationalPhone`), now used by all three places that
touch a phone number: `formatPhone` to display it, the Zod schema to
validate it, and seller sign-up to store it. The field now goes
normalize-then-validate
(`union(string, number) → toNationalPhone → isNationalPhone → Number`), so
it accepts what real forms actually send — `'3001234567'`,
`'(300) 123-4567'`, `'+57 300 123 4567'` — and Mongoose still gets a
`Number`.
**Why it also validates it doesn't start with zero:** the phone is stored
as a `Number`, so a `'0300123456'` would become `300123456` and silently
lose a digit. Now it's rejected with 400.
**Watch out for `.transform(Number)`:** no integration test catches it,
because Mongoose converts the string on its own when saving. It stays
anyway — the validator's contract is to deliver the data in the model's
type, not rely on an implicit conversion — and it's pinned with a unit
test on the schema, which does fail if it's removed.
**Still unnormalized:** `sellers/profile/edit/page.jsx` stores the
already-formatted text in its state. It works because the schema
normalizes it, but the client's state and what's in the database don't
match until reload. Left this way on purpose: fixing it properly means
`InputFields` emitting the clean value in its `onChange` instead of the
raw event, and that touches every one of its consumers.
**Underlying debt, not this task's:** `phoneNumber` as a `Number` is
fragile — no leading zeros, no country code — and should be a `string`.
Changing it means migrating data, so it goes with T-30.
**Depends on:** T-13b
**Model:** `sonnet` · **Nightly:** yes

### [x] T-14 · Dead and broken endpoints
**Why:** the PUT and DELETE in `api/sellers/route.js` use `req.query`,
which doesn't exist in the App Router: they never worked.
`api/sellers/availability` is entirely commented out, so automatic
schedule-based availability doesn't work.
**Another candidate, seen in T-13b:** `GET /api/schedules` filters by
`req.sellerid` (a field that doesn't exist on `NextRequest`, so it's
always `undefined`). Nothing in the frontend calls it —
`Schedule.jsx` only uses the `POST`. `GET /api/schedules/[id]` is the
route that actually works and is used.
**Decision (2026-09-06):** restore it, don't delete it. The human
confirmed they want automatic "open now" back — the `Seller.availability`
field and its badge (`AvailabilityBadge.jsx`) already exist and are
already shown to buyers; it just needs to update itself. `allowedIPs.js`
no longer exists (T-34 deleted it), so there's nothing to "replace": the
new guard is straightforward, no migrating anything old.
**Done when:** the dead handlers in `api/sellers/route.js` are removed;
`api/sellers/availability`'s `PATCH` (already written, just commented
out — see the file) is uncommented and guarded with a `CRON_SECRET` in
the `Authorization` header, not IPs; a Vercel cron (`vercel.json` →
`crons`) calls it every 5-10 minutes. A test confirms that without the
right secret the route responds 401 and doesn't touch any `Seller`.
**Model:** `sonnet` — the product decision is already made, what's left
is implementation with the logic already written
**Nightly:** yes
**Done:** the dead `PUT`/`DELETE` in `api/sellers/route.js` are gone
(confirmed zero frontend callers — the real edit path is `PUT
/api/sellers/[id]`, which already works and has its own tests).
`api/sellers/availability`'s handler is uncommented, guarded with
`CRON_SECRET` (fails closed if the env var itself is unset, not just on a
mismatched header), and called every 10 minutes by a GitHub Actions
workflow (see below for why not Vercel's native cron for the frequent
trigger).
**Two bugs caught in the "already written" logic before shipping it,
not left for later:**
1. **It was exported as `PATCH`; Vercel Cron always calls the configured
   path with `GET`.** Shipped as written, the cron would have hit a route
   with no `GET` handler — a silent 405, availability never updating,
   with nothing in the logs pointing at why. Renamed to `GET`.
2. **The day/time math used the runtime's local clock** (`now.getDay()`,
   `now.toTimeString()`). Vercel's functions run in UTC; sellers' schedules
   are entered in Bogotá time (UTC-5). Left as written, the cron would
   have compared against the wrong hour (and sometimes the wrong day)
   every single run — not unimplemented, actively wrong, which is worse
   for a badge buyers already see and trust. Colombia has no DST, so a
   fixed 5-hour offset computed via UTC getters (not the runtime's
   configured timezone) is enough; no dependency needed.
**Test:** `tests/integration/availability-cron.test.js` — no
`Authorization`, a wrong secret, and `CRON_SECRET` itself unset all get
401 without touching any `Seller`; with the right secret, the seeded
approved seller (Monday/Wednesday 08:00-16:00, Friday 10:00-18:00) is
forced `availability: false` then correctly flipped back to `true` at a
mocked Monday-10am-Bogotá timestamp, and to `false` at Monday-8pm-Bogotá
— including a case where the mocked instant is already Tuesday in UTC,
to confirm the timezone shift (not just the hour) is right.
**Confirmed against real infra, not guessed at: the Vercel plan blocks
sub-daily crons — the PR's own preview deployment failed on it.** `*/10
* * * *` in `vercel.json` made the Vercel deployment check fail outright;
the link Vercel gave for the failure redirects straight to
`vercel.com/docs/cron-jobs/usage-and-pricing`, which states Hobby plans
are capped at once a day and reject anything more frequent **at deploy
time**. A once-daily update would leave "open now" stale basically all
day, defeating the point of the badge, so `vercel.json`'s cron stays at
once a day (`0 5 * * *`, a redundant fallback) and
**`.github/workflows/availability-cron.yml`** is the real trigger: a
scheduled GitHub Actions workflow, outside Vercel's cron system entirely,
that calls the same protected route every 10 minutes with `curl` and a
repo secret.
**Went live 2026-09-13 and has failed every run since, measured:** the
workflow only fires from the default branch, so it started with the
`develop -> main` promotion (#306 merged 20:26 UTC). Runs at 20:37, 20:44
and 20:52 all failed with `curl: (22) The requested URL returned error:
401`. The repo has **no `CRON_SECRET` secret** (`gh secret list`: only
`CLERK_SECRET_KEY` and `NEXT_PUBLIC_IMAGEKIT_KEY`), so the header goes out
as an empty Bearer. The workflow file's own header predicted exactly this
("calls will 401, harmlessly") - but a comment inside a YAML file is not a
promotion checklist, which is the same gap T-11b fell into. **Not a
regression:** in `main` before that promotion this route's handler was
commented out entirely, so no cron had ever updated availability in
production. **What it needs is two values that must match:** `CRON_SECRET`
in Vercel's Production environment *and* a GitHub repo secret of the same
name. Until both exist it fails ~144 times a day, and GitHub emails the
repo owner about scheduled-workflow failures.
**Resolved the same day, and verified end to end.** A fresh 64-hex value was
generated locally with no trailing newline - a single stray byte of
difference between the two stores keeps the Bearer from matching - and set,
by CLI with the human's explicit authorisation, as the GitHub repo secret
and as a *Sensitive* Production variable in Vercel. It was passed on stdin
(never `--value`, which puts it on a command line), never printed, and the
local file was deleted. The agent's own production redeploy was refused by
the permission classifier, so the human redeployed from the dashboard
(`mercampus-ggh3jj6ol`, 20:16 Bogotá). A manual `workflow_dispatch` run at
01:21 UTC answered **success**. The scheduled run at 01:15 UTC still failed,
and that is expected: it hit the previous deployment, and Vercel only applies
an environment change to deployments created after it.
**Worth knowing before wiring it up:** the first successful run will
recompute `availability` for every seller from their `Schedule`, in
production, for the first time ever. Stored values that disagree with a
schedule will flip on the badge buyers see. That is the feature working,
but it is a visible change and worth expecting.
**Needs a human to actually turn on — can't be done from here:** the
workflow's `${{ secrets.CRON_SECRET }}` has to be a GitHub Actions repo
secret holding the *same* value as the `CRON_SECRET` environment variable
on the Vercel project. That's two separate dashboards; until both are set
to the same value, calls just 401 harmlessly (safe default, not broken —
it fails the way it's supposed to fail without the secret).
**Left alone on purpose:** `GET /api/schedules`'s dead `req.sellerid`
filter (T-13b's finding) — not part of this task's "done when", and
nothing in the frontend calls it.

### [x] T-15 · Typed errors and logger
**Why:** `console.log` everywhere, inconsistent error messages, `AppError`
used somewhere it isn't even imported (`api/products/[id]` DELETE, fixed
in T-10).
**Watch the count:** there were 169; after T-34's deletions, 104 were
left, spread across about 43 files. That's why it's split.
**Done when:** a single error-response helper; a logger with levels that
doesn't print in test; zero `console.log` outside `scripts/`.
**Already done:** `src/lib/logger.ts` (levels, silent in test, context as
a separate object) and `src/lib/api-response.ts`, which unifies
`invalidPayload` and `errorResponse` and **never returns a 500's message
to the client**. Migrated the entire API layer: 34 calls across 12 files,
with a test that blocks a `console.*` from sneaking back in there.
**Closed in T-13c** (bookkeeping, not code): the other 70 calls were
migrated by T-15c and T-15d, and the criterion is met. Verified: the only
`console.*` calls left in `src/` are the two **inside**
`src/lib/logger.ts`, which is where they belong. The guard test walks all
of `src/`.
**On unifying error bodies:** handlers sometimes return `{ error }` and
sometimes `{ message }`. Changing that would alter the contract the
frontend consumes, so `errorResponse` is only used where the shape
already matches. Fully unifying it is T-32's job, once mutations move to
Server Actions.
**Model:** `sonnet` · **Nightly:** yes

### [x] T-15c · Logger in components and context
**Why:** 29 `console.*` calls left in `src/components/` and
`src/context/`.
**Done when:** migrated to the logger; the test guarding `src/app/api`
extended to cover these folders too.
**Heads up:** these are client components, so the logger also runs in the
browser. Next replaces `process.env.X` with undefined in the client
bundle, so `LOG_LEVEL` doesn't apply there and the level is decided by
`NODE_ENV`. Verified with e2e, which loads these components in a real
Chromium.
**Depends on:** T-15
**Model:** `sonnet` · **Nightly:** yes

### [x] T-15d · Logger in services, utilities, and pages
**Why:** 41 `console.*` calls left in `src/services/`, `src/utils/`, and
the non-API pages under `src/app/`.
**Done when:** migrated to the logger; the guard now covers all of
`src/`, so T-15's criterion (zero `console.log` outside `scripts/`) is
closed.
**Done:** 41 calls migrated across 16 files. The guard now walks all of
`src/` (not just the already-migrated folders) and also counts a
**commented-out** `console.log` as a failure: three leftover debug lines
like that were found and removed. The logger normalizes context (Error,
string, number, or object) so a `catch (error)` in TypeScript doesn't need
casts.
**Depends on:** T-15
**Model:** `sonnet` · **Nightly:** yes

### [x] T-15b · Fix currency and phone formatting
**Why:** `priceFormat` uses `en-US` with `currency: 'USD'` in a Colombian
marketplace (`1500 → '$1,500'` instead of `'$1.500'`). `formatPhone`
breaks with a country code.
**Done when:** `priceFormat` uses `es-CO` with `currency: 'COP'`;
`formatPhone` correctly handles the `+57` prefix; T-02's tests updated to
reflect the correct behavior.
**Correcting the premise:** the result of `es-CO` + `COP` is **not**
`'$1.500'` but `'$ 1.500'`: ICU separates the symbol from the amount with
a hard space (U+00A0). It's the locale's canonical form, so it's left as
is, and the tests assert it with the `NBSP` constant instead of an
invisible character in the literal.
**Done:** `priceFormat` and `formatValue` (which now delegates to the
former) in `es-CO`/`COP`; `formatPhone` drops the `57` country code only
when more than 10 digits are left — no Colombian national number starts
with 57 (mobiles start with 3, landlines with 60), and the guard prevents
eating the first three digits of a 10-digit number. Three tested mutations
(reverting to `en-US`/`USD`, removing the country-code drop, dropping it
without the guard) each kill one test.
**Watch out for ICU:** the default `maximumFractionDigits` for COP
**depends on the ICU version**. Left unset, `priceFormat(1500.5)` gave
`'$ 1.500,5'` locally (Node 22.20) and `'$ 1.501'` on the CI runner — the
first attempt passed locally and broke `quality`. Now it's explicitly set
to 0, which is correct (peso cents don't circulate and the price is an
integer in `productSchema`) and makes the format independent of the
machine. If currency ever needs formatting elsewhere, don't trust the
locale's defaults: pin them.
**Watch out for the e2e:** `recorrido.spec.js` asserted the price as
`'6,000'`, so it caught the change. Now it asserts `/\$\s*6\.000/` and
also that `'6,000'` doesn't appear.
**Finding, not fixed, see T-13c:** the phone reaches the server as a
string and `createSellerSchema` requires a `number`.
**Model:** `sonnet` · **Nightly:** yes

---

## Phase 2 — Performance and data

Almost this whole phase is nightly-friendly: unambiguous criteria and
tests that catch the error.

### [x] T-20 · Move the migration out of the read handler
**Why:** `GET /api/products` runs
`updateMany({section: {$exists: false}})` on **every** request. A
one-time migration has been running on every page load for a year.
**Done when:** the migration lives in `scripts/`, the handler only reads.
**Pending execution:** the script exists (`npm run migrate:product-section`)
but nobody has run it against the real database yet. It requires `--yes`
because it writes. Unlike the seed, this migration actually is meant for
production.
**Model:** `sonnet` · **Nightly:** yes

### [x] T-21 · Indexes
**Why:** no schema defines any indexes. Everything is a collection scan.
**Done when:** indexes on `Product.sellerId`, `Product.section`,
`Schedule.sellerId`, `User.email`, `Seller.userId`, `Seller.university`;
verified with `.explain()` in a test or script.
**Watch out with `Product.section`:** it only has two possible values, so
as a standalone index it's not very selective and Mongo may ignore it.
What would actually help is a compound `{section, sellerId}` or
`{section, category}`. The simple one was implemented because that's what
the criterion asks for; the compound one deserves measuring against real
data before adding it.
**Model:** `sonnet` · **Nightly:** yes

### [x] T-22 · Kill the schedule N+1
**Why:** one `Schedule.find()` per product and per seller. With 50
products that's 51 queries.
**Done when:** a single query with `$in` (or a `$lookup`) and grouping in
memory; a test that counts the queries emitted.
**One left untouched:** `api/sellers/admin/route.js` has the same pattern,
but T-12 rewrites that whole route (the in-memory Map and the
setInterval). The `src/utils/lib/schedules.ts` helper is already there to
use there.
**Model:** `sonnet` · **Nightly:** yes

### [x] T-23 · Real pagination
**Why:** `productService` sends `limit` and `offset` that the route
ignores; the whole collection loads, gets sorted in JS, and filtered
after populating. `react-intersection-observer` is installed but unused.
**Done when:** the query paginates in Mongo with a cursor; infinite scroll
works on the listing; an e2e test that scrolls and loads a second page.
**Depends on:** T-04, T-21
**Scope:** `GET /api/products` only. `GET /api/sellers` has the exact same
shape of problem (`Seller.find()` with no filter, `.filter()` in JS for
university/section) but the roadmap talks about "the listing" singular and
sellers already got its own task history (T-14); left untouched here.
**The real blocker wasn't the cursor, it was where filtering happened.**
`populate({ path: 'sellerId', match: { approved, university } })` fetched
the *entire* matching collection, populated it, and only discarded
unapproved/wrong-university sellers **after** — so a Mongo `.limit()`
wouldn't know how many of a page's items would survive that filter. Moved
the eligibility check ahead of the query instead: `Seller.find({approved,
university}).distinct('_id')` once, then `Product.find` filters by
`sellerId: {$in: eligibleIds}` directly — the same two-step
"resolve ids in one collection, filter the other by `$in`" pattern
`api/sellers/route.js` already used for its `section` filter, not a new
idiom.
**The random shuffle had to go.** `products.sort(() => Math.random() -
0.5)` picked a fresh order every request — fundamentally incompatible with
a stable cursor (page 2 could repeat or skip page 1's items, since there
was never a persisted order to resume from). Replaced with a deterministic
sort: `availability desc, createdAt desc, _id desc`. Keeps the original
intent (open-now sellers surface first) while making every page
reproducible. Considered and rejected a seeded/session-stable shuffle for
variety — real complexity for a food-listing sort order the task never
asked to preserve.
**Cursor:** opaque base64url JSON of `{availability, createdAt, id}` —
the exact fields of the last item on a page, decoded and validated inside
`productQuerySchema` itself (a malformed cursor is a Zod issue, 400, not a
try/catch in the route). Accepted, minor edge case left in the open: if a
seller's `availability` flips (the T-14 cron runs every 10 min) *between*
two of a user's own page fetches in the same scroll session, keyset
pagination on a mutable sort key can duplicate or skip one item at the
boundary. Same class of eventual-consistency gap every infinite-scroll UI
accepts; not worth a snapshot-isolation design for a food marketplace
listing.
**Frontend:** `ProductGrid.jsx` — `react-intersection-observer`'s
`useInView` on a sentinel div at the list's end triggers the next fetch;
a `requestId` ref discards a stale response if the filters change while a
"load more" is still in flight. `productService.getProducts()` moved from
7 positional params (about to become 9) to an options object; single
caller updated in the same change.
**Index:** `productSchema.index({ section: 1, availability: -1, createdAt:
-1 })`, matching the new sort — confirmed with `.explain()` in the test, same
pattern as T-21.
**e2e caught two real bugs in the test itself, not in the feature:**
`window.scrollTo` scrolled the browser window, but the listing scrolls
inside its own `overflow-y-scroll` container (`Layout.jsx`) — the window
never moves, so the trigger did nothing. Fixed with
`locator.scrollIntoViewIfNeeded()`, which finds the real scrollable
ancestor. And `page.getByText('Antojo de scroll 1')` (Playwright's default
substring match) also matched "10" through "15" — needed `{ exact: true }`.
**Seed data lives only in `scripts/e2e.mjs`, not `seedDatabase()`:** the
shared seed's 3 visible antojos aren't enough to fill a 12-item page, but
growing it there would break every other test/e2e that asserts on it by
name. 15 extra products are added after seeding, specifically for this
e2e run — `availability: false` and a backdated `createdAt` so they sort
*after* the original 3, not ahead of them.
**A real Mongoose gotcha, not a guess:** backdating those 15 products'
`createdAt` via `Product.updateMany(..., { $set: { createdAt } })` silently
didn't work — Mongoose's `timestamps` middleware overwrites `createdAt`
with the current time on any update, even one that explicitly sets it.
Confirmed by inspecting the written value before concluding, not assumed.
Fixed with `Product.collection.updateMany(...)` (the native driver,
bypassing Mongoose's schema middleware entirely).
**Model:** `opusplan` to plan, `sonnet` to execute
**Nightly:** no

### [x] T-24 · Decent search
**Why:** an unanchored `$regex` on `name`, no tolerance for typos or
accents. "arepa" doesn't find "Arepas".
**Correction on the example above:** "arepa" *does* find "Arepas" today —
it's a literal substring. The real gap runs the other way: searching
"arepas" (plural) does **not** find a product named "Arepa de queso"
(singular) — a morphology problem, not an accent one, and more common than
it sounds given 87% of product names are more than one word (see below).
**Measured against the real database before designing anything** (no
search-query logging exists yet — that's T-60 — so this is exposure, not
confirmed user failures): of 112 real products, 7 (6%) have an accented
character or ñ in the name buyers search, and 97 (87%) have multi-word
names. Small catalog, so not "half of searches fail," but not
hypothetical either — real names like "Postre de limón" and "Sándwiches
cubanos" are exactly what an unaccented, fast, one-handed phone search
would miss today.
**Done when:** a MongoDB text index (or Atlas Search if the cluster
allows it), accent-insensitive, with ranking; tests with typos and
accents.
**Rejected, and why — checked, not assumed:**
- **Atlas Search:** the roadmap's own hedge ("if the cluster allows it")
  turned out to be the deciding factor. `$search` needs Atlas's separate
  Lucene sidecar process, which doesn't exist in `mongodb-memory-server` —
  the engine every test in this repo runs against. Choosing it would mean
  shipping a feature with zero test coverage against the harness Fase 0
  built specifically so nothing ships unverified.
- **MongoDB `$text` index:** implemented first, then reverted after
  measuring it against real product names instead of assuming it would
  work. `SearchBox.jsx` searches live from 2 characters with a 500ms
  debounce — genuine type-ahead. `$text` matches whole words/stems, not
  prefixes: tested directly, `"bro"` and `"brow"` find nothing against
  "Brownie de chocolate," only `"browni"` onward does. Shipping that would
  have made the search box feel broken for the first several keystrokes of
  most words — a real regression to working behavior, discovered by
  testing before shipping rather than after.
**Done:** `buildAccentInsensitiveRegex()` (`src/utils/lib/search.ts`) —
normalizes the query term (Unicode NFD, strip combining diacritics,
lowercase), then rebuilds it into a regex where each vowel/ñ becomes a
character class matching every accented variant (`limon` →
`l[ií...]m[oó...]n`... `n` → `[nñ]`), keeping `$options`-free case
insensitivity via the regex `i` flag. Replaces `filter.name = { $regex:
product, $options: 'i' }` with `filter.name =
buildAccentInsensitiveRegex(product)` — same substring/prefix matching
behavior as before (verified: `"are"` still finds "Arepa de queso"),
now accent-insensitive on either side (query has the accent, name doesn't,
or vice versa). Doesn't fix the plural/singular gap from the correction
above, but a live type-ahead search self-mitigates most of that in
practice: reaching "arepas" already passed through the matching "arepa"
substring at an earlier keystroke.
**No schema or index change, no migration:** the normalization happens on
the query term at request time, not on stored data — nothing to backfill,
works retroactively on the existing 112 products immediately.
**Tests:** `tests/unit/search.test.js` — the regex builder directly:
accent either direction, ñ either direction, case-insensitivity, prefix
matching preserved (the exact property `$text` would have broken),
special regex characters escaped instead of throwing. Plus a "genuinely
absent term finds nothing" control. `tests/integration/busqueda-productos.test.js`
covers the same through the real route: an unaccented query finds
"Buñuelo," a short prefix still works end-to-end, a pending seller's
products stay excluded from search results too, and a term with regex
metacharacters doesn't 500.
**Model:** `opusplan` · **Nightly:** no

---

## Phase 3 — Architecture

The big rewrite. All yours, with `opusplan` — except the final cleanup,
which is nightly work.

### [ ] T-30 · Server-side data layer
**Why:** today the data-access logic lives inside the route handlers, so
it can't be reused from Server Components.
**Done when:** `src/server/products.ts`, `sellers.ts`, `schedules.ts`
with pure functions that query Mongo; the route handlers become thin
wrappers; unit tests on that layer.
**Depends on:** T-05, T-13
**Model:** `opusplan` · **Nightly:** no

### [ ] T-31 · Migrate the listings to Server Components
**Why:** 44 files with `'use client'` and the app calling its own API
over HTTP. On Vercel that's the server calling itself: latency and an
extra function per request.
**Done when:** `/antojos`, `/marketplace`, and `/antojos/[id]` render
server-side, querying `src/server/` directly; filters keep working via
searchParams; e2e green; a before/after Lighthouse comparison in the PR.
**Depends on:** T-30
**Model:** `opusplan` · **Nightly:** no

### [ ] T-32 · Mutations via Server Actions
**Done when:** creating, editing, and deleting a product go through
Server Actions with Zod validation and `revalidatePath`;
`services/api.js` and `services/apiToken.js` are removed.
**Depends on:** T-30, T-10
**Model:** `opusplan` · **Nightly:** no

### [x] T-33 · Deduplicate components
**Why:** `ProductCard`/`ProductCardAV` differ by 32 lines,
`SellerCard`/`SellerCardAV` by 10, `TableSche`/`TableSchema` by 63.
**`TableSche`/`TableSchema` no longer applied:** `TableSche.jsx` had 0
importers and was deleted in T-34. Only `TableSchema.jsx` remains, no
duplicate left to merge.
**Done:** `ProductCard` and `SellerCard` now accept a `variant`
(`'standalone'` by default, `'embedded'`); `ProductCardAV` and
`SellerCardAV` removed and their two call sites (product editing, seller
admin) point at the single component.
**e2e's real limit, and how it was covered:** the e2e's original four
screens don't exercise the `'embedded'` variant of either component —
only product editing and the admin panel use it, both authenticated
routes Playwright can't visit yet (no simulated Clerk session). Added a
fifth screen (`/antojos/sellers/list`) that does exercise `SellerCard` for
real, and the two variants' className logic was extracted into
`src/lib/card-variant.js` — a JSX-free module on its own — with unit tests
that do cover `'embedded'`, verified by mutation.
**Finding, not fixed:** writing the fifth screen showed — first
incorrectly, then corrected — that `GET /api/sellers` **doesn't filter by
`approved`**: it returns every seller. The public listing only looks
clean because `SellerGrid.jsx` filters client-side; anyone calling the API
directly also sees pending-approval sellers. Not as serious as T-10b (no
write involved, just reading non-sensitive data), but the same family of
problem: a business rule that only lives on the client.
**Model:** `sonnet` · **Nightly:** yes (the e2e with screenshots is the
safety net)

### [x] T-34 · Delete the dead code
**Why:** nobody imports `SellerContext2.js` (everyone uses
`SellerContext`); same for `RegisterSellerForm.jsx`, `pqrsService.js`,
`allowedIPs.js`, and `favoriteSchema.js` — the last one also does
`module.exports = mongoose.model(...)` without the
`mongoose.models ||` guard, so it would blow up with `OverwriteModelError`
if anyone imported it.
**Gotten ahead of in T-01:** `src/app/api/categories/route.js` and
`src/utils/models/categorySchema.js` were already removed. Nobody imported
them, and categories come from `utils/resources/categories.js` and
`utils/categoriesList.js`; also that endpoint was the only one with a
`GET()` taking no arguments, so Next prerendered it at build time and it
broke.
**New candidate:** `src/utils/lib/clerkUser.js`, 0 importers. Found in
T-05, where it also turned out not to compile under TS.
**Done when:** deleted, with the reference search documented in the PR;
`knip` or similar added to CI so it doesn't accumulate again.
**Deleted (10):** the five from the list, plus `lib/clerkUser.js` (T-05)
and four knip found: `TableSche.jsx`, `services/auth/server/seller.js`,
`services/auth/server/user.js`, and `utils/auth/client/seller.js`. The
last two were also broken: they imported symbols their source doesn't
export.
**knip only fails the build on dead files.** The 9 unused dependencies it
flags belong to **T-35** (next-auth, bcryptjs, jsonwebtoken, cookies, and
whichever image provider gets dropped), and the 10 unused exports belong
to **T-30**, once the data layer absorbs the services. They stay as
visible warnings in the log until then.
**Model:** `sonnet` · **Nightly:** yes

### [x] T-35 · A single image provider
**Why:** Cloudinary and ImageKit are both installed, each with its own
route. `next-auth`, `bcryptjs`, `jsonwebtoken`, and `cookies` are also
leftovers from before Clerk.
**Done when:** one is chosen, the other is removed along with its route
and dependency; `package.json` with no unused dependencies.
**The dead pre-Clerk dependencies were split out as T-109**, because that
half needs no decision from anybody. What is left here is the provider
choice.
**The data has mostly made it (measured 2026-09-13, read-only):** 150 product
images and 53 seller logos are on ImageKit, against 2 legacy product images
on Cloudinary, and every form uploads through `ImageGrid` -> `/api/images`,
which is ImageKit. The Cloudinary route has no caller in the repo; see
T-116. Keeping ImageKit is the path of least migration; the 2 Cloudinary
URLs still render without any Cloudinary key, since they are public.
**Decided by the human (2026-09-15): ImageKit.** Cloudinary was already dead
code by the time the decision landed - T-116 had deleted its only route and
importer, and T-109/T-113 had already found zero references left under
`src/`. Done in the same PR: `cloudinary` and `next-cloudinary` removed from
`package.json` (`npm uninstall`, lockfile updated), the `CLOUDINARY_*`
section dropped from `.env.example`, and the matching `KNOWN_ORPHANS`
entries removed from `tests/unit/env-publico.test.js` now that there is
nothing left to be orphaned.
**Model:** `sonnet` · **Nightly:** no (choosing the provider is yours)

### [x] T-109 · Drop the pre-Clerk dead dependencies
**Why:** carved out of T-35 on 2026-09-10 so an agent can take it alone.
T-35 bundles two things: *which image provider to keep*, which is the
human's call, and *deleting the leftovers from before Clerk*, which is
nobody's call - `next-auth`, `bcryptjs`, `jsonwebtoken` and `cookies` are
listed there as leftovers of an auth stack this app no longer uses.
**Done when:** each one is confirmed unimported across `src/`, `scripts/`
and `tests/`, then removed from `package.json` with the lockfile updated;
`npm run verify` green.
**Rule 5 is the whole job:** do not delete on the strength of the name.
Quote the reference search for each package in the PR, and if one turns out
to be imported somewhere, leave it and say where. Being a transitive
dependency of something else is also a reason to stop.
**Not in scope:** the image provider. And do not confuse the `cookies`
package with `next/headers`' `cookies()`, which is Next's own and is
certainly in use.
**Found alongside (2026-09-13), same leftovers one layer out:** the human's
local `.env` still defines `AUTH_SECRET`, `AUTH_GOOGLE_ID` and
`AUTH_GOOGLE_SECRET` - next-auth's variables - and nothing in `src/`,
`scripts/` or `tests/` reads any of them. They are not in `.env.example`
either. Dropping them from `.env` is the human's (it is not tracked); if
any also exist in Vercel, same. Separately, the repo has a GitHub secret
named `NEXT_PUBLIC_IMAGEKIT_KEY` that **no workflow references** (the
workflows use only `CLERK_SECRET_KEY`, `CRON_SECRET` and the automatic
`GITHUB_TOKEN`) - almost certainly the placeholder CI carried before T-11b.
Deleting it is a settings change, so it is listed here, not done.
**Done (2026-09-14):** `next-auth`, `bcryptjs`, `jsonwebtoken` and `cookies`
had zero references in `src/`, `scripts/` or `tests/` (only `package.json`,
`package-lock.json` and this file mentioned them by name) and `npm ls` showed
each as a bare top-level dependency with no other package depending on it.
All four removed with `npm uninstall`; `npm run verify` green (lint, deadcode,
typecheck, test, build). See PR for the full reference-search evidence.
**Model:** `sonnet` · **Nightly:** yes

### [x] T-110 · Stabilise the flaky e2e specs
**Why:** the suite has now cried wolf three times on record, which is how a
real regression gets waved through. T-80 logged two seller specs (`el perfil
del vendedor carga su negocio`, `el listado de vendedores muestra las
tarjetas`) failing and then passing 16/16 on an immediate re-run of the same
commit, with only comment changes in the tree. T-104's PR (#301) hit a third:
`about-topbar.spec.js:53`, T-87's "scrolling back to the top puts the hero
back behind it", red on the first run and green on a re-run of the same
commit.
**The cause is probably already written down.** T-87's own entry explains the
class for `/about`: the page animates its sections in with framer-motion, so
on a cold runner the document is still viewport-height when a scroll lands,
the event goes nowhere and `scrollY` stays 0. Its other two tests poll
`document.body.scrollHeight` until the page is scrollable and then poll
`scrollY` until it moved - the failing one is the scroll-back-*up* direction,
which has no such poll.
**Done when:** the named specs pass on repeated runs of the same commit, and
each fix waits on a real condition rather than a fixed timeout. A
`waitForTimeout` added to make a race go away is not a fix and will rot.
**Careful:** do not "stabilise" a spec by weakening what it asserts. T-87's
test exists because the header printed on top of the section text; a version
that no longer checks the background is worse than a flaky one.
**Worth knowing:** `--grep` narrows `npm run test:e2e` to one spec, which is
what makes "run it ten times" cheap enough to actually prove the fix.
**Found 2026-09-14 (T-123): `scroll-infinito.spec.js` was hiding a real bug.**
Its "page 2 is not there yet" check is `toHaveCount(0)`, which passes on its
first poll, so a second page that auto-loads ~300 ms later went unseen on
`agent/develop` (1 of 3 runs, measured). The bug is fixed in T-123 (see
there); the assertion is still first-poll-only. A wait on a real condition,
such as "no `cursor=` request until the scroll", would pin it.
**Model:** `sonnet` · **Nightly:** yes

### [x] T-36 · A real README
**Why:** it's still `create-next-app`'s, with a stray `## Yes`.
**Done when:** what the project is, screenshots, stack, environment
variables, how to run it, how to run tests, and a section on the agentic
pipeline. This is the file recruiters will read.
**Update 2026-09-06:** used to say "write it yourself, it's your
showcase" — the human decided to delegate it to an agent. It's still the
showcase for recruiters, so if the result doesn't land, it gets rewritten
by hand afterward; no harm in trying an agent first.
**Model:** `sonnet` · **Nightly:** yes

---

## Phase 4 — New functionality

From here on, it's building on solid ground. Each one is a project of its
own, and all of them are design work, so all of them are yours.

### [x] T-40 · Order model
**Why:** there's no `Order`. Today the flow ends in a WhatsApp link, so
there's no data on anything.
**Done when:** an `Order` schema with a state machine
(`pending → accepted → preparing → delivering → completed | cancelled`),
transitions validated in a single place, a state-change history, and
tests proving an invalid transition gets rejected.
**Design decisions (made interactively, not baked into the schema yet as
an assumption for future tasks to revisit):** one seller per order — there's
no multi-seller cart today (`ProductModal.jsx`'s WhatsApp link is already
per product/seller), so splitting by seller avoids reshaping this schema
if a real cart shows up later. Line items snapshot `name`/`price` at order
time instead of only referencing `Product`, so a later price edit or
deletion can't retroactively change a past order. History is an array
embedded in the `Order` document itself, not a separate collection:
`mongodb-memory-server` runs in standalone mode (no replica set, see
T-10b), so a design needing a cross-collection transaction wouldn't be
verifiable with today's test harness. The transition table is a plain
`Record<OrderStatus, OrderStatus[]>` (no state-machine library) — six
linear states plus one cancel branch don't justify a new dependency;
xstate would pay for itself only if guards/parallel states/side-effects
show up later.
**Done:** `src/server/orders/stateMachine.ts` (`assertValidTransition`,
`transitionOrder`, the only place `status` is ever assigned) and
`src/utils/models/orderSchema.ts` (`Order`, embedding `lineItems` and
`history`). Cancellation is allowed from `pending`/`accepted`/`preparing`,
not from `delivering` (someone's already en route) or the terminal states.
Tests in `tests/unit/orderStateMachine.test.js` and
`tests/unit/orderSchema.test.js` cover the full happy path, every invalid
transition (skipping steps, going backwards, cancelling after
`delivering`, any transition out of a terminal state), and schema
validation (required fields, empty `lineItems`, quantity `< 1`, status
outside the enum).
**Deliberately out of scope:** no API route or Server Action creates or
transitions an `Order` yet — nothing in the roadmap's "done when" for this
task asked for one, and wiring checkout/UI is its own decision (payment
flow, who's allowed to trigger which transition). T-41 (chat) and T-42
(map) depend on this schema existing, not on an endpoint.
**Model:** `opusplan` · **Nightly:** no

### [ ] T-41 · Buyer ↔ seller chat
**Why:** WhatsApp takes the user out of the app and the order's context
gets lost.
**Done when:** one thread per order, persisted history, unread indicator.
Start with polling every 5s; migrate to SSE or WebSocket only if polling
genuinely becomes a problem. Measure before adding complexity.
**Depends on:** T-40
**Model:** `opusplan` · **Nightly:** no

### [ ] T-42 · Campus map and live status
**Why:** it was the feature that never got built. The hard problem isn't
the map, it's where the location comes from: sellers walk around campus,
and relying on GPS in an open tab is fragile.
**Done when (v1, no GPS):** fixed campus delivery points with known
coordinates; the seller declares their point and status; a map with
MapLibre + OpenStreetMap tiles showing pins. Covers almost all the value
without touching geolocation.
**v2 (optional):** real location during `delivering`, with explicit
consent, that turns itself off once the order completes.
**Depends on:** T-40
**Model:** `opusplan` · **Nightly:** no

### [ ] T-43 · Push notifications
**Why:** `manifest.json` already exists, so the PWA is halfway there.
**Done when:** Web Push for order status changes and new messages;
permissions requested at the right moment, not on load.
**Depends on:** T-40
**Model:** `opusplan` · **Nightly:** no

### [x] T-44 · Seller panel
**Done when:** sales per day, top-ordered products, peak hours,
cancellation rate. Reads from `Order`, writes nothing new.
**Done:** `/antojos/sellers/panel`, a Server Component that reads `Order`
directly (`src/server/orders/getSellerPanelStats.ts`, no fetch to our own
API). The aggregation itself is pure and unit tested apart from Mongo, same
split T-72 used for the profile checklist: `src/lib/seller-panel-stats.ts`
computes the last 14 days of sales bucketed by the day an order actually
*completed* (from `history`, in Bogotá time - reuses `BOGOTA_OFFSET_HOURS`,
now exported from `src/lib/store-availability.ts`), the top 5 products by
quantity among completed orders, the top 5 peak hours across every order
regardless of status (demand, not just fulfilled demand), and an all-time
cancellation rate. Linked from the sidebar's "Gestionar" section as "Panel de
ventas". No schema change, no new API route, no new dependency: bars are
plain server-rendered `<div>`s against `bg-primary-orange`/`bg-base-200`
(same tokens `ProfileChecklist` already proved safe in both themes), not a
chart library.
**Verified per rule 3 (2026-09-16):** the implementing agent's worktree had
no `.env`, so it left this `[~]`. Closed out from a session with the real
`.env`: `scripts/e2e.mjs`'s own recipe (in-memory Mongo + seed + a real
throwaway Clerk account + build + Playwright) signed in as the seeded
approved seller and hit `/antojos/sellers/panel` directly. The seed has no
`Order` documents, so a handful of `completed`/`cancelled` orders were
inserted by hand (script not committed - one-off, not a fixture anyone else
needs) to see the bars with real data instead of the empty state.
Screenshots in both themes: the `bg-primary-orange` bars render as
brand-orange on `bg-base-200` in light mode and stay the same orange against
the dark card background in dark mode, with legible text in both - none of
the T-100 near-white regression. `npm run verify` already passed per the
note above.
**Worth knowing (rule 9, found while touching `EditSellerForm.jsx`'s
neighbourhood):** that file has a commented-out back button
(`{/* <Link href='/'>...<TbChevronLeft />...</Link> */}`) left over from
T-72's extraction (`git log -L` traces it to that commit, already commented
there) - `EditSellerForm.jsx` never imports `TbChevronLeft` at all, so
un-commenting it as-is would throw. Every other screen with this same back
button (`ProductPage.jsx`, `SellerPage.jsx`, `Schedule.jsx`,
`SignUpForm.jsx`, register pages) imports the icon and renders it live, so
this one reads as dead, not a deliberate omission - not removed here to
avoid scope creep on a task that isn't this one.
**Depends on:** T-40
**Model:** `sonnet` · **Nightly:** yes

### [ ] T-45 · Reviews
**Done when:** a rating per completed order (not per standalone product,
to avoid fake reviews), an average on the seller's card, basic
moderation.
**Depends on:** T-40
**Model:** `opusplan` · **Nightly:** no

### [x] T-46 · Internationalization (Spanish and English)
**Why:** all the copy is hardcoded in Spanish inside the components. At a
university with exchange students, English widens the audience — and for
the portfolio it demonstrates handling locale-based routes and dynamic
content, which is what makes this task genuinely hard.
**Watch the size:** there's copy in more than 40 components. Doing it all
at once produces an unreviewable diff and blows past the ~15-file limit.
**Done (v1, scaffolding only):** `next-intl` configured; middleware that
negotiates locale only for `/about(.*)` and `/en/about(.*)` and coexists
with `clerkMiddleware` (the rest of the routes don't go through
`next-intl` yet, so they stay as they were); Clerk switches from `esMX` to
`enUS` based on locale (resolved in the root layout via `getLocale()`, so
it applies to the whole app, migrated or not); dictionaries in
`messages/{es,en}.json`; `/about` migrated as the proof screen (moved to
`src/app/[locale]/about/`); e2e in `tests/e2e/i18n.spec.js` walking it in
both languages.
**Two non-obvious decisions:** `localeDetection: false` — otherwise the
browser's `Accept-Language` decides `/about`'s language without the
visitor asking for it, inconsistent with the rest of the app (which
always defaults to Spanish). And the language switcher uses a plain
`<a href>`, not `next-intl`'s `Link`: `NextIntlClientProvider` lives in
the root layout, which Next.js doesn't re-run on a client-to-client
navigation within the same tree, so a soft navigation left the
translation stuck on the initial locale. A full navigation avoids that
without duplicating the provider across two layouts.
**The remaining +25 routes weren't moved under `[locale]/`** — that
would have blown past the ~15-file PR limit. They stay as they were, in
Spanish, with no prefix.
**Afterward, one task per zone:** listing, product detail, seller
profile, forms, seller panel. Each with its own PR. **Filed as T-81
(2026-09-07)** — until then this promise lived only here, inside a task
already marked done, and 20 of 21 pages were still unmigrated with nothing
tracking it.
**What this doesn't solve:** content sellers write themselves (product
names and descriptions) will stay in whatever language they wrote it in.
Translating that is a separate product decision, not an i18n one.
**Depends on:** T-04, which provides the safety net to check nothing
visual breaks
**Model:** `opusplan` — negotiating locale alongside Clerk's middleware
has a catch
**Nightly:** no

### [ ] T-68 · Favorites (blocked on a product decision)
**Why:** a "save for later" feature was started once — `favoriteSchema.js` —
but never wired up anywhere (zero importers), and T-34 already deleted it as
dead code. Doing this means starting over, not resuming.
**Found while doing T-81 (rule 9, not fixed here):** the frontend half of
that abandoned attempt is still around too —
`src/components/products/ProductGridFavorite.jsx` and
`ProductCardFavorite.jsx`. They were never rendered by anything (their only
importers were unused imports in `src/app/antojos/page.jsx` and
`src/app/marketplace/page.jsx`, confirmed by reference search), and
`ProductGridFavorite` calls an undefined `getItems()` — it never worked even
when "reachable". T-81's migration of those two page files dropped the dead
imports, which made `npx knip`'s dead-file check start failing on them; both
are now listed in `knip.json`'s `ignore` so `npm run verify` stays green
without deleting code a human might still want for this task. T-130
(2026-09-15) separately lists `ProductCardFavorite.jsx` as sharing the
broken-image pattern to fix — worth checking with whoever filed it before
deleting, in case it's slated for reuse rather than removal.
**Blocked on:** whether this is worth building at all, and if so: favorite
products only, or sellers too? Its own page, or just a filter/heart icon on
the existing listings? Login required (almost certainly, it ties to `User`)?
These are product calls, not implementation details — see how T-12/T-14/T-32
handle "needs a human decision" in this file.
**Done when (once scoped):** a `Favorite` model tying a `User` to the
product/seller ids they've saved, a toggle on product/seller cards, and a
"my favorites" view — with the same ownership checks as the rest of the
app's mutations (a user can only read/write their own favorites).
**Model:** `opusplan` — needs the product decision above · **Nightly:** no

### [x] T-70 · Sort options in the product/seller listings
**Why:** the public listing's default order pushes unavailable products
last and otherwise orders deterministically by `createdAt` (T-23 replaced
the old random shuffle with cursor pagination — `availability` desc,
`createdAt` desc, `_id` as tiebreak); there was no way to sort by price or
by newest, even though `Product` already has `price` and Mongoose's
`timestamps: true` gives every document a `createdAt` for free. University
filtering already works (`UniversitySelector` + `useUniversity`) — this
only adds ordering on top of it.
**Done when:** a sort control (price asc/desc, newest first) on the
listing, backed by a query param the API already accepts or a small
addition to it. The deterministic default order stays the default when no
sort is picked.
**Done:** `sort` query param (`default` | `newest` | `price_asc` |
`price_desc`) added to `productQuerySchema`/`GET /api/products`, reusing
the existing cursor-pagination machinery — each sort defines its own Mongo
sort spec, cursor filter and cursor payload shape in
`src/lib/sorting/product-sort.ts` (`SORT_CONFIGS`), keyed by a `sort` field
in the cursor itself so a cursor can't be replayed against a different
sort. New indexes `{section, createdAt}` and `{section, price}` back
`newest`/`price_desc` and `price_asc` respectively (Mongo scans the price
index in either direction). `ProductGrid` gets a sort `<select>`, kept as
local component state rather than a URL param — `SearchBox` rebuilds the
query string from scratch on every keystroke and would silently drop an
unknown `sort` param. **Model:** `sonnet` · **Nightly:** yes

### [x] T-71 · Seller pause mode
**Why:** an approved seller who's away (exam week, sick, traveling) has no
way to hide their store without losing approval or their whole catalog —
today they either stay listed while genuinely absent, or a human has to
unapprove them. `Seller.availability` already exists but means something
different (open right now, per schedule — see T-14); reusing it for a
multi-day pause would conflate two different meanings on one field.
**Done when:** a new boolean (e.g. `Seller.paused`) that hides the seller
and its products from public listings without touching `approved`; a
toggle the seller controls from their own profile, guarded by the same
ownership check as the rest of the seller-facing mutations.
**Done:** `Seller.paused` (boolean, default `false`) added next to
`availability`, with a comment on each explaining which is which — the
T-14 cron rewrites `availability` for every seller on every run, so it
could never have held a multi-day absence. Public listings resolve it in
Mongo, not in the browser: `GET /api/products` adds it to the
`eligibleSellerIds` query alongside `approved` (before pagination, so the
`limit` counts only products that will actually show), and
`GET /api/sellers` filters it in the `Seller.find()` itself. The toggle
lives on the seller's own profile page (`/antojos/sellers/profile/edit`),
written through the `PUT /api/sellers/[id]` that already runs
`verifySellerId` — no new route and no new ownership check. `paused` is in
`updateSellerSchema` only, not in `createSellerSchema`. Pausing leaves
`approved` and the catalog untouched, and the seller's own product
dashboard is unaffected (it reads `/api/products/seller/[id]`, which never
filtered by eligibility).
**Measured against the real database (read-only, no writes):** 54 sellers,
36 approved, **0 with a `paused` field**. So the obvious filter,
`paused: false`, would have matched *nothing* and emptied the public
listing for all 36 — the T-12c trap again. Both queries use
`paused: { $ne: true }`, which matches the field-less documents, so the
schema default covers old data and **no migration is needed**. Note that
Mongoose only applies that default when hydrating a document: `.lean()`
reads (`getSellerContextData`, `/api/sellers/admin`) still return
`undefined` for old sellers, so the UI coerces with `Boolean(...)`.
A test in `tests/integration/seller-pause.test.js` unsets the field on a
seller and asserts it stays listed; it was confirmed to fail against the
`paused: false` version of the filter.
**Left out on purpose:** an admin's view of `/antojos/sellers/list` (which
reuses the public `GET /api/sellers`) no longer lists paused sellers —
`/admin/sellers`, backed by `GET /api/sellers/admin`, still returns every
seller and is the panel meant for that. Direct links to a paused seller's
profile page still resolve, exactly as they already do for unapproved
sellers; only the listings are gated.
**Model:** `sonnet` · **Nightly:** yes

### [x] T-72 · Seller profile completeness checklist
**Why:** nothing today nudges a newly-approved seller to actually finish
their profile — no logo, no schedule, no description — and their listing
looks empty next to sellers who filled everything in. Every field this
needs already exists on `Seller`/`Schedule`; this is purely surfacing
what's missing.
**Done when:** a small checklist/progress indicator on the seller's own
dashboard, computed from existing fields (has logo? has description? has
at least one `Schedule` entry? has at least one product?) — derived only,
no schema change.
**Done:** `ProfileChecklist` on `/antojos/sellers/profile/edit`, the
closest thing to a seller dashboard today (it's where an approved seller
lands) — a real one is still T-44. Progress bar plus only the pending
items, each linking to the screen that fixes it; once all four are done it
collapses to a single line. Derived, no schema change: the rules live in
`src/lib/profile-completeness.ts` (pure, unit tested) and the reads in
`src/server/sellers/getProfileChecklist.ts` (`countDocuments`, both
collections already indexed by `sellerId`). The page became a Server
Component that hands the result to the form, now
`src/components/seller/EditSellerForm.jsx` — it stays a Client Component
because it is all state and handlers.
**The trap, measured read-only against the real database:** `Seller.logo`
has a schema default, so *every* seller has one and `if (seller.logo)`
would mark all of them done. Of the 7 approved sellers without a real
logo, **6 carry exactly that placeholder** — a truthiness check would have
missed 6 of the 7. `DEFAULT_SELLER_LOGO` is now exported from the schema
and compared against, instead of being a bare string in two places.
**Worth knowing:** of 36 approved sellers only **21 have all four items**.
Missing today: 10 without a single product, 9 without any schedule, 7
without a real logo, 2 without a description. This nudges 15 of 36, not a
corner case.
**Model:** `sonnet` · **Nightly:** yes

### [x] T-73 · Dark mode with a hand-designed palette
**Why:** daisyUI is already the styling layer and ships multi-theme
support out of the box, but only one custom light theme is defined
(`tailwind.config.*`) — there's no dark option at all today.
**Why it's not nightly work:** the human asked for a hand-designed dark
palette, not daisyUI's stock "dark" preset — that needs real color
decisions (contrast against the existing brand primary/secondary,
readability of product photos on a dark background), not a config toggle.
Needs a plan-mode session, same as T-45/T-63.
**Done when:** a second daisyUI theme (`dark`) with its own hand-picked
palette, a switcher that persists per visitor (`localStorage`, following
daisyUI's own `data-theme` convention), and the T-61 Lighthouse budget
re-run against it to confirm contrast still passes.
**Done:** human picked a "warm charcoal" palette (near-black warm
backgrounds, the brand orange lightened one step for AA contrast, a
lightened secondary grey) — `dark` theme added in `tailwind.config.js`
alongside `light`, `darkMode` set to track the `data-theme` attribute
(daisyUI's own convention) instead of `prefers-color-scheme`. Switcher
lives in `SideBar.jsx` (`ThemeToggle.jsx`), persists to `localStorage`,
applied pre-hydration by an inline script in `layout.jsx` to avoid a
light→dark flash; that same script also accepts a one-time `?theme=`
override (not persisted) for sharing a link in a specific theme and for
`scripts/lighthouse-dark.mjs`'s budget re-run below.
Scope was deliberately partial, confirmed with the human mid-task: most of
the app uses hardcoded Tailwind classes (`bg-white`, `text-gray-*`) instead
of daisyUI's theme-aware tokens, and migrating all of it (31 files) is its
own rewrite — out of bounds for one PR per CLAUDE.md. This PR migrates the
core product/seller browsing flow to `base-100`/`base-200`/`base-content`
etc: `ProductCard`/`SellerCard` (`card-variant.js`), `CategoryGrid`,
`Navbar` (`Hambtn.jsx`, `UniGraphicSelector.jsx`), the product/seller
modals and detail pages (`ProductModal`, `SellerModal`, `ProductPage`,
`SellerPage`, `TableSchema`, `SellerProductsBySection`), `Carousel`/
`CarouselModal`, and the `/antojos/sellers/list` section toggle. Everything
else (admin, auth, about, landing, seller forms) stays light-only for now.
**Found along the way:** `public/css/main.css` has `.bg-primary { @apply
bg-[#f8f8f8]; }` — a hand-written override that's always won the cascade
tie against daisyUI's theme-driven `.bg-primary`, so `bg-primary` has
never actually painted the brand orange anywhere in the app, in any theme;
it's a flat near-white canvas color (`bg-primary-orange`, right below it in
the same file, is the separate class that *does* use the real orange). Not
a bug worth fixing site-wide here — that's its own, unrelated change with
its own blast radius — but every scoped file above pairs its `bg-primary`
with an explicit `dark:bg-base-100`/`dark:bg-base-200` companion, or the
dark canvas would've stayed bright white behind the newly-dark cards. Left
a comment in `Layout.jsx` for whoever touches this next.
**Lighthouse re-run (T-61 budget, dark theme):** `npm run
budget:lighthouse:dark` (new script, results under the gitignored
`lighthouse-results-dark/`) — all 6 pages pass the same thresholds as
light mode; accessibility scored 0.71–0.93, in line with (part of it above)
light mode's own 0.69–0.93 baseline noted in T-61.
**Depends on (follow-up filed):** T-75 — migrating the rest of the app
(admin, auth, about, landing, seller forms) to the same tokens, so the
toggle doesn't leave those screens looking half-dark if someone navigates
there after switching.
**Model:** `opusplan` — needs real design judgment, not just
configuration · **Nightly:** no

---

## Phase 5 — AI as a feature, not as a tool

Different from using an agent to write the code: here AI is part of the
product. This is what sets the portfolio apart.

### [ ] T-50 · Semantic search
**Why:** today "something sweet and cheap" finds nothing.
**Done when:** embeddings of name + description + category stored on the
document, Atlas vector search, hybrid with text search. Evaluated with 20
reference queries and their expected results, to be able to demonstrate
the improvement.
**Depends on:** T-24
**Model:** `opus` — new domain, non-obvious decisions
**Nightly:** no

### [ ] T-51 · Add a product from a photo
**Why:** publishing a product today is 6 fields filled by hand; it's the
number-one source of friction for a seller between classes.
**Done when:** the seller uploads the photo and a model proposes name,
description, category, and price range; **everything editable before
saving**, no autosave. Manual fallback if the API fails.
**Model:** `opus` · **Nightly:** no

### [ ] T-52 · Listing moderation
**Why:** raised again by the human on 2026-09-15, specifically as
AI-based explicit-content detection - both the product photo and the
text fields (name, description) - so a listing can't publish something a
human never looked at.
**Done when:** automatic review of photo and text on publish, with a
human-review queue for uncertain cases instead of automatic blocking - not
a hard block, since a false positive would refuse a legitimate seller with
no recourse.
**Open design questions for whoever picks this up (interactive session,
not a nightly task):** which provider/model does the classification (an
LLM vision call vs. a dedicated moderation API - cost and latency differ a
lot at upload time); where the queue lives (an admin screen, extending the
existing seller-approval surface, or its own); what "uncertain" means
numerically for each classifier; and whether this blocks publish
synchronously or runs after, with the listing live in the meantime.
**Model:** `opusplan` · **Nightly:** no

### [ ] T-129 · Mercarti, a support chatbot (the squirrel mascot)
**Why:** raised by the human on 2026-09-15. Not scoped, not urgent - a
backlog idea for later, and also a portfolio piece (an agentic feature
looks good on the showcase T-36 already writes for). Named after the
site's existing squirrel mascot, Mercarti.
**The idea, roughly staged (each stage is its own decision, not a plan to
execute as written):**
1. **A widget on the site** a visitor can open to ask questions about
   registration, how the site works, and its conventions - and that can
   hand back a real link to the relevant page/resource rather than just
   describing it in prose.
2. **Read-only tools first - but two different risk levels, not one:**
   - **Catalog/recommendation** ("algo frutal bajo $6000 que esté hoy"): a
     natural-language front end to the same public listing `/antojos`
     already shows anyone, logged in or not - no ownership check applies,
     because none of the data is private. Best built as tool-calling on
     top of **T-50** (semantic search) rather than a separate
     implementation: the model extracts structured arguments (the semantic
     text, a price bound, a day/time bound) and the tool executes them,
     it never reasons over raw catalog text itself. Day/time reuses
     `isOpenAt`/`src/lib/store-availability.ts` as-is (it already takes an
     arbitrary `{day, time}`, not just "now"); a *range* query ("after 10,
     before 3pm") needs one small overlap predicate added to that same
     file, not a formula invented per query. University defaults from the
     existing `UniversityContext` (`selectedUniversity` in
     `localStorage` - client state, not server session, so the client has
     to pass it explicitly), overridden only when the text names another
     one. **Depends on T-50** existing - without it, this either doesn't
     scale or duplicates it.
   - **Mine/my-seller's data** (a product's or seller's approval status,
     schedule, availability): this is the one that can leak what a
     signed-in user could not already see through the UI, so it needs the
     authorization boundary CLAUDE.md's convention already requires
     ("Autorización explícita") - scoped to the caller's own seller/
     product, never anyone else's.

   Either way: for a claim read out of a seller's free-text description
   that reads as health/dietary/allergy ("sin azúcar", "apto para X"),
   quote what the seller wrote rather than assert it as verified - nobody
   has checked it. Doesn't apply to taste/price/schedule, where a wrong
   guess costs a follow-up question, not a false safety claim.
3. **Agentic/write tools, later and separately:** editing a product's own
   name, price, etc. on the seller's behalf. This is a materially
   different risk level than (1)/(2) - it mutates real data through
   natural language - and shouldn't be scoped until (1)/(2) exist and the
   authorization model for a write made *by an assistant, on a user's
   behalf* has been thought through on its own, not inherited by default
   from the read-only stage.
**Open questions for whoever designs this:** which model/provider, cost
per conversation at any real traffic, where conversation history lives (a
new collection, likely), how it's told apart from a real human in the
UI, and how (2)/(3)'s tool calls get audited - "the assistant did it" is
not an acceptable line in a log next to a real data mutation.
**Model:** `opusplan` · **Nightly:** no
**Why:** without evals, "I improved the prompt" is just an opinion. This
is what separates a demo from a system.
**Done when:** a case set with expected output for T-50 and T-51, a
command that runs it and reports metrics, and CI running it on PRs that
touch those routes.
**Depends on:** T-50, T-51
**Model:** `opus` · **Nightly:** no

---

## Phase 6 — Operations

### [ ] T-60 · Observability
**Done when:** Sentry for client and server errors, structured logs, and
an alert when the deploy's error rate crosses a threshold.
**Model:** `sonnet` · **Nightly:** yes

### [x] T-61 · Performance and accessibility budget
**Why:** Lighthouse CI on every PR with thresholds that break the build;
keyboard navigation and contrast reviewed on the main screens.
**Done:** `scripts/lighthouse.mjs` reuses the `e2e.mjs` recipe (in-memory
Mongo + seed + build + `next start`) and runs Lighthouse against the main
screens (`/antojos`, a product detail page, a seller profile, the seller
grid, `/marketplace`, `/about`). Runs via `npx`, not as an installed
dependency: `@lhci/cli` pulls in ~240 transitive packages with 30+ CVEs
(several critical) that aren't worth adding to the project's lockfile for
something invoked once per PR.
Thresholds are measured against the real app, not guessed: performance
0.35, accessibility 0.6, best-practices 0.45, seo 0.85 — a floor below
today's observed scores (0.41-0.59 / 0.69-0.93 / 0.54-0.57 / 0.91-1.0),
meant to catch regressions rather than demand a high score that would need
separate performance work. See `lighthouserc.json`.
New `lighthouse` job in `ci.yml`, gated the same way as `e2e` (needs real
Clerk — its middleware runs on every route, public ones included).
**Keyboard navigation:** `tests/e2e/keyboard-nav.spec.js`, with
`@playwright/test` (already a dependency, no need to add `axe-core`).
Covers the two public forms (PQRS and login): tab order, the checkbox
being operable with Space, and a disabled button being excluded from tab
order until there's something to submit.
**Contrast:** covered by Lighthouse's accessibility category's
`color-contrast` audit, not a separate tool.
**Model:** `sonnet` · **Nightly:** yes

### [x] T-67 · UI/UX audit across the app's main screens
**Why:** the app grew screen by screen without ever getting a full design
review pass. Small usability and consistency issues — spacing, unclear
copy, awkward mobile layouts, dead-end states — likely exist and nobody
has walked through the whole app looking for them.
**Done when:** an agent walks through the main screens with Playwright
(reusing the seeded test data from `tests/e2e/`) on both a desktop and a
mobile viewport — buyer side (listing, product detail, seller profile,
PQRS), seller side (registration, profile edit, product CRUD, schedules),
and auth (login/register) — takes screenshots, and writes up a findings
list (screen + issue + suggested fix) in the PR description. No code
changes in this task; it's diagnosis, not repair. Concrete follow-ups get
their own tasks from that list.
**Done:** 27 findings (screen + issue + suggested fix) in
`docs/audits/t-67/findings.md`, numbered F1–F27 for follow-up tasks to
reference; also in PR #275, which is where they were first written up.
24 screenshots in the same folder. The walkthrough used a
throwaway stack — `MongoMemoryServer` + `scripts/seed.mjs` + build + serve,
the recipe from `scripts/e2e.mjs` — on 1280x900 and 390x844, in both
themes. No product code changed.
The three worth pulling out: `/antojos/<unknown id>` renders the whole
product page empty with `$ NaN` and a live WhatsApp button instead of a
404; `/antojos/sellers/<unknown id>` spins forever; and a shared
`/antojos?product=...` URL comes back unfiltered because SearchBox
rewrites the query string on mount, wiping the param ProductGrid reads.
Plus the dark-mode gap this task was expected to find: the `/about` hero
never moved to daisyUI tokens, so in dark it is near-white text on its
original light gradient.
**What this task did NOT cover:** the authenticated screens the "Done
when" asks for — seller registration, profile edit, product CRUD,
schedules, admin. Playwright has no Clerk session, so all of them redirect
to `/auth/login`; auditing them needs a signed-in Playwright fixture
first, which is its own task — proposed, with the rest of the follow-ups,
in the PR body rather than written in here unilaterally.
**Model:** `sonnet` · **Nightly:** yes

### [x] T-69 · Open Graph previews for product/seller pages
**Why:** sharing a product link (there's already a share button,
`ShareButton.jsx`) drops a bare URL — WhatsApp/Instagram previews fall
back to the generic site-wide metadata in `layout.jsx`, the same title and
image for every page on the site. A student sharing "look at this arepa"
gets a link with no picture, no price, nothing that makes someone tap it.
**Done when:** `generateMetadata()` on the product and seller detail pages
returning per-page `openGraph`/`twitter` tags — title, description, and
the product/seller's own image, all already stored in Mongo. No new
fields needed, just reading what's already there.
**Done:** `generateMetadata()` added to the three detail pages
(`antojos/[id]`, `marketplace/[id]`, `antojos/sellers/[id]`), backed by two
new minimal, Mongo-direct reads (`src/server/products/
getProductForMetadata.ts`, `src/server/sellers/getSellerForMetadata.ts` —
`.select()` only the OG-relevant fields, `null` on a malformed or missing
id instead of throwing) and a shared presentation layer
(`src/lib/metadata.ts`) that builds the actual `title`/`openGraph`/
`twitter` object, falls back price→generic text when a product has no
description, and unwraps the legacy string-JSON description format
(`parseIfJSON` in `utilFn.js`) without ever handing a parsed object to a
meta tag. Uses `title: { absolute }` rather than a plain string — the root
layout's `title.template` is `'Mercampus'` with no `%s`, so a plain child
title gets silently discarded in favor of that literal string; worth
fixing on its own, left alone here since it's unrelated to this task.
**Model:** `sonnet` · **Nightly:** yes

### [x] T-74 · sitemap.xml
**Why:** complements the SEO category T-61 already measures. Approved
sellers and their public product/profile pages aren't discoverable via a
sitemap today — there isn't one.
**Done when:** `src/app/sitemap.ts` (Next.js' native sitemap convention,
no new dependency) generating entries for the static public pages plus
one per approved seller and their products, read straight from Mongo.
**Done:** `src/app/sitemap.ts` (Next's native convention, no dependency,
no route handler), `dynamic = 'force-dynamic'`, not `revalidate`: ISR
still *prerenders* during `next build`, so the build needed a database and
CI (which builds without `MONGO_URI`) failed with `Error occurred
prerendering page "/sitemap.xml"`. It passed locally only because Next
loads `.env` — meaning the local build was quietly querying the production
database. Every other route here is already `ƒ`; the sitemap was the odd
one out. URL shapes are pure and unit tested in `src/lib/sitemap.ts`;
the reads are in `src/server/sitemap/getPublicSitemapData.ts`. Products are
scoped to the eligible sellers rather than fetched wholesale, and each one
is listed under its own section (`/marketplace/<id>` vs `/antojos/<id>`),
never both. `/` is left out — it's a permanent redirect to `/antojos`
(`next.config.mjs`) — and `/about` declares its `es`/`en` alternates from
T-46. Verified against a real production build: `/sitemap.xml` returns 200
`application/xml`, well-formed, all absolute, unapproved sellers absent.
**Eligibility is shared now, not copied:** `publicSellerFilter()` in
`src/lib/public-visibility.ts` is the single definition of "publicly
visible" (`approved` + not `paused`), used by `GET /api/products` and the
sitemap. A sitemap that disagrees with the listing is worse than none — it
would keep advertising a seller who paused their store.
**Careful — `GET /api/sellers` deliberately does NOT use it.** That
endpoint returns *unapproved* sellers on purpose: `SellerGrid` hides them
from ordinary visitors client-side but shows them to an admin, who
approves them from that very grid. Sharing the filter there empties the
approval queue. This was found by breaking it during this task; nothing
covered it, so there's a test for it now in
`tests/integration/seller-pause.test.js`.
**Follow-up, not done here:** there's no `robots.txt`, so nothing points a
crawler at the sitemap — worth a small `src/app/robots.ts`, but it's its
own deliverable, not this ticket's "Done when".
**Model:** `sonnet` · **Nightly:** yes

### [x] T-79 · Remove the `/landing` draft
**Why:** `/landing` was an early draft of what Mercampus could look like
(confirmed by the human, 2026-09-07), superseded by `/about` — which is
the same idea grown up: 750 lines, `next-intl` since T-46, animated.
`/landing` is 172 lines of hardcoded colours and, in its entire history,
was touched by exactly two commits: the one that created it and T-75c's
theme migration. Nobody edited it since it was written.
**It still cost something:** it was a live public URL — anyone typing it
saw a half-finished page carrying the brand — it was built into every
deploy, and it surfaced in every repo-wide search. T-75c migrated two of
its lines to the dark theme for nothing, and T-74 had to argue in a code
comment about why the sitemap skipped it.
**Done when:** deleted, with the reference search that proves nothing
points at it.
**Done:** `src/app/landing/` removed. The only mentions of it anywhere in
`src/`, `tests/` and `scripts/` were the file itself and the sitemap
comment explaining the exclusion — no imports, no links, no tests, no
scripts. The sitemap comment is gone with it, and T-78's note about
leaving it undisallowed is updated.
**Recoverable:** `git show 5363433:src/app/landing/page.jsx` returns the
draft exactly as it was, forever. Deleting it from the tree doesn't delete
the idea.
**Model:** `sonnet` · **Nightly:** no — deleting a page is the human's call

### [x] T-78 · robots.txt
**Why:** T-74 added a sitemap and nothing points a crawler at it, so it
reaches no one. Filed and closed in the same PR — it is the five lines
that make the previous task's work count.
**Done:** `src/app/robots.ts` (Next's native convention, no dependency),
sharing `SITE_URL` with the sitemap and the root layout's `metadataBase`.
Allows everything, disallows the API, `/admin`, `/auth`, and the seller's
own screens. Prerendered at build, unlike the sitemap — it touches no
database.
**The trap:** `/antojos/sellers/` is the obvious prefix for "the seller's
own screens", and it would have deindexed every public seller profile
(`/antojos/sellers/<id>`) and the directory (`/antojos/sellers/list`) —
precisely the pages T-74 had just started advertising. Each private screen
is listed by its own prefix instead, and a test cross-checks the disallow
list against the URLs `buildSitemap` produces, so the two can't contradict
each other. Confirmed the test catches it by widening the prefix and
watching it name both URLs.
**`/landing` was left undisallowed on purpose** — whether it was dead,
private or just unlinked was a product question, and blocking it here
would have decided it quietly. The human answered: it was an early draft
of what they imagined for Mercampus, superseded by `/about`. Deleted in
T-79, so there is nothing left to block.
**Model:** `sonnet` · **Nightly:** yes

### [x] T-75 · Migrate the rest of the app to daisyUI's theme tokens
**Why:** T-73 added a dark theme and switcher but only migrated the core
product/seller browsing flow (`ProductCard`/`SellerCard`, `Navbar`,
`CategoryGrid`, the product/seller modals and detail pages) from hardcoded
Tailwind classes (`bg-white`, `text-gray-*`, `text-black`, `border-gray-*`)
to daisyUI's theme-aware tokens (`bg-base-100`, `text-base-content`, etc).
Everything else — admin (`admin/sellers`), auth (`login`/`register`/
`ForgotPassword`), `about`, `landing`, and the seller's own forms
(registration, profile edit, product CRUD, schedules, PQRS) — still uses
the hardcoded classes, so a visitor who toggles dark mode while browsing
and then navigates into one of those screens sees it stay light: not
broken (nothing becomes unreadable, since each screen's own contrast pairs
are internally consistent), just half-migrated.
**Done when:** the same `bg-white`→`bg-base-100`,
`text-gray-*`/`text-black`→`text-base-content` pattern T-73 already
applied, extended to the remaining ~25 files (a fresh grep for
`bg-white|text-black\b|text-gray-[0-9]+|border-gray-[0-9]+|bg-gray-[0-9]+`
across `src/` finds the current list — some of what T-73 touched will
already be clean). Big enough to split across a few PRs by area (admin,
auth, seller forms, marketing pages) rather than one — see CLAUDE.md's
~15-file guideline. Re-run `npm run budget:lighthouse:dark` after each
batch to catch contrast regressions.
**Careful with that re-run (measured 2026-09-07, T-75b):** the dark budget
is not reliable on the dev laptop. It fails there on `agent/develop` with
*no* changes applied — `Runtime error: The page did not paint any content
(NO_FCP)`, exit 1, zero assertion failures — and across four runs of
identical code the set of pages that misses the 0.35 performance threshold
changed every time (0.32-0.52 on the same page), because performance is
timing-based and the machine orbits that threshold. One run reported
performance `NaN`, which is the same NO_FCP surfacing as a failed
assertion. Judge a theming batch by **accessibility**, which is a static
audit and came out bit-stable at 0.71/0.74/0.75/0.75/0.93 in every run,
matching T-73's baseline. Treat a performance failure there as noise
unless it reproduces on a clean base run in the same session. Note CI only
runs the *light* budget (`ci.yml`), so nothing catches this automatically.
**In progress — split into 4 PRs by area.** Fresh inventory (2026-09-07):
25 files, 175 occurrences, very unevenly spread — `/about` alone has 105.
| Batch | Area | Files | Occurrences | State |
|---|---|---|---|---|
| a | admin + auth + strays | 7 | 32 | merged (#255) |
| b | seller's own forms | 9 | 28 | merged (#256) |
| c | marketing (`/about`, `about/layout`, `/landing`) | 3 | 111 | merged (#257) |
| d | final sweep + guard test | — | — | merged (#258) |
All four landed.
**Rule the batches follow** (the one T-73 actually applied, which is not
quite what "Done when" above says): surfaces and borders are *replaced*
with tokens — `bg-white`→`bg-base-100`, `bg-gray-50/100/200`→`bg-base-200`,
`border-gray-*`→`border-base-300` — and that is pixel-identical in light
mode, since daisyUI's light `base-100` is white. Text greys are *not*
replaced: they keep the light class and gain a `dark:` companion
(`text-gray-500 dark:text-base-content/70`). Replacing them outright would
swap a mid-grey for the light theme's near-black `base-content` and darken
every piece of secondary text in light mode — a visible regression on the
theme almost everyone uses. Migrated surfaces also get an explicit
`text-base-content`, or their text keeps the body colour and stays
near-black on the dark surface.
**Not real work, despite matching the grep:** `ToggleSwitch.jsx`'s
`bg-white` is inside a commented-out JSX block (dead markup, left alone);
`Carousel`/`CarouselModal`'s `bg-gray-400` is an inactive-dot indicator and
`ShareButton`'s `text-gray-200` sits on `bg-green-600` — both are
self-consistent colour pairs that read fine on either theme. So the
175-occurrence count overstates the job. Two more that the inventory
counted for batch b were already migrated by T-73 and came out untouched
(`SellerProductsBySection`, `UniGraphicSelector`), and `Schedule.jsx`'s
`text-white bg-gray-800` pills are another self-consistent pair — left
alone.
**Done (batch d):** the re-grep is a test now, not a one-off check —
`tests/unit/theme-tokens.test.js`, which runs inside `npm run verify` and
in CI. It scans `src/` and fails on any surface/border class that wasn't
replaced, or any text grey without its `dark:` companion, naming the file
and the class. Confirmed it actually catches a regression by adding a
`bg-white text-gray-700` to `SellerGrid` and watching it fail with both.
This matters because **nothing else can catch this class of bug**: a stray
`bg-white` renders identically in the light theme, so it looks correct in
review, in every existing test and in CI, and only breaks for someone
browsing in dark mode.
A plain grep over `src/` still reports ~110 hits and that number is
misleading: migrated lines keep their light class (`text-gray-600
dark:text-base-content/70` still contains `text-gray-600`). The real
remainder is **5 occurrences in 2 files**, all deliberate and listed in
the test's `ALLOWED` with a reason: the `/about` CTA button on the orange
band (`bg-white`/`bg-gray-100` — white is the *contrast colour* there, not
a surface), its dark footer's `text-gray-400`, and `ShareButton`'s
`text-gray-200` on `!bg-green-600`. A second test asserts each exception
still exists, so a later migration can't leave dead entries behind.
**Not verified:** the dark Lighthouse budget never produced a usable run
for batches c and d — it aborts with NO_FCP on this machine, on the base
branch too (see the note above). `/about` is in the budget's page list and
batch c rewrote it, so its contrast is the one thing here confirmed only
by reading the diff. Worth a re-run wherever the budget works.
**Regression found afterwards by the T-67 audit, fixed in #275:** the
`/about` hero is `bg-gradient-to-br from-orange-50 via-white to-orange-25`,
and batch c2 gave the text on top of it `dark:text-base-content` without
touching that gradient - light text on a light gradient, unreadable. It
was *worse* than before the migration, where dark text sat on the same
light gradient and at least read. The scan driving T-75 only looked at the
`bg-white`, `bg-gray` and `text-gray` families, so a gradient built out of
`from-orange-50 via-white` was invisible to it, and so is it to the guard
test from d. **Gradients need eyes, not the scan** - worth checking by
hand wherever one carries migrated text.
**Depends on:** T-73
**Model:** `sonnet` · **Nightly:** yes

### [x] T-76 · Root layout's title.template swallows every page title
**Why:** found while building T-69. `src/app/layout.jsx`'s metadata sets
`title: { template: 'Mercampus', default: 'Mercampus' }` — a template
needs a `%s` to interpolate a child page's title into it, and this one
has none, so Next.js just renders the literal string `'Mercampus'` for
any page that sets a plain `title: '...'` instead of showing that page's
own title. T-69 worked around this with `title: { absolute: '...' }` on
the two detail pages (bypasses the template entirely), but any other page
that sets an ordinary `title` string is silently getting `'Mercampus'`
instead — worth checking which pages currently do that and whether they
noticed.
**Done when:** the template reads something like `'%s · Mercampus'` (or
whatever the human prefers for the tab title format), confirmed against
every page that currently sets its own `title` to make sure none of them
were relying on the current no-op behavior on purpose.
**Done:** template is now `'%s · Mercampus'`, moved out of `layout.jsx`
into `src/lib/metadata.ts` (`titleMetadata`) so the `%s` can be asserted in
a unit test — importing `layout.jsx` from a test pulls in Clerk, next/font
and the global CSS.
**Audit (the part the ticket asked for):** all 22 pages and 4 layouts under
`src/app` were checked. Exactly one file exports `metadata` (the root
layout) and three export `generateMetadata` (`antojos/[id]`,
`antojos/sellers/[id]`, `marketplace/[id]`); there is no `<title>` tag
anywhere and no nested layout sets metadata. So **nothing was relying on
the no-op**: no page sets a plain `title` at all. The three that do set one
route through `buildProductMetadata`/`buildSellerMetadata`, which used
`title.absolute` with a hand-written ` · Mercampus` suffix precisely to
step around this bug (noted in T-69). Both builders now return the bare
name and let the template add the suffix; `openGraph`/`twitter` keep the
full string, since Next.js doesn't apply the title template to those.
**Verified:** the rendered title is unchanged, but it is now produced *by*
the template — `tests/e2e/recorrido.spec.js` already asserted
`toHaveTitle('Arepa de queso · Mercampus')` and
`toHaveTitle('Arepas El Parche · Mercampus')`, and with a plain `title` and
the old template those would have rendered the literal `'Mercampus'` and
failed. 16/16 e2e green, `npm run verify` green.
**Follow-up (not filed as a task):** now that the template works, ordinary
pages (`/about`, `/landing`, `/auth/*`, the seller's own screens) could set
a plain `title` and get a real tab name instead of the bare site name. None
do today; out of scope here.
**Model:** `sonnet` · **Nightly:** yes

### [ ] T-77 · `auth()` sometimes runs without Clerk's middleware context
**Why:** during the T-75a Lighthouse run the server logged, 24 times in
one run, `Clerk: auth() was called but Clerk can't detect usage of
clerkMiddleware()`, with a React `digest` and no URL. Nothing 500s — every
page still served 200 — but `getSellerContextData()` in the root layout
calls `auth()` without a try/catch, so whatever request hits this path
renders its layout through an error instead of a resolved session, and it
would silently sign the visitor out for that render.
**Investigated 2026-09-07, could NOT reproduce.** Ruled out, each by
experiment against a production build served from an in-memory Mongo (the
`scripts/lighthouse.mjs` recipe):
- *Not* the `next-intl` early return in `src/middleware.js` — the first and
  most obvious suspect, since `if (isIntlRoute(req)) return
  intlMiddleware(req)` returns before Clerk decorates the request. `/about`
  and `/en/about` log nothing.
- *Not* the `?theme=dark` query Lighthouse appends (the matcher regex has a
  `[^?]*` clause about search params, so it was worth testing): all 6
  budgeted pages were probed with and without it, 12 requests, zero errors.
- *Not* the build phase — in the logs the errors land after `──── server
  ────`, during the page loads, not during `Generating static pages`.
- *Not* something only a real browser triggers: driving Chromium through
  Playwright to `networkidle` on all 6 pages, so every client component
  mounts and makes its `/api/*` calls, also logs zero.
**Where to pick it up:** the error carries no URL, which is what makes it
hard — the first job is finding out *which* request it is. Both runs that
showed it were also the runs where Lighthouse was failing with `NO_FCP` on
this machine, so it may well be an artifact of a Chrome that never paints
rather than a bug real visitors hit; that is a guess, not a finding.
Cheapest next step is defensive and useful either way: wrap the `auth()`
call in `getSellerContextData()` so a throw degrades to "no session" — a
state that function already models and returns — instead of taking the
root layout down with it, and log the pathname when it happens. That turns
an invisible error into something with an address on it.
**It reproduces after all — in CI, every time (found 2026-09-10).** The
`lighthouse` job logs it **36 times per run**, and it did so in three
consecutive runs: 34554978872 (T-104's source PR), 34556229494 and
34557100075 (both docs-only). Same count regardless of what the PR changed,
so it is not content-dependent. The investigation above was local; the
reproduction is the CI job, and anyone can re-read it with
`gh run view <id> --job <lighthouse job id> --log`.
**This kills the leading hypothesis.** The entry guessed the errors might be
an artifact of a Chrome that never paints, since both runs that showed them
were also failing with `NO_FCP`. But run 34554978872's `lighthouse` job
**passed**, all budgets green, and still logged the same 36. The errors are
independent of whether Lighthouse fails: the run where they appeared with a
failure (34557100075) failed on `categories.performance 0.34 vs 0.35` on
`/antojos`, which is the ordinary threshold noise T-73's entry already warns
about, not `NO_FCP`.
**So the "which request is it" job just got much cheaper** - it is a fixed
set of 6 budgeted URLs, on a machine that can be re-run at will, producing a
stable count. The defensive step this entry already proposes (wrap `auth()`
in `getSellerContextData()` so a throw degrades to the "no session" state it
already models, and log the pathname) is now verifiable rather than
speculative: with a stable 36, a run that logs 36 pathnames tells you which
requests they are, and a later run tells you whether the fix moved the
number.
**Careful, same as T-91:** that wrap is inside the root layout. Making it
degrade gracefully is safe; restructuring what the root layout awaits is
T-12d/T-91 territory and is not this task.
**The defensive half is done (PR #TBD, 2026-09-15). The entry stays open
because the cause is not found.** `getSellerContextData()` now catches the
throw, returns the `{ user: false, seller: false }` it already returned for
an anonymous visitor, and logs the pathname with `logger.warn`. What that
buys: the root layout no longer renders through an error, and the next
occurrence carries an address. What it does not buy: any answer to *why*
`auth()` runs without Clerk's context.
**Baseline, re-measured before the change:** run 34924504970, `lighthouse`
job 104239568323, on `agent/develop`. **36 errors, and the distribution is
flat: exactly 6 on each of the 6 budgeted URLs** — `/antojos`,
`/antojos/<id>`, `/antojos/sellers/<id>`, `/antojos/sellers/list`,
`/marketplace`, `/about`. Within each page the 6 arrive as 3 pairs, each
pair ~2ms apart and the pairs ~20ms apart, all within one page load. That
`/about` scores the same 6 as everything else is another nail in the
intl-middleware theory, and the flat 6-per-URL says whatever it is happens
a fixed number of times per render, not once per route.
**Do not let the wrap swallow Next's control flow.** Next signals "this
route is dynamic" by throwing `DynamicServerError` out of `headers()`, which
is what Clerk's `auth()` calls underneath. Catching that one would let the
root layout prerender and bake a signed-out session into every static page —
permanently, not for one render, and far worse than the bug being defended
against. The wrap rethrows anything carrying a `digest` string
(`DYNAMIC_SERVER_USAGE`, `NEXT_REDIRECT`, `NEXT_NOT_FOUND`,
`BAILOUT_TO_CLIENT_SIDE_RENDERING`); the build's route table staying all `ƒ`
is the check that it worked.
**The pathname is best-effort, and that is a real limitation.** Next 14 hands
a Server Component no pathname, and the middleware that would normally set a
header for it is exactly what is missing when this fires. The wrap reads an
allowlist — `next-url` (client-side navigations), `x-matched-path` (Vercel),
`x-invoke-path`, `x-pathname`, `referer` — and logs `pathSource: 'none'`
when none of them is present, rather than inventing one. Nothing else is
read off the request: it also carries Clerk's session cookie. On a cold
document request in the `lighthouse` job none of those headers exist, so
expect `path: 'unknown'` there; it is on Vercel and on soft navigations that
this earns its keep.
**Noticed while in there, not fixed (rule 9, rule 2).** Three other call
sites `await auth()` with no try/catch and would throw the same way:
`src/app/antojos/layout.jsx:8` and `src/app/marketplace/layout.jsx:8` (both
only to pass `userId` to `SideBar`), and `src/server/sellers/
getProfileChecklist.ts:15`. They are *not* the source of the 36 — `/about`
renders none of them and still logs 6 — but whoever finds the cause should
fix them in the same pass rather than one at a time.
**Model:** `opus` — subtle, and it runs through the root layout · **Nightly:**
no

### [x] T-80 · Translate the existing code comments to English
**Why:** the 2026-09-05 decision (see T-66) says code, comments and the
ROADMAP go in English. T-66 delivered exactly what its own "Done when"
asked for — `ROADMAP.md` — and CLAUDE.md's rule was updated, but the
comments already written in the code were never migrated. Every task since
then adds English comments next to Spanish ones, so the repo drifts
further into a mix rather than settling. Measured 2026-09-07: **670
comment lines across 124 files** carry Spanish markers (accents, `ñ`,
`¿¡`, or Spanish function words) — a floor, not an exact count, since the
heuristic misses unaccented Spanish.
**Not a rewrite:** comments only. No renaming of identifiers, no behaviour
change, no reflowing of code. A batch that touches anything but comment
text has gone out of scope.
**Done when:** the comment bodies are in English, batch by batch, keeping
each note's exact technical meaning rather than translating word for word
— the same bar T-66 set for the ROADMAP.
**Split by zone** (~15 files per PR, per CLAUDE.md), in this order:
| Batch | Zone | Files | Lines | State |
|---|---|---|---|---|
| a | `src/lib`, `src/server`, `src/services`, `src/context`, `middleware.js` | 17 | 100 | **done (#265)** |
| b1 | `src/utils` | 16 | 100 | **done (#266)** |
| b2 | `src/app/api` | 10 | 84 | **done (#267)** |
| c1 | `src/components` | 17 | 91 | **done (#268)** |
| c2 | the pages under `src/app`, plus what the old scan missed in a/b | 16 | 41 | **done (#269)** |
| d1 | `tests/integration` | 20 | 143 | **done (#271)** |
| d2 | `tests/unit`, `tests/e2e`, `tests/setup.js` | 16 | 92 | **done (#272)** |
| e | `scripts/` | 13 | 213 | merged (#273), human-reviewed |
**Batch b was split in two (2026-09-07):** the estimate said ~19 files, the
real count is 25 (169 lines) - over CLAUDE.md's ~15 guideline, so `src/utils`
and `src/app/api` became b1 and b2.
**The inventory undercounts, and b2 proved how (2026-09-07):** the scan
only looked at lines *starting* with a comment marker, so trailing
`code // comment` was invisible, and the Spanish detector missed comments
written without accents or its keyword list. `api/uploadimageProduct/
route.js` never appeared in the inventory at all for that reason - all of
its comments are Spanish. The scan now also reads trailing comments and a
wider word list; treat every count in this ticket as a floor and rescan
each zone after translating it rather than trusting the original number.
**Re-counted with the fixed scan (2026-09-07):** `tests/` is 232 lines
across 36 files, not 156/34; `scripts/` is 184 lines, not 149. The zones
already marked done are *not* clean either - the old scan left 11 lines
behind in `src/utils`, `src/services` and `src/app/api`, which batch c2
picks up. "Zone at zero" only ever meant "zero for the scanner of the day".
**Not in scope, decided while doing batch c1:** commented-out *code* whose
strings are Spanish UI copy stays as it is (`ShareButton.jsx`'s
`¡Mira este producto en Mercampus!`) - that is product copy, which CLAUDE.md
keeps in Spanish, and deleting dead code is a separate call. Test
`describe`/`it` descriptions stay Spanish too: they are prose for whoever
reads a failure, not code comments, and every existing test file writes
them that way.
**`src/` is finished as of c2** - one line left, on purpose: `ShareButton`'s
commented-out share text, which is product copy. `tests/` and `scripts/`
remain.
**A word on the scan itself.** It was widened twice while doing this task
and the second widening went too far: adding `no` and `si` to the Spanish
word list made it flag English comments containing "no", turning 41 real
hits into 111 mostly-false ones. If you rebuild it, prefer accents, `ñ` and
words with no English twin; then read the output rather than trusting the
count.
**The scan cannot be trusted as a stop condition.** By batch d it was
producing false positives in the other direction: an English comment
containing "error", or a Spanish product name ("Buñuelo") inside an English
sentence. Use it to find candidates, then read them. A zone is finished
when the remaining hits are all explainable, not when the count is zero.
**`tests/` is finished as of d2.** One hit remains and it is a false
positive: an English comment containing the product name "Buñuelo".
**Flaky e2e, seen 2026-09-07 during d2:** `npm run test:e2e` failed two of
the seller specs (`el perfil del vendedor carga su negocio`, `el listado de
vendedores muestra las tarjetas`) and then passed 16/16 on an immediate
re-run of the same commit, with only comment changes in the tree. Worth
knowing before anyone reads a red e2e as a real regression — and worth its
own look if it repeats, since a flaky suite that cries wolf is how a real
break gets waved through.
**Batch e went last and was reviewed by the human before merging**, as
this ticket required from the day it was filed.
**Closed 2026-09-07.** All eight batches landed: 8 PRs, ~1,000 comment
lines across `src/`, `tests/` and `scripts/`. Two comments stay Spanish on
purpose and are listed in the guard's ALLOWED-style notes above:
`ShareButton`'s commented-out share text (product copy) and an English
comment quoting the product name "Buñuelo". The `describe`/`it` strings
are a separate task, T-85. `scripts/` is where the
dangerous notes live — `seed.mjs`'s "NUNCA apuntes esto a producción",
`backup-db.mjs`, `reclaim-account.mjs`, `set-admin-metadata.mjs`. T-66
already made this point about the ROADMAP: a translation that softens or
blurs one of those warnings is worse than leaving it in Spanish. Same
applies to the `.env`-points-at-production and multiple-Clerk-instances
notes wherever they appear in code.
**Not in scope:** UI copy. What a student reads stays Spanish by default
(CLAUDE.md: it's a business language, not a code one); translating that is
T-81.
**Model:** `sonnet` for batches a-d, `opus` for e · **Nightly:** yes for
a-d, no for e

### [~] T-81 · Finish the i18n migration, zone by zone
**Why:** T-46 shipped the scaffolding and `/about` as the proof screen,
and closed with "afterward, one task per zone: listing, product detail,
seller profile, forms, seller panel. Each with its own PR." Those tasks
were never filed, so the follow-up lives only as a sentence inside a
ticket that is already marked done — which nobody reads. Measured
2026-09-07: **1 of 21 pages** sits under `[locale]/`, and at least 53
hardcoded Spanish strings remain in 21 files (a floor: the count only sees
text between `>` and `<` on one line, not `placeholder=`, `title=`, `alt=`
or multi-line copy).
**Done when:** each zone moved under `src/app/[locale]/` with its copy in
`messages/{es,en}.json`, one PR per zone, and `tests/e2e/i18n.spec.js`
extended to walk it in both languages.
**Suggested order** — by what an exchange student hits first: listing
(`/antojos`, `/marketplace`) → product detail → seller profile → auth →
the seller's own forms → admin (or leave admin out; it has one user).
**Carry over from T-46, don't rediscover it:** `localeDetection: false` on
purpose, and the language switcher is a plain `<a href>`, not `next-intl`'s
`Link` — `NextIntlClientProvider` lives in the root layout, which Next
doesn't re-run on a client-side navigation, so a soft navigation left the
translation stuck on the initial locale.
**Watch out:** the middleware currently matches `/about(.*)` and
`/en/about(.*)` only, and has to keep coexisting with `clerkMiddleware`.
Every zone widens that matcher, which is the part that can break auth on
routes that have nothing to do with i18n.
**Still not solved by any of this:** what sellers write themselves —
product names and descriptions — stays in whatever language they typed. A
product decision, not an i18n one.
**Split by zone**, one PR each, tracked here as it goes (see T-80 for the
same pattern applied to a different migration):
| Zone | Routes | State |
|---|---|---|
| listing | `/antojos`, `/marketplace` (index pages only, not their sub-routes) | **done** |
| product detail | `/antojos/[id]`, `/marketplace/[id]` | pending |
| seller profile | `/antojos/sellers/[id]`, `/antojos/sellers/list` | pending |
| auth | `/auth/login`, `/auth/register` | pending |
| seller's own forms | `/antojos/sellers/register`, `/profile/edit`, `/products/edit(/[id])`, `/schedules`, `/approving`, `/antojos/product/add` | pending |
| admin | `/admin/*` | pending (or skip - one user, per the note above) |
**Listing zone notes (this PR):** `isIntlRoute` in `src/middleware.js` now
matches `/antojos`, `/en/antojos`, `/marketplace`, `/en/marketplace` as
exact paths (no `(.*)` wildcard) - their sub-routes stay on the old,
unmigrated tree under `src/app/antojos/` and `src/app/marketplace/` on
purpose, so `isProtectedRoute`'s gate on `/antojos/sellers/register` etc.
is untouched. `src/app/[locale]/antojos/layout.jsx` and
`.../marketplace/layout.jsx` are deliberate duplicates of the old
layouts, not shared - a `[locale]` segment can't span into the sibling
non-locale tree that still owns those sub-routes. No visible locale
switcher on these two pages yet: `LocaleSwitcher` only renders inside
`AboutLayout` and its hrefs are hardcoded to `/about` - generalizing it to
work from any zone is left for whichever zone does it first. Both
languages are reachable directly by URL either way, which is what this
task's "Done when" asks for.
**Locale switcher follow-up (closed):** `LocaleSwitcher` now takes a
`basePath` prop (`about` / `antojos` / `marketplace`) instead of a
hardcoded `/about` href, and renders in `src/app/[locale]/antojos/layout.jsx`
and `.../marketplace/layout.jsx` too - outside `<Layout>`, so it does not
leak into the shared `Layout`/`Navbar` used by the still-unmigrated
`src/app/antojos/layout.jsx` and `src/app/marketplace/layout.jsx`. It still
does not preserve query params (sort/category/availability) across a
switch, matching the About switcher's existing behavior on purpose.
`tests/e2e/i18n.spec.js` walks the switcher on both listing pages.
**Model:** `sonnet` per zone, `opusplan` if the middleware matcher needs
rethinking · **Nightly:** yes

### [x] T-84 · A signed-in Playwright fixture
**Why:** T-67 audited the public screens and could not touch the
authenticated half its own "Done when" asked for — seller registration,
profile edit, product CRUD, schedules, admin — because Playwright has no
Clerk session and every one of them redirects to `/auth/login`. That is
also why `card-variants.test.js` says its unit tests are "the only net"
covering the `embedded` variant, and why T-72's checklist and T-71's pause
toggle were verified by probe rather than by a walkthrough. The gap is
wider than one audit.
**Done when:** the e2e harness can start a run already signed in as a
seeded seller, so a spec can visit an authenticated screen. Whatever shape
it takes, it has to work with the harness as it stands: `scripts/e2e.mjs`
builds against an in-memory Mongo and needs a real Clerk publishable key,
because Clerk's middleware rejects every route without one.
**Careful — this is where the Clerk instance trap bites again.** A seeded
Mongo user is not a Clerk account, and a `clerkId` only means anything
inside its own instance (T-12h/T-64). A fixture that invents a session for
a user that does not exist in the instance the keys belong to will either
fail or, worse, pass against nothing. Read T-64 and
`scripts/backfill-clerk-id.mjs`'s instance guard before designing it.
**Unblocks:** the second half of T-67, and real coverage for T-71/T-72.
**Done (2026-09-08):** `scripts/clerk-e2e-user.mjs` creates a throwaway Clerk
account per run, `scripts/e2e.mjs` writes its real id onto the seeded owner of
"Arepas El Parche", and `tests/e2e/auth.setup.js` signs in with it and parks
the session for a new `signed-in` Playwright project. The suite went from 16
tests to 57.
**How the instance trap was handled:** measured first, not assumed.
`GET /v1/instance` says the keys in `.env` **and** the ones in CI are the same
`development` instance (`sacred-shrew-44`, 11 accounts) — the one CLAUDE.md
describes. The guard in `clerk-e2e-user.mjs` is the **mirror image** of
`backfill-clerk-id.mjs`'s: that script refuses to run anywhere but production,
because it writes ids onto real people; this one refuses to run anywhere but
development, because it creates and deletes accounts. Neither can be pointed
at the other's instance by accident.
**Why the account is real and not a stub:** the seed writes
`clerkId: 'user_seed_carlos'`, which exists in no instance. Anything built on
top of that signs in as nobody. The link is what the specs assert on — the
profile form comes back holding "Arepas El Parche", and T-72's checklist
renders at all, which only happens when `getProfileChecklist()` resolves a
seller from `auth()` on the server.
**The control matters as much as the fixture:** `tests/e2e/auth-gate.spec.js`
runs in the signed-out project and asserts the same four routes redirect to
the login. Without it, every signed-in assertion is equally well explained by
"the gate is open to everyone".
**Housekeeping that came with it:** the fixture email is unique per run
(`GITHUB_RUN_ID`, so two CI jobs cannot collide), the account is deleted in a
`finally`, and a run killed in between is swept by the next one. Measured
after a full run: the instance is back to exactly 11 users, 0 leftovers.
`npm run test:e2e` also passes its arguments through to Playwright now, so a
single spec can be run without waiting on the whole suite.
**Found by the control spec, and it predates this task:** CI and local were
running the e2e against two differently configured apps. `NEXT_PUBLIC_CLERK_
SIGN_IN_URL` is baked into the build and decides where a signed-out visitor
hitting a gated route lands — `.env` sets it to `/auth/login`, the CI workflow
never set it, so in CI every redirect went to Clerk's hosted portal at
`sacred-shrew-44.accounts.dev` and the app's own login screen was never
exercised there at all. Nothing noticed until a spec asserted on where the
redirect lands. `scripts/e2e.mjs` now pins both URLs, so the suite tests the
same app everywhere.
**CLERK_SECRET_KEY is now required** to run the e2e at all, the same way the
publishable key already was. A suite that quietly skips its authenticated half
is the failure this task exists to prevent. CI already had the secret.
**Model:** `opus` — auth in a test harness, with a known history of
instance mix-ups · **Nightly:** no

### [x] T-94 · The other half of the T-67 audit: the seller screens
**Why:** T-67's own "Done when" asked for seller registration, profile edit,
product CRUD, schedules and admin, and it could not reach any of them —
Playwright had no session, so all five redirected to the login. It said so
and left them. T-84 built the way in; nobody has walked through them yet.
The public half produced 27 findings, three of them serious. There is no
reason to think the screens nobody has ever audited are cleaner.
**Done when:** the same walkthrough T-67 did — desktop and mobile, both
themes, screenshots — over the seller screens, written up as numbered
findings in `docs/audits/t-67/` (continue the F-numbering; these are the same
audit, not a new one). Diagnosis only, no product changes, follow-ups get
their own tasks.
**Read first:** `docs/audits/t-67/README.md` for the harness recipe, and
`tests/e2e/signed-in/seller-screens.spec.js` for how to get a session. A spec
in `tests/e2e/signed-in/` starts signed in as the seeded approved seller.
**Not covered by the fixture:** admin. The session is a seller, not an admin —
the role lives in Clerk's `publicMetadata` (T-12), so auditing `/admin/*` needs
the fixture account to carry it. Decide whether that is this task or another
one before starting.
**Done (2026-09-08):** seven screens walked on both viewports in both themes —
register, approving, profile edit, schedules, the product list, product edit and
product add — 24 screenshots and **26 findings, F28–F53**, appended to
`docs/audits/t-67/findings.md`. No product code changed.
**The admin decision: another task, T-95.** Not scope creep avoidance — the
fixture would have to be given `publicMetadata.role = 'admin'`, which means
`clerk-e2e-user.mjs` starts minting privileged accounts in a real Clerk
instance. That is a change to the harness with its own instance-safety
questions (T-12h/T-64), not a corner of a diagnosis task, and mixing it in
would have put a security-shaped change inside a PR that otherwise touches
nothing but Markdown and PNGs.
**The three worst:** (1) **F45** — `InputFields` hardcodes `bg-[#f0f5fa]` while
the text colour comes from the theme, so in dark mode every value on every
seller form renders at **1.13:1**: a seller cannot read their own business name,
slogan or phone number. (2) **F28** — `GET /api/products/[id]` populates the
owner with `match: { approved: true }` and then dereferences the result, so it
answers **500** for any product whose seller is not approved; the edit screen
falls back to one bare line of text, which means an approved seller who is later
un-approved loses access to every one of their own products. (3) **F32/F33** —
the product list, the screen a seller uses daily, has twenty tab stops that are
all unnamed checkboxes, and the card that opens a product for editing is a
`<div onClick>` with no `tabIndex`, so changing a price is mouse-only.
**How the two unreachable screens were reached:** registration and the approval
notice both bounce an approved seller, and the fixture *is* the approved seller.
The harness moved the fixture's `clerkId` onto another seeded user (the buyer,
then the pending seller) in the run's in-memory database and reloaded. Worth
knowing before reading the shots: the avatar still draws the fixture account's
initials, so a page greeting "Postres Laura" shows "CM". Noted in the README.
**One measurement was wrong and got redone:** the first contrast pass reported
grey-on-`#393939` for text that is plainly on a white card. daisyUI 4 declares
its themes in `oklch()`, so a checker whose regex only understands `rgb()` reads
every themed surface as transparent and keeps walking up to the nearest hex
background. Second pass normalises every colour through a 1x1 canvas; the
numbers in F48 are from that one. The lesson generalises: this project's
surfaces are daisyUI tokens, so anything that parses computed colours by regex
is measuring something else.
**Model:** `sonnet` · **Nightly:** yes

### [ ] T-95 · Audit `/admin/*`, the last unaudited screen
**Why:** the one route T-67 and T-94 both left alone. `/admin/sellers` is where
a seller gets approved — the gate between "registered" and "visible to buyers" —
and nobody has looked at it since T-12 fixed its authorisation. T-94 walked
everything else behind a session and found 26 problems; there is no reason to
expect the screen nobody has audited to be cleaner.
**Blocked on the fixture, and that is the real work.** The T-84 account is a
seller. The admin role lives in Clerk's `publicMetadata` (T-12), so auditing
this means `scripts/clerk-e2e-user.mjs` creating an account with
`publicMetadata: { role: 'admin' }` — a privileged account, minted per run, in a
real Clerk instance. Read T-64 and the instance guard in `clerk-e2e-user.mjs`
before touching it: that guard exists because a `clerkId` only means anything
inside its own instance, and this makes the stakes of pointing it at the wrong
one higher, not lower. The account is deleted in a `finally` and swept by the
next run — keep both.
**Done when:** the fixture can start a run as an admin (with the guard intact
and the sweep proven, the way T-84 proved it), and `/admin/sellers` is walked
the way T-94 walked the rest: desktop and mobile, both themes, screenshots,
findings numbered from F54 in `docs/audits/t-67/`. Diagnosis only.
**Careful:** the middleware calls Clerk's Backend API on every admin request
(`esAdmin`), so this is also the first e2e that exercises that path. If it is
slow or flaky, say so in the PR — that is a finding about production, not about
the test.
**Model:** `opus` — it is auth in a harness, the same reason T-84 was
· **Nightly:** no

### [x] T-96 · Dark mode: unreadable values across every InputFields form
**Why:** T-94's own "three worst" list put this first — **F45**, and its root
cause **F19** on the auth screens. `InputFields` hardcoded `bg-[#f0f5fa]`, a
light panel colour, on every input and textarea, while the typed value kept
the theme's text colour. In dark mode that is light text on a light box —
measured at **1.13:1** on the seller forms — so a signed-in seller could not
read their own business name, slogan or phone number back. F19 is the same
bug on login, register and PQRS, just measured first.
**Done when:** `InputFields` uses a themed background instead of the hardcoded
hex, checked against dark and light in a real build, on every one of the 7
screens the component renders on (not only the profile-edit form F45 measured):
`/auth/login` (+ its `ForgotPassword` modal), `/auth/register`, `/antojos/pqrs`,
`/antojos/sellers/register`, `/antojos/sellers/profile/edit`,
`/antojos/sellers/products/edit/[id]`, `/antojos/product/add`.
**Done (2026-09-08):** one component, three occurrences of the same class
string (`InputFields.jsx`'s textarea, `tel` input and default input all
repeated it). `bg-[#f0f5fa]` → `bg-base-200 text-base-content`, the same
daisyUI tokens every other themed surface in the app already uses (`PqrsForm`,
`ProductModal`, `SellerModal`, `Hambtn`, …) — no new pattern introduced.
Verified all 7 usages read the same `className` merge with no caller passing a
conflicting `bg-*` override (one caller, the register password field, adds
`border-*` only). Before/after screenshots, light and dark, in
`docs/audits/t-96/` — `login`/`auth-register`/`pqrs` from a fresh `next build`
with the fields filled in (the bug is in the *typed value*, an empty field
hides it), the four seller screens signed in through T-84's fixture
(`npm run test:e2e`), reusing the `docs/audits/t-67/` shots already committed
as the seller-side `before`.
**Not re-shot:** `/antojos/sellers/register` — reaching it signed in needs the
account-swap trick T-94's README describes (an approved seller is bounced off
that route). Confirmed by reading the file instead: same component, same
unconflicting `className`.
**Model:** `sonnet` · **Nightly:** yes

### [x] T-97 · The product edit dead end and the 500s (F28, F29)
**Why:** second on T-94's own follow-up list, and the only finding in the
seller half that answers a **500**. `GET /api/products/[id]` populated the
owner with `match: { approved: true }` and then read `product.sellerId._id` on
the very next line, so a product whose seller is not visible got
`Cannot read properties of null` — never an answer. The edit screen read that
route from the client, so all of it arrived as
`Error al cargar los detalles del producto.` in a naked paragraph: no header
band, no form, no link back, and a URL still claiming to be editing a product.
And `GET /api/products/not-an-id` answered 500 with Mongoose's own CastError in
the body — `for model "Product"`, the path it is keyed by, the value.
**Measured read-only against the real database (2026-09-08), before writing
any code:** **17 of 112 products** answer 500 on that route today.
- **14** belong to **10 of the 18 unapproved sellers** (36 of 54 are approved).
- **3** more point at a `sellerId` that matches **no seller at all** — 2
  distinct dangling ids. The populate yields null for the same reason, so they
  fail identically; nobody can legitimately edit them either.
- **0 paused.** No seller document carries `paused` yet (0 of 54): T-71 shipped
  the field and nobody has used it, so the paused half of this moves no row.
- 16 of the 17 have `availability: true`, i.e. they look live.
**Correcting F28's reasoning, which the finding got one step wrong:** it says
"an approved seller who is later un-approved can no longer open any of their
own." True in effect, but not through this 500 — `useCheckSeller('sellerApproved',
'/antojos/sellers/approving')` gates add, list *and* edit, so an unapproved
seller is redirected before the fetch happens. The 500 is reached by an
*approved* seller opening the URL of a product owned by an unapproved (or
deleted) seller. The gate is left exactly as it was: whether an unapproved
seller should be allowed to edit is a product decision, not part of fixing a
500. What did change is that ownership no longer depends on the owner being
publicly visible — `getProductForEdit` has no `approved`/`paused` filter, and
two tests pin that.
**Done when:** the route answers 400 for a malformed id with no driver message
in the body, never 500 for a product whose owner is not visible, and the edit
screen resolves its own product on the server — 404 when it is missing, and
nothing rendered around nothing.
**Done:** same shape as T-90's fix for F1/F2.
- `productIdSchema` in `lib/validators/product.ts`, applied in **all three**
  handlers. F29 named the GET, but the same malformed id reached Mongoose
  through `verifyOwnershipAndGetSellerId` in the PUT and the DELETE. Those two
  also stopped hand-rolling their catch: `errorResponse` keeps an AppError's
  4xx message and never returns a 500's, which is the other half of F29.
- The GET still populates behind a filter, but the result is checked before
  being dereferenced, and the filter is now `publicSellerFilter()` instead of a
  fourth hand-written copy of the visibility rule (T-74's note). This route was
  the copy that disagreed: it left `paused` out, so a paused seller's product
  stayed reachable by direct link while the listing, the seller list and the
  sitemap all hid it. 0 rows affected today, measured.
- Missing and not-public answer the *same* 404, body included, with a test
  pinning that they are byte-identical: telling them apart would answer "this
  exists but you may not see it" to anybody trying ids.
- `src/server/products/getProductForEdit.ts` resolves the product and the
  answer to "may this session edit it?" server-side, returning
  `ok`/`not-found`/`forbidden` rather than throwing. The page is a Server
  Component now and the form moved to
  `components/products/edit/EditProductForm.jsx`, taking the product as a prop
  — there is no load left to fail, and no ownership check that can be skipped
  because the request 500'd on the way to it.
- A failed *save* no longer replaces the screen either. `if (error) return
  <p>{error}</p>` was the same bare line, and it took the seller's unsaved
  edits with it; it reports next to the form now.
**Both failures render the same 404, deliberately.** Next 14 gives a page no
way to answer 403 — and `notFound()` answers 200 here anyway, which is T-91 and
app-wide — so the only real choice is what the visitor sees. A 404 does not
confirm that somebody else's product id exists, and `app/not-found.jsx` (T-90)
already offers a way back, which is the half of F28 the bare paragraph had
none of. The authorization that matters is unchanged and still a real 403: PUT
and DELETE verify ownership themselves.
**Verified:** `npm run verify` green. 17 new integration tests in
`tests/integration/product-by-id.test.js` (the 200, the 400 and what its body
must not contain, and 404 for each of the four ways the owner can be invisible
— unapproved, orphan, paused, missing — plus the nine `getProductForEdit`
cases). 6 e2e in `tests/e2e/signed-in/product-edit.spec.js` on T-84's session;
`scripts/e2e.mjs` now exports `E2E_PENDING_PRODUCT_ID`, because a product that
exists and belongs to somebody else cannot be reached through the UI, which is
the point. Full `npm run test:e2e`: 61 passed, 1 unrelated flake
(`about-topbar.spec.js`'s T-87 scroll-back assertion, which passes on its own —
reported, not fixed here).
**Confirmed dead and removed:** `getProductById` in `services/productService.js`
had no callers left across `src/`, `tests/` and `scripts/` once the edit screen
stopped using it — it was also one more `fetch` to our own API from a Server
Action, the antipattern CLAUDE.md is removing. `ProductPage` calls
`/api/products/[id]` with `fetch` directly and is untouched.
**Left for its own task, measured not guessed:** those same 17 products still
paint F1's fake chrome on the **public** page. `ProductPage` hands any JSON
body to `setProduct`, so a 404 (or the 500 before it) is truthy and renders the
full product frame — `$ NaN`, a live "Contactar por WhatsApp" — around an error
object. T-90 fixed that for ids that resolve to nothing; it never covered a
product whose *owner* is invisible, and the client has no error state at all
(the same gap F2 left behind). Fixing it means either a server-side visibility
guard on `antojos/[id]` and `marketplace/[id]` — which would 404 those 17
products publicly, a real change to production behaviour that deserves its own
decision — or an error state in `ProductPage`. Not smuggled in here.
**Model:** `opus` — it is a 500 with an authorization check behind it
· **Nightly:** yes

### [x] T-98 · Keyboard access on the product list: unnamed switches and an unreachable card (F32, F33)
**Why:** on `/antojos/sellers/products/edit`, every one of the 20 tab stops
after "Añadir Producto" was a checkbox with no accessible name (**F32** —
`ToggleSwitch` renders a bare `<input type=checkbox>` inside a `<label>` with
no text of its own; the visible "Disponibilidad" beside it is a `<p>`, not a
`<label for>`) and the card that opens a product for editing was a `<div
onClick>` with no `role`, no `tabIndex` and no `href` (**F33**), so tabbing
went straight from the button into the toggles. A seller could flip a
product's availability with a keyboard but could not open it to change its
price, description or photos.
**Done when:** the switches on that screen carry a name that identifies which
row they belong to and its state, the card is a real, focusable link to
`/antojos/sellers/products/edit/<id>`, and an e2e reaches a product's edit
form using the keyboard alone.
**Done (2026-09-08):**
- `ToggleSwitch` takes an optional `label` prop rendered as `aria-label` on the
  checkbox. Only `/antojos/sellers/products/edit` passes it (the seller's own
  switch names the business, each product's switch names the product and its
  state) — the other two callers (`EditSellerForm`, `EditProductForm`) are
  unchanged, out of this task's scope.
- The card wrapper is a `next/link` `<Link>` to
  `/antojos/sellers/products/edit/<id>` instead of a `<div onClick>`, which is
  what the handler already did — `handleProductClick` is gone, dead once the
  `Link` took over its one call site (confirmed with a repo-wide search).
**Verified:** `npm run verify` green. New
`tests/e2e/signed-in/product-list-keyboard.spec.js` on T-84's session: one test
asserts both switches (seller and a named product) resolve by accessible
name; the other tabs from "Añadir Producto" until focus lands on a product
card's `href` (bounded, so a regression back to an unfocusable `div` fails the
assertion instead of hanging), reads the product's name off the card rather
than assuming which one Mongo's unsorted `find()` returns first, presses
Enter, and asserts the edit form loads prefilled with that same product.
**Model:** `sonnet` · **Nightly:** yes

### [x] T-101 · The schedule row's end time is cut off on mobile (F42)
**Why:** on `/antojos/sellers/schedules` at 390px, each schedule row's time
group (`Hora Inicial` label + input, `Hora Final` label + input) was one
`flex gap-2` row with no wrapping below `md:`. Measured: the row's content
was 411px wide inside a ~279px box, and the second `input[type=time]`
(`Hora Final`) landed at x=311-467 — 77px past the 390px viewport — inside a
container whose computed `overflow-x` is `hidden` (`Layout.jsx`'s
`hide-scrollbar` scroller). There is no horizontal scroll to reach it; the
field stayed technically usable only because the visible sliver happened to
include the hour, and the value cut off mid-string (`04:00 p`).
**Done when:** both time inputs are fully visible and reachable within a
390px viewport, the desktop layout (not flagged in the audit) is unchanged,
and an e2e pins the `Hora Final` input's bounding box to the viewport at
390px so a regression fails the build.
**Done (2026-09-08):** in `src/components/seller/Schedule.jsx`, the time
group's single `flex` row is now `flex flex-col md:flex-row md:items-center`
wrapping two sub-rows (`Hora Inicial` label+input, `Hora Final` label+input),
each its own `flex items-center gap-2` pair. Below `md:` the sub-rows stack
vertically, so each pair gets the row's full width instead of splitting it
four ways; at `md:` and above the sub-rows sit side by side exactly as
before (same classes on the `select`/button group and on both inputs).
**Verified:** `npm run verify` green. New
`tests/e2e/signed-in/schedule-mobile.spec.js` sets a 390x844 viewport,
navigates to the seeded seller's schedules screen, locates the `Hora Final`
input by its adjacent label (it isn't wired to it with `htmlFor`/`id` —
F41's sibling problem, out of this task's scope), and asserts its bounding
box's right edge stays within the viewport width.
**Model:** `sonnet` · **Nightly:** yes

### [x] T-99 · Gate `/antojos/sellers/approving` at the middleware (F30)
**Why:** `isProtectedRoute` in `src/middleware.js` listed `register`,
`profile/edit`, `products/edit`, `schedule` and `product/add`, but not
`approving` — the one seller route the audit found the middleware did not
match. Measured signed out: every other route in the list already lands on
`/auth/login?redirect_url=...` before any HTML ships; `approving` rendered
itself first and only bounced to `/auth/login` about a second later, when
`useCheckSeller` ran client-side — and with no `redirect_url`, so signing in
did not return the visitor to where they were headed.
**Done when:** a signed-out visit to `/antojos/sellers/approving` redirects at
the edge, with a `redirect_url`, same as the other four seller routes.
**Done (2026-09-08):** added `'/antojos/sellers/approving(.*)'` to the
`isProtectedRoute` matcher, next to `schedule`. The middleware only enforces
that matcher when there is no `userId` (`if (!userId && isProtectedRoute(req))`),
so a signed-in seller's visit is unaffected regardless of the matcher —
confirmed `tests/e2e/signed-in/seller-screens.spec.js` does not currently
navigate to `approving` at all (checked with a repo-wide search), so this
change touches no signed-in path.
**Verified:** `npm run verify` green. Extended the existing `gatedRoutes` array
in `tests/e2e/auth-gate.spec.js` (T-84) with `/antojos/sellers/approving`
rather than adding a new spec — same one `describe`, same assertion the other
four routes already use. Full `npm run test:e2e` green.
**Model:** `sonnet` · **Nightly:** yes

### [x] T-100 · Dark mode for react-select and the approving screen (F46, F47)
**Why:** the two dark-mode findings T-96 explicitly left for their own task.
**F46** — the "Sección" and "Categoría" comboboxes on `/antojos/product/add`
and the product edit form stay pure white with dark text in dark mode:
`react-select` paints control/menu/option colours as inline styles, so neither
Tailwind's `dark:` variants nor daisyUI's `data-theme` switch ever reach it.
**F47** — `/antojos/sellers/approving` hardcodes `bg-[#F2F2F2]` for the page and
`bg-[#FF7622]` for the card, so the screen is pixel-identical in both themes.
**Done when:** both comboboxes repaint on a theme flip with no full reload, and
the approving screen uses daisyUI tokens instead of the two hardcoded hexes.
**Done (2026-09-08):**
- `src/utils/hooks/useReactSelectTheme.js`: `useReactSelectStyles()`, a hook
  returning react-select's `styles` prop (one function per part - `control`,
  `menu`, `option`, `singleValue`, `multiValue`, …). It tracks `<html
  data-theme>` with a `MutationObserver` (the same attribute `ThemeToggle`
  flips and `layout.jsx`'s anti-FOUC script sets - see both files), so it
  updates on a toggle click with no page reload. Colours are not a second,
  hand-copied palette: a hidden probe carries the same `bg-base-100
  text-base-content`/`bg-base-200`/`bg-primary` classes the rest of the app
  uses, and `getComputedStyle` resolves whatever daisyUI actually renders them
  as today (raw `oklch()` components behind CSS variables - confirmed by
  compiling the real `tailwind.config.js` through `postcss` and reading the
  generated rules), so a future palette edit in `tailwind.config.js` keeps
  matching instead of drifting out of sync.
- Wired into both `<Select>` usages ("Sección" and "Categoría") in
  `src/app/antojos/product/add/page.jsx` and
  `src/components/products/edit/EditProductForm.jsx` (T-97 moved the edit
  form here) via `styles={selectStyles}` - four call sites, not two: F46 named
  both comboboxes and both screens.
- `src/app/antojos/sellers/approving/page.jsx`: `bg-[#F2F2F2]` → `bg-base-200`
  on the page, `bg-[#FF7622]` → `bg-primary` on the card, `text-white` →
  `text-primary-content` on its three headings/paragraphs - the same daisyUI
  token swap T-96 used for `InputFields`, no new pattern. The WhatsApp link's
  `bg-green-500 text-white` is untouched: it is not one of the two hex
  literals the finding named, and the same pair is used unconditionally for
  every WhatsApp CTA in the app (`ToggleSwitch`, `about/page.jsx`), a
  deliberate, theme-independent brand colour rather than this bug.
- **Deliberately not touched:** the WhatsApp button's own contrast (2.28:1,
  measured in F47) and the rest of the seller screens' contrast failures are
  **F48**, its own future task - this one is scoped to "responds to
  `data-theme`", not "passes AA".
**Verified:** `npm run verify` green (lint, `knip`, `tsc --noEmit`, `vitest`,
`next build`). New `tests/unit/dark-mode-t100.test.js`: a source-level
regression guard, same spirit as `theme-tokens.test.js`'s T-75 scan - asserts
the two hex literals are gone from the approving screen and the daisyUI tokens
are there instead, that the hook's source actually observes `data-theme` via
`MutationObserver` (not a one-time read), and that every `<Select>` in both
product-add and product-edit carries `styles={selectStyles}`.
**Not captured this round: before/after screenshots.** Getting real ones needs
either `npm run test:e2e` (F47's approving screen needs T-94's account-swap
trick, moving the session's `clerkId` onto the seeded pending seller) or a
`next dev`/`next start` server to shoot the auth-gated `/antojos/product/add`
directly - every server-starting command was refused by this session's
sandbox itself (its auto-mode classifier blocks anything that starts a
listening process, `npx next dev` included, independent of Clerk secrets: a
bare `next dev` with no Clerk keys involved was refused the same way). A
static render without a server was ruled out too: no bundler is a project
dependency to compile `react-select` for a standalone page, and `next build`
does not emit static HTML for either route (`/antojos/product/add` needs a
session; `.../approving` is behind `useCheckSeller`), so there is nothing
already built to open directly. Left for whoever promotes this to `develop`:
capture the four shots (`product-add` × 2 themes with the Categoría menu open,
`approving` × 2 themes) the way T-96 did, in a session that can run
`npm run test:e2e`.
**Follow-up (2026-09-08): the screenshots were taken, and they caught a real
regression.** A session that could run `npm run test:e2e` captured the four
shots — `docs/audits/t-100/README.md` — and the first `approving` render came
back with **white text on a near-white card**, barely legible. The merged fix
had swapped the card's `bg-[#FF7622]` for `bg-primary`, expecting daisyUI's
real orange; `public/css/main.css` (line 62) overrides `.bg-primary` to
`bg-[#f8f8f8]` **app-wide, in both themes** — the same trap
`components/layout/Layout.jsx` already has a comment about, for the same
class. The source-level test added alongside this fix asserted `bg-primary`
was present, which it was — the assertion never checked what that class
actually renders as, so it passed straight over the regression.
**Fixed the same day**, before this reached `develop`: the card now uses
`bg-primary-orange` — the class every other branded-orange surface in the app
already uses (`Loading`'s spinner, `ProfileChecklist`'s progress bar,
`Carousel`'s active dot), none of which differ by theme either — with
`text-white` to pair with it. The page background (`bg-base-200`) was correct
as merged and untouched. `tests/unit/dark-mode-t100.test.js` now asserts the
specific class rather than mere presence, stripping JSX comments first so a
comment that has to *name* the broken class to warn against it can't trip its
own guard. `npm run verify` green again after the fix; the four corrected
screenshots are what's committed in `docs/audits/t-100/`.
**Model:** `sonnet` · **Nightly:** yes

### [x] T-102 · The forgot-password modal was unreadable in dark mode
**Why:** not from a walkthrough — found by grepping the whole codebase for
other bare `bg-primary` usages right after T-100's regression (the CLAUDE.md
note it left behind), to check whether the same trap existed anywhere else.
`ForgotPassword.jsx` (opened from `/auth/login` → "¿Has olvidado tu
contraseña?", a public route, no session needed) used bare `bg-primary` with
no `dark:` pairing on both its modal-box divs — unlike `ProductModal.jsx`,
`SellerModal.jsx`, `SellerPage.jsx` and `ProductPage.jsx`, which all correctly
pair the same trick with `dark:bg-base-100`. Measured before the fix: the
"Ingresa tu correo..." paragraph rendered at **1.04:1** in dark mode — the
modal box stayed fixed at `#f8f8f8` while its ambient text correctly followed
the theme, so the surface and its own text moved in opposite directions.
Never audited: T-67/T-94 shot `/auth/login` from the outside; nobody had
clicked through to this specific sub-modal in dark mode before.
**Done when:** the modal responds to the theme the same way its siblings do,
verified with a real screenshot and a measured contrast ratio, not a
source-string test (CLAUDE.md, rule 3).
**Done (2026-09-08):** added `dark:bg-base-100` next to both `bg-primary`
occurrences in `src/components/auth/ForgotPassword.jsx`, matching the
existing `ProductModal`/`SellerModal` convention exactly rather than
inventing a new one. No text-colour changes were needed: every text element
in this modal already used either an ambient/theme-following colour or a
real daisyUI token (`text-secondary`) — the bug was entirely the surface
failing to move with the theme, not the text. Confirmed no hardcoded
dark-only text colour (`text-gray-800`, `text-black`, …) exists in the file
that the now-dark surface could clash with instead.
**Verified:** `npm run verify` green. Re-measured the same paragraph after
the fix: **13.44:1**, resolving against the correct (now dark) modal
background — the probe's first pass had accidentally grabbed F9's always-
mounted, closed error dialog (`#fde6e6`) instead of the modal actually open,
which is why the number is worth double-checking rather than trusting a
single reading; screenshot confirms the whole modal legible.
**Not given its own F-number.** `docs/audits/t-67/findings.md` reserves
F54+ for T-95's admin audit; this was found by a targeted grep, not a
screen-by-screen walkthrough, so it doesn't compete for that range.
**Model:** `sonnet` · **Nightly:** yes

### [x] T-103 · Hotfix: intermittent 500 on /antojos and /marketplace
**Why:** reported live by the human on the `agent/develop` Vercel preview:
signing out threw `Application error: a server-side exception has occurred`,
digest `2226905661`. Pulled the real Vercel function logs (`vercel logs
--branch agent/develop --level error`) rather than guessing from the digest
alone: `MissingSchemaError: Schema hasn't been registered for model "Seller"`,
thrown from inside a `.populate()` call, on `GET /marketplace` and on
`OPTIONS /antojos` (any request to `/antojos` renders through the root
layout regardless of method, since Next.js doesn't reject other methods for
a page route). Both routes go through `getSellerContextData()`
(`src/utils/lib/auth.ts`), called by the root layout on **every** request,
which populates `sellerId` by the string `'Seller'`.
**Measured, not assumed, that it's intermittent:** aggregated three hours of
logs by status code - `/antojos` 54×200 vs. 12×500, `/marketplace` 36×200 vs.
6×500 (~15-18% failure). Not a permanent break, which is why it doesn't
reproduce on every request and why nobody had filed it yet - a cold-start-
dependent registration race, not a deterministic one.
**Root cause:** `getSellerContextData()` relies on an `import { Seller } from
'@/utils/models/sellerSchema2'; // eslint-disable-line no-unused-vars` purely
for its side effect (`mongoose.model()` runs at import time) - the import
itself is never referenced by name in that file. The codebase already knew
this pattern was fragile and had patched it **twice more**,
`api/products/route.js` and `api/products/[id]/route.js`, each with its own
copy of the identical comment and import. Each copy only protects the one
file carrying it; there is no way to grep for a file that's *missing* one,
so the bug stays invisible until a request actually reaches an unprotected
populate.
**Fix:** `connectDB()` (`src/utils/connectDB.js`) is the one function every
Mongo-touching code path already calls before running a query - now it
imports all six model files (`orderSchema`, `pqrsSchema`, `productSchema`,
`scheduleSchema`, `sellerSchema2`, `userSchema`) for that same side effect,
so every model is registered unconditionally, once, regardless of what else
the calling file imports. The three existing per-file defensive imports are
untouched (harmless, safer left alone while this is fresh) - no new file
should ever need a fourth.
**Verified:** `npm run verify` green. New
`tests/integration/connect-db-model-registration.test.js`, deliberately
narrow - it imports *only* `connectDB`, never a model file by name - so a
regression that drops one of the six imports fails here instead of shipping
to some fraction of production requests. Confirmed the test is a real
regression guard, not a tautology: reverted the fix locally, watched the
first assertion fail (`mongoose.models.Order: expected undefined to be
defined`), then restored it and watched it pass again.
**Not yet resolved: "no me dejó adjuntar imagen."** The same incident report
described an image attach failing on the seller-registration form. Vercel
logs show one `POST /api/images` around the same time with no accompanying
error-level log (a controlled 4xx, or it may have succeeded) - no smoking
gun found in the time spent on this hotfix. Left open; needs more detail
from whoever hit it (what the UI showed, if anything) or a repro.
**Model:** `opus` — production incident, subtle serverless bug
· **Nightly:** no

### [x] T-104 · T-12's admin migration was never finished
**Status: discovery only.** Filed while chasing T-103 live with the human.
No refactor here - the human wants to keep exploring this interactively
before anything gets touched. Do not pick this up as a normal "implement
the fix" task; read it, then ask.
**Why:** T-12's own comment in `src/middleware.js` says "for 'admin', Clerk
is the only source of truth" - and then a grep across `src/` for
`role === 'admin'` (searching for Mongo's field, not Clerk's) turns up
**four** places that never got the memo:
- `src/utils/lib/auth.ts:133` (`verifySellerId`) - gates the actual seller
  approve/reject mutation.
- `src/components/seller/index/SellerGrid.jsx:56,83` - a second, complete
  approve/reject UI, parallel to `/admin/sellers`.
- `src/components/seller/SideBar.jsx:50` - shows/hides the "Gestionar" nav
  section.
Only `src/middleware.js:38` checks Clerk's `publicMetadata.role`, which is
the one place T-12 actually finished.
**How this was found, live, not theoretical:** the human's own Clerk
account (`sajhdg30@gmail.com`) has **two** Mongo `User` documents - one
`role: admin` tied to a Clerk account in one instance, and a second one Mongo
auto-created via the webhook (`role: buyer`, schema default) the moment the
same person's browser session authenticated through a *different* Clerk
instance for the first time (T-12h/T-64: instances are fully isolated, so a
new instance means a brand-new Clerk user, no matter that it's the same
person). Email has no unique index either (T-11), so nothing merges the two.
Consequence, measured: `/admin/sellers`' list rendered fine (Clerk-gated),
but clicking approve on a real pending seller answered
`403 "No autorizado para este vendedor."` - `verifySellerId` resolved the
*other* Mongo document, `role: buyer`, and rejected it. Unblocked by hand for
this one document (`users._id: 6aa1fb344de64210563fb675`, `role` set to
`admin`) - a single-field, single-document, easily-reversible write, not a
fix for the underlying gap.
**Not a bug in the "wrong" sense - a gap in a migration.** A user having both
`role: admin` and a real `sellerId` (the human's older account does, on
purpose, for testing) is fine either way: nothing in the current code treats
admin-ness and seller-ness as mutually exclusive, so this isn't blocking
anything by itself.
**Raised and rejected: growing Mongo's role model** (an array, or a separate
`isAdmin` boolean next to `role`) **to carry admin more richly.** Discussed
with the human and the conclusion was no - that doubles the exact
"two sources of truth can disagree" problem this finding just demonstrated
live, in the other direction. `role`/`sellerId` in Mongo staying about
buyer/seller, and admin-ness staying only in Clerk's `publicMetadata`
(possibly as an array there later, if more than one admin tier is ever
needed) was the human's own call, not just this note's opinion.
**Open questions, for the human to decide before any of this becomes a
task:**
- Does fixing this mean `getSellerContextData()` (or a sibling) starts
  calling `clerkClient().users.getUser()` to hand the client an `isAdmin`
  flag sourced from Clerk - on every request, the same cost `esAdmin()`
  already accepts for admin routes only? What's that cost across `/antojos`
  and every other page this touches, given `getSellerContextData()` runs on
  **every** request via the root layout, not just admin ones?
- Is `SellerGrid.jsx`'s inline approve/reject UI (parallel to
  `/admin/sellers`) something to keep at all, once it's admin-gated
  correctly - or is having two separate approval surfaces itself worth
  collapsing into one?
- Does this fold into finally addressing T-11 (email uniqueness) at the same
  time, since the duplicate-User-per-instance failure mode depends on it
  too, or are they separate tasks?
**Sequencing with T-63, the human's own call:** do this one first. T-63
splits Mongo per environment while Clerk stays one instance everywhere: if
admin-ness is fully on Clerk's `publicMetadata` before that split happens,
it needs zero reseeding in the new non-prod cluster - it already applies
everywhere, same as every session does, because Clerk doesn't change
between environments. Doing T-63 first means the same Mongo-role reseeding
this incident needed gets repeated by hand in the new cluster too.
**Decided with the human 2026-09-10, and done.** The three stragglers now
read Clerk, and there is a single definition of admin-ness to read:
`src/utils/lib/isClerkAdmin.ts`. It imports Clerk and nothing else, which is
why it is not in `utils/lib/auth.ts` next to the other auth helpers -
`middleware.js` shares it, and importing `auth.ts` there would pull Mongoose
and `connectDB` into the edge bundle. `middleware.js`'s local `esAdmin()` is
gone in favour of it, so the correct check and the three fixed ones cannot
drift apart again.
- **Server (`verifySellerId`)**: ownership is compared first and Clerk is
  asked only if that fails. Comparing two ids the `User` document already
  carries is free and covers the common case (a seller editing their own
  profile); the roundtrip is paid by the rarer request, an admin acting on
  somebody else's seller.
- **Client (`SellerGrid`, `SideBar`)**: `useUser().user?.publicMetadata`.
  Clerk exposes `publicMetadata` on the client in the user resource the
  session has already loaded, so **this costs no extra request at all** -
  which is the answer to the open question below.
**The `getSellerContextData()` question, answered: no, and it must not.**
Putting `isAdmin` in `SellerContext` was considered and rejected. That
function runs on **every** request through the root layout, so it would have
added a Clerk Backend API roundtrip to the critical path of every page for
100% of signed-in traffic, to serve a boolean that matters to a handful of
accounts. `esAdmin()` accepts that same cost on `/admin/*` only, which is a
rounding error of the traffic by comparison. Since the client already has
`publicMetadata` for free, the expensive option bought nothing. Customising
the Clerk session token (the genuinely cheapest option - it would remove the
middleware's roundtrip too) was rejected separately: it is a dashboard
change, invisible from the repo, applied by hand per instance (T-12h), and
exactly the class of out-of-repo change that caused T-64.
**On UI gating vs authorisation:** the two client changes are cosmetic by
design. A non-admin who forces either branch open in their own browser
renders the toggles and gets a 403 from every one of them, because
`verifySellerId` reads the same `publicMetadata` server-side. Hiding a nav
item is a convenience, never the gate.
**Verified:** `npm run verify` green (lint, deadcode, typecheck, test,
build). Two new tests in `tests/integration/autorizacion.test.js` pin *which*
store the admin exception comes from, and both were confirmed to fail against
the old code in the right direction: the Clerk admin got **403** (the
incident this finding opened with) and the Mongo-only admin got **200** (the
hole nobody had noticed). `clerkClient` had to be stubbed in
`seller-pause.test.js` too - its "one seller cannot pause another's shop"
case takes the new non-owner branch.
**Measured afterwards, read-only: nobody loses admin, and `--apply` must
NOT be run.** The check this needed is "which Mongo admins have no
`publicMetadata.role` in Clerk", and `npm run set-admin-metadata`'s dry run
answers it misleadingly on its own - see T-108. Resolved id by id against
`GET /v1/users/:id` on the instance the deployed site actually authenticates
against (`ins_2mH0ZTsikZ8SSYtT1h3WhwJB5Cd`, development - T-64):
- **5** `User` documents carry `role: 'admin'` in Mongo.
- **3** of them have a `clerkId` that **404s** on that instance: they are
  production-instance ids (T-12h). Nobody can present them to the live site,
  so there is no working admin there to lose. Had they signed in, the webhook
  would have minted them a fresh development-instance `User` with the schema
  default `role: 'buyer'` anyway - which is precisely the duplicate this
  finding opened with. Their Mongo `role: 'admin'` was already inert before
  this change, because `/admin/*` was already gated on Clerk.
- **1** (`test@example.com`) has no `clerkId` at all: nobody can sign in as it.
- **1** - the human's working account, `users._id 6aa1fb344de64210563fb675`,
  the very document unblocked by hand during the incident - already has
  `publicMetadata.role: 'admin'`. It keeps working.
So the promotion to `develop` is not blocked. **Do not run `--apply`:** with
these keys it writes to the development instance (the script's guard refuses
it anyway), and with production keys it would write into the instance T-64
established the site does not use.
**The other two open questions, decided:** `SellerGrid`'s parallel UI gets
collapsed into `/admin/sellers` (T-106), and email uniqueness stays separate -
T-11 deleted `/api/register` but explicitly left the unique index pending, so
it is now filed on its own as T-107 with the duplicates measured. Splitting `approved` out as T-105 is what the next entry
is about, and it is why **this PR alone does not make approving work yet.**
**Model:** `opus` · **Nightly:** no

### [x] T-105 · Approving a seller writes nothing
**Why:** found while reading T-104's four files, and it sits behind the same
403. Both approval surfaces send `updateSeller(id, { approved })` to
`PUT /api/sellers/[id]`, whose `updateSellerSchema` **does not declare
`approved`** (`src/lib/validators/seller.ts`). Zod strips what it does not
declare - which is T-13's deliberate anti-mass-assignment behaviour, working
as intended - so `findByIdAndUpdate` receives an object without the field and
writes nothing. The client flips the toggle optimistically, sees no
`response.error` (the response is the seller JSON), and the UI lies until the
next refresh. There is no approval endpoint anywhere: `/api/sellers/admin`
only has a `GET`. **So T-104 fixed the gate and approving still does not
work.**
**Not a matter of adding `approved` to `updateSellerSchema`:** that is the
self-service edit path a seller uses on their own profile, and putting
`approved` in it hands every seller self-approval - the exact hole T-13
closed. It needs its own admin-only edge.
**Done when:** an admin-only endpoint actually flips `approved`, with an
integration test that reads Mongo after the write rather than trusting the
response, and the client surfaces a failed write instead of leaving the
optimistic flip standing.
**Worth knowing:** putting it under `/api/sellers/admin/...` means the
middleware's `/api/(.*)/admin(.*)` matcher gates it for free, which is the
one pattern in this repo that was already right.
**Measured before doing it (read-only, 2026-09-13):** 55 sellers, 36
approved, **19 pending** - and the most recent registered **2026-09-09**,
four days before this was written. So this was not theoretical: somebody
signed up and sat there while the only way to approve them did nothing.
**Done:** `PATCH /api/sellers/admin/[id]`, a new route, because there was no
approval edge at all - `/api/sellers/admin` had only a `GET`. It takes
`approveSellerSchema` (`{ approved: boolean }`, `.strict()`) and writes that
one field and nothing else.
- **Two gates, on purpose.** The path matches the middleware's
  `/api/(.*)/admin(.*)`, so Clerk's `publicMetadata` is checked before the
  handler runs; the handler then checks it again with the same
  `isClerkAdmin()` helper T-104 introduced. The second is not redundant - it
  is what keeps the handler safe on its own if the matcher ever changes.
- **`approved` stays out of `updateSellerSchema`.** That schema is the
  seller's own self-service edit, and adding the field there would hand every
  seller self-approval - the mass assignment T-13 closed. There is now exactly
  one writer of `approved`, and it is admin-only.
- **The client no longer lies.** `fetchAPIToken` *throws* on a non-2xx rather
  than returning `{ error }`, so `SellerGrid`'s rollback - which sat behind
  `if (response.error)` - could never have run. The undo moved into the
  `catch`. `/admin/sellers` already rolled back correctly and only changed
  endpoint.
**Verified:** `npm run verify` green, plus 11 tests in
`tests/integration/seller-approval.test.js`. Every one reads Mongo after the
call instead of trusting the response body, which is the whole point: the old
path answered **200** and wrote nothing, so a test asserting on the status
would have passed against the bug. They cover the admin flipping it both
ways, 401 without a session, 403 for a non-admin, **403 for the seller
themselves** (owning a shop is not approving it), 400 for a missing,
non-boolean or over-wide body, 400 on a malformed id instead of a CastError
500, 404 on an unknown one, and a regression lock that the seller's own `PUT`
still cannot approve them.
**Not verified in a browser, and why:** proving the admin screen end to end
needs a signed-in *admin* Playwright fixture. T-84's fixture is a seller, and
minting an admin one is exactly T-95, which is parked. The route handler is
covered against a real Mongo instead. No screenshots: no colour, theme or
layout changed - the markup both components render is identical, only the
endpoint they call and where the rollback lives.
**Corrected the same day by T-105b, before it was ever exercised:** the
client called it through `fetchAPIToken`, which is `'use server'` - so the
request left the *server* with a Bearer token and no cookies, and had to
survive the middleware's admin gate on a server-to-server hop that nothing
in this repo exercises. The integration tests cannot see that seam: they
call the handler directly with the middleware mocked out. It is a plain
relative browser fetch now, matching the sibling `GET /api/sellers/admin`
that has always worked. See T-105b.
**This is not live until the promotion happens.** Measured 2026-09-13:
`agent/develop` is **133 commits** ahead of `develop`, and `develop` equals
`main`; both last moved 2026-09-05. Production still runs the old
`verifySellerId` (Mongo's `role`) and the old `updateSellerSchema`, so
approving is still broken there for both reasons. T-104 and T-105 together
are what make it work end to end, and a human promoting `agent/develop` is
what makes it real.
**Model:** `opus` · **Nightly:** no

### [x] T-105b · Approve through a relative fetch, not a Server Action
**Why:** caught while the `develop -> main` promotion was already running, so
before anyone had clicked the new toggle. T-105's client called the endpoint
through `fetchAPIToken`, and that helper is `'use server'`: the call becomes a
Server Action that fetches `NEXT_PUBLIC_URL + '/api'` **from the server**,
carrying `Authorization: Bearer` and no cookies. Two things wrong with that,
and only here:
- It is the first call through that helper to a path the middleware gates as
  an admin route (`/api/(.*)/admin(.*)`). Whether Clerk resolves that Bearer
  on a server-to-server hop is a seam nothing else in this repo exercises, and
  the integration tests structurally cannot cover it - they call the route
  handler directly with the middleware mocked out. It very likely works;
  "very likely" is not what an authorisation path should rest on when the
  alternative is free.
- It is the `NEXT_PUBLIC_URL + '/api'` antipattern CLAUDE.md says is being
  removed.
**Done:** `approveSeller` does a plain relative `fetch('/api/sellers/admin/:id')`
from the browser, which carries Clerk's cookie - exactly what the sibling
`GET /api/sellers/admin` in the same panel has always done. It still throws on
a non-2xx, so the optimistic rollback contract is unchanged. The
`getToken({ skipCache: true })` dance and the now-unused `useAuth` import went
with it from both call sites.
**Verified:** `npm run verify` green; the 11 T-105 tests are untouched and
still pass, since the route itself did not change.
**Still not provable in CI:** the browser hop through the real middleware
needs a signed-in admin Playwright fixture, which is T-95. The check is one
click in the deployed panel: approve somebody, refresh, see it stick.
**Answered in production, 2026-09-13, and it settles the risk half of this
entry.** The promotion that went live (#306) carried T-105, *not* this fix,
so the click went through `fetchAPIToken`'s server-side Bearer hop. The
human approved "Heladería Mercardi", reloaded, and it stayed approved; Mongo
confirmed `approved: true` at 20:39 UTC, 13 minutes after the merge, and
T-106's count of 37 approved (not 36) is that same write. So Clerk *does*
resolve the Bearer through the middleware's admin gate - the seam this entry
worried about works. The change still stands on its other reason: it
removes the `NEXT_PUBLIC_URL + '/api'` antipattern from the one path it
touched.
**Model:** `opus` · **Nightly:** no

### [x] T-111 · `src/services/api.js` and `apiToken.js`, audited
**Closed by T-112b on 2026-09-14:** both files were deleted. Items 1-3 are
moot, and 4 - the Server Action surface of `fetchAPI(endpoint, options)` - no
longer exists. The Bearer's job, carrying identity, moved to Clerk's session
cookie on a same-origin browser fetch, the shape T-105b had already proved.
Nothing shaped like `x-internal-fetch` was introduced. **The warnings below
still hold for anyone tempted to bring back a server-side fetch to this app's
own API.**

**Why:** the human asked, while reviewing T-105b, whether `apiToken.js` was an
abandoned experiment - it was written long before this backlog, to carry
identity to the API with a Bearer token, and they no longer remembered
whether anything used it. Audited 2026-09-13. **It is used, and the Bearer is
load-bearing** - so the answer to the question is "keep it", and what follows
is the list of what is genuinely wrong with these two files.
**Both files are `'use server'`, which is why the token exists.** A `fetch()`
from the server carries no browser cookies, so in the three mutations that go
through `fetchAPIToken` (`updateProduct`, `deleteProduct`, `updateSeller`) the
Bearer is the only thing that gets the caller's identity to `auth()`. Removing
it breaks them. `fetchAPI` has 8 call sites across `productService`,
`scheduleService` and `sellerService`, all of them public GETs, which is why
its lack of a token has never hurt.
**What is actually wrong, in rising order of how much thought it needs:**
1. **A superseded draft left commented out** - `api.js` lines 6-33 are an
   older `fetchAPI` sitting directly above the live one. The difference is
   real and settles it: the old one swallowed the error and returned
   `undefined`, the live one checks `content-type`, throws with detail and
   re-throws for the caller. It was fixed and the previous version was left
   alongside. Nothing references it. Delete.
2. **`credentials: "include"` does nothing** in either file. It is a browser
   option; in a server-side fetch (undici) it is ignored. Cargo cult.
3. **These two files *are* the `NEXT_PUBLIC_URL + '/api'` antipattern**
   CLAUDE.md says is being removed, and T-30/31/32 are the tasks that remove
   it. Neither file says so. At minimum they should carry a note pointing at
   those tasks, so the next person does not invest in them.
4. **Worth a proper look, not asserted here: the Server Action surface.**
   `'use server'` makes every export a Server Action callable from the
   browser, and `fetchAPI(endpoint, options)` takes both the path *and* the
   request options from its caller. That is an action which makes the server
   issue a request to an arbitrary path of its own origin with arbitrary
   method, headers and body. It is not a classic SSRF - the path is
   concatenated onto a fixed prefix so it cannot leave the origin, and the
   request carries no cookies, so it is not privilege escalation on its own.
   But nobody designed that surface on purpose, and "not exploitable in the
   ways I checked" is not the same as safe.
**Done when:** 1-3 are done (they are small and need no decision), and 4 is
either ruled out with the reasoning written down, or split into its own task.
**Where the Bearer came from, since it explains why it must stay** (dug out
of `git log` 2026-09-13, because the human no longer remembered and guessing
would have got it wrong): on **2025-03-28** the base URL was replaced with a
per-environment one - localhost in dev, `mercampus.vercel.app` in production,
`VERCEL_URL` for previews (`4888e00`, 11:32) - to stop a preview deployment
calling production's API. It then grew an `x-internal-fetch: true` header and,
at 12:59, a matching middleware bypass: `if (req.headers.get("x-internal-fetch")
=== "true") return;` (`a675bf6`). That is an unauthenticated door - any caller
sending the header skipped Clerk entirely - and it was reverted 20 minutes
later along with the whole URL change (`2cc58aa`, 13:19). **All three commits
live only on `origin/universities` and never reached `main`**, so the hole
never shipped. A month later `2991401` (2025-04-22) added `apiToken.js`, and
the Bearer is the *correct* answer to the problem that killed the March
attempt: a server-side `fetch` carries no cookies, so identity travels in a
header instead of a hole in the middleware.
**Careful:** do not "simplify" by dropping the token. It looks redundant next
to `credentials: 'include'` precisely because that option is inert - the
token is the half that works. And do not reintroduce anything shaped like
`x-internal-fetch`: it has been tried, on a branch, and it is an auth bypass.
**Model:** `opus` for 4, `sonnet` for 1-3 · **Nightly:** yes for 1-3

### [x] T-113 · Environment drift: fail loudly, and catch renames before they ship
**Why:** on 2026-09-13 the first promotion in eight days broke two things in
production at once, and **neither was a code bug** - both were a change
that needed a value set outside the repo, recorded somewhere no promoter
reads:
- **T-11b** renamed six image env vars in code. Vercel and the human's
  `.env` kept the old names. Every product image upload answered 500.
- **T-14** made the availability cron require `CRON_SECRET`. Neither Vercel
  nor GitHub has it. The cron workflow has failed with 401 every ten
  minutes since the merge.
Both are fixed by a human in two dashboards (see T-11b and T-14 for the
exact names). This task is what the repo can do so it does not happen a
third time, and so it takes seconds to diagnose if it does.
**Measured drift, `.env.example` vs the human's `.env`, names only:** the
six image vars under old names; `CRON_SECRET` absent; three next-auth
leftovers nothing reads (see T-109); and `NEXT_PUBLIC_CLERK_SIGN_IN_URL` /
`NEXT_PUBLIC_CLERK_SIGN_UP_URL` present but undocumented - Clerk's SDK
reads them straight from the environment, no file in `src/` names them,
which is exactly why they were missing from the example.
**Done when:**
1. **The image routes say what is missing.** `getCloudinary()` and
   `getImageKit()` check their three variables and throw an error naming
   the absent one; the routes log it and answer with a message that says
   "configuration", not "try again". Today the user is told to retry
   something that cannot succeed, and the cause lives only in Vercel's
   logs. A unit test per SDK, with the variables unset.
2. **A test that `.env.example` and the code agree.** Every
   `process.env.X` read under `src/` is documented in `.env.example`, and
   every name in `.env.example` is read somewhere or explicitly marked as
   read by a library (the Clerk URLs). `tests/unit/env-publico.test.js`
   already scans source for `process.env` patterns, so the harness exists.
   This would not have caught Vercel - nothing in the repo can - but it
   catches a rename that forgets the example, and it makes `.env.example`
   trustworthy as *the* list to compare a dashboard against.
**Not in scope:** anything that reads or writes Vercel or GitHub settings.
That is the human's, and listing it is what T-11b and T-14 now do.
**`getCloudinary()` no longer exists.** T-116 deleted `src/utils/cloudinary.js`
along with its only importer (a route with no caller) - confirmed by grepping
all of `src/` for `getCloudinary` and finding nothing outside this ROADMAP.
Only `getImageKit()` (`src/utils/imagekit.js`) got the check.
**Done:** `getImageKit()` checks its three variables and throws a new
`ConfigError` (`src/utils/lib/errors.ts`) naming every one that's missing.
`errorResponse` (`src/lib/api-response.ts`), the single choke point both
`POST` and `DELETE /api/images` already funnel every error through, logs it
at `error` (unchanged) and now answers `ConfigError` with a message that says
"configuración" and that retrying won't help, instead of the generic
"Error interno del servidor" - the specific variable name stays in the log,
never in the response. `tests/unit/imagekit.test.js` is new: each of the
three vars missing alone, and all three missing together, name themselves in
the thrown message. `tests/unit/api-response.test.js` gained a `ConfigError`
case covering both the log and the response body.
`tests/unit/env-publico.test.js` gained the drift test: every `process.env.X`
read under `src/` must be in `.env.example` (two runtime-only exceptions,
`NODE_ENV`/`VITEST`, which a human never sets there), and every
`.env.example` entry must be read in `src/`, read directly by a library
(the two Clerk URLs, plus - newly confirmed by grep - `CLERK_SECRET_KEY` and
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`), or a named, evidenced orphan. Verified
the negative case by hand: deleting `CRON_SECRET` from `.env.example` and
rerunning the suite failed that exact test; restored before committing.
**Orphans found while building the drift test (not deleted, rule 5):**
`CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` are
new orphans - T-116 deleted the only code that read them, and `.env.example`'s
own comment ("T-35 decide con cual quedarse") shows that decision never
happened. `NEXT_PUBLIC_URL` was already known-orphaned (T-112b); confirmed its
only remaining readers are `scripts/e2e.mjs` and `scripts/lighthouse.mjs`,
outside `src/`. `.env.example` now says so next to each. `LOG_LEVEL`
(`src/lib/logger.ts`) was read in `src/` but undocumented; added as an
optional entry.
**Verified:** `npm run test` (451/451), `npm run typecheck` and `npm run build`
all green. `npm run lint` (and the lint step inside `npm run build`) fails in
this session's sandbox with `Plugin "@next/next" was conflicted between
".eslintrc.json ..." and "..\..\..\.eslintrc.json ..."` - reproduced
identically on the unmodified base commit, so it's the worktree sitting
inside the main checkout (which has its own `.eslintrc.json` and
`node_modules` three directories up), not this change. Ran raw `eslint
--no-eslintrc -c .eslintrc.json` (bypasses the ancestor-directory config
search `next lint` doesn't let you skip) over `src` and `tests`: 0 errors, 6
pre-existing warnings, none in a file this PR touches.
**Also noticed (rule 9), not fixed here:** `src/components/general/ImageGrid.jsx`
ignores the upload response body and always shows a static "Hubo un problema
al subir la imagen. Inténtalo de nuevo." alert, so a seller hitting the new
`ConfigError` message still only sees "try again" client-side. Fixing that
needs its own PR (and, per CLAUDE.md, a real render/screenshot if the UI copy
changes) - the "Done when" for this task was the route's response, not this
component.
**Nothing outside the repo.** This is entirely in-repo: no Vercel, GitHub, or
`.env` change required.
**Model:** `sonnet` · **Nightly:** yes

### [x] T-115 · Creating a product answered 400 for every price typed in the form
**Why:** reported live on 2026-09-13, right after image uploads were fixed:
the upload worked, then "Subir producto" answered `400 Datos inválidos`. The
cause had been waiting ten days. `/antojos/product/add` takes the price in a
`type='text'` input and sends the string it holds; T-13 (`1b2d030`,
2026-09-03, in `main` since 2026-09-05) validated it as `z.number().int()`,
and Zod never coerces. **Every product created from the UI since then was
refused.** Nobody noticed because nobody had tried: the most recent product
in the database was created on 2025-09-30. The edit form
(`EditProductForm.jsx`) had the same bug on any change that included price.
**The trap in the obvious fix:** `Number("5.000")` is `5`, and so is
`z.coerce.number()`. In Colombia the dot is the thousands separator, so a
seller typing five thousand the usual way would have had it stored as five
pesos, with a 200 and no error anywhere.
**Measured first (rule 8, read-only):** 112 products, prices from 1.212 to
1.100.000, all whole numbers, none under 100. There are no cents to preserve,
and "5.000" can only mean five thousand.
**Done:** `src/lib/price.ts` exports `toPesos()`, which accepts a number,
plain digits, or digits grouped in threes by one kind of separator (dots or
commas), with optional `$`, `COP` and spaces - and returns NaN for anything
it would have to guess at: "5,5", "5.50", "1.000,50". The product schema
pipes the price through it into the same `int().nonnegative()` as before, so
creation and edit are fixed in one place, and an ambiguous price fails with a
message naming the field instead of being stored wrong. Same shape as the
seller phone normalisation already in `src/lib/phone.ts`.
**Verified:** `npm run verify` green. `tests/unit/price.test.js` covers
`toPesos` and the schema with the exact payload the add form sends, plus a
guard that "5.000" is never read as five; `tests/integration/validacion.test.js`
gains a `PUT` with `"9.000"` that reads the stored document and finds 9000.
The schema-level and integration tests were run against the old schema first
and failed, then passed with the change - so they test the bug, not just the
fix. The existing `price: 'gratis'` test still answers 400 naming `price`.
**Nothing outside the repo.** It reaches production with the next promotion.
**Also noticed (rule 9), left for their own PRs:** the add page shows only
the generic `message` and drops the `fields` the API already returns, which
is why this surfaced as "Datos inválidos" rather than "precio"; its price
input has `value` commented out, so it is uncontrolled; and the image upload
happens before the product is saved, so this very failure left two orphan
files in ImageKit (see the image-routes entries).
**Model:** `opus` · **Nightly:** no

### [x] T-116 · The image routes answer anyone: upload, look up and delete
**Why:** found on 2026-09-13 while fixing image uploads in production, read
from the code and **not** exercised against production. None of the three
image routes checks identity, and the middleware does not cover them:
- `DELETE /api/images` takes `{ fileId }` and calls ImageKit's `deleteFile`.
- `GET /api/fileId?url=...` turns any image URL into its `fileId`, by listing
  files whose *name* matches the URL's last segment.
- Together: anyone who can see a product photo on the site can delete it
  from ImageKit. `POST /api/images` also accepts any `folder` the caller
  names, so the media library is writable by anybody, anywhere.
- `src/app/api/uploadimageProduct/route.js` (Cloudinary) has the same shape
  and **no caller anywhere in the repo** - dead, but still a live endpoint.
- Every 500 returns `error.message` to the client, which `api-response.ts`'s
  `errorResponse()` exists to prevent.
**This predates the promotion** - the routes worked with the old env var
names until T-11b's rename broke them, and renaming them back in Vercel
(done 2026-09-13) restored the exposure exactly as it was.
**The name lookup is its own bug:** `listFiles({ name })` searches the whole
account and returns the first match, so two files called `arepa.jpg` in
different folders means deleting a product image can remove the wrong one.
**Done when:** `POST` requires a Clerk session and picks the folder
server-side instead of trusting the client; `DELETE` requires the image to
belong to a product or seller the caller owns (or the caller is an admin via
`isClerkAdmin()`), and resolves the file by the exact stored URL or a stored
`fileId` rather than by name; the dead Cloudinary route is deleted (rule 5:
the reference search is above and should be repeated in the PR); errors go
through `errorResponse()`. Integration tests for 401/403 on each verb, and
for "deleting one product's `arepa.jpg` does not touch another's".
**Done (2026-09-13), design agreed with the human before coding:**
- `POST /api/images` needs a session (any session - see below) and takes
  `folder` only as a choice from `products | sellerlogos`;
  `imageFolder()` in `src/server/images/imageFiles.ts` is the single place a
  folder is built, where T-118's prefix goes. Uploads are tagged
  `uploader:<clerkId>`.
- `DELETE /api/images` takes `{ url }`, not `{ fileId }`, and resolves the
  file server-side in one function, `findImageFile()`: URL -> exact path
  under `IMAGEKIT_URL_ENDPOINT`, only inside the two folders, `listFiles`
  narrowed by `path` + `name`, then every candidate compared against the
  exact `filePath` in code. `GET /api/fileId` is deleted; `ImageGrid` was its
  only caller.
- Allowed when **(a)** the file's uploader tag is the caller's, **(b)** the
  URL is referenced by the caller's seller (a product image or the logo) and
  by no other seller, or **(c)** `isClerkAdmin()`. Both sides are normalised
  to origin + path first (`src/lib/image-url.ts`): 12 of the 205 stored URLs
  carry `?updatedAt=`, and the default logo is used by 12 sellers once the
  query is dropped - 6 by exact text. The default logo is refused outright
  under (b). "No other seller" exists because a product accepts any URL:
  pasting someone's photo into your product must not make it yours.
- `ImageGrid` makes one call with the URL and drops the image from the form
  on 403 and 404 without the file being touched (so a seller holding the
  shared default logo can replace it); on 401 and 5xx it alerts and keeps the
  image so the user can retry. No visual change.
- Deleted, reference search repeated on 2026-09-13 (`git grep` over `src`,
  `tests`, `scripts`, `.github`): `api/uploadimageProduct/route.js` and
  `utils/cloudinary.js` were only referenced by each other, `api/fileId` only
  by `ImageGrid`. `cloudinary.js` had to go with the route: knip's `files`
  rule is an error. The `cloudinary` package stays for T-35.
**Noted, not fixed (rule 9):**
- Any session can upload, a buyer without a seller included. A `sellerId`
  can't be required: `/antojos/sellers/register` uploads the logo before the
  seller exists.
- On the *edit* forms `ImageGrid` deletes the file the moment it is removed,
  before saving; cancelling leaves the product pointing at a deleted image.
  The mirror image of T-117.
- `src/services/uploadImages.js` is imported by `/antojos/product/add` and
  called nowhere.
- Resolving by URL is a stopgap; storing `fileId` + `filePath` is T-120.
- The ownership check is an unindexed regex over `products.images` and
  `sellers.logo`: fine at ~110 products, worth revisiting with T-120.
**Model:** `opus` - authorisation plus a destructive external call ·
**Nightly:** no

### [x] T-116b · Deleting a photo right after picking it answered 404
**Why:** found on 2026-09-13 while checking T-116 against the real ImageKit
API before promoting it. ImageKit's search index lags an upload: a file
uploaded to a throwaway folder returned **0** results from `listFiles` one
second later and **1** after about seven, while `getFileDetails` by id found
it at once (two controlled uploads, both deleted, account back to 365 files,
taken after T-121's full backup). T-116's `findImageFile` resolves by search,
so a seller who picked a photo and removed it within those seconds got a
404; the form - as T-116 decided - dropped it from the list without deleting
it, and the file stayed in ImageKit as an orphan (T-117). It fails closed,
so it was never a security issue, and T-116 was promoted without waiting.
**Done:** `ImageGrid` remembers the `fileId` each upload in the session
returned (keyed by URL, in a ref - the parent form still receives plain
URLs) and sends it with the URL on delete. `findImageFile(url, fileId)` tries
`getFileDetails` first and accepts the result **only if that file sits at
exactly the path the URL points to**; an unknown id or an id for a different
file falls through to the path search. So the id is a hint that skips the
index, never a way to aim a delete at another file, and the permission rule
is untouched.
**Verified:** `npm run verify` green. Five integration tests with the index
lag simulated in the ImageKit mock: the uploader deletes at once with the
`fileId`; without it the answer is still 404 and nothing is deleted; a
`fileId` belonging to another file is ignored; someone else's URL with its
real `fileId` is still 403; an unknown `fileId` falls back to the path. The
first of those was run against T-116's code before the change and failed.
**Not verified in a browser:** `ImageGrid`'s change is not visual, and the
agent's session has no seller login. **Outside the repo:** nothing; it
reaches production with the next promotion.
**Related:** T-120 (storing `fileId` + `filePath` in Mongo) would give every
image an id, not only the ones uploaded in the current session.
**Model:** `opus` · **Nightly:** no

### [ ] T-117 · A failed or abandoned product form leaves its images in ImageKit
**Why:** reported by the human on 2026-09-13 and measured the same day. The
image uploads the moment it is picked (`ImageGrid.jsx` -> `POST /api/images`),
long before the product is saved. The "Subir producto" that answered 400
(T-115) left **two files** in ImageKit's `products` folder, created 01:58 and
01:59 UTC, that no product references - checked by listing the most recent
files with the SDK and searching Mongo for each name, read-only. Closing
the tab mid-form does the same. It is the mirror image of T-82, which is
about deleting a product leaving its images behind.
**Done when:** one of these is chosen and built -
- **a cleanup script** in `scripts/`, dry run by default, that lists ImageKit
  files older than a grace period (a day) and deletes the ones no product or
  seller references. Covers every past orphan too. Destructive against
  production media, so it needs the T-116 lookup fix first - matching by
  name is exactly how it would delete the wrong file;
- or **upload on save**: keep the picked file in the browser and upload it in
  the same submit as the product, so nothing is stored for a form that fails.
  Cleaner, but it changes `ImageGrid`'s contract and every form that uses it.
**Not done here on purpose:** the two known orphans were left in place; they
are the human's test images and cost nothing until a cleanup exists.
**Sized on 2026-09-13 by T-121's first backup:** of 365 files in the
account, **174 are referenced by no product and no seller** - 103 in
`products`, 65 in `sellerlogos`, plus the legacy folders `seller-logos` (2)
and `tutorimages` (4). Not all are necessarily orphans of this bug (the
legacy folders predate the current forms), but that is the ceiling, and the
backup's `manifest.json` lists every one with its `fileId`. A cleanup should
start from that manifest and keep the backup it came from.
**Model:** `opus` for the script (it deletes production files), `sonnet`
for upload-on-save · **Nightly:** no

### [ ] T-118 · ImageKit per environment: folders plus a restricted key
**Why:** agreed with the human on 2026-09-13. Products and sellers will not
live in both environments - after T-63, production keeps the real ones and
the shared non-prod cluster gets seeded data - so images should follow the
data: real images only in production, non-prod uploads disposable.
**Measured first:** the real media is in ImageKit, not Cloudinary - 150
product images under `products` and 53 logos under `sellerlogos`, against 2
legacy product images on Cloudinary. The seed already uses fake URLs
(`ik.imagekit.io/seed/...`) that point at no real account.
**The plan:**
- **Production is not touched.** `products` and `sellerlogos` stay at the
  root; moving them would break the 203 URLs already stored in Mongo.
- **Preview and Development upload under `dev/products` and
  `dev/sellerlogos`**, from a server-side variable (empty in production,
  `dev` elsewhere) applied by the route - never a folder the client names.
- **A restricted ImageKit key outside production**, allowed to upload and
  read but not delete. ImageKit supports restricted keys that limit which
  APIs a key may call; no evidence was found that they can be scoped to a
  folder, so the folders separate by convention and the key is what actually
  protects production. That also neutralises the name-lookup hazard in
  T-116 for non-prod.
- **That restricted key must not be able to modify tags either.** Since
  T-116, the `uploader:<clerkId>` tag is one of the three ways to be allowed
  to delete a file; a key that can rewrite tags can grant that. Likewise the
  DAM MCP server, if connected, gets view-only.
- **The uploader tag depends on the Clerk instance** (T-12h, T-64): a
  `clerkId` only exists inside one instance. If uploads start coming from a
  different instance, old tags stop matching and deleting falls back to
  ownership or admin - nothing opens, but a user may lose rule (a) for their
  unsaved uploads.
- **The folder prefix goes in `imageFolder()`** (`src/server/images/
  imageFiles.ts`); `findImageFile()` derives the deletable folders from it,
  so the two stay in step.
- **A second ImageKit account** would isolate harder, at the cost of another
  dashboard, quota and key set. Not needed at this scale; the upgrade path
  if it ever is.
- Cleaning up non-prod becomes deleting the `dev/` folder.
**Depends on:** T-63 - while Preview still writes to the production
database, a preview upload would land in `dev/` but be referenced by real
data. T-116 should land first regardless.
**Tooling, looked at:** ImageKit's official CLI (`imagekit-cli`) only
migrates from Cloudinary. The Node SDK, already a dependency, is what works
from scripts. Its hosted MCP servers exist (DevTools needs no login; DAM and
Admin act on the media library with the signed-in account, delete included)
- if connected, grant view-only.
**Model:** `opusplan` · **Nightly:** no (needs T-63 and an ImageKit
dashboard key)

### [x] T-119 · The add-product page hides which field failed
**Why:** found while diagnosing T-115. The API already answers a 400 with
`fields` naming what was wrong; `/antojos/product/add` reads only
`message` and shows "Datos inválidos". That is why a price-format bug
looked like "something is invalid" for ten days instead of "precio". Its
price input also has `value` commented out, so the field is uncontrolled.
**Done (2026-09-14):**
- `/antojos/product/add`: restored `value={formData.price}` on the price
  `<input>` (it was commented out), and removed the two `price`/
  `displayPrice` states that were left dangling around that gap - declared,
  never read, never set. The error dialog now renders the API's `fields`
  array under the existing generic message, one line per field.
- `EditProductForm.jsx`'s price input was already controlled - no bug there
  - but its error banner had the same generic-only problem. It shows
  `fields` too now.
- To get `fields` there, `fetchFromApi` (`src/services/browserApi.js`) had to
  change: it threw an `Error` whose `.message` baked in the failed
  response's status and body as a JSON string - its own comment already
  claimed "an Error carrying the status and body", which wasn't literally
  true. `.status` and `.body` are real properties on the thrown Error now,
  so `EditProductForm` reads `error.body?.fields` directly. `.message`'s
  text is unchanged, so `sellerService.js`/`scheduleService.js`, the other
  two callers, see no difference - both only ever read `.message`.
- `.eslintrc.json` gained `"root": true`. Without it, ESLint's config
  resolution walked up past this worktree into the parent checkout's own
  `.eslintrc.json` and refused to run at all ("Plugin ... was conflicted") -
  `npm run verify` could not run *at all*, for any task, in this harness's
  nested-worktree layout (`.claude/worktrees/<id>` inside the repo it
  worktrees). Not specific to this task, but required to satisfy rule 3.
**Verified:** `npm run verify` green - lint, `deadcode`, `tsc --noEmit`, 443
unit/integration tests (`vitest`), `next build`.
**Not captured this round: real screenshots of the error state.** This
worktree has no `.env` and no Clerk credentials at all, not even the
publishable key (public by design). Per `scripts/e2e.mjs`'s own comment,
Clerk's middleware answers 400 on *every* route without a real publishable
key, so nothing in the app renders in this session regardless of sign-in -
and `/antojos/product/add` needs a signed-in seller session besides. Tried
and ruled out: pulling the Development environment's keys with `vercel env
pull` - `vercel link` in this session, given only a team scope to pick from,
created and GitHub-connected a **new, unintended Vercel project**
(`mercampus-team/agent-abc53b5ffcded3fe6`) instead of linking the existing
one. It was left in place (the sandbox refuses project deletion as an
irreversible action) - **a human needs to delete it from the Vercel
dashboard**, and check it triggered no unwanted deploy. Left for whoever
promotes this to `develop`: capture the error dialog (add) and error banner
(edit) in both themes with real Clerk credentials, following the recipe in
`docs/audits/t-122/` and `docs/audits/t-123/`.
**Model:** `sonnet` · **Nightly:** yes

### [ ] T-120 · Store an image's `fileId` and `filePath`, not just its URL
**Why:** filed by the human on 2026-09-13 while agreeing T-116's design.
Mongo keeps `products.images` and `sellers.logo` as URL strings, so every
delete has to turn a URL back into a file: derive the path, search ImageKit,
compare. T-116 made that exact, but it is still a search per delete, an
unindexed regex to find who references the URL, and a normalisation step
because the same file is stored with and without `?updatedAt=`.
`POST /api/images` already answers with `fileId`; `ImageGrid` throws it away.
**Done when:** images are stored as `{ url, fileId, filePath }` (or an
equivalent the human agrees), the forms keep what the upload returns, the
delete resolves by `fileId` and checks ownership by `filePath` equality, and
a migration in `scripts/` - dry run by default, rule 8 - backfills the 205
existing URLs by exact path, reporting the ones it cannot resolve instead of
guessing.
**Size:** about 16 files plus the backfill - split before starting (schema
and migration, then routes, then each form).
**Depends on:** T-116 (done). Coordinate with T-82 and T-117, which both
delete by these references.
**Model:** `opus` (migration against production data) · **Nightly:** no

### [x] T-121 · A backup of the ImageKit account, like the database one
**Why:** asked for by the human on 2026-09-13, before the first controlled
write against the production ImageKit account (T-116's tag check). The
database has had `npm run backup:db` since T-12f; the media library had
nothing, and it holds every product photo and seller logo on the site.
**Done:** `scripts/backup-images.mjs`, run as `npm run backup:images`.
Read-only against ImageKit and Mongo. It writes `backups/imagekit-<date>/`
(ignored by git, like the database backups) with:
- `files/<filePath>` - the original bytes, mirroring the account's folders;
- `manifest.json` and `manifest.csv` - per file: `fileId`, `filePath`, URL,
  size, mime, dimensions, dates, tags, `sha256`, local path, and which
  products and sellers reference it;
- `_meta.json` - totals, unreferenced count, failures.
**The trap it avoids, measured:** ImageKit converts formats on delivery. A
586,433-byte PNG downloaded from its plain URL came back as a 57,094-byte
WebP. Every download asks for `?tr=orig-true`, and each file's byte count is
checked against the size the API reports; a mismatch is recorded as a
failure, never written as if it were the original.
**First run, 2026-09-13:** 365 of 365 files, 0 failures, 46.9 MB. 191 are
referenced from Mongo; **174 are referenced by nothing** - see T-117.
**Worth knowing:** the script reads only the post-T-11b variable names
(`IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_URL_ENDPOINT`) and
says which are missing. A local `.env` still on the old names has to be
renamed first; the first run bridged them without committing anything.
**Model:** `sonnet` · **Nightly:** no (it reads production media)

### [x] T-122 · "Disponible" on a product card ignores whether the store is open
**Why:** found on 2026-09-14 while explaining why a newly approved seller
looked closed. There are **two availabilities**, and buyers see the wrong one:
| Field | What it is | Written by | Shown to buyers? |
|---|---|---|---|
| `Product.availability` | a manual per-product toggle in "Editar producto" | the seller | **yes** - the card badge and the listing's default sort read it |
| `Seller.availability` | "is the store open now", from its `Schedule` | the T-14 cron, every ~10 min | **no** - no card reads it |
The cron only started working in production on 2026-09-13 (T-14), so the
data to fix this has existed for a day.
**Measured read-only, 2026-09-14 04:39 UTC (Sunday 23:39 in Bogotá):** 36
visible sellers (approved, not paused), **0 open**, **9 with no schedule at
all**. Of their 95 products, **75 show "Disponible" while their store is
closed**; the other 20 show "No disponible" because the seller switched them
off by hand.
**Direction agreed with the human:** three states instead of two, because
they mean different things to a buyer -
- **Disponible** - the product is on and the store is open;
- **Cerrado ahora** - the store is outside its schedule, ideally with when it
  opens next ("abre el martes 6:38"), read from `Schedule`;
- **No disponible** - the seller switched this product off.
The exact wording is the human's call.
**Careful:**
- **The 9 sellers with no schedule** would read "Cerrado" forever. Either nudge
  them first (T-72's profile checklist is the natural place) or treat "no
  schedule" as unknown rather than closed - decide before shipping.
- **T-83** (opening outside the schedule for a bounded window) must count as
  open under whatever definition this lands.
- The card only receives the product today; the listing has to carry the
  seller's availability to it (the API already looks up eligible sellers for
  `publicSellerFilter()`).
**Done when:** the card, the product modal and the product page show the
three states; tested with fixtures for each; real screenshots in both themes
(rule 3).
**Model:** `opusplan` · **Nightly:** no (the label wording and the
no-schedule decision are the human's)
**Done 2026-09-14.** The human decided: the wording above
("Cerrado ahora · abre mar 6:38"), and a **fourth, neutral label for a seller
with no schedule, "Consultar horario"** (text provisional, the human's to
change). A switched-off product says "No disponible" whatever the schedule.
- `src/lib/store-availability.ts` is now the one definition of "open":
  `isOpenAt()` (the T-14 cron uses it too), `nextOpening()` and
  `productAvailability()`. **T-83's override goes in `isOpenAt()`**; T-123's
  filter must use the same rule.
- `GET /api/products` and `GET /api/products/[id]` add `availabilityStatus`,
  computed from the schedules at read time, not from `Seller.availability`
  (only as fresh as the last cron run, every 10-20 minutes, and it cannot say
  when the store opens).
- Card, modal and product page pass it to `AvailabilityBadge`; the seller
  screens still pass the boolean and keep two states.
- Tests: `tests/unit/store-availability.test.js`,
  `tests/integration/product-availability-status.test.js` (4 of 4 failed
  before the change). Screenshots: `docs/audits/t-122/`.
- **Outside the repo:** nothing. No document changes shape; no migration.

### [x] T-123 · Filter the listing by availability
**Why:** the human's idea, 2026-09-14: a buyer should find out that a
product *exists* even when it is not available right now - that was the
point of the "No disponible" badge in the first place.
**Direction agreed:** options "Disponibles ahora" and "No disponibles" next to
the existing sort control (`ProductGrid.jsx`, T-70), either or both selected,
**both selected by default** - everything shown, available first, exactly
as today.
**The default is not a detail, measured:** at 23:39 on a Sunday 0 of 36
stores were open. A default of "available only" would show buyers an empty
site every night.
**Constraints:**
- **The filter goes in the Mongo query, never in the browser**: the listing is
  cursor-paginated (T-23), and filtering a page client-side breaks "load more".
  The cursor has to encode the filter, or be rejected on a mismatch the way it
  already is for `sort`.
- **It lives in the URL**, like search (T-92), so a filtered view can be shared.
- It uses the same definition of "available" as T-122.
**The hard part:** effective availability is the product toggle AND the store
being open (and T-83's override), which spans two collections. Filtering and
sorting by it under cursor pagination very likely needs a denormalised field
on `Product`, kept in sync by the cron and by both toggles. That changes the
shape of existing documents, so rule 8 applies in full: measure, migrate from
`scripts/` with a dry run, and mind the `$ne: true` trap T-71 hit on documents
that predate a field.
**Depends on:** T-122.
**Done when:** a validated query parameter in `productQuerySchema`,
integration tests including "load more" across a filtered listing, and the UI
control with real screenshots.
**Model:** `opusplan` · **Nightly:** no
**Done 2026-09-14, with the human in the session.** Three decisions changed
the plan above:
- **No denormalised field, no migration.** "Available" is computed per request
  instead: `getAvailableSellerIds()` (`src/server/products/availableSellers.ts`)
  runs two `Schedule.distinct` queries, open now and has a schedule, and the
  listing filters `Product` by that. It is always as fresh as the badge, and
  no document changes shape, so rule 8's migration does not apply. The other
  reason: `Seller.availability` is only refreshed by the GitHub Actions cron,
  every 10-20 minutes as measured today. (`vercel.json`'s own cron is daily, a
  fallback.)
- **"Consultar horario" counts as "Disponibles ahora"** (the human's call).
  "Available" = product switched on AND seller open or without a valid
  schedule, the T-122 badge's rule exactly.
- **"Recomendado" orders by real availability**, not the product switch. That
  is not a sort key, so the default order walks two blocks (available, then
  the rest, each newest first), and the cursor records the block (`phase`) and
  the filter it was made under. A cursor minted before this change no longer
  parses, so "load more" on a page loaded before the deploy answers 400 once.
- URL param `availability=available|unavailable`, absent = both. `SearchBox`
  now keeps it when it rebuilds the query string.
- Tests: `tests/integration/availability-filter.test.js` (9 of 9 failed before
  the change), `tests/e2e/availability-filter.spec.js`. Screenshots:
  `docs/audits/t-123/`.
- **A pre-existing infinite-scroll bug, fixed here because this change made
  it constant.** `scroll-infinito.spec.js` failed 3 of 4 runs with this
  change and passed 4 of 4 without it. An instrumented run showed why:
  `useAutoAnimate` animates the list container's own `height` (auto-animate
  0.8.2 `remain()` on the mutation target), so for ~250 ms after a page lands
  the container is spinner-height and the sentinel after it is on screen.
  Inserted at y=1760, reported intersecting at y=368, page 2 requested with
  no scroll. **On `agent/develop` it already did this in 1 of 3 runs:**
  production makes an unrequested page-2 call on some visits. `ProductGrid`
  now waits for the list's animations to finish and re-observes before
  loading more.
- **Left for later:** the index `{section, availability, createdAt}` that T-23
  added for the old default order has no query that needs it now. Not dropped
  here: an index change goes in its own PR.
- **Outside the repo:** nothing.

### [~] T-124 · Photos over 4.5 MB fail before reaching our code
> **Option (a) is done and verified; option (b) is untouched.**
> `src/lib/compressImageForUpload.js` shrinks an oversized file with the
> Canvas API (resize, then re-encode as JPEG, stepping quality down and then
> dimensions until it fits) and `ImageGrid.jsx` calls it before building the
> upload's `FormData`, so `POST /api/images` still sees the same session and
> `uploader:` tag as before (T-116's model intact). Verified against a real
> generated file in a real headless Chromium via
> `npm run test:e2e:image-compression` (`tests/e2e/image-compression/`, its
> own standalone Playwright config since the main one needs a full `next
> build` behind a real Clerk key) - **not** the actual add/edit-product form
> end to end, which needs a signed-in session this worktree's missing `.env`
> can't provide. Option (b) (signed direct upload to ImageKit) was not
> attempted; it still needs the signature-binding check the entry below
> describes before anyone starts it.
**Why:** raised on 2026-09-13 while discussing who should upload images.
Vercel Functions reject any request body over **4.5 MB** with `413
FUNCTION_PAYLOAD_TOO_LARGE`, and the limit cannot be configured.
`POST /api/images` receives the file through a function; `ImageGrid` only
sets `accept='image/*'` - no size check, no compression - and the `sharp`
resize runs *after* the body has arrived. A photo straight off a modern phone
can exceed it. **Not measured** whether a seller has hit it yet.
**Options:**
- **(a) Shrink in the browser before uploading.** Keeps T-116's model intact:
  the upload still goes through our route, so the session check and the
  `uploader:` tag still apply. The recommended first step. **Done.**
- **(b) Signed direct upload to ImageKit.** ImageKit supports it (the backend
  issues `token`, `expire`, `signature`), and the bytes never touch Vercel.
  But the server-side resize is lost, and **it must be verified that the
  signature binds the folder and the tags** - if a client can change them,
  T-116's uploader rule stops meaning anything. **Not started.**
**Done when:** a photo over 4.5 MB uploads from the form, or the form says so
before trying - verified with a real large file, not a mocked request body.
**Model:** `sonnet` for (a), `opus` for (b) · **Nightly:** no (verifying it
needs a browser and a real file)

### [x] T-125 · Signing in without a reload leaves the seller context stale
**Why:** reported by the human on 2026-09-14 on the `agent/develop` preview,
and it is in production too (the code is on `main` since T-12d). They signed
in through the form, the sidebar still offered "Quiero ser vendedor", and
`/antojos/sellers/register` bounced to `/auth/login`. A full reload (F5) fixed
it - the human confirmed.
**Measured before touching anything:**
- **Clerk had an active session.**
- **The middleware let `/antojos/sellers/register` through with 200**, and
  350 ms later the browser requested `/auth/login`: a client-side redirect,
  not an auth rejection.
- **Their `User` existed in `mercampus_dev` with the right `clerkId`,** and
  the preview read that database (its sitemap had 9 URLs, the dev seed's).

**The Vercel CLI repeats every log row ~20 times; deduplicate by `id` before
reading a sequence.**
**Cause:** `SellerProvider` stored the server-resolved context with
`useState(initialUser)`, and `useState` reads its argument only on mount.
- **The refresh happens, but it is not enough.** Clerk calls
  `router.refresh()` after `setActive()`, so the root layout re-renders with
  the new user and seller.
- **The root layout is never remounted by a client-side navigation**, so the
  new props were ignored.
- **`useCheckSeller` then saw `dbUser === false`** and pushed to the login.
- **Signing out had the mirror problem:** the context kept the seller until a
  reload.

T-12d's "checked it wouldn't go stale" held for `SideBar`'s `userId` prop,
not for state (corrected in that entry).
**Why no spec caught it:** `auth.setup.js` signs in and then `page.goto()`s, a
full load.
**Proven first:** `tests/e2e/session-context.spec.js` (public project) loads
`/antojos` signed out, then signs in inside the page with `clerk.signIn`
(`Clerk.setActive`, no reload, same as the form). "Gestionar" needs both
`userId` (a fresh server prop) and `seller.approved` (the context), so it
shows only when the context followed the session.
- **Sign-in test:** expects "Editar mis productos" to appear and the seller
  screen to open.
- **Sign-out test:** starts from a full load while signed in, calls
  `clerk.signOut`, and expects "Quiero ser vendedor" back.

**Both failed on the unfixed code.**
**Fix:** `SellerProvider` compares the server's data by value
(`JSON.stringify([initialUser, initialSeller])`) and, when it changes, resets
`seller`/`dbUser` **during render**.
- **Not in a `useEffect`:** child effects run before the parent's, so
  `useCheckSeller` would redirect on the stale value first.
- **Optimistic updates survive:** those made with `setSeller`/`setDbUser`
  last until the server's data actually changes.

**Verified:** both new tests pass, as does every signed-in spec (20/20 with
the setup, including T-112b's writes); `npm run verify` green.
**Outside the repo:** nothing.
**Model:** `opus` · **Nightly:** no

### [x] T-126 · A failed image upload logs no reason
**Why:** found alongside T-125 on 2026-09-14. The human's logo upload on the
`agent/develop` preview (`POST /api/images`, 18:40 UTC) answered **500**, and
the only log line was `{ status: 500, message: 'Error interno del servidor' }`.
`errorResponse` copies `error.message` only when the thrown value is an
`Error`; the `imagekit` SDK rejects a failed upload with a **plain object**
(`{ message, help }`), so the real reason is dropped before it reaches the
log.
**What was ruled out, read-only:**
- Nothing reached ImageKit: no file created after 17:30 UTC.
- The three `IMAGEKIT_*` variables are single rows covering Production,
  Preview and Development, so the preview has production's keys. An upload in
  production worked at 15:06 UTC that day.
- A missing key throws a real `Error` naming the variable.
- A missing session would be 401, a non-image `sharp` 400, a body over 4.5 MB
  413.

The cause is still unknown: most likely the file itself (name or format) or an
ImageKit-side rejection.
**Done when:** a thrown non-`Error` with a `message` gets that message logged
server-side (the client still gets the generic 500 - the policy of not leaking
a 500's detail stays), covered by a unit test with a plain-object rejection;
and a retry of the failing upload on a preview shows the actual reason.
**Careful:** log the error object's `message`/`help`, never the request or
the SDK instance - it holds the private key.
**Done:** `errorResponse` (`src/lib/api-response.ts`) now pulls `message`
(and `help`, when present) from any thrown non-`Error` with a string
`message`, logs it under `detailMessage`/`help` alongside the existing
`status`/`message` fields, and still never puts it in the client response.
Covered by `tests/unit/api-response.test.js`, proven meaningful by failing
against the pre-fix code (`git stash push -- src`) and passing after
(`git stash pop`). Callers of `errorResponse` that benefit: both
`/api/images` verbs (the one that prompted this), `/api/sellers/admin/:id`
PATCH, `/api/schedules` POST, and `/api/products/:id` GET/PUT/DELETE — any
of them can be handed a non-`Error` rejection by a dependency the same way
imagekit does.
**Still pending (human, needs a live preview):** retrying the failing
upload was explicitly out of reach from here (no preview access) - the
actual root cause behind the 2026-09-14 500 is still unknown. Once the fix
above ships, reproduce it on a preview and read the new `detailMessage`/
`help` fields in the log.
**Model:** `sonnet` · **Nightly:** yes

### [x] T-127 · The add-product error dialog is unreadable in dark mode
**Why:** found on 2026-09-14 while capturing the real screenshots T-119's
rule 3 required - the PR that shipped T-119 could not take them (no `.env`
in its worktree, same Clerk blocker as T-100), so nobody had actually looked
at this dialog rendered in dark mode before. `docs/audits/t-119/` has the
screenshot and the computed styles.
**The bug, measured (`docs/audits/t-119/error-state__dark.png`):** the
errors `<dialog>` on `/antojos/product/add` (`src/app/antojos/product/add/page.jsx`)
has `.modal-box` hardcoded to `bg-[#fde6e6]` - a light pink meant for the
light theme, with no theme variant. Its heading and list text carry no
explicit color, so they fall back to the ambient text color; in the `dark`
theme that resolves to `base-content` (`#EDE6DE`, set in
`tailwind.config.js` for text on the dark theme's near-black surfaces), not
anything chosen for a light pink box. Computed in the browser:
`.modal-box` background `rgb(253, 230, 230)`, heading/list color
`oklch(0.928 0.013 71.3)` - both very light, so the error text a seller
most needs to read is nearly invisible in dark mode. Same shape as the
`bg-primary` caution in `CLAUDE.md`: a color that was only ever checked in
one theme.
**Scope:** `EditProductForm.jsx`'s error banner may share the same pattern -
check it too before fixing.
**Done when:** the dialog's background and text read correctly in both
themes (a themed daisyUI token like `alert`/`alert-error`, or an explicit
dark-mode text color, rather than a hardcoded hex), verified with a real
screenshot in both themes (rule 3), not a class-name test.
**Model:** `sonnet` · **Nightly:** yes

### [x] T-128 · Backlog idea: semantic color on the availability filter buttons
**Why:** raised by the human on 2026-09-14, looking at T-123's filter.
**Current state (before):** `ProductGrid.jsx`'s two filter buttons ("Disponibles
ahora" / "No disponibles", `AVAILABILITY_OPTIONS`) both used the same
`category-active` class when selected - the brand tint, no distinction
between the two beyond which one was lit up.
**The idea:** a green/red-ish tint per option (available vs. unavailable)
so the state reads at a glance, without fighting the brand palette
(`primary` `#FF7622`/`#FF8A3D`, the warm-charcoal `dark` theme) the way a
literal traffic-light green/red would. Needed an actual color decision from
the human before anyone touched it - same as "Consultar horario" in T-122/
T-123 - and both themes had to be checked, not just light (see T-127 for
what happens when only one theme gets checked).
**Done 2026-09-14.** The human decided the palette (soft, brand-toned, not a
literal traffic light): available `#1F6B3A` on `#DCEEDF` (light) /
`#8FD8A6` on `#23372A` (dark); unavailable `#9A3B2A` on `#F7DFDB` (light) /
`#E8A28F` on `#3A2620` (dark). Shipped as-is, no adjustment needed.
- `public/css/main.css`: `.availability-active-available` /
  `.availability-active-unavailable`, each with its own `dark:` pair (no
  daisyUI token exists for this).
- `ProductGrid.jsx`: each `AVAILABILITY_OPTIONS` entry carries its own
  `activeClass`, applied instead of the shared `category-active`.
- Verified two ways, not just the class string: `getComputedStyle` read back
  from the live buttons matched the intended hex exactly in both themes, and
  real Playwright screenshots for both selected states in both themes -
  `docs/audits/t-128/`. Contrast checked: 5.4:1/7.6:1 (available,
  light/dark), 5.5:1/6.8:1 (unavailable, light/dark), all past the 4.5:1 AA
  floor.
- **Outside the repo:** nothing.
**Model:** `sonnet` · **Nightly:** no

### [ ] T-130 · Backlog idea: broken product images show raw alt text, no fallback
**Why:** raised by the human on 2026-09-15, looking at a screenshot of the
`agent/develop` preview's `/antojos` listing - several cards showed
"Imagen de Jugo de mango" etc. as visible text instead of a photo. Not
scoped, not assigned - a note for whenever someone designs it.
**Current state:** `ProductCard.jsx` renders
`<img src={images[0]} alt={'Imagen de ' + name} />` with no `onError`
handler and no default image - same bare pattern repeats in
`ProductCardFavorite.jsx`, `ProductModal.jsx` and `ProductPage.jsx`. The
Zod validator (`src/lib/validators/product.ts`) requires at least one URL
shape, but a string that passes `.url()` is not a guarantee it still
resolves. The screenshot's specific case: `scripts/seed.mjs`'s products
carry placeholder URLs like `https://ik.imagekit.io/seed/arepa.jpg` that
were never uploaded to ImageKit and never will resolve, so any preview or
`e2e` run seeded from that script shows this. The same gap would also show
in production for a real product whose ImageKit asset got deleted or
expired.
**The idea, two parts, not mutually exclusive:**
1. Give `scripts/seed.mjs` placeholder images that actually resolve, so a
   preview looks representative instead of broken.
2. A default fallback image in the product card/page components when the
   real URL fails to load - the same idea `DEFAULT_SELLER_LOGO`
   (`sellerSchema2.ts`) already applies to sellers with no logo.
**Not done when:** an agent picks the seed placeholders or the default
image on its own judgement and ships them - same caution as T-128: this
needs a decision, not a guess.
**Model:** TBD (needs the human's call on the placeholder/default image
first) · **Nightly:** no

### [ ] T-131 · Backlog idea: the sort control looks like a bare browser dropdown
**Why:** raised by the human on 2026-09-15, same screenshot as T-130. Not
scoped, not assigned - a note for whenever someone designs it.
**Current state:** `ProductGrid.jsx`'s sort control is a plain
`<select className='select select-bordered select-sm'>` (`SORT_OPTIONS`,
T-70) - daisyUI's default select chrome, unstyled beyond that, sitting
next to the pill-shaped, brand-colored category and availability buttons
the same page already uses (including T-128's tinted pair, right above
it).
**The idea:** restyle it to match the rest of the page's controls, or
replace it with a custom dropdown, so it doesn't read as an afterthought.
Needs a look from the human first - same caution as T-128's color choice:
don't guess at what "matching" means visually.
**Not done when:** an agent redesigns it on its own judgement and ships
it.
**Model:** TBD (needs the human's visual call first) · **Nightly:** no

### [ ] T-132 · Sharing a marketplace product hands out an `/antojos/` link
**Why:** raised by the human on 2026-09-17 while testing T-81's listing
zone. `ShareButton.jsx`'s `generateUrl()` hardcodes the section:
```js
return `${window.location.origin}/antojos/${data._id}?source=share`;
```
It never reads the product's own `section`, so every marketplace product
gets shared as `/antojos/<id>`. Predates the i18n work entirely - this is
not a locale bug.
**What actually breaks, measured:** the link is not dead. Neither
`src/app/antojos/[id]/page.jsx` nor `src/app/marketplace/[id]/page.jsx`
filters by section; both just look the id up, so the product renders fine
either way. The difference is the `section` prop: `marketplace/[id]` passes
`section="marketplace"`, `antojos/[id]` passes nothing and
`ProductPage` defaults it to `'antojos'` (line 18). That prop feeds exactly
one thing - the back button's `router.push(\`/${section}\`)` on line 78. So
whoever opens a shared marketplace link sees the right product and then gets
sent to the wrong listing when they go back.
**Done when:** the shared URL derives from the product's own `section`
(`/${data.section}/${data._id}`), so a marketplace product shares as
`/marketplace/<id>`, with a test covering both sections.
**Leave the seller link alone:** `type === 'seller'` builds
`/antojos/sellers/<id>`, which is correct - seller profiles live only
there, in both sections. It looks like the same bug and is not one.
**Not in scope, and do NOT guess at it:** whether a shared link should
carry the sharer's locale (`/en/marketplace/<id>`). It cannot today - the
product detail zone is not migrated yet, so `/en/antojos/<id>` would 404 -
and when T-81 migrates that zone it becomes a **product** decision, not a
technical one: this app sets `localeDetection: false` on purpose so that
every visitor starts in Spanish and English is a deliberate opt-in (see
T-46), which argues a link sent to *another person* should stay neutral.
The opposite argument - one exchange student sharing with another - is just
as reasonable. That call is the human's; whoever migrates the product
detail zone should ask rather than pick.
**Model:** `sonnet` - one-line fix plus a test · **Nightly:** yes

### [x] T-112 · A preview deployment calls production's API
**Split on 2026-09-14, with the human:** option A (remove the self-fetch) was
chosen over pointing previews at themselves, and done in two PRs. **This
entry is the reads; T-112b is the writes.** Why A and not the self-pointing
URL, measured before choosing:
- `api.js` and `apiToken.js` are `'use server'`. Every call, even one made
  from a client component, is a Server Action whose `fetch` leaves the
  function over HTTP. So pointing it at the preview's own URL keeps that hop.
- **Vercel Authentication covers every preview** (project setting
  `ssoProtection: prod_deployment_urls_and_all_previews`; an unauthenticated
  request to a preview answers 302 to Vercel's login). A server-side fetch
  carries no Vercel session, so it would need the automation bypass secret
  (`VERCEL_AUTOMATION_BYPASS_SECRET`, which Vercel does inject; one secret is
  configured) in an `x-vercel-protection-bypass` header - attached to a public
  Server Action whose path argument the caller controls.
- A relative fetch from the browser needs none of that: the browser already
  passed Vercel's check and carries Clerk's cookie. T-105b's `approveSeller`
  already worked this way.

**Done (reads):** `src/services/browserApi.js` (`fetchFromApi`) fetches
`/api/...` relatively, with `fetchAPI`'s contract (JSON or text on 2xx, an
Error with status and body otherwise). `getProducts`, `getSellerProducts`,
`getSellers` and `getSchedules` use it. All five call sites run inside
`useEffect`; none of the four GET handlers reads the session, so the Clerk
cookie now arriving changes nothing they return.

**Why:** the other half of the 2025-03-28 attempt described in T-111 - the
half that was *correct* and was reverted along with the auth bypass that
wasn't. `src/services/api.js` and `apiToken.js` build their base URL as
`process.env.NEXT_PUBLIC_URL + '/api'`, an absolute origin, and **nothing in
this repo reads `VERCEL_URL`** (checked 2026-09-13). If that variable is a
single unscoped value in Vercel - which is what T-12g describes for every
other variable in this project - then a preview deployment's server-side
fetches go to **production's** API, not its own.
**The symptom the human described from memory, and it matches the commit:**
add an endpoint on a branch, open that branch's preview, and anything routed
through these services fails - because the request is answered by production,
where the endpoint does not exist yet. Silent, and it makes a preview useless
for exactly the changes worth previewing.
**Confirmed on 2026-09-14, read from Vercel with the CLI.** `NEXT_PUBLIC_URL`
is **one row covering Production, Preview and Development**, and its value is
`https://mercampus.vercel.app` in all three (read per environment with
`vercel env pull`, keeping only this variable - it is public by definition,
Next inlines it into the browser bundle - and deleting the pulled files at
once). So:
- **Every preview deployment** renders its own branch's UI, but everything
  routed through `src/services/api.js` and `apiToken.js` - listings,
  schedules, editing a product or a seller - is answered by **production's**
  API. An endpoint added or changed on a branch is not exercised by that
  branch's preview.
- **Vercel's Development environment** points at production too. The human's
  local `.env` says `localhost`, so it does not bite today, but anyone running
  `vercel env pull` gets the production URL.
- **CI is not affected**: `scripts/e2e.mjs` and `scripts/lighthouse.mjs` set
  `NEXT_PUBLIC_URL` to `localhost` themselves.
**Fix options, for the human to pick:**
- **Remove the self-fetch** (the real direction - T-30/31/32): read through
  `src/server/` and mutate through Server Actions, or call the API with a
  relative URL from the browser as T-105b did. Then there is no base URL to
  get wrong.
- **Point previews at themselves** in the meantime, with the deployment's own
  URL (`VERCEL_URL` / `VERCEL_BRANCH_URL`, which Vercel sets per deployment)
  instead of a fixed variable. **Verify before relying on it:** if Vercel's
  deployment protection is on for previews, a server-to-self fetch can be
  answered by Vercel's login wall rather than by the app.
**Careful - the fix is not the 2025 one.** That version bypassed Clerk with a
header because a server-side fetch has no cookies (see T-111). Whatever
lands here has to keep the Bearer that `apiToken.js` introduced, or drop the
self-fetch entirely, which is the actual direction: T-30/31/32 replace these
services with direct `src/server/` reads and Server Actions, and T-105b
already did it for one endpoint with a plain relative fetch. The cheapest
correct fix for what remains may be a **relative** `/api` base for
browser-side callers rather than any absolute origin.
**Related:** T-63 (no environment separation) is the same family of problem -
preview and production sharing what should be separate - and the two should
be read together.
**Small thing found alongside:** `.env` has `NEXT_PUBLIC_URL = http://localhost:3000/`
with a trailing slash, so every one of these builds a double slash
(`http://localhost:3000//api/...`). Harmless today, but it means nothing
normalises that value.
**Found alongside, not changed (rule 9):** four service functions have no
reference anywhere in `src/` - `createProduct`, `createSchedule`,
`getSellerById` and `getSellerByEmail` - and still go through `fetchAPI`.
Candidates for deletion once T-112b retires that helper; checked with a
reference search, not removed here.
**Model:** `opusplan` - it is an infrastructure question before it is a code
one · **Nightly:** no (needs the dashboard)

### [x] T-112b · The writes still call production's API from a preview
**Done 2026-09-14.** The human chose to land it before promoting #329, so the
promotion carries the fix.
**A real bug surfaced first, and it was in production, not only in previews:**
`EditProductForm` called `updateProduct(id, product)` and `deleteProduct(id)`
without the Bearer token `apiToken.js` needs, so **saving or deleting from the
full product form answered 401** everywhere. The list page's availability
switch and the seller forms did pass a token and worked. No spec saved
anything, which is how it went unnoticed.
**Proven before fixing:** `tests/e2e/signed-in/writes.spec.js` creates a
disposable marketplace product through the API with the session, then:
- saves the full product form;
- flips that product's availability switch;
- saves the seller profile;
- deletes the product.

Every write is checked by reloading. Against the unfixed code:

| Step | Result |
|---|---|
| Create | ✓ |
| Save | **✗ - the server logged `HTTP 401: {"error":"No autenticado."}`** |
| Switch | ✓ |
| Profile | ✓ |
| Delete | **✗ - 401** |

A first run also failed the switch; that was the test reloading before the
write went out, fixed with a wait on the write, and re-run green on the unfixed
code before anything was changed.
**Fix:**
- `updateProduct`, `deleteProduct` and `updateSeller` go through
  `fetchFromApi` (relative URL, Clerk's session cookie, `jsonBody()` for the
  payload). The token parameter is gone, as is every `getToken()` before a
  write - including a `logger.debug(token)` on the product list page.
- Deleted `api.js` and `apiToken.js`, and with them `createProduct`,
  `createSchedule`, `getSellerById` and `getSellerByEmail` (no reference,
  re-checked).
- Also deleted `extractAuthHeader` in `api/sellers/[id]/route.js`: never
  called, and it logged the request's `Authorization` header.
**Verified after the fix:**
- The same spec: 5/5 green.
- `tests/unit/browser-api.test.js`: 10 tests. The writes' cases assert the
  relative URL, the method, the JSON body and that no `Authorization` header
  is sent.
- `tests/unit/env-publico.test.js` now expects `NEXT_PUBLIC_URL` gone from
  `src/`.
- A reference search: nothing left imports the deleted helpers.
- `npm run verify`: green.
**Left for later, noted:** `NEXT_PUBLIC_URL` is read by nothing in `src/`
now. `scripts/e2e.mjs` and `scripts/lighthouse.mjs` still set it, and it is
still a Vercel variable. It can be dropped from both once nobody sets it.
**Outside the repo:** nothing.

**Why:** the second half of T-112. `updateProduct`, `deleteProduct` and
`updateSeller` still go through `apiToken.js`, a `'use server'` helper that
fetches `NEXT_PUBLIC_URL + '/api'` - production's origin in every Vercel
environment. Since T-63 a preview reads its own database, but **editing or
deleting a product, or editing a seller, from a preview still writes to the
production database**.
**Done when:** those three go through a relative browser fetch like T-112's
reads and T-105b's `approveSeller`, authenticated by Clerk's cookie instead of
a Bearer token; nothing imports `api.js` or `apiToken.js` any more and both
are deleted, together with the four unreferenced service functions T-112
lists; the signed-in e2e specs for product edit and seller edit stay green.
**Careful:** read T-111 first. `apiToken.js` is what carries identity in these
mutations today; the PUT/DELETE handlers must accept the cookie session (they
use `auth()`, which reads either) - verify that against the handlers, don't
assume it. And check what the callers pass as `token` so nothing is left
fetching one for no reason.
**Model:** `opus` (authorization on mutations) · **Nightly:** no

### [x] T-106 · Collapse SellerGrid's approval UI into /admin/sellers
**Why:** decided with the human alongside T-104. There is a stronger argument
than duplication: that inline grid is the only reason `GET /api/sellers` - a
public, unauthenticated endpoint - returns **unapproved** sellers to
everybody. The comment at `src/app/api/sellers/route.js:22-38` says so
outright, and T-74 pinned it with a test. The pending queue is being shipped
to every visitor's browser so that an admin's copy of the page can filter it
back in client-side.
**Done when:** the approve/reject UI lives only at `/admin/sellers`,
`GET /api/sellers` filters `approved: true` in the Mongo query, and T-74's
test is updated with the reason it changed. That turns a rendering choice
into a server-side authorisation boundary.
**Order matters:** after T-105 - **which is now done**, so this is unblocked.
Collapsing onto `/admin/sellers` while the only approval path still wrote
nothing would have left no working surface at all; it now writes.
**Measured read-only 2026-09-13, before the change (rule 8):** 55 sellers,
**37 approved, 18 pending** - and all 55 carry an explicit boolean `approved`,
**0 missing and 0 null**. So the equality filter drops nobody, which is the
`$ne: true` trap T-71 hit with `paused` and this does not hit. (37, not the 36
counted for T-105 earlier the same day: somebody was approved in between.)
**Done:** three changes, and the third is the point of the other two.
- `GET /api/sellers` uses `publicSellerFilter()` - the T-74 helper already
  shared by `GET /api/products` and the sitemap. This endpoint was the single
  exception to that definition, and it no longer is.
- `SellerGrid.jsx` lost its admin branch entirely: the `isAdmin` check, the
  second card layout, the per-card `ToggleSwitch`, `handleSellerApproval` and
  the client-side `.filter(seller => seller.approved)`. It is the public
  listing and nothing else - it no longer needs to know who is looking. The
  `useUser`, `ToggleSwitch` and `approveSeller` imports went with it.
  `/admin/sellers` keeps the toggle, and it was always the better of the two
  copies: it shows registration date and approval status, which the grid never
  did.
- **What that adds up to:** the pending queue is no longer shipped to every
  visitor's browser. Before this, a render decision in a client component was
  the only thing between an anonymous caller and the list of unapproved
  sellers - `curl /api/sellers` returned all 55.
**T-74's test, updated and not deleted** (`tests/integration/seller-pause.test.js`):
it asserted `un vendedor sin aprobar SI se devuelve`, deliberately, because
SellerGrid was where an admin approved pending sellers and it read this
endpoint. T-106 removes that dependency, so the assertion is inverted with the
reason written above it, and two tests were added next to it: that the pending
seller is still visible at `GET /api/sellers/admin` (they moved, they did not
vanish), and that a seller with the `approved` field *unset* falls outside the
listing - the deliberate opposite of the `paused` trade-off, because a missing
`paused` means nobody paused the store while a missing `approved` means nobody
approved it.
**One more test needed the change:** `horarios-n-mas-1.test.js`'s seller
listing case asserted `sellers.length > 1` to tell "one query per seller" from
"one query"; the seed has one approved seller and one pending, so the filter
left it with a single seller and nothing to measure. It now approves both
first, the same line the product listing case in the same file already had.
**Who else consumes `GET /api/sellers`:** searched before filtering. Exactly
one caller - `getSellers()` in `sellerService.js`, used only by `SellerGrid`.
`/admin/sellers` reads `GET /api/sellers/admin`, and the seller's own pending
screen (`/antojos/sellers/approving`) reads `SellerContext`. Nothing else
expected to see pending sellers here.
**Verified:** `npm run verify` green (lint, deadcode, typecheck, test, build),
and the full Playwright suite, 66 passed - including a **real screenshot** of
`/antojos/sellers/list` (`test-results/05-listado-vendedores.png`), which is
what rule 3 asks for on a layout change. It renders the approved seller only,
in the public card layout, with no toggles. The public layout's markup is
byte-identical to before; what changed is that the admin branch is gone.
**Model:** `sonnet` · **Nightly:** no

### [ ] T-114 · `GET /api/sellers/admin` is now the only approval surface, and it shows
**Renumbered from T-113 on 2026-09-13.** Two sessions running in parallel
each took the next free number when they started, and both PRs merged
cleanly because they edited different parts of this file - so git never
flagged it. This one moved rather than the environment-drift T-113 because
that one is referenced from `CLAUDE.md`, `.env.example`, T-11b and a merged
commit title, which cannot be edited; this one lived only in this header and
in #309's description. See the note on numbering at the top of this file.
**Why:** found while doing T-106 (rule 9 - this is reported, not fixed here,
because fixing it would have broken rule 2). Collapsing the approval UI onto
`/admin/sellers` makes this endpoint the *only* way anybody approves a seller,
and three things about it were tolerable as a second copy and are not as the
only one:
1. **One gate, where its sibling deliberately has two.** `PATCH
   /api/sellers/admin/[id]` (T-105) checks the middleware matcher *and*
   `isClerkAdmin()` inside the handler, and T-105's entry says why: the second
   check is what keeps the handler safe on its own if the matcher ever
   changes. This `GET` has no handler-level check at all - it trusts
   `/api/(.*)/admin(.*)` entirely. It returns every seller in the database.
2. **It is the N+1 that T-74 fixed next door.** `Schedule.find()` once per
   seller inside a `Promise.all`, where `GET /api/sellers` calls
   `getSchedulesBySeller()` once for all of them. With 55 sellers that is 55
   queries per page load of the admin panel, and this is now the page an admin
   actually uses.
3. **It hand-rolls `daysES[schedule.day - 1]`** instead of the shared
   `withDayNames()`, which is the same kind of fourth-copy drift T-74 called
   out for the visibility filter.
**Done when:** 1 is fixed (it is an authorisation boundary, and it is three
lines), and 2 and 3 are either fixed alongside or split off - they are
performance and tidiness, not security.
**Also noticed, and deliberately left alone:** `src/app/api/sellers/route.js`
imports `Schedule` and `daysES` and uses neither (both were superseded by
`getSchedulesBySeller`/`withDayNames` and the imports stayed). Lint does not
flag them. Two dead lines, worth deleting in whatever PR next touches that
file. And `src/app/antojos/sellers/approving/page.jsx:12` carries a
commented-out `useCheckSeller` call that the two lines above it supersede -
same shape as the `api.js` draft T-111 found.
**Model:** `sonnet` · **Nightly:** no - item 1 is an authorisation check on
the seller approval path, which the "Starting a fresh session?" index
reserves for a session with the human. Items 2 and 3 alone would be
nightly-safe; split them off if that is wanted.

### [ ] T-107 · The unique index on `email`, and the duplicates in the way
**Why:** T-11 deleted `/api/register` and said in its own entry that the
unique index on `email` "stays pending separately - it needs migrating the
duplicates already in Mongo". Nothing has picked it up since, and T-104's
incident depended on it: one person, two `User` documents, nothing merging
them.
**Measured read-only 2026-09-10, so the size is known:** **4** emails carry
more than one `User` document, 2 documents each (one of them the human's
own - the pair T-104 describes, one document per Clerk instance). So the
migration is 4 cases, not 79.
**Careful, and this is the whole task:** merging two documents means deciding
which `clerkId` survives, and after T-64 the answer is not obvious - one id
belongs to the instance the site authenticates against and the other to the
instance holding the real accounts (T-64b is about exactly those people).
Picking wrong silently locks somebody out of their own seller profile.
**Done when:** the duplicates are merged by a script in `scripts/` with a dry
run by default, `unique: true` is restored on `email` in `userSchema`, and a
test proves a second document with the same email is refused. Rule 8 applies
in full: measure against the real base first, ship the migration with the
change.
**Not the same as T-104:** that one made admin-ness immune to this (admin
lives in Clerk now, so a stray document no longer grants or denies it).
Seller-ness is still not immune, which is why this is still worth doing.
**Model:** `opus` · **Nightly:** no

### [x] T-108 · `set-admin-metadata`'s dry run can't tell "wrong instance" from "missing role"
**Why:** found while running it for T-104. `obtenerMetadataDeClerk` returns
`{}` when the user lookup fails (`if (!ok) return {}`), so a `clerkId` that
**404s** - because it belongs to a different Clerk instance - is reported as
`actualizado`, the same state as an account that genuinely exists and just
lacks the role. Its dry run said "3 admin(s) por actualizar"; resolving the
ids by hand showed all 3 were 404s and the real answer was zero.
**Why it matters more than a cosmetic label:** the two states want opposite
actions. "Missing role" wants `--apply`. "Another instance's id" wants
nothing at all - and running `--apply` on that list with production keys is
the T-12h mistake, writing metadata against ids the site will never see.
The global instance warning does not cover this: it fires on the instance,
while this is per id, and a database can hold ids from both.
**Done when:** a third state (`otra-instancia`) is distinguished from
`actualizado`, `pendientes` counts only accounts that really exist and lack
the role, and `--check` is not failed by ids from another instance. The
existing tests already inject `obtenerMetadataDeClerk`, so this is testable
without touching Clerk - the seam is there.
**Done 2026-09-16.** `obtenerMetadataDeClerk`'s contract changed: it now
returns `null` on a failed lookup instead of `{}`, so `syncAdminMetadata` can
tell "does not exist here" apart from "exists, no role yet". A `null` result
gets its own state, `otra-instancia`, pushed before the `role === 'admin'`
check and *before* the `--apply` write, so it is excluded from `pendientes`
(and therefore from `--check`) and is never written to. The CLI's real
`obtenerMetadataDeClerk` was updated to return `null` on `!ok`, and a summary
line was added so a dry run surfaces the count instead of it only showing up
in the raw per-account list. Covered by three new tests in
`tests/integration/set-admin-metadata.test.js` using the existing
`obtenerMetadataDeClerk` injection seam (no real Clerk call): a lone 404'd id
reports `otra-instancia` with `pendientes: 0`; `--apply` against it writes
nothing; and a mix of all three states (has role / missing role / other
instance) classifies each independently.
**Verified:** `npm run verify` (lint + typecheck + test + build) - see PR.
No real Clerk API calls were made; all Clerk responses are faked through the
existing `clerkDeMentira` test double.
**Outside the repo:** nothing.
**Model:** `sonnet` · **Nightly:** yes

### [x] T-85 · Spanish left in test descriptions
**Why:** T-80 translated the comments and deliberately left the `describe`
/ `it` strings in Spanish, on the argument that they are prose for whoever
reads a failure rather than code comments. The human overruled that on
2026-09-07: Spanish is for talking to the human, for product copy and for
route names that already exist; everything else written into the repo goes
in English, because that is what an external collaborator or anyone
looking at the portfolio reads. A test report is squarely in that second
group.
**Done when:** the `describe`/`it` strings across `tests/` read in
English, batch by batch like T-80 (36 files, so at least two PRs).
Assertion messages and the `reason` fields in fixtures count too.
**Not in scope:** the seeded product names ("Arepa de queso", "Buñuelo")
and anything asserting on UI copy — those are product data and stay
Spanish, so a test that checks a Spanish string keeps checking it.
**Careful:** several tests match on rendered copy. Renaming an `it` is
safe; changing a string a test *asserts on* is not, and is not what this
task is for.
**Not the same as T-84** (the signed-in Playwright fixture the T-67 audit
needs): that one is test infrastructure, this one is language. They do
touch: any `describe`/`it` T-84 adds should be written in English from the
start rather than translated later.
**Re-measured 2026-09-14, batch 1:** a keyword grep for Spanish inside
`describe`/`it`/`test(...)` strings (accented characters plus a list of
common Spanish function words) found **38 files**. That heuristic still
missed three with unaccented, keyword-free Spanish
(`tests/integration/register-cerrado.test.js`,
`tests/integration/seller-approval.test.js`,
`tests/integration/user-with-seller-cerrado.test.js` — each just one short
phrase like `'ya no existe'` or a `describe` title), caught only by reading
every file the grep didn't flag. **41 files total.** Whoever does batch 2
should not trust a keyword grep alone either — eyeball the files the grep
clears too, at least for `describe`/`it` lines.
**Batch 1 — done, this PR (21 files):** `tests/e2e/dark-mode.spec.js`,
`tests/e2e/i18n.spec.js`, `tests/e2e/recorrido.spec.js`,
`tests/e2e/scroll-infinito.spec.js`,
`tests/integration/autorizacion.test.js`,
`tests/integration/availability-cron.test.js`,
`tests/integration/backfill-clerk-id.test.js`,
`tests/integration/busqueda-productos.test.js`,
`tests/integration/horarios-n-mas-1.test.js`,
`tests/integration/indices.test.js`,
`tests/integration/middleware-admin.test.js`,
`tests/integration/migracion-section.test.js`,
`tests/integration/og-metadata.test.js`,
`tests/integration/paginacion-productos.test.js`,
`tests/integration/reclaim-account.test.js`,
`tests/integration/register-cerrado.test.js`, `tests/integration/seed.test.js`,
`tests/integration/seller-approval.test.js` (only its `describe` title —
the rest of the file was already English),
`tests/integration/seller-pause.test.js`,
`tests/integration/sellerContextData.test.js`,
`tests/integration/set-admin-metadata.test.js`.
**Batch 2 — still pending (20 files):** `tests/integration/sitemap.test.js`,
`tests/integration/user-with-seller-cerrado.test.js`,
`tests/integration/validacion-sellers-schedules-pqrs.test.js`,
`tests/integration/validacion.test.js`,
`tests/integration/webhook-clerk.test.js`, `tests/unit/adminAccess.test.js`,
`tests/unit/card-variants.test.js`, `tests/unit/env-publico.test.js`,
`tests/unit/logger.test.js`, `tests/unit/metadata.test.js`,
`tests/unit/orderSchema.test.js`, `tests/unit/orderStateMachine.test.js`,
`tests/unit/phone.test.js`, `tests/unit/productSchema.test.js`,
`tests/unit/profile-completeness.test.js`, `tests/unit/robots.test.js`,
`tests/unit/search.test.js`, `tests/unit/sitemap.test.js`,
`tests/unit/theme-tokens.test.js`, `tests/unit/utilFn.test.js`.
**Model:** `sonnet` · **Nightly:** yes

### [x] T-86 · A visible keyboard focus ring (F5)
**Why:** first follow-up out of the T-67 audit
(`docs/audits/t-67/findings.md`, F5). Tabbing through the app showed
nothing: the focused element computed to `outline: solid 2px rgba(0, 0, 0, 0)`
- a real outline, fully transparent - with no ring shadow behind it, on the
university selector, the category chips, the sort control and the cards.
A keyboard user could not tell where they were on any screen.
**Cause:** `public/css/main.css` line 6. The project's own `.btn` override
ended in `focus-visible:outline-none`, which erased daisyUI's stock focus
outline on every button in the app, and `.input` did the same with
`focus-within:outline-0`. Nothing replaced either.
**Done when:** one token-based `:focus-visible` ring in the global
stylesheet, visible in both themes, with an e2e test that reads the
computed outline off a focused control rather than trusting the CSS.
**Done:** the two overrides dropped, and a single ring
(`outline: 2px solid hsl(var(--bc))` at a 2px offset) added at the top of
`main.css`, repeated for `.btn`/`.input`/`.select`/`.textarea`/`.checkbox`/
`.toggle` so it outranks daisyUI's equally-specific component focus styles.
`--bc` (base-content) is the theme's text color, so the ring follows T-73's
palette into dark mode instead of hardcoding one; the offset keeps it on the
page background rather than drawing `currentColor` white-on-orange inside a
filled button. `:focus-visible` means a mouse click still draws nothing.
Five per-component overrides went with it - the university selector button
and its info button (`UniGraphicSelector.jsx`), the PQRS type `select` (its
`focus:ring-blue-500` was also an off-palette hardcoded color), and the OTP
boxes in `ForgotPassword.jsx` and `SignUpForm.jsx` - because a
`focus:outline-none` utility on the element outranks a global rule and
would have left exactly the controls the audit named still ringless.
Two tests in `tests/e2e/keyboard-nav.spec.js` tab to a `.btn-primary` and to
a form field and assert the outline is not `none`, not a hairline, and not
`rgba(..., 0)`.
**Not in scope:** F6 (the first two tab stops are invisible drawer-toggle
checkboxes) - the ring makes them no more visible, and fixing it means
deciding what the hamburger should be, which is its own task. F7/F8
(accessible names and labels) likewise.
**Model:** `sonnet` · **Nightly:** yes

### [x] T-87 · The /about sticky header has no background (F16)
**Why:** second follow-up out of the T-67 audit
(`docs/audits/t-67/findings.md`, F16). The `/about` topbar is `sticky` and
`bg-transparent`, pulled up over the hero with `mt-[-72px]` so the gradient
shows through it - which is the right call at the top of the page and the
wrong one everywhere else. Past the hero the wordmark, the language
switcher and the "Explorar Productos" CTA print directly on top of the
section text (`about-header-overlap__desktop__dark.png`: "Conecta solo con
estudiantes de tu universidad" runs straight through the logo).
**Done when:** the bar keeps its transparency over the hero and picks up a
surface once the page has scrolled, in both themes.
**Done:** `src/components/general/StickyTopbar.jsx` - a small client
component that reads `window.scrollY` and swaps `bg-transparent` for
`bg-base-100/95 backdrop-blur-md border-b border-base-300 shadow-sm` past
24px. The layout stays a Server Component and the bar's contents stay on
the server (`LocaleSwitcher` is async and reads the locale there); they
arrive through `children`, so the only thing that ships to the client is
the scroll state. Tokens, not hardcoded colors, so it follows T-73's
palette. Three tests in `tests/e2e/about-topbar.spec.js` read the computed
background: transparent at the top, opaque after a wheel, transparent again
on the way back up, plus the same round trip forced into dark.
**A pure-CSS version was tried first and dropped:** a permanently
translucent bar needs no JS, but a 95% veil over the hero gradient leaves a
visible horizontal seam exactly where the header ends. The state is real,
so it is a client component - `'use client'` for a scroll listener is what
the convention in CLAUDE.md means by "effects", not a shortcut around it.
**Worth knowing for the next e2e that scrolls `/about`:** `page.mouse.wheel()`
is not enough. The page animates its sections in with framer-motion, so on a
cold CI runner the document is still viewport-height when the wheel lands -
the event goes nowhere, `scrollY` stays 0 and nothing flips. Two of these
three tests passed locally and failed in CI for exactly that. They now poll
`document.body.scrollHeight` until the page is scrollable, scroll with
`window.scrollTo`, and poll `scrollY` until it moved.
**Note on the markup:** the header carries `data-scrolled` so the state is
inspectable from a test without asserting on a Tailwind class string. One
attribute, and it is the component's actual state, not a test-only hook.
**Not covered:** the `/about` topbar is its own thing - the app's other
header (`src/components/layout/Layout.jsx`) is not sticky and was not
touched.
**Model:** `sonnet` · **Nightly:** yes

### [x] T-88 · Listing header copy: dangling greeting and wrong placeholder (F21, F22)
**Why:** third follow-up out of the T-67 audit. Two copy bugs in the same
four lines of header, shared by `/antojos` and `/marketplace`.
F22: signed out, the greeting read "Hola, calma tus antojos" - the comma is
there for a name that never arrives. F21: `/marketplace` asked for "Busca tu
antojo más deseado", because `SearchBox`'s placeholder was hardcoded to the
section it was first written for.
**Done when:** the signed-out greeting stands on its own, and each section's
search box asks for what that section actually sells.
**Done:** the greeting now renders only when there is a name to greet
("Hola **Ana**, calma tus antojos"), and otherwise drops to "Calma tus
antojos" / "Explora el marketplace". `SearchBox` takes the same `section`
prop `CategoryGrid` and `ProductGrid` already take, and picks its
placeholder from it. Three tests in `tests/e2e/listing-copy.spec.js`.
**Found while there, and fixed in the same branch:** the signed-in branch
keyed off `session`, not off the name, so a Clerk account with no
`firstName` rendered "Hola , calma tus antojos" - comma adrift, with a space
in front of it. It now falls into the signed-out branch. Not in the audit;
nobody had looked at a nameless account.
**This is product copy, so it is the human's call.** The wording here is the
minimum that removes the bug; if "Calma tus antojos" is not the greeting you
want on the signed-out listing, change the string, not the structure.
**Only half testable:** Playwright has no Clerk session (T-84), so the
signed-in greeting - the branch that actually interpolates the name - has no
coverage. The tests assert the signed-out copy and that no `h2` on either
page contains "Hola,".
**Model:** `sonnet` · **Nightly:** yes

### [x] T-89 · The sidebar's current item is not a link (F26)
**Why:** fourth follow-up out of the T-67 audit. `SidebarBtn` branched on
`pathname === goto` and rendered the current item as an `<a>` whose `href`
was **commented out** - a leftover pointing at `/scripts/clientes` and a
`lastActiveURL` variable, neither of which exists anywhere in this repo. An
`<a>` without `href` is not a link to the browser: no link role, not
focusable, not in the tab order. So the one item a keyboard user most needs
to locate - the page they are on - was the only one they could not reach,
and nothing but a background color said it was current.
**Done when:** every sidebar item is a real link, and the current one is
marked `aria-current="page"`.
**Done:** the two branches collapsed into one `Link`. `aria-current` carries
the state for a screen reader, `btn-nav-active` still carries it visually.
Three tests in `tests/e2e/sidebar-nav.spec.js` - they would have failed
before the change, because `getByRole('link')` does not match an `<a>`
without an `href`.
**Two things fixed by the collapse, not separately:** clicking the current
item now closes the drawer (only the inactive branch wired
`handleSidebarClose`, so tapping the page you were on did nothing at all on
mobile), and the inactive branch's `pathname === goto && 'btn-nav-active'`
was dead by construction - it could only ever render in the branch where
that comparison is false.
**Left alone deliberately:** `handleSidebarClose` now null-checks the
toggle, since only the `/antojos` and `/marketplace` layouts render a
drawer. And `btn-nav` is not defined anywhere in `main.css` - only
`btn-nav-active` is - so it is doing nothing today. Not removed: it reads
like a hook someone may still want, and this task is about the link.
**Model:** `sonnet` · **Nightly:** yes

### [x] T-90 · Dead ends: unknown product and seller ids (F1, F2)
**Why:** the T-67 audit's number one, and the only finding that can send a
buyer into a WhatsApp chat about something that does not exist.
`/antojos/<unknown id>` returned HTTP 200 and painted the whole product
chrome around nothing: no name, `$ NaN` in the price bar, a "No disponible"
badge, a broken image, and a live **"Contactar por WhatsApp"** button.
`/antojos/sellers/<unknown id>` logged `Seller not found` to the console and
spun forever - no error, no empty state, no way out but the back button.
Both pages are Server Components that already resolve the id for
`generateMetadata` (T-69); they just never looked at the answer.
**Done when:** an id that does not resolve renders a 404 instead of a fake
product, and the 404 offers a way back.
**Done:** `notFound()` on the three detail pages (`antojos/[id]`,
`marketplace/[id]`, `antojos/sellers/[id]` - the audit only walked the
antojos route, but marketplace renders the same component from the same id)
plus `src/app/not-found.jsx`, because Next's stock 404 is itself a dead end:
correct status, no navigation, which is half of what F1 and F2 were about.
The reads are the T-69 ones wrapped in React `cache()`, so resolving the id
twice per request - once for metadata, once for the guard - is still one
query. Nine tests in `tests/e2e/dead-end-404.spec.js`, over both shapes of
bad id: a well-formed ObjectId that matches nothing (reaches Mongo) and a
malformed one (rejected by the id check first).
**What this did NOT fix, measured and filed as T-91:** the page renders as a
404 and still answers **200**. A soft 404. Not this route's doing - see T-91
for the measurement.
**Still true for a seller whose fetch fails for another reason:** F2's
spinner is only fixed for the unknown-id case. `SellerPage` still has no
error state, so a network failure mid-load spins the same way. Out of scope
here; it needs an error state, not a route guard.
**Model:** `opus` · **Nightly:** yes

### [ ] T-91 · `notFound()` answers 200 - the whole app soft-404s
**Why:** found while doing T-90, and it is not what T-90 was about. Every
`notFound()` in this app renders the 404 page with an HTTP **200**. A
crawler is told the page is fine; Google indexes soft 404s as real pages,
which works directly against T-74's sitemap and T-78's robots.txt.
**Measured (2026-09-08), so nobody has to guess:**
- `/nope/nope`, a path matching no route at all → **404**. The router
  decides before rendering, so the status is still free.
- A throwaway route whose entire body is `notFound()`, no data access, no
  `await` → **200**.
- The same with an `await` before it → **200**.
- T-90's detail pages, with the check in `generateMetadata` (which runs
  during the render in Next 14, not before it) → **200**.
So it is not about awaiting, not about Mongo, and not about where in the
page the call happens. It is app-wide.
**The suspect:** `src/app/layout.jsx` is an async root layout that awaits
`getLocale()`, `getMessages()` and `getSellerContextData()` (Clerk + Mongo)
before rendering any child. The response is committed by the time a page
calls `notFound()`, and a status line that has been sent cannot be changed.
**Done when:** `notFound()` answers 404. The test that proves it already
exists and is marked `test.fail()` in `tests/e2e/dead-end-404.spec.js` -
when this lands, that test starts passing and Playwright fails the run to
say the annotation should come off.
**Careful:** the obvious fix - move `getSellerContextData()` out of the root
layout, behind Suspense - touches how `SellerProvider` is seeded, which is
T-12d's work. Read that entry first. Do not "fix" this by removing the
awaits without understanding what reads them.
**Model:** `opus` - it is a rendering/streaming question with an auth
context in the middle · **Nightly:** no

### [x] T-92 · A shared search URL comes back unfiltered (F3)
**Why:** the T-67 audit's number two. `/antojos?product=arepa` returned the
complete listing, with an empty search box, and the param gone from the
address bar. `SearchBox` rebuilds the query string from its own state in an
effect, and on mount that state is an empty string, so it pushed a URL with
no `product` - wiping the param `ProductGrid` reads one line later. The
search box wrote a URL the app could not read back: shared links and
reloads both broke, and the app has a share button.
**Done when:** a URL carrying `product` arrives with the box filled, the
listing filtered, and the param still in the address bar after the debounce
has had time to fire.
**Done:** `search` is seeded from `searchParams.get('product')` instead of
`''`, and the effect skips its first run behind a `hasMounted` ref - the
two halves the audit prescribed. Four tests in
`tests/e2e/search-url.spec.js`: a shared URL, a reload, the round trip of
typing and clearing (the behaviour the mount push was there to provide, so
it had to keep working), and a search that matches nothing.
**Left as it was, deliberately:** the effect still rebuilds the query string
from the three params it knows about, so any param it does not know is
still dropped on the next keystroke. That is why `sort` is local state in
`ProductGrid` rather than a URL param - there is a comment there saying so.
Making the push preserve unknown params would let `sort` move into the URL,
which is a shareable-sort feature and its own decision, not this fix.
**Model:** `sonnet` · **Nightly:** yes

### [x] T-93 · Accessible names and real labels (F7, F8)
**Why:** the T-67 audit's number three, minus the focus ring (T-86) and the
drawer tab stops (F6, still open). F7: the header account link, the modal
back and close buttons, the favourite heart and the auth back arrow are
icon-only, and a screen reader announced all of them as "button". F8: the
login, register and PQRS fields showed label text that was a `<p>`, not a
`<label for>`, so the association did not exist and the fields leaned on
`placeholder` - which disappears the moment you type.
**Done when:** every visible form control on the public forms has a real
label, and every icon-only control has a name.
**Done:** F8 turned out to be one component.
`src/components/auth/register/InputFields.jsx` rendered its `title` as a
`<p>`, and **nine** forms are built on it - login, register, PQRS, seller
registration, product add, product edit, the seller profile edit, and the
password recovery flow. One `useId()` and a `<label htmlFor>` fixed all of
them at once. The two PQRS controls that do not go through it (the
`Anónimo` checkbox and the `Tipo de Solicitud` select) got `htmlFor`/`id`
directly. F7 is six `aria-label`s across `Navbar`, `ProductModal` (x3),
`ProductPage`, both auth forms and `ForgotPassword`.
**Found by the test, not in the audit:** the search box on `/antojos` and
`/marketplace` had a placeholder and nothing else - the same defect F8
describes, on the busiest screen in the app. The sweep test caught it the
first time it ran. It now carries an `aria-label` built from the same string
as the placeholder, so the two cannot drift.
**The test is a sweep, not a list:** `tests/e2e/accessible-names.spec.js`
walks every visible `input`/`select`/`textarea` on the four public screens
and fails on any that has no `aria-label`, no `aria-labelledby`, no
`label[for]` pointing at it and no wrapping `<label>`. `placeholder` and
`title` deliberately do not count. A new unlabelled field fails the suite
without anyone remembering to add an assertion.
**Named but not wired:** the heart button in `ProductModal`'s error branch
has an `aria-label` now and still has no `onClick` - it never had one.
Favourites are T-68, blocked on a product decision. Naming it does not make
it more reachable (it always was); it just stops it announcing as "button".
**Still open from this group:** F6, the two invisible drawer-toggle
checkboxes that are every keyboard visit's first two tab stops. Fixing it
means deciding what the hamburger should be - it is a CSS-checkbox drawer
today - so it is its own task.
**Model:** `sonnet` · **Nightly:** yes

### [ ] T-82 · Deleting a product leaves its images behind
**Why:** rescued from GitHub issue #133 (2025-03-05, "que se borren las
imagenes y todo asociado a ese producto"), and confirmed still true on
2026-09-07: `DELETE /api/products/[id]` is a bare
`Product.findByIdAndDelete`. The document goes, the uploaded images stay in
ImageKit forever. Every product ever deleted has left its files there, and
nothing ever cleans them up — it is a bill that only grows, and the images
of a deleted product stay publicly reachable by URL.
**Done when:** deleting a product also deletes its images, and a failure to
delete a remote file does not leave the product undeleted (or the other way
round) without saying so. `src/app/api/fileId/route.js` already resolves an
ImageKit fileId from a URL and `ImageGrid.jsx` already deletes one, so the
pieces exist — this is about calling them from the delete path and deciding
what happens when the remote call fails.
**Worth measuring first:** how many orphaned files are already up there, and
what they cost. That number decides whether this also needs a one-off
cleanup script in `scripts/`, which would be its own task.
**Careful:** the same URL can, in principle, be referenced by more than one
product (a copy-pasted image). Check before deleting by URL, or a delete
takes down another product's picture.
**Model:** `opus` — a delete path that touches an external service and can
half-fail · **Nightly:** no

### [x] T-83 · Extraordinary availability, overriding the schedule
**Why:** rescued from GitHub issue #120 (2025-02-25). A seller who opens
outside their usual hours has no way to say so: `Seller.availability` is
recomputed from `Schedule` by the T-14 cron on every run, so anything set by
hand is overwritten within the hour.
**Note it is the mirror image of T-71, not the same thing.** T-71 added
`paused`, a manual flag that hides the store *despite* the schedule. This
asks for the opposite: appearing open *despite* the schedule saying closed.
Whoever takes it should read T-71's entry first — the field separation, and
the `$ne: true` trap for documents that predate the new field, apply here
too.
**Done when:** a seller can mark themselves open right now for a bounded
window, the cron respects that window instead of overwriting it, and the
public listing reflects it. The bound matters: an override with no expiry
becomes a seller permanently marked available who is not.
**Model:** `sonnet` · **Nightly:** yes
**Done:** `Seller.availabilityOverrideUntil`, a nullable `Date` next to
`availability` and `paused`, with a comment on the schema explaining which is
which. A single timestamp rather than a boolean + expiry pair on purpose:
there is no way to represent "override on, no expiry" — the exact bug this
entry warns about — because the override *is* the expiry, and it self-expires
by comparison against `now` instead of needing something to clear it.
`updateSellerSchema` bounds it to at most `MAX_AVAILABILITY_OVERRIDE_HOURS`
(6, an agent's choice — the entry only said "bounded" — since the task has no
`Nightly: no` flag for a human wording/number decision the way T-73/T-122 did)
hours ahead of "now"; `null` clears it early. Deliberately **not** required to
be in the future: `EditSellerForm`'s full-form submit resends the seller's
current `availabilityOverrideUntil` along with every other field, so
rejecting a since-expired timestamp would have turned an unrelated profile
edit into a 400 once the window passed. `isOverrideActive()`
(`src/lib/store-availability.ts`) already treats a past timestamp as "no
override", so allowing it through validation is harmless.
- **Composition, not a parallel code path**, per the note already in this
  file next to T-123: `isOpenAt(schedules, clock, overrideActive)` takes a
  precomputed boolean and short-circuits the schedule check when it's true.
  `isOverrideActive(overrideUntil, now)` turns the stored timestamp into that
  boolean — the only place `now` is compared against it, so cron, the product
  routes and the availability filter can't disagree on what "active" means.
  - **The T-14 cron** (`GET /api/sellers/availability`) reads
    `seller.availabilityOverrideUntil` off the hydrated document (not
    `.lean()`, so the schema default already covers a seller who never used
    it) and folds it into the same `isOpenAt()` call that recomputes
    `availability` — it does not skip overridden sellers, it just computes the
    right answer for them, so the write path stays a single line.
  - **`productAvailability()`** takes the seller's `availabilityOverrideUntil`
    as a fourth argument. Both product routes pass it from the already
    -populated `sellerId` (no new query): `GET /api/products` and
    `GET /api/products/[id]`.
  - **`getAvailableSellerIds()`** (T-123's filter, `src/server/products/
    availableSellers.ts`) adds a third query — sellers with
    `availabilityOverrideUntil: { $gt: now }` — to the two it already ran, so
    "Disponibles ahora" also includes an overridden seller. `$gt` already
    excludes a seller without the field (a nonexistent field never satisfies
    `$gt`), so this needed no `$ne`-style rewrite the way `paused` did.
- **The toggle** lives on `/antojos/sellers/profile/edit`
  (`EditSellerForm.jsx`), next to the T-71 pause switch: three preset
  durations (1h/2h/4h, all under the cap) when there's no active override, a
  "hasta las HH:MM" readout and a cancel button when there is one. Written
  through the same `PUT /api/sellers/[id]` / `verifySellerId` as `paused` —
  no new route.
**Measured against the real database (read-only, no writes) — this session
had no `.env`/Mongo credentials in the worktree, so this is the T-71 finding
carried forward rather than a fresh read:** `availabilityOverrideUntil` did
not exist in the schema before this PR, so by construction **all 54 real
sellers** predate it, the same situation `paused` was in at T-71 (0 of 54).
Unlike `paused`, nothing here needed an equality-filter workaround: the one
Mongo-side filter (`getAvailableSellerIds`) uses `$gt: now`, which already
excludes a missing field without an `$ne` rewrite, and every other read is
either a hydrated document (schema default applies) or a plain `Boolean`
-style check in `isOverrideActive()`. No migration script is needed — this is
purely additive and self-defaulting, same conclusion as T-71.
**Tests:** `tests/unit/store-availability.test.js` (isOpenAt/productAvailability
with `overrideActive`/`overrideUntil`, `isOverrideActive` on its own),
`tests/unit/seller-validators.test.js` (the bound, and that a past timestamp
is accepted on purpose), `tests/integration/availability-cron.test.js` (the
cron composes instead of overwriting, an expired override doesn't stick, a
field-less document is unaffected), `tests/integration/
seller-availability-override.test.js` (ownership, the cap, clearing early,
old documents), `tests/integration/product-availability-status.test.js` and
`tests/integration/availability-filter.test.js` (both product routes and the
T-123 filter agree an override counts as open).
**Left out on purpose, noted per rule 9:** `ToggleSwitch.jsx` has ~15 lines of
commented-out JSX (an earlier, hand-rolled toggle implementation) above the
`<input>` it was replaced by — dead code, not touched here since it's
unrelated to this task; worth deleting in a future pass once someone confirms
nothing still points at it in history. `EditSellerForm`'s `setDataSeller`
calls (the ones that reach into `SellerContext`) still close over the stale
`seller` variable and spread `{ ...seller, field }` instead of a functional
update, on every optimistic toggle including this one's — pre-existing
pattern from T-71's `handleSellerPaused`, followed here for consistency
rather than fixed, since changing it would touch code this PR doesn't
otherwise need to.
**Outside the repo:** nothing.

### [x] T-63 · Separate the environments (database and Clerk)
**Done 2026-09-14 (the Mongo half), with the human in the session.**
Re-measured first, then split:

| | Production | Preview + Development (and the local `.env`) |
|---|---|---|
| Atlas project | `Mercampus-db` (org "Mercampus") | `Mercampus-dev` (same org, created for this) |
| Cluster | `cluster0.fibip` - M0, AWS us-east-1 | `cluster0.xuedyfi` - M0, AWS us-east-1 |
| Database | `mercampus_products` | `mercampus_dev` |
| DB user | one user with `readWriteAnyDatabase` | `mercampus-dev-app`, `readWrite@mercampus_dev` only |
| Vercel `MONGO_URI` | row `nJ7Ex9q9…`, Production only | new row `SR5yNOPk…`, Preview + Development |
| Clerk | `sacred-shrew-44`, development instance | the same instance |

- **Vercel:** the single `MONGO_URI` row (all three environments, 655 days
  old) had its targets narrowed to Production **without touching its
  value**, and a second row was added for Preview + Development. Production
  did not need a redeploy.
- **Verified:** a production backup was taken first; the dev user connects,
  writes, and is denied on any other database; `mercampus_dev` was seeded (3
  users, 2 sellers, 6 products, 6 schedules); production's counts were the
  same afterwards (84 users, 55 sellers, 114 products, 143 schedules) and
  `/antojos` answered 200.
- **Why a second project and not a second database:** Atlas allows one free
  M0 per *project*, not per account, and a project has its own DB users and
  IP list, so a dev credential cannot open production. A `mercampus_dev`
  database inside the production cluster would share its connection and
  throughput limits, and the existing user can write to every database there.
- **Clerk, re-measured:** the Production keys changed on 2026-09-05 but still
  belong to the same development instance as Preview (`ins_2mH0…`,
  publishable host `sacred-shrew-44`), so the drift the note further down
  worried about did not change instance. Loose end: Production's
  `CLERK_SECRET_KEY` is stored as Sensitive and cannot be read back, so it is
  confirmed only indirectly - T-104's admin check needs it and works.
- **The webhook, corrected:** the sketch below says a real account signing in
  against the dev database gets its `User` from the webhook "unprompted". It
  does not: `WEBHOOK_SECRET` exists only in Production, and Clerk sends each
  event to one endpoint. With no `User`, `src/utils/lib/auth.ts` treats the
  session as nobody. `npm run seed:team -- --email <email> [--apply]` creates
  those documents from Clerk, only for the accounts named - the development
  instance also holds real students' accounts.
- **`npm run seed` now loads `.env`**, like `backup:db`. Before, it failed with
  "falta MONGO_URI" unless the variable was exported by hand.

**Outside the repo - already done, listed for whoever promotes:** the Atlas
project, cluster, IP rule (`0.0.0.0/0`, which Vercel needs) and DB user; the
two Vercel `MONGO_URI` rows; the human's local `.env` points at
`mercampus_dev`, with production's URI kept in the ignored `.env.prod-db`.
Nothing further is needed for this PR to work.

**What changes for anyone working here:**
- `npm run backup:db` now backs up **dev**. For production:
  `node --env-file=.env --env-file=.env.prod-db --import ./scripts/register-alias.mjs ./scripts/backup-db.mjs`
  (with repeated `--env-file`, the last file wins).
- Preview deployments built **before** 2026-09-14 15:55 UTC still carry
  production's URI: Vercel fixes variables at build time. Only new
  deployments use dev.

**Not closed by this - read before assuming a preview is safe:**
- **T-112.** Whatever a preview routes through `src/services/api.js` /
  `apiToken.js` (editing a product or a seller, schedules) is still answered
  by production's API, and so written to the production database.
- ~~T-63b~~ - done the same day: production has its own
  `readWrite@mercampus_products` user and the old one is deleted.
- **Observed afterwards:** the first preview built after the change
  (`agent/t-63`, 16:12 UTC) served a sitemap of 9 URLs carrying the dev seed's
  ids and none of production's - it reads `mercampus_dev`. That is a read; a
  preview *write* through `api.js` still goes to production until T-112.

**The entry as it stood before 2026-09-14** (kept for its history; the
webhook bullet in the sketch is wrong, see above):

> **The biggest structural risk in the project right now.** An agent can't
> do this: these are infrastructure decisions and they cost money.

**Measured with the Vercel CLI and against the real services (T-12g):**

| | Production | Preview | Development |
|---|---|---|---|
| `MONGO_URI` | `cluster0.fibip…/mercampus_products` | **the same cluster, the same database, the same user** | the same |
| Clerk | `sacred-shrew-44.clerk.accounts.dev` | **the same instance** (identical `CLERK_SECRET_KEY`) | the same |

Vercel has two separate entries for `CLERK_SECRET_KEY` and
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (one for Preview, one for
Production), but **they hold the same value**, so the separation is only
apparent.

**What this means, concretely:**
1. **Any preview deployment writes to the production database.** Including
   `agent/develop`'s preview. There's no data safety net between what the
   agent tests and what users see.
2. **The site runs on Clerk's _development_ instance, and stays that way on
   purpose (T-64).** The production one exists and its users are intact,
   but it depends on a domain (`mercampus.com`) the team decided not to
   renew. It isn't a pending task, it's the decision that was made.
3. `npm run seed` with the current `.env` would wipe the production
   database. The `--yes` guard outside localhost is the only thing
   preventing that: don't remove it.

**Done when:** there's a separate Mongo cluster for preview/development;
the working `.env` points at it; and `.env.example` documents which is
which.
**No longer applies:** the Clerk half of this task (a separate production
instance) — see T-64. Point 1 (Mongo) is still the real, pending risk.

**This table needs re-measuring.** Found live on 2026-09-10, chasing an
unrelated seller-approval bug with the human: Vercel's `CLERK_SECRET_KEY`
and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` for **Production** were updated
**4 days ago** — no longer the same value as Preview's (530 days old), which
is what this table's "identical" claim above was measured against. Querying
both confirms two genuinely different Clerk instances now, one of them
holding real historical users (the pre-T-64 production instance). Whether
that was deliberate or accidental wasn't determined - worth the human
confirming before anything here is acted on, since T-64's decision was to
run everywhere on *development* on purpose, and this drift may be quietly
undoing that.

**A design sketch for the Mongo half** (Clerk staying exactly as T-64 left
it - one instance, same keys, everywhere), worked through with the human
2026-09-10, so executing this doesn't have to start from zero:

- **Two clusters, not three:** `mercampus_production` (unchanged, real
  data) and one shared `mercampus_dev` for **both** Preview and
  Development - they carry the same risk profile (no real users), so
  splitting them further can wait for a concrete reason to.
- **`MONGO_URI` becomes environment-scoped** in Vercel (Production keeps
  today's value; Preview + Development get the new cluster) and the
  working `.env` moves to point at it too - which is what turns the
  `npm run seed` `--yes` guard from "the only thing standing between a
  routine `npm run dev` and wiping 54 real sellers" into an ordinary safety
  net, not the sole one.
- **No app code changes** - `connectDB()`, the models, the webhook, all
  untouched. This is entirely env vars plus a new cluster.
- **The one real wrinkle, designed for:** since Clerk stays *shared*, the
  same `clerkId` will need its own separate Mongo `User` document in
  `mercampus_dev` the first time each real account signs in there - the
  webhook already does exactly this, unprompted (it's what created the
  stray `role: buyer` document this same day's incident was about - see the
  T-104 finding below). Two different seeding needs follow from that, not
  one:
  - Bulk, realistic fake data for general browsing/testing - already
    solved: `scripts/seed.mjs` already does this for the e2e harness; the
    same script would seed `mercampus_dev` for real once it exists.
  - The handful of real team `clerkId`s that need admin/seller status in
    `mercampus_dev` for manual testing - a short, explicit, idempotent
    script in `scripts/`, keyed by clerkId (stable now, since Clerk is the
    same instance everywhere - a real simplification over today).
- **Sequencing with T-104, the human's own call:** do T-104 first if at
  all possible. If admin-ness is fully on Clerk's `publicMetadata` (T-104's
  whole point) before this cluster split happens, admin needs zero seeding
  in the new `mercampus_dev` at all - it already applies everywhere, same
  as everyone's session does, because Clerk doesn't change between
  environments. Splitting Mongo before finishing T-104 means the same
  Mongo-role reseeding this incident needed has to be repeated by hand in
  the new cluster too - workable, but carrying the exact gap forward
  instead of closing it first.
**Model:** `opusplan` · **Nightly:** no (infrastructure and cost)

### [x] T-63b · Rotate production's database credential
**Done 2026-09-14, the human authorizing each step.** In this order:
1. Production backup (`backups/2026-09-14T16-28-59-300Z`).
2. Created `mercampus-prod-app` with `readWrite@mercampus_products` only.
   Checked before using it: it reads production (84 users, 55 sellers, 114
   products, 143 schedules), is denied on the `dev` database, and
   `listDatabases` shows it only `mercampus_products`.
3. Vercel's Production `MONGO_URI` (row `nJ7Ex9q9…`, still Production only)
   set to the new URI, 16:35 UTC.
4. Redeployed production from `dpl_7Ensy…` (commit `cb835a5`, no code
   change): new deployment `dpl_DfLRT1pw…`, aliased to `mercampus.vercel.app`.
5. Verified on it: `/antojos`, `/antojos/sellers/list`, `/marketplace` and
   `/sitemap.xml` answered 200, the sitemap listed 135 URLs (dev's lists 9),
   and its logs had no errors, 5xx or Mongo/auth messages.
6. Deleted the old `readWriteAnyDatabase` user. Atlas now rejects the old
   URI; the four pages and the logs were checked again; the human's
   `.env.prod-db` was rewritten with the new URI (connects, 84 users).

**Checked alongside:** no GitHub repo secret or workflow references a Mongo
URI (CI uses `mongodb-memory-server`). Environment-level secrets (Preview,
Production, copilot) could not be listed from the session, but no workflow
reads `MONGO_URI`, so nothing there could consume one.
**Consequence, expected:** every deployment built before this - older
production deployments and previews from before T-63 - can no longer reach a
database. **An instant rollback in Vercel to one of them comes up without
Mongo; redeploy instead.**
**Outside the repo (all done):** the Atlas user created and the old one
deleted; Vercel's Production `MONGO_URI` value; production redeployed;
`.env.prod-db`.

**Why:** found doing T-63 on 2026-09-14. Production's cluster has exactly one
DB user, with `readWriteAnyDatabase`, and until that day it sat in all three
Vercel environments and in every local `.env`. T-63 moved Preview,
Development and the local `.env` to their own cluster, but the old credential
still works from wherever a copy lives - an old `.env`, a pulled env file, a
preview built before the change. The split is only as real as that
credential is retired.
**Done when:** production connects with a new user limited to
`readWrite@mercampus_products`; Vercel's Production `MONGO_URI` (row
`nJ7Ex9q9…`) holds it; production was redeployed and a page that reads Mongo
answers 200 with data; only then is the old user deleted. The human's
`.env.prod-db` is updated to the new URI.
**Careful:** the order is the task - create, switch, redeploy, verify, *then*
delete. Deleting first takes production down. Previews built before T-63
still hold the old credential and stop reaching any database once it is
deleted - expected, and harmless.
**Why it matters more than it looks:** both Atlas projects allow `0.0.0.0/0`
(Vercel on M0 has no static egress IPs), so the password is the only barrier.
**Outside the repo:** entirely - Atlas and Vercel. No code changes.
**Model:** `opus` · **Nightly:** no (production credentials, needs the human)

### [x] T-12h · Instance guard in the backfill
> **Fixes a mistake of mine that would have damaged real data.** In T-12f
> I called the backfill done, saying "11 of 11 resolve on their own."
> Those 11 belong to a **development** instance. Production has ~70
> accounts.

**Why:** a `clerkId` only means something within its own instance.
Running the backfill with `.env`'s keys would have written development-
instance ids over real users: ids no session will ever present, and since
`clerkId` is a `unique` field, that leaves the slot occupied by garbage
that has to be cleaned up before it can link correctly.
**What confirms the keys are the wrong ones** (`GET /v1/instance` with
`.env`'s secret, which is **the same one** Vercel has in Production):

```
environment_type: "development"
id: ins_2mH0ZTsikZ8SSYtT1h3WhwJB5Cd
users count: 11
```

And `GET /v1/domains` on that instance lists **two** domains: its own
(`sacred-shrew-44.clerk.accounts.dev`) and `mercampus.vercel.app`, the
latter pointing at a different frontend
(`pleased-gobbler-74.clerk.accounts.dev`, created 2026-01-28). In other
words, **more than one instance is in play**, and the deployed site loads
the development one: the only key that appears in
`mercampus.vercel.app/auth/login`'s HTML is `sacred-shrew-44`'s `pk_test_`.
**Done:** `checkInstance()` runs before anything else and (a) rejects any
instance that isn't `production` unless `--allow-development`, and (b) if
the database already has links, checks against Clerk that they belong to
**this** instance, to avoid mixing two. The dry run and `--check` warn
instead of refusing to proceed — diagnosing is exactly what they're for
— but `--apply` refuses to touch the database, and `--check` exits with
code 1.
**Confirmed for real:** the dry run against production prints the
warning, `--check` returns 1, and users are still at **0** `clerkId`.
Five new tests.
**Along the way:** `npm run migrate:clerk-id` wasn't loading `.env` (a
bundling mistake from T-12e). `npm run seed` deliberately does **not**
get `--env-file` added: not loading the production URI on its own is a
protection, not an oversight.
**Correction (T-64): yes, there is a Clerk CLI — `npm install -g clerk`.**
What doesn't exist is the `@clerk/cli` package; the real one is just
called `clerk`. Installing it with `winget` reported success but wrote
nothing (the account isn't an administrator and the MSI needs
elevation); the portable ZIP download worked. `clerk users list
--instance prod`, `clerk env pull`, `clerk config pull` replace a good
chunk of this PR's hand-rolled `fetch` calls — whoever picks up T-64/T-63
next should use the CLI instead of repeating that.
**Model:** `opus` · **Nightly:** no

### [x] T-64 · Point the app at the correct Clerk instance — ATTEMPTED AND REVERTED
**Correction (T-12h): the question wasn't "where are the missing
accounts." The accounts were there.** They were in Clerk's **production**
instance (70, confirmed one by one with `clerk users list --instance
prod`, matching 100% of Mongo's 76 unique emails). The deployed site was
authenticating against the **development** one (11 accounts).
**The full switch was attempted** (backfill `--apply` against production,
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`/`CLERK_SECRET_KEY` in Production
switched to `pk_live_`/`sk_live_`, a new webhook on the production
instance, redeploy) and **it took the production site down**:
`clerk.mercampus.com` (that instance's Frontend API) doesn't resolve,
because it's tied to the `mercampus.com` domain, which **expired in
January 2026** and the team decided not to renew (no return that justifies
the cost). Without that domain, no Clerk production instance can load in
the browser — **it isn't a configuration problem, it's that the
production instance has nowhere to live.**
**Reverted immediately:** Production's keys restored to the development
ones, redeployed, site verified at 200 with
`sacred-shrew-44.clerk.accounts.dev` loading fine.
**Investigated and ruled out:** using Clerk's own `*.clerk.accounts.dev`
as the production domain. Confirmed against Clerk's official
documentation — *"Production instances require that you associate a
production domain... You will need to have a domain you own"* — that's
exclusive to `development` instances, Clerk blocks it technically, it's
not negotiable.
**The team's decision, with the data behind it:** most likely there won't
be an owned domain for 1-3 years. Real user activity (the last sign-ups
and last login from an actual student/seller, not the team) stopped cold
on **2025-09-30**; the only access after that was the team's own
(2025-10-23, 2026-01-26). Given that, **the decision is to keep running
on the development instance indefinitely** instead of chasing a domain.
T-64b follows up on the data question this leaves open.
**Model:** `opus` · **Nightly:** no

### [x] T-64b · Account recovery for users on the old instance
**Why:** of the 79 `User` documents in Mongo, **63 exist only in Clerk's
production** instance (7 more are in both — the team testing). Since
Clerk doesn't share users across instances, those 63 people can't sign in
with their usual account: if they sign up again in development, Clerk
gives them a new `clerkId` that doesn't match the one already on their
Mongo `User` (which points at the production instance), so the webhook
creates them a **new, empty** `User` — they come in as a buyer with no
store and no products, which still exist but are now orphaned.
**Why this doesn't get solved inside the webhook:** matching by email at
write time is exactly the fragility T-12c removed (email is mutable and,
with `unique` still commented out in T-11, not even unique). With a
handful of people over 1-3 years, it doesn't need automating — and
automating it would be the kind of "hot data migration" CLAUDE.md's rule
4 asks to avoid.
**Handled properly, this is reversible both ways:** Clerk's Backend API
**doesn't depend on the domain** — it worked fine throughout the whole
T-64 incident. Users who never claim their account keep their production
`clerkId` as is (already set in T-12h/T-12f), ready in case a domain ever
comes back. Only the ones who do claim need re-mapping.
**Done when:** a script (`scripts/reclaim-account.mjs`, alongside
`backfill-clerk-id.mjs`) that, given the new `clerkId` of someone who just
signed up and their email, looks for their old `User`/`Seller` among the
snapshot of the 70 production accounts, and on an exact email match,
updates the old `User`'s `clerkId` to the new one (keeping `sellerId`,
`role`, and everything else) instead of leaving the empty new `User` the
webhook created. Dry run by default, explicit `--apply`, same as the rest
of `scripts/`. Tests with in-memory Mongo: happy path, no-match case
(touches nothing), and a case where the new `clerkId` is already used by
another document.
**Deliberately out of scope:** a self-service "recover your account"
screen isn't worth it for the expected volume. Reconsider if this becomes
frequent.
**Done:** `scripts/reclaim-account.mjs` (`npm run reclaim:account --
--email <email> --clerk-id <id> [--apply]`). Given the email and the new
`clerkId`, it searches among the `User`s with that email
(case-insensitive comparison, since the schema doesn't normalize it) for
the one with a different `clerkId` — that's the old one, with
`sellerId`/`role`/everything else — and sets it to the new `clerkId`,
deleting the empty `User` the webhook left behind along the way. States:
`reclaimed`, `no-match` (nothing to do), `already-reclaimed`
(idempotent), `conflict` (the new `clerkId` already belongs to a
different email — touches nothing). Six tests with in-memory Mongo.
**Depends on:** T-64
**Model:** `opus` · **Nightly:** no
**Update (T-12):** confirmed concretely for at least 3 of the 63 — the
site's 3 Mongo admins, project owner included — none had reclaimed as of
2026-09-06. Their `User.clerkId` still 404s against the live instance's
Backend API, so T-12's Clerk-`publicMetadata` admin migration can't apply
for them until they sign in once (fresh `User` via the webhook) and
someone runs `reclaim:account` for each. Not new work, just a real number
attached to "some people haven't reclaimed yet."

### [x] T-64c · Google login — was already wired up and already works
**Finding, not work:** `ProvidersButton.jsx` already exists, is already
imported in `SignInForm.jsx`/`SignUpForm.jsx`, and already uses
`signIn.authenticateWithRedirect` with `oauth_google` and
`oauth_microsoft`. On the development instance, Google is
`enabled: true` with its own credentials already configured (not Clerk's
shared ones) — someone on the team set this up a while back. Verified
live on `mercampus.vercel.app/auth/login` right now.
**Why it was never seen working:** until this change, the site was
running on the correct keys anyway (the development ones, unintentionally),
so this already worked; nobody just tested it after the production domain
broke and the doubt set in.
**No task to do here.** Left documented so nobody wonders again whether
Google login "is a production thing" — it isn't: in Clerk, `development`
comes with its own or Clerk's shared credentials with nothing to
configure, and `production` is what requires your own credentials
verified by Google.

### [x] T-62 · Agent debt: cleanup of merged `agent/*` branches
**Why:** the nightly pipeline generates its own debt too: abandoned PRs,
old `agent/*` branches, badly split tasks.
**Done when:** automatic cleanup of merged branches, closing inactive
PRs, and a monthly review of the roadmap itself.
**Done (partial, on purpose):** only the branch cleanup. Measured against
the real repo: the only two open PRs (#193, #167) aren't from the agent
pipeline — they're from external contributors, and closing them
automatically would be a product decision, not housekeeping. And there
are ~40 old branches unrelated to `agent/*` (`game`, `refactor`, `roles`,
...) whose history isn't known — touching them would violate rule 5 (don't
delete what you don't understand).
Only what's unambiguously the pipeline's own garbage got implemented:
`scripts/cleanup-agent-branches.mjs` deletes an `agent/<id>` branch when a
PR for it has already merged into `agent/develop` — it never touches
`main`, `develop`, `agent/develop`, or any branch outside the `agent/*`
namespace. Runs weekly via
`.github/workflows/agent-branch-cleanup.yml` (`workflow_dispatch` with
`dry_run` to test it by hand). Only actually activates once promoted to
the default branch (GitHub Actions' `schedule` doesn't fire anywhere
else), so it stays behind the same human gate as the rest of the
pipeline.
The rest of the task is split into T-62b and T-62c.
**Model:** `sonnet` · **Nightly:** yes

### [ ] T-62b · Closing inactive PRs
**Why:** the part of T-62 deliberately left out: deciding what counts as
"inactive" and whether it applies to external contributors' PRs (there
are two open today: #193 and #167, neither from the agent pipeline) is a
product/community decision, not a script's housekeeping.
**Done when:** someone decides the threshold and the scope (only
`agent/*` PRs? external ones too, with a warning before closing?) and it
gets implemented on top of that decision.
**Model:** `opusplan` (needs judgment) · **Nightly:** no

### [x] T-62c · Monthly roadmap review reminder
**Why:** the other part of T-62 that was split off: an automatic reminder
for a human to revisit `ROADMAP.md` once a month (stale tasks, duplicates,
or tasks that no longer apply).
**Done when:** a monthly scheduled workflow opens a reminder issue; it
doesn't close or edit anything on its own.
**Done:** `.github/workflows/roadmap-review-reminder.yml` — `schedule`
(1st of each month) plus `workflow_dispatch` for manual testing, opens one
issue via `actions/github-script` listing what to check (stale/duplicate
tasks, tasks needing a Nightly re-flag, notes worth trimming). Only ever
opens an issue, matching CLAUDE.md's rule against unattended writes: no
label creation, no auto-closing, no editing `ROADMAP.md` itself.
Not triggered live as part of this PR's verification — doing so would
create a real, visible issue on the repo, which needs sign-off rather than
being a unilateral call. Verified via YAML syntax parsing and code review;
a human can trigger it once via `workflow_dispatch` after merging to
confirm the live run, or ask the agent to do it with explicit permission.
Like the other scheduled workflows in this repo, `schedule` only fires off
the default branch, so it has no effect until promoted past
`agent/develop`.
**Model:** `sonnet` · **Nightly:** yes

### [x] T-65 · `/api/schedules` logs a normal 401 as `[error]`
**Why:** noticed during smoke verification after promoting
T-11/T-64b/T-13 to `main` (2026-09-06). A `POST /api/schedules` with no
session responds correctly — 401,
`{ message: 'No autenticado.' }` — but the catch routes it through
`errorResponse(error, '[POST /api/schedules]', ...)`, which calls
`logger.error` for any error, including this expected branch. In Vercel's
logs, a normal attempt from someone with no session is indistinguishable
from a real failure, and it drowns out the signal for errors that
actually matter.
**Done when:** expected authentication/authorization errors (401/403) log
at a level other than `error` (`warn` or `info`), and `logger.error` is
reserved for what's genuinely unexpected. Check whether other routes with
the same `errorResponse` pattern have the same problem before deciding
whether the fix goes in `api-response.ts` (one place) or route by route.
**Done:** `errorResponse` (the only site using this pattern — grep
confirmed `/api/schedules` is the only caller) now logs at `logger.warn`
when `status < 500` and reserves `logger.error` for 500+. Other routes
(`sellers/[id]`, `products/[id]`) call `logger.error` directly with their
own inline handling, not via `errorResponse`; out of scope for this task,
noted for whoever touches those routes next.
**Model:** `sonnet` · **Nightly:** yes

### [x] T-66 · Translate ROADMAP.md to English
**Why:** human decision on 2026-09-05: the code, its comments, and this
file itself should be in English — Spanish stays for conversation with
the agent, not for what gets written into the repo. CLAUDE.md's rule was
already updated as part of this same task (T-66); what was left was
translating the +60 already-written tasks, with their detailed technical
history (production warnings, architecture decisions, "watch out for..."
notes).
**Why it wasn't done all at once:** 1180+ lines of dense technical notes
accumulated since T-01. Translating all of it in a single PR produces a
diff impossible to review line by line against the original, and a bad
translation here is genuinely dangerous: this file is what documents, for
example, that the local `.env` points at production (T-12f/g/h) or that
there's more than one Clerk instance (T-12h). Losing a nuance while
translating those notes is worse than leaving them in Spanish a while
longer.
**Done when:** `ROADMAP.md` fully in English — structure, the +60
existing tasks, and the rules sections ("Model and effort", "Code
conventions," etc.) — preserving each note's exact technical meaning, not
a word-for-word literal translation. A human must especially review the
security/production notes (T-12f, T-12g, T-12h, T-64) before merging,
because a translation that softens or changes the tone of those warnings
would be worse than not translating at all.
**Done (2026-09-06):** the full file translated section by section,
preserving every task id, number, date, file path, and code identifier
exactly, and keeping the tone of the safety-critical notes (the T-12b
through T-12h and T-64 family) as close to literal as natural English
allows rather than smoothing them over. Tasks already written in English
after the 2026-09-05 decision (T-61, T-62c, T-67 through T-74, and the
items added that same day) were left untouched. Per this task's own
requirement, this PR was **not self-merged**: a human reviewed the
security/production sections (T-12f, T-12g, T-12h, T-64) specifically for
lost or softened nuance before merging.
**Afterward:** every new task added to this file gets written directly in
English; no "half" translation stays half-done.
**What this task did NOT cover, and nothing tracked until T-80
(2026-09-07):** the comments already written in the *code*. This ticket's
"Done when" was `ROADMAP.md`, and it delivered that — but the 2026-09-05
decision covers code and comments too, and 670 comment lines across 124
files were still Spanish two days later.
**Depends on:** nothing technically, but it made sense to do once the
pace of active tasks slowed down — it's a large diff competing for review
attention with anything else open at the same time.
**Model:** `opusplan` (needs judgment to not lose nuance in the security
notes) · **Nightly:** no
