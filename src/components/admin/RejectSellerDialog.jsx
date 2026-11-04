'use client';
import React, { useEffect, useId, useState } from 'react';

// Kept in sync with SELLER_DECISION_REASON_MAX in src/lib/validators/seller.ts;
// the API is what enforces it, this only stops the textarea early.
const REASON_MAX = 500;

/**
 * T-155: asks the admin why a seller is being rejected before the PATCH goes
 * out. The API refuses a rejection without a reason (it is stored in the
 * seller's audit log), so this is not optional copy - without it rejecting
 * would fail with a 400.
 *
 * Controlled by `seller` (null = closed). `onConfirm(reason)` receives the
 * trimmed reason; `submitting` disables the form while the request runs.
 */
export default function RejectSellerDialog({ seller, submitting, onConfirm, onCancel }) {
  const [reason, setReason] = useState('');
  const textareaId = useId();

  // A fresh, empty reason every time the dialog opens for a seller.
  useEffect(() => {
    setReason('');
  }, [seller?._id]);

  if (!seller) return null;

  const trimmed = reason.trim();

  const handleSubmit = e => {
    e.preventDefault();
    if (!trimmed || submitting) return;
    onConfirm(trimmed);
  };

  return (
    <div className='modal modal-open' role='dialog' aria-modal='true' aria-labelledby={`${textareaId}-title`}>
      <form className='modal-box bg-base-100 text-base-content' onSubmit={handleSubmit}>
        <h3 id={`${textareaId}-title`} className='text-lg font-bold'>
          Rechazar a {seller.businessName}
        </h3>
        <p className='py-2 text-sm text-base-content/70'>
          El motivo queda registrado en el historial del vendedor.
        </p>
        <label htmlFor={textareaId} className='label'>
          <span className='label-text text-base-content'>Motivo del rechazo</span>
        </label>
        <textarea
          id={textareaId}
          className='textarea textarea-bordered w-full bg-base-100 text-base-content'
          rows={4}
          maxLength={REASON_MAX}
          required
          autoFocus
          value={reason}
          onChange={e => setReason(e.target.value)}
          disabled={submitting}
        />
        <div className='text-right text-xs text-base-content/60'>
          {reason.length}/{REASON_MAX}
        </div>
        <div className='modal-action'>
          <button type='button' className='btn btn-ghost' onClick={onCancel} disabled={submitting}>
            Cancelar
          </button>
          <button type='submit' className='btn btn-error' disabled={!trimmed || submitting}>
            {submitting ? 'Rechazando...' : 'Rechazar'}
          </button>
        </div>
      </form>
      <div className='modal-backdrop' onClick={submitting ? undefined : onCancel} />
    </div>
  );
}
