// T-84: where the signed-in session is parked between the setup project and the
// specs that need it. Imported by playwright.config.js too, so the path is
// written once - a mismatch here fails as "no storage state" three files away.
export const AUTH_STATE_PATH = 'tests/e2e/.auth/seller.json';
