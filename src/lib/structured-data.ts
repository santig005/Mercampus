import { SITE_NAME, SITE_URL } from '@/lib/metadata';

// T-152c: schema.org JSON-LD. Pure builders, so the emitted JSON is asserted
// in a unit test the way src/lib/metadata.ts's builders are (T-151 asks for
// exactly that), and the page only serializes what they return.

// The profile the landing's final call to action already links to.
export const INSTAGRAM_URL = 'https://www.instagram.com/mercampus/';

// /images/logo.png (500x500) is the logo the landing's topbar renders. Not
// /android-chrome-512x512.png: the root layout's openGraph image points
// there, but that file does not exist in public/ (404 in production,
// measured 2026-09-26 - see ROADMAP.md).
export const ORGANIZATION_LOGO_PATH = '/images/logo.png';

// Emitted once, on the home page: who is behind the site. This is what lets
// a search result or a link preview name the organization instead of just
// showing a bare URL.
export function buildOrganizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}${ORGANIZATION_LOGO_PATH}`,
    sameAs: [INSTAGRAM_URL],
  };
}

// JSON.stringify does not escape '<', so a string value containing
// "</script>" would close the tag early and let the rest run as HTML. None of
// today's values can contain one, but the builders will take data from the
// database later (T-151's Product markup), so the escaping lives here, once.
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
