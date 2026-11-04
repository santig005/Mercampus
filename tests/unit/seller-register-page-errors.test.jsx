// @vitest-environment jsdom
import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import RegisterSeller from '@/app/[locale]/antojos/sellers/register/page.jsx';

const pushMock = vi.fn();
const setSellerMock = vi.fn();
const setDbUserMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));
vi.mock('next-intl', () => ({
  useLocale: () => 'es',
  // Real copy is irrelevant here; the strings asserted on below come from
  // the (mocked) fetch response, not from these translation keys.
  useTranslations: () => key => key,
}));
vi.mock('@/components/general/ImageGrid', () => ({
  default: () => null,
}));
vi.mock('@/components/university/UniGraphicSelector', () => ({
  default: () => null,
}));
vi.mock('@/context/SellerContext', () => ({
  useSeller: () => ({
    seller: null,
    setSeller: setSellerMock,
    dbUser: { role: 'user' },
    setDbUser: setDbUserMock,
  }),
  useCheckSeller: () => ({ checkedSeller: true }),
}));

// Reproduces React's DOM-value-setter trick (the one @testing-library/react's
// fireEvent uses under the hood) so typing into the description textarea
// goes through InputFields' controlled onChange, without pulling in a second
// test-utility dependency.
function setNativeValue(element, value) {
  const prototype = Object.getPrototypeOf(element);
  const { set: prototypeValueSetter } = Object.getOwnPropertyDescriptor(prototype, 'value');
  prototypeValueSetter.call(element, value);
}

function typeDescription(container, value) {
  const textarea = container.querySelector('textarea[name="description"]');
  act(() => {
    setNativeValue(textarea, value);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function submit(container) {
  // Not `container.querySelector('form')`: FormErrorModal nests its own
  // `<form method="dialog">` around the close button, and that one sits
  // first in document order.
  const form = container.querySelector('button[type="submit"]').closest('form');
  act(() => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
}

let container;
let root;

beforeEach(() => {
  pushMock.mockClear();
  setSellerMock.mockClear();
  setDbUserMock.mockClear();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(<RegisterSeller />);
  });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

async function flushSubmit(container) {
  await act(async () => {
    submit(container);
    // Let the fetch promise and the subsequent state updates settle.
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('register form shows a rejected submit instead of hiding it (T-134)', () => {
  it('renders the generic message and the per-field errors from a 400', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        message: 'Datos inválidos',
        fields: [{ field: 'businessName', message: 'El nombre del negocio es obligatorio' }],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await flushSubmit(container);

    const dialog = container.querySelector('#errors');
    expect(dialog).not.toBeNull();
    expect(dialog.className).toMatch(/modal-open/);
    expect(dialog.textContent).toContain('Datos inválidos');
    expect(dialog.textContent).toContain('El nombre del negocio es obligatorio');
  });

  it('a retry right after a rejected submit does not double-encode the description', async () => {
    typeDescription(container, 'Las mejores arepas del campus');

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'Datos inválidos', fields: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    // First submit fails; nothing is retyped before the retry, matching the
    // scenario in ROADMAP.md T-134 ("a retry does not double-stringify the
    // description").
    await flushSubmit(container);
    await flushSubmit(container);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    const secondBody = JSON.parse(fetchMock.mock.calls[1][1].body);

    const expectedDescription = JSON.stringify('Las mejores arepas del campus');
    expect(firstBody.description).toBe(expectedDescription);
    expect(secondBody.description).toBe(expectedDescription);
  });
});
