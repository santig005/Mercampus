import { defineRouting } from 'next-intl/routing';

// T-46: v1 only covers /about as the proof screen. Other routes don't go
// through this middleware yet (see src/middleware.js), so they stay in
// Spanish with no locale prefix until they're migrated zone by zone.
export const routing = defineRouting({
  locales: ['es', 'en'],
  defaultLocale: 'es',
  localePrefix: 'as-needed',
  // The rest of the app always defaults to Spanish regardless of the
  // visitor's browser language. Keep /about consistent with that instead of
  // letting Accept-Language silently switch it to English; visitors opt in
  // via the locale switcher instead.
  localeDetection: false,
});
