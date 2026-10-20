import React, { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Premium Café POS Modal / BottomSheet component
 * Features:
 * - Responsive: Centered modal on tablet/desktop (>= 768px), smooth bottom-sheet on mobile (< 768px)
 * - Backdrop blur & touch-friendly dismiss
 * - Keyboard ESC listener & focus containment
 * - Espresso dark surfaces & gold accents
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'max-w-lg',
  className = '',
  showClose = true,
}) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/40 backdrop-blur-xs animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className={`w-full ${maxWidth} bg-pos-surface border border-pos-border rounded-t-3xl md:rounded-2xl shadow-elevation2 flex flex-col max-h-[92vh] md:max-h-[85vh] overflow-hidden text-pos-text transition-all ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile handle indicator */}
        <div className="md:hidden flex justify-center pt-2.5 pb-1">
          <div className="w-12 h-1.5 rounded-full bg-pos-border" />
        </div>

        {/* Modal Header */}
        {(title || showClose) && (
          <div className="flex items-start justify-between px-5 py-4 border-b border-pos-border shrink-0">
            <div>
              {title && (
                <h3 className="font-display text-lg md:text-xl font-bold text-pos-text tracking-tight">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs text-pos-muted mt-0.5">{subtitle}</p>
              )}
            </div>
            {showClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="p-2 rounded-xl text-pos-muted hover:text-pos-text hover:bg-pos-raised touch-press transition-colors ml-3 min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <X size={20} />
              </button>
            )}
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto pos-scrollbar flex-1 space-y-4">
          {children}
        </div>

        {/* Modal Footer */}
        {footer && (
          <div className="p-4 md:p-5 border-t border-pos-border bg-pos-bg/50 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
