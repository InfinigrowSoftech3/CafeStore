import { useState } from 'react';
import { AlertTriangle, LogOut, Loader2, ShieldCheck } from 'lucide-react';
import api from '../../services/api';

export default function ImpersonationBanner({ cafeName, onExit }) {
  const [loading, setLoading] = useState(false);

  const handleExit = async () => {
    setLoading(true);
    try {
      await api.post('/platform/admin/exit-impersonation').catch(() => {});
    } finally {
      sessionStorage.removeItem('brewhaus_impersonating_cafe');
      if (onExit) {
        onExit();
      } else {
        window.location.reload();
      }
    }
  };

  return (
    <div className="sticky top-0 z-50 flex items-center justify-between border-b border-[var(--sa-primary-border)] bg-[var(--sa-primary)] px-4 py-2.5 text-xs font-medium text-white backdrop-blur-md shadow-md">
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-white">
          <AlertTriangle size={13} />
        </span>
        <span>
          <strong className="font-bold">Impersonation Mode Active:</strong>{' '}
          You are currently viewing the platform as{' '}
          <span className="underline decoration-white/50 underline-offset-2 font-bold">
            {cafeName || 'Selected Café'}
          </span>
          . All actions are attributed in the platform audit log.
        </span>
      </div>

      <button
        onClick={handleExit}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1 font-bold text-[var(--sa-primary)] transition hover:bg-white/90 disabled:opacity-50 shadow-xs"
      >
        {loading ? <Loader2 size={12} className="animate-spin" /> : <LogOut size={12} />}
        Exit Impersonation
      </button>
    </div>
  );
}