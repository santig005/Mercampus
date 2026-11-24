'use client';
import { FcHighPriority } from 'react-icons/fc';
import { IoClose } from 'react-icons/io5';

// T-134: shared by /antojos/product/add (T-119, T-127) and
// /antojos/sellers/register, so the two forms show one error dialog instead
// of drifting copies - the register page used to import the icons for this
// and never render it at all. Takes only props, no data access and no
// next-intl: each caller keeps picking its own translated strings.
//
// Markup, ids and classes are unchanged from product/add's original dialog
// (same `alert alert-error` token from T-127, which tracks the theme instead
// of a hardcoded colour) so its existing Playwright coverage still applies
// once it renders through here.
const FormErrorModal = ({ attentionLabel, message, fields = [], onClose }) => {
  return (
    <dialog id='errors' className={`modal ${message ? 'modal-open' : ''}`}>
      <div className='modal-box p-3'>
        <div
          role='alert'
          className='alert alert-error flex justify-start items-start gap-3 w-full'
        >
          <div className=''>
            <FcHighPriority className='text-4xl' />
          </div>
          <div className='w-full'>
            <h3 className='font-bold text-lg flex justify-between'>
              {attentionLabel}
              <form method='dialog'>
                {/* if there is a button in form, it will close the modal */}
                <button className='font-normal' onClick={onClose}>
                  <IoClose className='text-2xl' />
                </button>
              </form>
            </h3>
            <p className='py-2'>{message}</p>
            {fields.length > 0 && (
              <ul className='list-disc list-inside text-sm -mt-1 pb-1'>
                {fields.map(({ field, message: fieldMessage }) => (
                  <li key={field}>
                    <span className='font-semibold'>{field}:</span> {fieldMessage}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </dialog>
  );
};

export default FormErrorModal;
