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
**Model:** `opus` — a bug that doesn't reproduce on demand · **Nightly:** no

### [ ] T-80 · Translate the existing code comments to English
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
| e | `scripts/` | 13 | 213 | **PR #273, awaiting human review** |
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
**Batch e needs a human, and should be last.** `scripts/` is where the
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

### [ ] T-81 · Finish the i18n migration, zone by zone
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

### [ ] T-85 · Spanish left in test descriptions
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

### [ ] T-83 · Extraordinary availability, overriding the schedule
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
