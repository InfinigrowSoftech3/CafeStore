import React from 'react';
import { ShieldAlert, LogOut, ExternalLink } from 'lucide-react';

export default function UnauthorizedScreen({
  appName = 'this application',
  allowedRoles = [],
  user = null,
  onLogout,
  posUrl = import.meta.env?.VITE_POS_URL,
  kdsUrl = import.meta.env?.VITE_KDS_URL,
  adminUrl = import.meta.env?.VITE_ADMIN_APP_URL || import.meta.env?.VITE_ADMIN_URL,
}) {
  const currentRole = user?.role || 'unknown';
  const roleName = user?.name || user?.email || 'Authenticated User';

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6 text-center select-none font-sans">
      <div className="w-full max-w-md bg-slate-800/90 border border-slate-700/80 rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
        <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 flex items-center justify-center mx-auto mb-5 shadow-lg">
          <ShieldAlert size={32} />
        </div>

        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-2">
          Not Authorized for {appName}
        </h1>

        <p className="text-sm text-slate-300 mb-6 leading-relaxed">
          Your account is signed in, but does not have permission to access the{' '}
          <span className="font-semibold text-white">{appName}</span>.
        </p>

        <div className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-4 mb-6 text-left space-y-2 text-xs">
          <div className="flex justify-between items-center text-slate-400">
            <span>Signed in as:</span>
            <span className="font-medium text-slate-200 truncate max-w-[200px]">{roleName}</span>
          </div>
          <div className="flex justify-between items-center text-slate-400">
            <span>Your Assigned Role:</span>
            <span className="px-2 py-0.5 rounded-full font-bold uppercase text-[10px] bg-red-900/40 text-red-300 border border-red-700/50">
              {currentRole}
            </span>
          </div>
          {allowedRoles.length > 0 && (
            <div className="flex justify-between items-center text-slate-400">
              <span>Required Role(s):</span>
              <span className="font-semibold text-emerald-400">
                {allowedRoles.join(', ')}
              </span>
            </div>
          )}
        </div>

        {/* Alternative App Links based on role */}
        <div className="space-y-2 mb-6">
          {['owner', 'manager', 'cashier'].includes(currentRole) && posUrl && appName !== 'POS Terminal' && (
            <a
              href={posUrl}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-xs font-semibold text-white transition border border-slate-600"
            >
              <ExternalLink size={14} /> Open POS Terminal
            </a>
          )}
          {['owner', 'manager', 'kitchen'].includes(currentRole) && kdsUrl && appName !== 'Kitchen Display' && (
            <a
              href={kdsUrl}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-xs font-semibold text-white transition border border-slate-600"
            >
              <ExternalLink size={14} /> Open Kitchen Display (KDS)
            </a>
          )}
          {['owner', 'manager'].includes(currentRole) && adminUrl && appName !== 'Café Admin' && (
            <a
              href={adminUrl}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-xs font-semibold text-white transition border border-slate-600"
            >
              <ExternalLink size={14} /> Open Café Admin
            </a>
          )}
        </div>

        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 active:scale-[0.99] text-xs font-bold text-white transition shadow-md"
          >
            <LogOut size={14} /> Switch Account / Sign Out
          </button>
        )}
      </div>
    </div>
  );
}
