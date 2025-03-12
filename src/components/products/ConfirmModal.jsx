import React from 'react';

export default function ConfirmModal({ isOpen, onClose, onConfirm }) {
  return (
    <dialog open={isOpen} className='modal'>
      <div className='modal-box'>
        <h2 className='text-lg font-semibold'>¿Estás seguro?</h2>
        <p className='mt-2'>Esta acción no se puede deshacer.</p>
        <div className='modal-action'>
          <button className='btn btn-secondary' onClick={onClose} type='button'>
            Cancelar
          </button>
          <button className='btn btn-error' onClick={onConfirm}>
            Confirmar
          </button>
        </div>
      </div>
    </dialog>
  );
}
