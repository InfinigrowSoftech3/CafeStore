import { useAuth } from './context/AuthContext';
import { useTenant } from './context/TenantContext';
import { canAccessKds, UnauthorizedScreen } from '@cafe/shared';
import LoginPage from './pages/LoginPage';
import KitchenDisplayPage from './pages/KitchenDisplayPage';
import ErrorBoundary from './components/ErrorBoundary';
import { LogOut, ExternalLink, ChefHat, Monitor } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { env } from './config/env';

export default function App() {
  const { isAuthenticated, loading, user, logout } = useAuth();
  const tenant = useTenant();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-950 text-stone-200">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
          <span className="text-xs font-semibold text-stone-400">Connecting Kitchen Display...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Role Gate check for KDS
  if (!canAccessKds(user?.role)) {
    return (
      <UnauthorizedScreen
        appName="Kitchen Display"
        allowedRoles={['Kitchen / Barista', 'Manager', 'Owner']}
        user={user}
        onLogout={logout}
      />
    );
  }

  const adminUrl = env.adminUrl;
  const posUrl = env.posUrl;
  const isManagerOrOwner = ['owner', 'manager'].includes(user?.role);

  return (
    <div className="flex flex-col min-h-screen w-screen bg-stone-950 text-stone-100 font-sans select-none">
      <Analytics />
      <SpeedInsights dsn="CmYU8C4o7QrHziabP83DyQ2CEd" />

      {/* ── KDS Top Shell Header ────────────────────────────────────── */}
      <header className="h-12 bg-stone-900 border-b border-stone-800 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-stone-950 font-bold text-xs">
            🍳
          </div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm tracking-tight text-white">{tenant?.name || 'Café'}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
              Kitchen Display (KDS)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Staff Info */}
          <div className="flex items-center gap-2 text-xs text-stone-300 bg-stone-950 px-2.5 py-1 rounded-lg border border-stone-800">
            <ChefHat size={13} className="text-amber-400" />
            <span className="font-semibold text-stone-200">{user?.name || user?.email}</span>
            <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-stone-800 text-stone-400">
              {user?.role === 'kitchen' ? 'Kitchen/Barista' : user?.role}
            </span>
          </div>

          {/* Cross-App Link: POS Register */}
          {posUrl && (
            <a
              href={posUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/60 text-xs font-semibold text-emerald-300 border border-emerald-800/50 transition"
              title="Open POS Terminal"
            >
              <Monitor size={12} className="text-emerald-400" />
              <span>POS Terminal</span>
            </a>
          )}

          {/* Cross-App Link: Admin Console (only for owners/managers) */}
          {isManagerOrOwner && adminUrl && (
            <a
              href={adminUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs font-semibold text-stone-200 border border-stone-700 transition"
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
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-950 hover:bg-red-950/60 hover:text-red-300 text-xs font-semibold text-stone-400 border border-stone-800 hover:border-red-900/60 transition"
            title="Sign out of station"
          >
            <LogOut size={13} />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      {/* ── KDS Main Body with ErrorBoundary ───────────────────────── */}
      <main className="flex-1 p-3 sm:p-4 overflow-y-auto">
        <ErrorBoundary>
          <KitchenDisplayPage />
        </ErrorBoundary>
      </main>
    </div>
  );
}
