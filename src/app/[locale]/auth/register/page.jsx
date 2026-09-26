import SignUpForm from '@/components/auth/register/SignUpForm';
import { setRequestLocale } from 'next-intl/server';

// T-81 (auth zone): moved from src/app/auth/register/page.jsx (deleted) -
// '/auth/register' is a `static` LOCALIZED_ROUTES entry (src/i18n/routing.ts),
// exact path only. See src/app/[locale]/auth/login/page.jsx for why there is
// no layout.jsx here.
//
// NEXT_PUBLIC_CLERK_SIGN_UP_URL is a compiled-in constant pointing at the
// bare '/auth/register' (see scripts/e2e.mjs and ROADMAP.md T-81) - that bare
// path still resolves here via next-intl's middleware rewrite for the
// default locale.
export default async function page({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <SignUpForm />;
}
