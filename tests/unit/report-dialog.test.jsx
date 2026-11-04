// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ReportDialog from '@/components/reports/ReportDialog';

const TARGET_ID = '64b7f0c2a1b2c3d4e5f60718';

const MESSAGES = {
  title: 'Reportar',
  description: 'Cuéntanos qué está mal.',
  reasonLabel: 'Motivo',
  reasonPlaceholder: 'Selecciona un motivo',
  detailsLabel: 'Detalles (opcional)',
  cancel: 'Cancelar',
  submit: 'Enviar reporte',
  submitting: 'Enviando...',
  successTitle: '¡Reporte enviado!',
  successBody: 'Gracias por avisarnos.',
  genericError: 'No se pudo enviar el reporte. Intenta de nuevo.',
  tooManyRequests: 'Demasiados reportes. Espera un momento antes de volver a intentarlo.',
  close: 'Cerrar',
};

const REASON_LABELS = {
  misleading_info: 'Información engañosa o incorrecta',
  wrong_price: 'Precio incorrecto',
  unsafe_or_prohibited: 'Producto inseguro o prohibido',
  offensive_content: 'Contenido ofensivo',
  other: 'Otro',
};

// A minimal stand-in for next-intl's useTranslations - this project has no
// component-test harness yet, so there is no existing NextIntlClientProvider
// test setup to reuse. Mirrors the real messages/es.json ReportDialog block
// closely enough to assert on real copy, not on translation keys.
vi.mock('next-intl', () => ({
  useTranslations: () => key => {
    if (key.startsWith('reasons.')) {
      return REASON_LABELS[key.slice('reasons.'.length)];
    }
    return MESSAGES[key] ?? key;
  },
}));

// jsdom does not implement <dialog>'s showModal/close (they are no-ops that
// warn "not implemented"), so they are stubbed just enough for the component
// to treat the dialog as open/closed - same approach Testing Library's own
// docs suggest for this element.
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function open() {
    this.open = true;
  });
  HTMLDialogElement.prototype.close = vi.fn(function close() {
    this.open = false;
    this.dispatchEvent(new Event('close'));
  });
});

afterEach(() => {
  // Testing Library's own auto-cleanup hooks itself onto a global `afterEach`
  // (Jest-style), which this project's vitest config does not expose
  // (`test.globals` is off) - called explicitly instead.
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function openDialog() {
  const ref = { current: null };
  render(<ReportDialog ref={ref} targetType='product' targetId={TARGET_ID} />);
  act(() => {
    ref.current.open();
  });
  return ref;
}

describe('ReportDialog (T-149)', () => {
  it('opens with every control labelled and reachable', () => {
    openDialog();

    // getByRole/getByLabelText throw if the element isn't there - finding it
    // is the assertion.
    expect(screen.getByRole('heading', { name: 'Reportar' })).toBeTruthy();
    expect(screen.getByLabelText('Motivo')).toBeTruthy();
    expect(screen.getByLabelText('Detalles (opcional)')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancelar' }).disabled).toBe(false);
    // Nothing picked yet: submitting is refused client-side too, not just by
    // the API's 400.
    expect(screen.getByRole('button', { name: /Enviar reporte/ }).disabled).toBe(true);
  });

  it('lists every reason with its Spanish label', () => {
    openDialog();

    for (const label of Object.values(REASON_LABELS)) {
      expect(screen.getByRole('option', { name: label })).toBeTruthy();
    }
  });

  it('enables submit only once a reason is picked', () => {
    openDialog();
    const submit = screen.getByRole('button', { name: /Enviar reporte/ });

    expect(submit.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: 'wrong_price' } });
    expect(submit.disabled).toBe(false);
  });

  it('cancelling closes the dialog without posting anything', () => {
    vi.stubGlobal('fetch', vi.fn());
    openDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(fetch).not.toHaveBeenCalled();
  });

  it('posts the report and shows the success state', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ message: 'Reporte creado correctamente.', id: 'r1' }),
      })
    );

    openDialog();
    fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: 'wrong_price' } });
    fireEvent.click(screen.getByRole('button', { name: /Enviar reporte/ }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '¡Reporte enviado!' })).toBeTruthy();
    });

    expect(fetch).toHaveBeenCalledWith(
      '/api/reports',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ targetType: 'product', targetId: TARGET_ID, reason: 'wrong_price' }),
      })
    );
  });

  it('shows the rate-limit copy on 429, a generic one otherwise', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        headers: { get: () => 'application/json' },
        json: async () => ({ error: 'Demasiadas solicitudes.' }),
      })
    );

    openDialog();
    fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: 'other' } });
    fireEvent.click(screen.getByRole('button', { name: /Enviar reporte/ }));

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toBe(MESSAGES.tooManyRequests);
    });
  });

  it('shows a generic error on any other failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        headers: { get: () => 'application/json' },
        json: async () => ({ error: 'Producto no encontrado.' }),
      })
    );

    openDialog();
    fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: 'other' } });
    fireEvent.click(screen.getByRole('button', { name: /Enviar reporte/ }));

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toBe(MESSAGES.genericError);
    });
  });
});
