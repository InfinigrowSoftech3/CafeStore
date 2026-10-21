import { useEffect } from 'react';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export default function Drawer({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 'max-w-md', // max-w-md, max-w-lg, max-w-xl, max-w-2xl
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0"
            style={{ backgroundColor: 'var(--drawer-backdrop)', backdropFilter: 'blur(4px)' }}
          />

          {/* Drawer content */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 240 }}
            className={`relative z-10 flex h-full w-full ${width} flex-col custom-scrollbar`}
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-primary)',
              boxShadow: 'var(--popover-shadow)',
              color: 'var(--text-primary)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b px-6 py-5 shrink-0"
              style={{ borderColor: 'var(--border-primary)', backgroundColor: 'var(--hover-bg)/50' }}
            >
              <div>
                <h2 className="font-display text-lg font-bold text-[var(--text-primary)] tracking-tight">
                  {title}
                </h2>
                {subtitle && (
                  <p className="mt-1 text-xs text-[var(--text-muted)] font-medium leading-relaxed">
                    {subtitle}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-[var(--text-muted)] hover:border-[var(--border-primary)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)] transition active:scale-95 shrink-0"
                aria-label="Close panel"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="border-t px-6 py-4"
                style={{ borderColor: 'var(--border-primary)/80', backgroundColor: 'var(--hover-bg)/80' }}
              >
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}