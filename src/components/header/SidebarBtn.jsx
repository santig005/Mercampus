'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function SidebarBtn({ text, goto = '' }) {
  const pathname = usePathname();

  const handleSidebarClose = () => {
    const sidebar = document.querySelector('.drawer-toggle');
    sidebar.checked = false;
  };

  return (
    <>
      {pathname === goto ? (
        <a
          className={`btn-nav flex !justify-start btn-nav-active`}
          // href={goto === '/scripts/clientes' ? lastActiveURL : goto}
        >
          {text}
        </a>
      ) : (
        <Link
          onClick={() => handleSidebarClose()}
          className={`btn-nav flex !justify-start ${
            pathname === goto && 'btn-nav-active'
          }`}
          // href={goto === '/scripts/clientes' ? lastActiveURL : goto}
          href={goto}
        >
          {text}
        </Link>
      )}
    </>
  );
}
