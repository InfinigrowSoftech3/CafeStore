import { useAuth } from './context/AuthContext';
import { useTenant } from './context/TenantContext';
import { canAccessPos, UnauthorizedScreen } from '@cafe/shared';
import LoginPage from './pages/LoginPage';
import POSPage from './pages/POSPage';
import ErrorBoundary from './components/ErrorBoundary';
import { LogOut, ExternalLink, User, Clock, Coffee } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { env } from './config/env';
import { PosToaster } from './components/ui';

export default function App() {
  const { isAuthenticated, loading, user, logout } = useAuth();
  const tenant = useTenant();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-pos-bg text-pos-text">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-pos-accent border-t-transparent" />
          <span className="text-xs font-semibold text-pos-muted tracking-wider uppercase">Connecting Station...</span>
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
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-pos-bg text-pos-text font-sans select-none">
      <Analytics />
      <SpeedInsights dsn="CmYU8C4o7QrHziabP83DyQ2CEd" />
      <PosToaster />

      {/* ── Premium Espresso POS Shell Header ──────────────────────── */}
      <header className="h-14 bg-pos-surface text-pos-text px-4 flex items-center justify-between border-b border-pos-border shrink-0 z-30 shadow-elevation1">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-pos-accent text-pos-bg font-extrabold text-sm shadow-sm">
            {tenant?.name ? tenant.name.charAt(0).toUpperCase() : <Coffee size={18} />}
          </div>
          <div className="flex items-center gap-2.5">
            <span className="font-display font-bold text-base md:text-lg tracking-tight text-pos-text">
              {tenant?.name || 'Café'}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-pos-raised text-pos-accent border border-pos-accent/30">
              Counter POS
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Staff Info */}
          <div className="flex items-center gap-2 text-xs text-pos-text bg-pos-raised px-3 py-1.5 rounded-xl border border-pos-border">
            <User size={14} className="text-pos-accent" />
            <span className="font-semibold text-pos-text max-w-[120px] truncate">{user?.name || user?.email}</span>
            <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-pos-surface text-pos-muted border border-pos-border/50">
              {user?.role}
            </span>
          </div>

          {/* Cross-App Link: Kitchen Display (KDS) */}
          {kdsUrl && (
            <a
              href={kdsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pos-raised hover:bg-pos-raised/80 text-xs font-semibold text-pos-accent border border-pos-border hover:border-pos-accent transition min-h-[36px]"
              title="Open Kitchen Display (KDS)"
            >
              <Clock size={14} />
              <span>KDS</span>
            </a>
          )}

          {/* Cross-App Link: Admin Console (only for owners/managers) */}
          {isManagerOrOwner && adminUrl && (
            <a
              href={adminUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pos-raised hover:bg-pos-raised/80 text-xs font-semibold text-pos-muted hover:text-pos-text border border-pos-border transition min-h-[36px]"
              title="Open Back-Office Admin"
            >
              <ExternalLink size={14} />
              <span>Back Office</span>
            </a>
          )}

          {/* Logout */}
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pos-raised hover:bg-pos-danger/20 hover:text-pos-danger text-xs font-semibold text-pos-muted border border-pos-border hover:border-pos-danger/40 transition min-h-[36px] touch-press"
            title="Sign out of station"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Exit</span>
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
