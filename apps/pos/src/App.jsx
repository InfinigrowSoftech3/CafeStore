import { useAuth } from './context/AuthContext';
import { useTenant } from './context/TenantContext';
import { canAccessPos, UnauthorizedScreen } from '@cafe/shared';
import LoginPage from './pages/LoginPage';
import POSPage from './pages/POSPage';
import ErrorBoundary from './components/ErrorBoundary';
import { LogOut, ExternalLink, User, Clock } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { env } from './config/env';

export default function App() {
  const { isAuthenticated, loading, user, logout } = useAuth();
  const tenant = useTenant();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <span className="text-xs font-semibold text-slate-400">Connecting Station...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Role Gate check
  if (!canAccessPos(user?.role)) {
    return (
      <UnauthorizedScreen
        appName="POS Terminal"
        allowedRoles={['Cashier', 'Manager', 'Owner']}
        user={user}
        onLogout={logout}
      />
    );
  }

  const adminUrl = env.adminUrl;
  const kdsUrl = env.kdsUrl;
  const isManagerOrOwner = ['owner', 'manager'].includes(user?.role);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-stone-100 font-sans select-none">
      <Analytics />
      <SpeedInsights dsn="CmYU8C4o7QrHziabP83DyQ2CEd" />

      {/* ── POS Shell Header ──────────────────────────────────────── */}
      <header className="h-12 bg-slate-950 text-white px-4 flex items-center justify-between border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0F3D2E] text-white font-bold text-xs">
            {tenant?.name?.charAt(0)?.toUpperCase() || 'C'}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm tracking-tight text-white">{tenant?.name || 'Café'}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/60">
              POS Terminal
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Staff Info */}
          <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
            <User size={13} className="text-slate-400" />
            <span className="font-semibold text-slate-200">{user?.name || user?.email}</span>
            <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
              {user?.role}
            </span>
          </div>

          {/* Cross-App Link: Kitchen Display (KDS) */}
          {kdsUrl && (
            <a
              href={kdsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-950/40 hover:bg-amber-900/60 text-xs font-semibold text-amber-300 border border-amber-800/50 transition"
              title="Open Kitchen Display (KDS)"
            >
              <Clock size={12} className="text-amber-400" />
              <span>Kitchen Display</span>
            </a>
          )}

          {/* Cross-App Link: Admin Console (only for owners/managers) */}
          {isManagerOrOwner && adminUrl && (
            <a
              href={adminUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition"
              title="Open Back-Office Admin"
            >
              <ExternalLink size={12} />
              <span>Back Office</span>
            </a>
          )}

          {/* Logout */}
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-red-950/60 hover:text-red-300 text-xs font-semibold text-slate-400 border border-slate-800 hover:border-red-900/60 transition"
            title="Sign out of station"
          >
            <LogOut size={13} />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      {/* ── POS Main Page with Inner ErrorBoundary ─────────────────── */}
      <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <ErrorBoundary>
          <POSPage />
        </ErrorBoundary>
      </main>
    </div>
  );
}
