// @vitest-environment jsdom
import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import FormErrorModal from '@/components/modals/FormErrorModal';

// T-134: the register page used to import the icons for this exact dialog
// (FcHighPriority, IoClose) and never render it - the API's rejection landed
// in `errorCode` state and nothing read it. This is the component product/add
// already had (T-119/T-127), now shared by both pages.
let container;
let root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('FormErrorModal', () => {
  it('stays closed when there is no message', () => {
    act(() => {
      root.render(<FormErrorModal attentionLabel='¡Atención!' message='' fields={[]} onClose={() => {}} />);
    });

    const dialog = container.querySelector('#errors');
    expect(dialog.className).not.toMatch(/modal-open/);
  });

  it('opens and lists the field errors once a message is set', () => {
    act(() => {
      root.render(
        <FormErrorModal
          attentionLabel='¡Atención!'
          message='Datos inválidos'
          fields={[{ field: 'category', message: 'La categoría es obligatoria' }]}
          onClose={() => {}}
        />
      );
    });

    const dialog = container.querySelector('#errors');
    expect(dialog.className).toMatch(/modal-open/);
    expect(dialog.textContent).toContain('¡Atención!');
    expect(dialog.textContent).toContain('Datos inválidos');
    expect(dialog.textContent).toContain('La categoría es obligatoria');
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    act(() => {
      root.render(
        <FormErrorModal attentionLabel='¡Atención!' message='Datos inválidos' fields={[]} onClose={onClose} />
      );
    });

    act(() => {
      container.querySelector('button').click();
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
