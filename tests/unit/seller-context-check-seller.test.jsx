// @vitest-environment jsdom
import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SellerProvider, useCheckSeller } from '@/context/SellerContext';
import { localizedHref } from '@/i18n/routing';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));
vi.mock('next-intl', () => ({
  useLocale: () => 'es',
}));

// T-134: `seller` is the string "None" (not an object, not null/undefined)
// when the signed-in user has no seller profile at all. `"None"` is truthy,
// so `if (seller)` used to take the branches meant for an actual seller
// document, reading `.approved` off a string (always undefined). Both
// `sellerNotApproved` and `sellerApproved` must send that user to /register
// instead.
function Harness({ sellerAllowed, routeIfNot }) {
  useCheckSeller(sellerAllowed, routeIfNot);
  return null;
}

let container;
let root;

function mount(seller, sellerAllowed, routeIfNot) {
  act(() => {
    root.render(
      <SellerProvider initialUser={{ role: 'user' }} initialSeller={seller}>
        <Harness sellerAllowed={sellerAllowed} routeIfNot={routeIfNot} />
      </SellerProvider>
    );
  });
}

beforeEach(() => {
  pushMock.mockClear();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('useCheckSeller sends "None" to /register, not through (T-134)', () => {
  it('sellerNotApproved branch: a user with no seller profile is not let through as "not approved"', () => {
    mount('None', 'sellerNotApproved', '/some/other/route');

    expect(pushMock).toHaveBeenCalledWith(localizedHref('/antojos/sellers/register', 'es'));
    expect(pushMock).not.toHaveBeenCalledWith(localizedHref('/some/other/route', 'es'));
  });

  it('sellerApproved branch: a user with no seller profile goes to /register, not routeIfNot', () => {
    mount('None', 'sellerApproved', '/antojos/sellers/approving');

    expect(pushMock).toHaveBeenCalledWith(localizedHref('/antojos/sellers/register', 'es'));
    expect(pushMock).not.toHaveBeenCalledWith(
      localizedHref('/antojos/sellers/approving', 'es')
    );
  });

  it('sellerApproved branch: a real unapproved seller still goes to routeIfNot, not /register', () => {
    mount({ approved: false }, 'sellerApproved', '/antojos/sellers/approving');

    expect(pushMock).toHaveBeenCalledWith(
      localizedHref('/antojos/sellers/approving', 'es')
    );
    expect(pushMock).not.toHaveBeenCalledWith(
      localizedHref('/antojos/sellers/register', 'es')
    );
  });

  it('sellerApproved branch: a real approved seller is let through (no redirect)', () => {
    mount({ approved: true }, 'sellerApproved', '/antojos/sellers/approving');

    expect(pushMock).not.toHaveBeenCalled();
  });
});
