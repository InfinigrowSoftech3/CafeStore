import { useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { useTenant } from './context/TenantContext';
import { canAccessKds, UnauthorizedScreen } from '@cafe/shared';
import { wakeServer } from './services/api';
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

  useEffect(() => {
    wakeServer();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F6F2] text-[#1C1815]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-600 border-t-transparent" />
          <span className="text-xs font-semibold text-[#6E645B] tracking-wider uppercase">Connecting Kitchen Display...</span>
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
    <div className="flex flex-col min-h-screen w-full max-w-full overflow-x-hidden bg-[#F8F6F2] text-[#1C1815] font-sans select-none">
      <Analytics />
      <SpeedInsights dsn="CmYU8C4o7QrHziabP83DyQ2CEd" />

      {/* ── KDS Top Shell Header (White-based theme) ───────────────── */}
      <header className="h-14 bg-white border-b border-[#E5DED5] px-3 sm:px-4 flex items-center justify-between shrink-0 shadow-xs z-30">
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-stone-950 font-black text-sm shadow-xs shrink-0 overflow-hidden">
            <img src={tenant?.logoUrl || '/logo.png'} alt="Logo" className="h-full w-full object-cover" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-sm sm:text-base md:text-lg tracking-tight text-[#1C1815] truncate max-w-[120px] sm:max-w-none">
              {tenant?.name || 'Café'}
            </span>
            <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#F2EDE4] text-amber-700 border border-amber-600/30">
              Kitchen KDS
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Staff Info */}
          <div className="flex items-center gap-1.5 text-xs text-[#1C1815] bg-[#F2EDE4] px-2.5 py-1.5 rounded-xl border border-[#E5DED5]">
            <ChefHat size={14} className="text-amber-600 shrink-0" />
            <span className="font-semibold text-[#1C1815] max-w-[80px] sm:max-w-[120px] truncate">{user?.name || user?.email}</span>
            <span className="hidden md:inline-block text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-white text-[#6E645B] border border-[#E5DED5]/80">
              {user?.role === 'kitchen' ? 'Kitchen' : user?.role}
            </span>
          </div>

          {/* Cross-App Link: POS Register */}
          {posUrl && (
            <a
              href={posUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#F2EDE4] hover:bg-[#E5DED5] text-xs font-semibold text-emerald-700 border border-[#E5DED5] transition min-h-[36px]"
              title="Open POS Terminal"
            >
              <Monitor size={14} />
              <span>POS</span>
            </a>
          )}

          {/* Cross-App Link: Admin Console (only for owners/managers) */}
          {isManagerOrOwner && adminUrl && (
            <a
              href={adminUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#F2EDE4] hover:bg-[#E5DED5] text-xs font-semibold text-[#6E645B] hover:text-[#1C1815] border border-[#E5DED5] transition min-h-[36px]"
              title="Open Back-Office Admin"
            >
              <ExternalLink size={14} />
              <span>Admin</span>
            </a>
          )}

          {/* Logout */}
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#F2EDE4] hover:bg-red-50 hover:text-red-600 text-xs font-semibold text-[#6E645B] border border-[#E5DED5] hover:border-red-200 transition min-h-[36px]"
            title="Sign out of station"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Exit</span>
          </button>
        </div>
      </header>

      {/* ── KDS Main Kitchen Display with ErrorBoundary ────────────── */}
      <main className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5">
        <ErrorBoundary>
          <KitchenDisplayPage />
        </ErrorBoundary>
      </main>
    </div>
  );
}
