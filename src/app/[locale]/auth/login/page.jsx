import SignInForm from '@/components/auth/register/SignInForm';
import { setRequestLocale } from 'next-intl/server';

// T-81 (auth zone): moved from src/app/auth/login/page.jsx (deleted) -
// '/auth/login' is a `static` LOCALIZED_ROUTES entry (src/i18n/routing.ts),
// exact path only. Unlike the other migrated zones, this route has no shared
// chrome (SideBar, Navbar, LocaleSwitcher) - SignInForm renders its own
// full-screen markup - so there is nothing for a layout.jsx to add here.
// setRequestLocale is called directly in the page instead of introducing a
// layout nobody else would use.
//
// NEXT_PUBLIC_CLERK_SIGN_IN_URL is a compiled-in constant pointing at the
// bare '/auth/login' (see scripts/e2e.mjs and ROADMAP.md T-81) - that bare
// path still resolves here via next-intl's middleware rewrite for the
// default locale, same mechanism every other migrated zone relies on.
export default async function page({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <SignInForm />;
}
