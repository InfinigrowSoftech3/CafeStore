import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmDialog({
  isOpen,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'danger', // 'danger' | 'primary' | 'warning'
  onConfirm,
  onClose,
  loading = false,
}) {
  if (!isOpen) return null;

  const btnColor = confirmVariant === 'danger'
    ? 'bg-red-600 hover:bg-red-700 text-white'
    : confirmVariant === 'warning'
    ? 'bg-amber-600 hover:bg-amber-700 text-white'
    : 'bg-stone-900 hover:bg-stone-800 text-white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-none border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              confirmVariant === 'danger' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
            }`}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-slate-900">{title}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{message}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-md border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-md px-4 py-2 text-xs font-bold shadow-2xs transition disabled:opacity-50 ${btnColor}`}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
