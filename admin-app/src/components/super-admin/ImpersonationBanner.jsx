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
    <div className="sticky top-0 z-50 flex items-center justify-between border-b border-[#E6CF7A]/40 bg-[#0B1B4D] px-4 py-2.5 text-xs font-medium text-slate-200 backdrop-blur-md shadow-md">
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#D4AF37]/20 text-[#D4AF37]">
          <AlertTriangle size={13} />
        </span>
        <span>
          <strong className="font-bold text-white">Impersonation Mode Active:</strong>{' '}
          You are currently viewing the platform as{' '}
          <span className="underline decoration-[#D4AF37]/50 underline-offset-2 font-bold text-[#D4AF37]">
            {cafeName || 'Selected Café'}
          </span>
          . All actions are attributed in the platform audit log.
        </span>
      </div>

      <button
        onClick={handleExit}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-lg bg-[#D4AF37] px-3 py-1 font-bold text-[#0B1B4D] transition hover:bg-[#C29B22] disabled:opacity-50 shadow-xs"
      >
        {loading ? <Loader2 size={12} className="animate-spin" /> : <LogOut size={12} />}
        Exit Impersonation
      </button>
    </div>
  );
}