// T-84: the throwaway Clerk account the signed-in e2e runs as.
//
// A seeded Mongo user is not a Clerk account. `scripts/seed.mjs` writes
// `clerkId: 'user_seed_ana'` and friends - ids that exist in no instance - so a
// fixture built on top of them would sign in as nobody and the specs would pass
// against nothing. This creates a real account in the real instance the keys
// point at, and hands back its real id for the seed to link.
//
// The guard is the mirror image of the one in `backfill-clerk-id.mjs`. That
// script refuses to run anywhere but production, because it writes ids onto
// real users. This one refuses to run ANYWHERE BUT development, because it
// creates and deletes accounts: doing that in the production instance would be
// churning real students' Clerk records for a test run.
//
// See T-12h and T-64 for why "which instance am I talking to" is the first
// question anything touching Clerk has to answer.

const CLERK_API = 'https://api.clerk.com/v1';

// A `+clerk_test` address is Clerk's own convention for test accounts: it skips
// email verification, and a plain `@example.test` is rejected outright as
// malformed (measured - the API answers 422 form_param_format_invalid).
const EMAIL_DOMAIN = 'example.com';
const EMAIL_PREFIX = 'mercampus.e2e';

// Orphans are the failure mode to design against: a run killed between creation
// and teardown leaves an account behind in an instance CLAUDE.md tells us to
// keep an eye on. Anything older than this that matches the prefix is swept on
// the next run.
const STALE_AFTER_MS = 2 * 60 * 60 * 1000;

const request = async (secretKey, path, init = {}) => {
  const response = await fetch(`${CLERK_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = body?.errors?.[0]?.long_message ?? body?.errors?.[0]?.message;
    throw new Error(`Clerk ${init.method ?? 'GET'} ${path} -> ${response.status}${detail ? `: ${detail}` : ''}`);
  }
  return body;
};

// The email is unique per run so two CI jobs on two PRs cannot fight over the
// same account, and prefixed so the sweep can recognise its own leftovers.
const fixtureEmail = () =>
  `${EMAIL_PREFIX}.${process.env.GITHUB_RUN_ID ?? Date.now()}+clerk_test@${EMAIL_DOMAIN}`;

async function assertDevelopmentInstance(secretKey) {
  const instance = await request(secretKey, '/instance');

  if (instance.environment_type !== 'development') {
    throw new Error(
      `La instancia de Clerk es "${instance.environment_type}" (${instance.id}).\n` +
        'El fixture del e2e crea y borra cuentas: hacerlo en la instancia de\n' +
        'produccion seria tocar los registros de estudiantes reales. Usa las\n' +
        'claves de la instancia de desarrollo.'
    );
  }

  return instance;
}

async function sweepStaleFixtures(secretKey) {
  const users = await request(secretKey, `/users?query=${encodeURIComponent(EMAIL_PREFIX)}&limit=50`);
  const cutoff = Date.now() - STALE_AFTER_MS;

  const stale = (users ?? []).filter(
    user =>
      user.email_addresses?.some(email =>
        email.email_address?.startsWith(`${EMAIL_PREFIX}.`)
      ) && user.created_at < cutoff
  );

  for (const user of stale) {
    await request(secretKey, `/users/${user.id}`, { method: 'DELETE' });
  }

  return stale.length;
}

/**
 * Creates the run's Clerk account. Returns `{ id, email }` - `id` is what the
 * seeded Mongo user has to carry as its `clerkId`, or the session will resolve
 * to nobody.
 */
export async function createFixtureUser(secretKey) {
  if (!secretKey) {
    throw new Error(
      'e2e: falta CLERK_SECRET_KEY. El fixture con sesion lo necesita para crear\n' +
        '     la cuenta y para firmar el sign-in token. En local sale del .env; en\n' +
        '     CI, de los secretos del workflow.'
    );
  }

  const instance = await assertDevelopmentInstance(secretKey);
  const swept = await sweepStaleFixtures(secretKey);
  const email = fixtureEmail();

  const user = await request(secretKey, '/users', {
    method: 'POST',
    body: JSON.stringify({
      email_address: [email],
      first_name: 'Carlos',
      last_name: 'Mesa',
      // The account only ever signs in through a backend-issued sign-in token,
      // so the password is never used to authenticate. It exists because Clerk
      // wants one, and it is random per run rather than a constant somebody
      // could mistake for a credential worth reusing.
      password: `e2e-${crypto.randomUUID()}-Xq7!`,
      skip_password_checks: true,
    }),
  });

  return { id: user.id, email, instanceId: instance.id, swept };
}

export async function deleteFixtureUser(secretKey, userId) {
  if (!secretKey || !userId) return;
  await request(secretKey, `/users/${userId}`, { method: 'DELETE' });
}
