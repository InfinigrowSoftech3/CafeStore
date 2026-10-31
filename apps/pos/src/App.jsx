import { useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { useTenant } from './context/TenantContext';
import { canAccessPos, UnauthorizedScreen } from '@cafe/shared';
import { wakeServer } from './services/api';
import LoginPage from './pages/LoginPage';
import POSPage from './pages/POSPage';
import ErrorBoundary from './components/ErrorBoundary';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { PosToaster } from './components/ui';

export default function App() {
  const { isAuthenticated, loading, user, logout } = useAuth();
  const tenant = useTenant();

  useEffect(() => {
    wakeServer();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF8F3] text-[#18251F]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#E99308] border-t-transparent" />
          <span className="text-xs font-bold text-[#718078] tracking-wider uppercase font-mono">
            Connecting Station...
          </span>
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

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#FAF8F3] text-[#18251F] font-sans select-none">
      <Analytics />
      <SpeedInsights dsn="CmYU8C4o7QrHziabP83DyQ2CEd" />
      <PosToaster />

      {/* ── Main POS Terminal Interface ────────────────────────────── */}
      <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <ErrorBoundary>
          <POSPage onLogout={logout} user={user} tenant={tenant} />
        </ErrorBoundary>
      </main>
    </div>
  );
}
