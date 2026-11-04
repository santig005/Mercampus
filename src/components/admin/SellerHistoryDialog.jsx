'use client';
import React from 'react';

const ACTION_LABELS = {
  approve: { text: 'Aprobado', color: 'text-green-600 bg-green-100' },
  reject: { text: 'Rechazado', color: 'text-red-600 bg-red-100' },
};

const formatDate = value =>
  new Date(value).toLocaleString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

/**
 * T-155: a seller's audit trail - who approved or rejected it, when, and why.
 *
 * Presentational only: the page fetches (`getSellerHistory`) and passes
 * `history`, `loading` and `error` down. Every seller approved or rejected
 * before T-155 has no records, so the empty state is the common case at
 * first, not an error.
 *
 * "Who" is the admin's Clerk id: the log stores exactly the session's id and
 * nothing resolved from it. `currentUserId` marks the viewer's own entries.
 */
export default function SellerHistoryDialog({
  seller,
  history,
  loading,
  error,
  currentUserId,
  onClose,
}) {
  if (!seller) return null;

  return (
    <div className='modal modal-open' role='dialog' aria-modal='true' aria-labelledby='seller-history-title'>
      <div className='modal-box bg-base-100 text-base-content max-w-2xl'>
        <h3 id='seller-history-title' className='text-lg font-bold'>
          Historial de {seller.businessName}
        </h3>

        {loading && (
          <div className='flex justify-center py-8'>
            <span className='loading loading-spinner loading-md' aria-label='Cargando historial' />
          </div>
        )}

        {!loading && error && (
          <div className='alert alert-error mt-4'>
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && history.length === 0 && (
          <p className='py-6 text-center text-sm text-base-content/70'>
            Sin cambios registrados. Las aprobaciones y rechazos anteriores a este historial no
            quedaron guardados.
          </p>
        )}

        {!loading && !error && history.length > 0 && (
          <ol className='mt-4 flex flex-col gap-3'>
            {history.map(entry => {
              const label = ACTION_LABELS[entry.action] ?? {
                text: entry.action,
                color: 'bg-base-200 text-base-content',
              };
              return (
                <li key={entry._id} className='rounded-lg border border-base-300 p-3'>
                  <div className='flex flex-wrap items-center justify-between gap-2'>
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${label.color}`}>
                      {label.text}
                    </span>
                    <time className='text-xs text-base-content/70' dateTime={entry.createdAt}>
                      {formatDate(entry.createdAt)}
                    </time>
                  </div>
                  <p className='mt-2 break-all text-xs text-base-content/70'>
                    Por: <span className='font-mono'>{entry.actorClerkId}</span>
                    {entry.actorClerkId === currentUserId && ' (tú)'}
                  </p>
                  {entry.reason ? (
                    <p className='mt-1 whitespace-pre-wrap break-words text-sm'>{entry.reason}</p>
                  ) : (
                    <p className='mt-1 text-sm italic text-base-content/60'>Sin motivo</p>
                  )}
                </li>
              );
            })}
          </ol>
        )}

        <div className='modal-action'>
          <button type='button' className='btn' onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
      <div className='modal-backdrop' onClick={onClose} />
    </div>
  );
}
