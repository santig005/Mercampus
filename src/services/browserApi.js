// T-112: reads the app's own API from the browser, with a relative URL.
//
// `api.js` and `apiToken.js` are `'use server'`, so calling them from a client
// component turns the call into a Server Action that fetches
// `NEXT_PUBLIC_URL + '/api'` from the server. That variable holds one value
// for every Vercel environment (`https://mercampus.vercel.app`), so a
// preview's listings were answered by production's API and database. A
// relative fetch goes to whichever deployment served the page, and has no base
// URL to get wrong. It also needs nothing to get past Vercel's deployment
// protection on previews: the browser already carries that session. T-105b's
// `approveSeller` does the same.
//
// Browser-only. Every caller runs it inside a `useEffect`; on the server a
// relative URL has no origin and `fetch` throws.
//
// Same contract as `fetchAPI`, so callers did not change: JSON (or text) on
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
