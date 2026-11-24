# Observability (Sentry) — turning it on

T-60 built everything on the code side: `src/instrumentation.ts` (server +
edge), `src/instrumentation-client.ts` (browser), `src/app/global-error.jsx`
(fallback screen for an error that escapes the root layout), and a bridge
from `src/lib/logger.ts` (`logger.error`/`logger.warn`). All of it is inert
right now — no `SENTRY_DSN` or `NEXT_PUBLIC_SENTRY_DSN` is set anywhere, so
`Sentry.init()` is never called, there is no Sentry client, and
`Sentry.getClient()` (the logger bridge's guard) is always falsy. Turning it
on is **T-60b**, and does not touch the repo: it's an account, five
Vercel environment variables, and one alert rule.

## 1. Create the Sentry project

1. Sign up / sign in at sentry.io (the free tier is enough for this app's
   traffic).
2. Create a project: platform **Next.js**, name it `mercampus` (or
   whatever the org's naming convention is).
3. From the project's **Settings → Client Keys (DSN)**, copy the DSN. It's
   the same value for both env vars below — a DSN only lets a caller *send*
   events, it can't read anything back, so there's no reason to use two
   different ones.

## 2. Set the environment variables in Vercel

Project Settings → Environment Variables. All six:

| Variable | Value | Environments | Sensitive? |
|---|---|---|---|
| `SENTRY_DSN` | the DSN from step 1 | Production. Add to Preview too if you want preview deploys to report (see below) | No (a DSN isn't a secret) |
| `NEXT_PUBLIC_SENTRY_DSN` | same DSN | same as above | No |
| `SENTRY_ORG` | the org slug (Settings → General) | Production (build-time only — see below) | No |
| `SENTRY_PROJECT` | the project slug | Production | No |
| `SENTRY_AUTH_TOKEN` | an **Internal Integration** token (Settings → Developer Settings → New Internal Integration, scope `project:releases` + `project:write`) | Production | **Yes — mark Sensitive** |

**Should Preview report too?** Recommended: yes, into the *same* Sentry
project, not a second one — this app has no real traffic to separate by
environment, and a second project is one more thing to keep configured.
`src/instrumentation.ts` and `src/instrumentation-client.ts` don't currently
tag the event's `environment`; if Preview is turned on, add one line to both
`Sentry.init()` calls so the two don't blur together in the issue list:

```ts
environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
```

(`VERCEL_ENV` is `production` / `preview` / `development`, set by Vercel
automatically — nothing to configure for it.)

**`SENTRY_ORG`/`SENTRY_PROJECT`/`SENTRY_AUTH_TOKEN`** are read once, at build
time, by `next.config.mjs` (`withSentryConfig`) to upload source maps — not
by anything that runs per-request. Setting them only in Production is enough
unless source maps for Preview builds matter too.

Missing any one of those three is safe by design: `next.config.mjs` checks
all three before calling `withSentryConfig` at all, so a partial config
builds exactly like no config, just without source maps.

## 3. Create the alert rule

Sentry project → **Alerts → Create Alert → Issues** (not "Metric Alert" —
that needs a paid plan's performance data, which this app doesn't send:
`tracesSampleRate: 0` in both `Sentry.init()` calls, on purpose — see
`src/instrumentation.ts`).

Suggested rule, tuned for an app with this little traffic (54 sellers,
no real growth expected per the portfolio-pivot note at the top of
`ROADMAP.md`):

- **When:** "An issue is first seen" (catches a new kind of error
  immediately) **or** "Number of events in an issue is greater than 5 in
  1 hour" for a *recurring* one — add both as separate alert rules if the
  UI doesn't let you combine them with OR.
- **Then:** send a notification to email (or Slack, if the org is already
  on Sentry's Slack integration) — whichever the human actually checks.
- Threshold rationale: at this traffic level, "any error at all" is already
  rare enough to be worth a look; a stricter rate-based threshold (e.g. "5%
  of requests") would need a request-volume baseline this app doesn't have.

## 4. Confirm it works

From a machine with the real `SENTRY_DSN` in its environment (**never**
commit it to `.env` — this repo's `.env` is local-only and gitignored, same
as every other secret):

```bash
SENTRY_DSN=<the dsn> node -e "
const Sentry = require('@sentry/nextjs');
Sentry.init({ dsn: process.env.SENTRY_DSN });
Sentry.captureException(new Error('T-60b test event'));
Sentry.flush(2000).then(() => process.exit(0));
"
```

It should show up in the Sentry project's Issues list within a minute,
titled `Error: T-60b test event`. Confirm the alert rule fired (email/Slack),
then delete or resolve the test issue so it doesn't skew the project's
"first seen" history.

Once this is confirmed, redeploy (a plain redeploy — the env vars take
effect on the next build/boot, no code change needed) and watch the next
real error show up for real.
