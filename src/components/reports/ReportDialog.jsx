'use client';

import { forwardRef, useId, useImperativeHandle, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import { logger } from '@/lib/logger';
import { fetchFromApi, jsonBody } from '@/services/browserApi';

// Kept in sync with REPORT_DETAILS_MAX in src/utils/resources/reports.ts;
// the API is what enforces it, this only stops the textarea early (same
// convention as RejectSellerDialog.jsx's REASON_MAX).
const DETAILS_MAX = 500;

// English values, same list as REPORT_REASONS - the Spanish label for each
// comes from ReportDialog.reasons.<value> in messages/*.json.
const REASONS = [
  'misleading_info',
  'wrong_price',
  'unsafe_or_prohibited',
  'offensive_content',
  'other',
];

/**
 * T-149. The "Reportar" dialog on a product or seller page. Opened through a
 * ref (`reportRef.current.open()`), same convention as ShareButton.jsx - the
 * caller renders its own trigger button.
 *
 * A native `<dialog>` (showModal/close), not a hand-rolled `modal modal-open`
 * div: the browser handles the focus trap and Escape on its own, same as
 * ProductModal.jsx and ShareButton.jsx.
 */
const ReportDialog = forwardRef(function ReportDialog({ targetType, targetId }, ref) {
  const dialogRef = useRef(null);
  const t = useTranslations('ReportDialog');
  const titleId = useId();
  const reasonId = useId();
  const detailsId = useId();

  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  // idle | submitting | success | error
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const reset = () => {
    setReason('');
    setDetails('');
    setStatus('idle');
    setErrorMessage('');
  };

  useImperativeHandle(
    ref,
    () => ({
      open: () => {
        reset();
        dialogRef.current?.showModal();
      },
    }),
    []
  );

  const close = () => dialogRef.current?.close();

  const handleSubmit = async event => {
    event.preventDefault();
    if (!reason || status === 'submitting') return;

    setStatus('submitting');
    setErrorMessage('');
    try {
      await fetchFromApi('/reports', {
        method: 'POST',
        ...jsonBody({
          targetType,
          targetId,
          reason,
          details: details.trim() || undefined,
        }),
      });
      setStatus('success');
    } catch (error) {
      logger.error('Error al enviar el reporte:', error);
      setStatus('error');
      setErrorMessage(error.status === 429 ? t('tooManyRequests') : t('genericError'));
    }
  };

  return (
    <dialog ref={dialogRef} className='modal' onClose={reset}>
      <div className='modal-box bg-base-100 text-base-content' aria-labelledby={titleId}>
        {status === 'success' ? (
          <>
            <h3 id={titleId} className='text-lg font-bold'>
              {t('successTitle')}
            </h3>
            <p className='py-2 text-sm text-base-content/70'>{t('successBody')}</p>
            <div className='modal-action'>
              <button type='button' className='btn btn-primary' onClick={close}>
                {t('close')}
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <h3 id={titleId} className='text-lg font-bold'>
              {t('title')}
            </h3>
            <p className='py-2 text-sm text-base-content/70'>{t('description')}</p>

            <label htmlFor={reasonId} className='label'>
              <span className='label-text text-base-content'>{t('reasonLabel')}</span>
            </label>
            <select
              id={reasonId}
              className='select select-bordered w-full bg-base-100 text-base-content'
              required
              autoFocus
              value={reason}
              onChange={e => setReason(e.target.value)}
              disabled={status === 'submitting'}
            >
              <option value='' disabled>
                {t('reasonPlaceholder')}
              </option>
              {REASONS.map(value => (
                <option key={value} value={value}>
                  {t(`reasons.${value}`)}
                </option>
              ))}
            </select>

            <label htmlFor={detailsId} className='label mt-2'>
              <span className='label-text text-base-content'>{t('detailsLabel')}</span>
            </label>
            <textarea
              id={detailsId}
              className='textarea textarea-bordered w-full bg-base-100 text-base-content'
              rows={3}
              maxLength={DETAILS_MAX}
              value={details}
              onChange={e => setDetails(e.target.value)}
              disabled={status === 'submitting'}
            />
            <div className='text-right text-xs text-base-content/60'>
              {details.length}/{DETAILS_MAX}
            </div>

            {status === 'error' && (
              <p role='alert' className='text-error text-sm mt-2'>
                {errorMessage}
              </p>
            )}

            <div className='modal-action'>
              <button
                type='button'
                className='btn btn-ghost'
                onClick={close}
                disabled={status === 'submitting'}
              >
                {t('cancel')}
              </button>
              <button
                type='submit'
                className='btn btn-primary'
                disabled={!reason || status === 'submitting'}
              >
                {status === 'submitting' ? t('submitting') : t('submit')}
              </button>
            </div>
          </form>
        )}
      </div>
      <form method='dialog' className='modal-backdrop'>
        <button>{t('close')}</button>
      </form>
    </dialog>
  );
});

export default ReportDialog;
