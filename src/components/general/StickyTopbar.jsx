'use client';

import { useEffect, useState } from 'react';

// T-87 (audit finding F16): the /about topbar is sticky and deliberately
// transparent - it is pulled up over the hero with a negative margin so the
// gradient shows through behind it. Once the hero scrolled away it stayed
// transparent, so the wordmark, the language switcher and the CTA ended up
// printed directly on top of the section text underneath.
//
// A surface that appears only after the page has moved is state, so this is
// the one client component in an otherwise server-rendered layout. The bar's
// contents stay on the server - LocaleSwitcher is an async server component
// that reads the active locale there - and arrive through `children`.
export default function StickyTopbar({ children }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // 24px, not 0: a couple of pixels of scroll should not flip the bar.
    const onScroll = () => setScrolled(window.scrollY > 24);

    // Run once on mount too: no scroll event fires when a page loads already
    // scrolled - a restored position, or a link into an anchor further down -
    // and the bar would sit transparent over the text until the first wheel.
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      data-scrolled={scrolled ? 'true' : 'false'}
      className={`sticky top-0 z-50 mt-[-72px] transition-colors duration-200 ${
        scrolled
          ? 'bg-base-100/95 backdrop-blur-md border-b border-base-300 shadow-sm'
          : 'bg-transparent'
      }`}
    >
      {children}
    </header>
  );
}
