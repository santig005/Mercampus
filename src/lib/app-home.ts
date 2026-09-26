// T-152b: where the app sends someone "home" after an action - signing in or
// out, finishing a form, being turned away from /admin. That is the catalogue.
//
// Those call sites all used to say '/', which worked only because '/' was a
// permanent redirect to /antojos (next.config.mjs). T-152b turns '/' into the
// public landing page, and a landing that says "Únete ahora" is the wrong
// place to drop someone who just signed in. Naming the destination here keeps
// every one of them where it has always actually landed, whatever '/' becomes.
//
// Default-locale path: pass it through localizedHref where the caller knows
// the locale.
export const APP_HOME = '/antojos';
