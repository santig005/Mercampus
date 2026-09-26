'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { localizedHref } from '@/i18n/routing';

export default function SidebarBtn({
  text,
  goto = '',
  iconActive,
  iconInactive,
}) {
  const pathname = usePathname();
  const locale = useLocale();
  // T-81: `goto` is always the default-locale (Spanish) path. On an English
  // page (pathname prefixed with /en) a bare next/link href would point at
  // the Spanish URL while the root layout - which Next.js does not
  // re-execute on a soft navigation - keeps rendering English, the exact
  // bug this task fixes (see src/i18n/routing.ts). localizedHref only
  // prefixes `goto` when it is an exact locale-aware route, so unmigrated
  // destinations like /antojos/sellers/list stay bare and don't 404.
  const href = localizedHref(goto, locale);
  // Compare against the resolved href, not the raw `goto`: once `href` can
  // be `/en/antojos`, `pathname` on that same page is also `/en/antojos`,
  // so comparing against unprefixed `goto` would silently break the active
  // highlight (and aria-current) on every non-default locale.
  const isCurrent = pathname === href;

  const handleSidebarClose = () => {
    // Only the /antojos and /marketplace layouts render the drawer, so the
    // toggle is not guaranteed to be there.
    const sidebar = document.querySelector('.drawer-toggle');
    if (sidebar) sidebar.checked = false;
  };

  // T-89 (audit finding F26): the current item used to render as a bare <a>
  // with no href - the href was commented out - which is not a link as far as
  // the browser is concerned: not focusable, not in the tab order, and with
  // nothing marking it as the page you are on. It is one Link now, and
  // aria-current tells a screen reader which one is current instead of the
  // difference being carried only by a background color.
  return (
    <Link
      href={href}
      onClick={handleSidebarClose}
      aria-current={isCurrent ? 'page' : undefined}
      className={`btn-nav flex !justify-start ps-2 ${
        isCurrent ? 'btn-nav-active' : ''
      }`}
    >
      {isCurrent ? iconActive : iconInactive} {text}
    </Link>
  );
}
