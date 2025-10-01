'use client'

import { useEffect, useRef } from 'react'

interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  isLoading?: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  confirmButtonStyle?: 'danger' | 'primary'
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  confirmButtonStyle = 'danger'
}: ConfirmationModalProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const confirmButtonRef = useRef<HTMLButtonElement>(null)

  // Focus management and keyboard navigation
  useEffect(() => {
    if (isOpen) {
      // Focus the cancel button by default for safety
      cancelButtonRef.current?.focus()

      // Prevent body scroll
      document.body.style.overflow = 'hidden'

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && !isLoading) {
          onClose()
        }
        if (event.key === 'Enter' && !isLoading) {
          onConfirm()
        }
        if (event.key === 'Tab') {
          // Trap focus within modal
          const focusableElements = [cancelButtonRef.current, confirmButtonRef.current].filter(Boolean)
          const currentIndex = focusableElements.indexOf(document.activeElement as HTMLButtonElement)

          if (event.shiftKey) {
            // Shift + Tab (backward)
            const nextIndex = currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1
            event.preventDefault()
            focusableElements[nextIndex]?.focus()
          } else {
            // Tab (forward)
            const nextIndex = currentIndex >= focusableElements.length - 1 ? 0 : currentIndex + 1
            event.preventDefault()
            focusableElements[nextIndex]?.focus()
          }
        }
      }

      document.addEventListener('keydown', handleKeyDown)

      return () => {
        document.removeEventListener('keydown', handleKeyDown)
        document.body.style.overflow = 'unset'
      }
    }
    return
  }, [isOpen, isLoading, onClose, onConfirm])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 backdrop-blur-sm transition-opacity"
          onClick={!isLoading ? onClose : undefined}
          aria-hidden="true"
        />

        {/* Modal panel */}
        <div
          className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          aria-describedby="modal-description"
        >
          {/* Warning icon */}
          <div className="sm:flex sm:items-start">
            <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </div>

            {/* Modal content */}
            <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
              <h3
                className="text-base font-semibold leading-6 text-gray-900"
                id="modal-title"
              >
                {title}
              </h3>
              <div className="mt-2">
                <p
                  className="text-sm text-gray-500 leading-relaxed"
                  id="modal-description"
                >
                  {message}
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            <button
              ref={confirmButtonRef}
              type="button"
              disabled={isLoading}
              onClick={onConfirm}
              className={`inline-flex w-full justify-center items-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm ring-1 ring-inset ring-transparent transition-all duration-200 sm:ml-3 sm:w-auto min-h-[2.5rem] ${
                confirmButtonStyle === 'danger'
                  ? 'bg-red-600 hover:bg-red-500 focus:ring-red-500 disabled:bg-red-400'
                  : 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500 disabled:bg-primary-400'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed`}
              aria-describedby={isLoading ? 'loading-description' : undefined}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Eliminando...
                  <span className="sr-only" id="loading-description">
                    Eliminando evento, por favor espera
                  </span>
                </div>
              ) : (
                confirmText
              )}
            </button>

            <button
              ref={cancelButtonRef}
              type="button"
              disabled={isLoading}
              onClick={onClose}
              className="mt-3 inline-flex w-full justify-center items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-primary-600 shadow-sm ring-2 ring-inset ring-primary-600 hover:bg-primary-50 transition-all duration-200 sm:mt-0 sm:w-auto min-h-[2.5rem] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {cancelText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}