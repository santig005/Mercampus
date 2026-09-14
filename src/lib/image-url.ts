/**
 * T-116: one image URL, one comparable form.
 *
 * The same ImageKit file is stored in Mongo both with and without a query
 * string: measured read-only on 2026-09-13, 12 of the 205 stored URLs carry
 * `?updatedAt=...`, and the default seller logo is used by 12 sellers once the
 * query is dropped (6 by exact text). Comparing raw strings would make a shared
 * file look like it belongs to one seller. So every comparison - the URL the
 * client sends and the URLs stored in Mongo - goes through this first.
 *
 * Origin + path, no query and no fragment. `new URL` also resolves `..`
 * segments, so a path cannot climb out of a folder after the folder check.
 */
export function normalizeImageUrl(value: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return null;
  }

  return `${parsed.origin}${parsed.pathname}`;
}

/**
 * The file's path inside the ImageKit account (`/products/arepa.jpg`), derived
 * from a URL under the account's URL endpoint. `null` when the URL is not
 * under that endpoint - it is not a file this account serves.
 */
export function imageFilePath(url: string, urlEndpoint: string): string | null {
  const normalized = normalizeImageUrl(url);
  const base = normalizeImageUrl(urlEndpoint)?.replace(/\/+$/, '');

  if (!normalized || !base || !normalized.startsWith(`${base}/`)) {
    return null;
  }

  try {
    return decodeURIComponent(normalized.slice(base.length));
  } catch {
    return null;
  }
}
