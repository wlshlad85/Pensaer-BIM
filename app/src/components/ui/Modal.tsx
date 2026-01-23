/**
 * Pensaer BIM Platform - Modal Component
 *
 * Reusable modal dialog with focus trapping, keyboard handling,
 * and configurable sizing.
 */

import { useEffect, useRef, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";

export type ModalSize = "sm" | "md" | "lg" | "xl" | "full";

interface ModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Called when modal should close */
  onClose: () => void;
  /** Modal title */
  title?: string;
  /** Modal content */
  children: ReactNode;
  /** Modal size */
  size?: ModalSize;
  /** Whether clicking backdrop closes modal */
  closeOnBackdrop?: boolean;
  /** Whether pressing Escape closes modal */
  closeOnEscape?: boolean;
  /** Whether to show close button */
  showCloseButton?: boolean;
  /** Footer content (buttons, etc.) */
  footer?: ReactNode;
  /** Additional CSS classes for the modal container */
  className?: string;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  full: "max-w-4xl",
};

/**
 * Modal component with focus trapping and accessibility
 */
export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  closeOnBackdrop = true,
  closeOnEscape = true,
  showCloseButton = true,
  footer,
  className,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<Element | null>(null);

  // Handle Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && closeOnEscape) {
        e.preventDefault();
        onClose();
      }
    },
    [closeOnEscape, onClose]
  );

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && closeOnBackdrop) {
        onClose();
      }
    },
    [closeOnBackdrop, onClose]
  );

  // Focus management and event listeners
  useEffect(() => {
    if (isOpen) {
      // Store currently focused element
      previousActiveElement.current = document.activeElement;

      // Focus the modal
      modalRef.current?.focus();

      // Add keyboard listener
      document.addEventListener("keydown", handleKeyDown);

      // Prevent body scroll
      document.body.style.overflow = "hidden";

      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "";

        // Restore focus to previous element
        if (previousActiveElement.current instanceof HTMLElement) {
          previousActiveElement.current.focus();
        }
      };
    }
  }, [isOpen, handleKeyDown]);

  // Focus trap - keep focus within modal
  const handleFocusTrap = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== "Tab" || !modalRef.current) return;

    const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Shift+Tab on first element - go to last
    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement.focus();
    }
    // Tab on last element - go to first
    else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement.focus();
    }
  }, []);

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      role="presentation"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-950/80 backdrop-blur-sm animate-fade-in"
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className={clsx(
          "relative w-full bg-gray-900 rounded-xl border border-gray-800 shadow-2xl",
          "animate-modal-in",
          sizeClasses[size],
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
        tabIndex={-1}
        onKeyDown={handleFocusTrap}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
            {title && (
              <h2
                id="modal-title"
                className="text-lg font-semibold text-white"
              >
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-white transition-colors rounded-md hover:bg-gray-800"
                aria-label="Close modal"
              >
                <i className="fa-solid fa-times text-lg" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="px-6 py-4">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-800">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  // Render using portal to escape DOM hierarchy
  return createPortal(modalContent, document.body);
}

/**
 * Confirm dialog built on Modal
 */
interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "info",
}: ConfirmModalProps) {
  const handleConfirm = useCallback(() => {
    onConfirm();
    onClose();
  }, [onConfirm, onClose]);

  const confirmButtonClass = clsx(
    "px-4 py-2 rounded-md font-medium transition-colors",
    variant === "danger" && "bg-red-600 hover:bg-red-700 text-white",
    variant === "warning" && "bg-yellow-600 hover:bg-yellow-700 text-white",
    variant === "info" && "bg-blue-600 hover:bg-blue-700 text-white"
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={confirmButtonClass}
          >
            {confirmText}
          </button>
        </>
      }
    >
      <p className="text-gray-300">{message}</p>
    </Modal>
  );
}

/**
 * Alert dialog (single action)
 */
interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  buttonText?: string;
  variant?: "error" | "warning" | "info" | "success";
}

export function AlertModal({
  isOpen,
  onClose,
  title,
  message,
  buttonText = "OK",
  variant = "info",
}: AlertModalProps) {
  const iconClass = clsx(
    "fa-solid text-3xl mb-2",
    variant === "error" && "fa-exclamation-circle text-red-400",
    variant === "warning" && "fa-exclamation-triangle text-yellow-400",
    variant === "info" && "fa-info-circle text-blue-400",
    variant === "success" && "fa-check-circle text-green-400"
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-md font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
        >
          {buttonText}
        </button>
      }
    >
      <div className="text-center">
        <i className={iconClass} />
        <p className="text-gray-300 mt-2">{message}</p>
      </div>
    </Modal>
  );
}

export default Modal;
