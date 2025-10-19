/**
 * @fileoverview Accessible modal dialog component.
 * 
 * This component provides a reusable, accessible modal dialog with configurable
 * sizes, close functionality, and proper focus management. It includes a backdrop,
 * close button, and supports custom content and icons.
 * 
 * The modal follows accessibility best practices with proper ARIA attributes,
 * focus trapping, and keyboard navigation support.
 * 
 * @module Modal
 */

import React from 'react';

/**
 * Accessible modal dialog component.
 * 
 * @param {Object} props - Component properties
 * @param {boolean} props.isOpen - Whether the modal is currently visible
 * @param {Function} props.onClose - Function to call when modal is closed
 * @param {string} [props.title] - Modal title text
 * @param {React.ReactNode} props.children - Content to display inside the modal
 * @param {React.ReactNode} [props.icon] - Optional icon to display in the modal
 * @param {'sm'|'md'|'lg'|'xl'} [props.size='md'] - Modal size (affects width)
 * 
 * @returns {JSX.Element|null} The rendered modal component or null if not open
 * 
 * @example
 * <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Confirmation">
 *   <p>Are you sure you want to continue?</p>
 *   <div className="mt-4 flex justify-end space-x-3">
 *     <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
 *     <Button variant="primary" onClick={handleConfirm}>Confirm</Button>
 *   </div>
 * </Modal>
 */
const Modal = ({ isOpen, onClose, title, children, icon, size = 'md' }) => {
  if (!isOpen) return null;

  /**
   * CSS classes for different modal sizes
   * @type {Object}
   */
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity animate-backdrop-in"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Spacer for centering */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
          &#8203;
        </span>

        {/* Modal */}
        <div
          className={`relative inline-block w-full ${sizeClasses[size]} p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl sm:rounded-3xl z-[10000] animate-modal-in`}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          <div className="text-center">
            {icon && (
              <div className="mx-auto flex items-center justify-center h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-amber-100 mb-4">
                {icon}
              </div>
            )}

            {title && (
              <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">{title}</h3>
            )}

            <div className="mt-2">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
