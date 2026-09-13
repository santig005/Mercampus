'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function SidebarBtn({
  text,
  goto = '',
  iconActive,
  iconInactive,
}) {
  const pathname = usePathname();
  const isCurrent = pathname === goto;

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
      href={goto}
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
