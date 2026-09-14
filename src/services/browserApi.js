// T-112 / T-112b: calls the app's own API from the browser, with a relative URL.
//
// `api.js` and `apiToken.js` used to do this job, and both were `'use server'`,
// so calling them from a client component turned the call into a Server Action
// that fetched `NEXT_PUBLIC_URL + '/api'` from the server. That variable holds
// one value for every Vercel environment (`https://mercampus.vercel.app`), so a
// preview's reads and writes were answered by production's API and database.
// A relative fetch goes to whichever deployment served the page, and has no
// base URL to get wrong. It also needs nothing to get past Vercel's deployment
// protection on previews: the browser already carries that session.
//
// Identity: a same-origin browser fetch sends Clerk's session cookie on its
// own, and the route handlers read it through `auth()`. No Bearer token to
// fetch and pass around - forgetting to pass it is how saving and deleting from
// the full product form answered 401 (T-112b). T-105b's `approveSeller` already
// worked this way.
//
// Browser-only. Every caller runs it inside a `useEffect` or an event handler;
// on the server a relative URL has no origin and `fetch` throws.
//
// Same contract `fetchAPI` had, so callers did not change: JSON (or text) on
// 2xx, and an Error carrying the status and body otherwise.
export async function fetchFromApi(path, options = {}) {
  const response = await fetch(`/api${path}`, options);

  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new Error(`Error HTTP ${response.status}: ${JSON.stringify(body)}`);
  }

  return body;
}

// The `headers` and `body` of a JSON write, to spread into fetchFromApi's options.
export const jsonBody = data => ({
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});
