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

### [ ] T-35 · A single image provider
**Why:** Cloudinary and ImageKit are both installed, each with its own
route. `next-auth`, `bcryptjs`, `jsonwebtoken`, and `cookies` are also
leftovers from before Clerk.
**Done when:** one is chosen, the other is removed along with its route
and dependency; `package.json` with no unused dependencies.
**Model:** `sonnet` · **Nightly:** no (choosing the provider is yours)

### [ ] T-36 · A real README
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

### [ ] T-44 · Seller panel
**Done when:** sales per day, top-ordered products, peak hours,
cancellation rate. Reads from `Order`, writes nothing new.
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
profile, forms, seller panel. Each with its own PR.
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

### [ ] T-70 · Sort options in the product/seller listings
**Why:** the public listing currently shuffles products randomly and only
pushes unavailable ones last (`ProductGrid` / `api/products/route.js`);
there's no way to sort by price or by newest, even though `Product`
already has `price` and Mongoose's `timestamps: true` gives every
document a `createdAt` for free. University filtering already works
(`UniversitySelector` + `useUniversity`) — this only adds ordering on top
of it.
**Done when:** a sort control (price asc/desc, newest first) on the
listing, backed by a query param the API already accepts or a small
addition to it. The random shuffle stays as the default when no sort is
picked.
**Model:** `sonnet` · **Nightly:** yes

### [ ] T-71 · Seller pause mode
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
**Model:** `sonnet` · **Nightly:** yes

### [ ] T-72 · Seller profile completeness checklist
**Why:** nothing today nudges a newly-approved seller to actually finish
their profile — no logo, no schedule, no description — and their listing
looks empty next to sellers who filled everything in. Every field this
needs already exists on `Seller`/`Schedule`; this is purely surfacing
what's missing.
**Done when:** a small checklist/progress indicator on the seller's own
dashboard, computed from existing fields (has logo? has description? has
at least one `Schedule` entry? has at least one product?) — derived only,
no schema change.
**Model:** `sonnet` · **Nightly:** yes

### [ ] T-73 · Dark mode with a hand-designed palette
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
**Done when:** automatic review of photo and text on publish, with a
human-review queue for uncertain cases instead of automatic blocking.
**Model:** `opusplan` · **Nightly:** no

### [ ] T-53 · Evals for the AI features
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

### [ ] T-67 · UI/UX audit across the app's main screens
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
**Model:** `sonnet` · **Nightly:** yes

### [ ] T-69 · Open Graph previews for product/seller pages
**Why:** sharing a product link (there's already a share button,
`ShareButton.jsx`) drops a bare URL — WhatsApp/Instagram previews fall
back to the generic site-wide metadata in `layout.jsx`, the same title and
image for every page on the site. A student sharing "look at this arepa"
gets a link with no picture, no price, nothing that makes someone tap it.
**Done when:** `generateMetadata()` on the product and seller detail pages
returning per-page `openGraph`/`twitter` tags — title, description, and
the product/seller's own image, all already stored in Mongo. No new
fields needed, just reading what's already there.
**Model:** `sonnet` · **Nightly:** yes

### [ ] T-74 · sitemap.xml
**Why:** complements the SEO category T-61 already measures. Approved
sellers and their public product/profile pages aren't discoverable via a
sitemap today — there isn't one.
**Done when:** `src/app/sitemap.ts` (Next.js' native sitemap convention,
no new dependency) generating entries for the static public pages plus
one per approved seller and their products, read straight from Mongo.
**Model:** `sonnet` · **Nightly:** yes

### [ ] T-63 · Separate the environments (database and Clerk)
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
**Model:** `opusplan` · **Nightly:** no (infrastructure and cost)

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
**Depends on:** nothing technically, but it made sense to do once the
pace of active tasks slowed down — it's a large diff competing for review
attention with anything else open at the same time.
**Model:** `opusplan` (needs judgment to not lose nuance in the security
notes) · **Nightly:** no
