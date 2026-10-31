import { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { useTenant } from './context/TenantContext';
import { canAccessKds, UnauthorizedScreen, getAccessToken } from '@cafe/shared';
import { wakeServer } from './services/api';
import LoginPage from './pages/LoginPage';
import KitchenDisplayPage from './pages/KitchenDisplayPage';
import ErrorBoundary from './components/ErrorBoundary';
import {
  LogOut, ExternalLink, ChefHat, Monitor, LayoutDashboard,
  UtensilsCrossed, ShoppingBag, BookOpen, Package, Layers,
  Users, BarChart2, Settings, Menu, X
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { env } from './config/env';

const getAppHref = (href) => {
  if (!href) return '';
  const token = getAccessToken();
  if (token) {
    const sep = href.includes('?') ? '&' : '?';
    return `${href}${sep}sso=${encodeURIComponent(token)}`;
  }
  return href;
};

export default function App() {
  const { isAuthenticated, loading, user, logout } = useAuth();
  const tenant = useTenant();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [clock, setClock] = useState(() => new Date());
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    wakeServer();
  }, []);

  // Real-time clock for sidebar
  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF8F3] text-[#18251F]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#E99308] border-t-transparent" />
          <span className="text-xs font-semibold text-[#718078] tracking-wider uppercase">Connecting Kitchen Display...</span>
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

  // KDS Navigation items (Section 4)
  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, href: `${adminUrl}/dashboard`, external: true },
    { label: 'Kitchen KDS', icon: UtensilsCrossed, href: '#', active: true },
    { label: 'Orders', icon: ShoppingBag, href: `${adminUrl}/orders`, external: true },
    { label: 'Menu', icon: BookOpen, href: `${adminUrl}/products`, external: true },
    { label: 'Inventory', icon: Package, href: `${adminUrl}/inventory`, external: true },
    { label: 'Tables & Floor', icon: Layers, href: `${adminUrl}/tables`, external: true },
    { label: 'Staff', icon: Users, href: `${adminUrl}/team`, external: true },
    { label: 'Reports', icon: BarChart2, href: `${adminUrl}/analytics`, external: true },
    { label: 'Settings', icon: Settings, href: `${adminUrl}/settings`, external: true },
  ];

  const formattedTime = clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const formattedDate = clock.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-[#FAF8F3] text-[#18251F] font-body select-none">
      <Analytics />
      <SpeedInsights dsn="CmYU8C4o7QrHziabP83DyQ2CEd" />

      {/* ── KDS Top Header (Section 3: Premium Design) ───────────────── */}
      <header className="h-16 bg-white border-b border-[#E9E2D8] px-3.5 sm:px-6 flex items-center justify-between shrink-0 shadow-xs z-30">
        {/* Left side: Logo, Cafe Name, Subtitle, KDS Badge */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            className="lg:hidden p-1.5 rounded-xl text-[#718078] hover:bg-[#FAF8F3] hover:text-[#18251F] transition"
            aria-label="Open kitchen navigation"
          >
            <Menu size={22} />
          </button>

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#105B43] to-[#0B3B2E] border border-[#174B3C] font-display font-extrabold text-white text-base shadow-sm shrink-0 overflow-hidden">
            {tenant?.logoUrl ? (
              <img src={tenant.logoUrl} alt="Logo" className="h-full w-full object-cover" />
            ) : (
              (tenant?.name && tenant.name !== 'Café' ? tenant.name : 'VelvetRosiee').charAt(0).toUpperCase()
            )}
          </div>

          <div className="flex flex-col">
            <span className="font-display font-extrabold text-base sm:text-lg text-[#18251F] tracking-tight leading-none truncate max-w-[130px] sm:max-w-none">
              {tenant?.name && tenant.name !== 'Café' ? tenant.name : 'VelvetRosiee'}
            </span>
            <span className="text-[10px] font-bold tracking-widest uppercase text-[#718078] mt-1 leading-none">
              {tenant?.tagline || 'CAFE & BISTRO'}
            </span>
          </div>

          <span className="hidden sm:inline-flex items-center gap-1.5 text-[10.5px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-[#0B3B2E] text-[#20D99A] border border-[#174B3C] shadow-2xs shrink-0">
            <ChefHat size={13} className="text-[#20D99A]" />
            KITCHEN KDS
          </span>
        </div>

        {/* Right side: User, Role, POS, Admin, Exit */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* User Name & Role Badge */}
          <div className="flex items-center gap-2 text-xs text-[#18251F] bg-[#FAF8F3] px-3 py-1.5 rounded-xl border border-[#E9E2D8] shrink-0">
            <ChefHat size={15} className="text-[#059669] shrink-0 hidden sm:inline" />
            <span className="font-bold text-[#18251F] max-w-[90px] sm:max-w-[140px] truncate">
              {user?.name || user?.email || 'Dhruvil Kyada'}
            </span>
            <span className="text-[9.5px] uppercase font-mono font-extrabold px-1.5 py-0.5 rounded bg-white text-[#062F25] border border-[#E9E2D8]">
              {user?.role?.toUpperCase() || 'OWNER'}
            </span>
          </div>

          {/* POS Terminal Navigation */}
          {posUrl && (
            <a
              href={getAppHref(posUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF8F3] hover:bg-[#EAE3D9] text-xs font-semibold text-[#062F25] border border-[#E9E2D8] transition shadow-2xs min-h-[36px]"
              title="Open POS Terminal"
            >
              <Monitor size={14} className="text-[#059669]" />
              <span>POS</span>
            </a>
          )}

          {/* Admin Back-Office Link (Owners / Managers) */}
          {isManagerOrOwner && adminUrl && (
            <a
              href={getAppHref(adminUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF8F3] hover:bg-[#EAE3D9] text-xs font-semibold text-[#062F25] border border-[#E9E2D8] transition shadow-2xs min-h-[36px]"
              title="Open Back-Office Admin"
            >
              <ExternalLink size={14} className="text-[#718078]" />
              <span>Admin</span>
            </a>
          )}

          {/* Exit / Sign Out Button */}
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF8F3] hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-xs font-semibold text-[#718078] border border-[#E9E2D8] transition shadow-2xs min-h-[36px] cursor-pointer"
            title="Sign out of station"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Exit</span>
          </button>
        </div>
      </header>

      {/* ── Main Body with Fixed Sidebar & Workspace ─────────────────── */}
      <div className="flex flex-1 min-h-0 w-full overflow-hidden">
        {/* Desktop Fixed Sidebar (Section 4: Dark Forest-Green #062F25) */}
        <aside className="w-[220px] shrink-0 hidden lg:flex flex-col h-full bg-[#062F25] border-r border-[#174B3C] text-white select-none">
          {/* Navigation Items List */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 sidebar-scrollbar">
            {navItems.map((item) => {
              const Icon = item.icon;
              if (item.active) {
                return (
                  <div
                    key={item.label}
                    className="relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-200 bg-[#105B43] text-white shadow-[0_2px_8px_rgba(16,91,67,0.35)]"
                  >
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 rounded-r-full bg-[#20D99A] shadow-[0_0_8px_rgba(32,217,154,0.7)]" />
                    <Icon size={19} className="text-white shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </div>
                );
              }

              return (
                <a
                  key={item.label}
                  href={getAppHref(item.href)}
                  target={item.external ? '_blank' : undefined}
                  rel={item.external ? 'noopener noreferrer' : undefined}
                  className="relative flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200 text-[#A9C7B8] hover:bg-[#104737] hover:text-[#F5FFF9] group"
                >
                  <div className="flex items-center gap-3 truncate">
                    <Icon size={19} className="text-[#A9CFC0] group-hover:text-white transition-colors shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.external && (
                    <ExternalLink size={12} className="text-[#80AD98] group-hover:text-white transition-colors shrink-0 opacity-70 group-hover:opacity-100" />
                  )}
                </a>
              );
            })}
          </nav>

          {/* Bottom Section: Kitchen Online status & live clock */}
          <div className="p-3.5 border-t border-[#174B3C] bg-[#062F25] shrink-0 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#F5FFF9]">
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isOnline ? 'bg-[#20D99A]' : 'bg-red-400'}`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isOnline ? 'bg-[#20D99A]' : 'bg-red-500'}`} />
              </span>
              <span>{isOnline ? 'Kitchen Online' : 'Kitchen Offline'}</span>
            </div>

            <div className="text-[11px] font-mono text-[#A9C7B8] tabular-nums tracking-wide">
              {formattedTime}
            </div>
            <div className="text-[10px] text-[#80AD98] font-medium leading-none">
              {formattedDate}
            </div>
          </div>
        </aside>

        {/* Mobile / Tablet Collapsible Sidebar Drawer */}
        <AnimatePresence>
          {mobileSidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileSidebarOpen(false)}
                className="fixed inset-0 z-40 lg:hidden bg-black/60 backdrop-blur-xs"
              />
              <motion.div
                initial={{ x: -240 }}
                animate={{ x: 0 }}
                exit={{ x: -240 }}
                transition={{ type: 'spring', stiffness: 280, damping: 30 }}
                className="fixed inset-y-0 left-0 z-50 w-[240px] lg:hidden flex flex-col bg-[#062F25] border-r border-[#174B3C] text-white"
              >
                {/* Mobile Drawer Header */}
                <div className="h-16 px-4 border-b border-[#174B3C] flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#105B43] to-[#0B3B2E] border border-[#174B3C] font-display font-extrabold text-white text-sm">
                      {(tenant?.name || 'V').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-display font-extrabold text-sm text-[#F5FFF9] leading-tight">
                        {tenant?.name || 'VelvetRosiee'}
                      </span>
                      <span className="text-[9.5px] uppercase font-bold text-[#80AD98]">
                        Kitchen KDS
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileSidebarOpen(false)}
                    className="p-1.5 rounded-lg text-[#A9CFC0] hover:text-white hover:bg-[#104737]"
                    aria-label="Close drawer"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Mobile Navigation List */}
                <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 sidebar-scrollbar">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    if (item.active) {
                      return (
                        <div
                          key={item.label}
                          className="relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold bg-[#105B43] text-white shadow-xs"
                        >
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 rounded-r-full bg-[#20D99A]" />
                          <Icon size={19} className="text-white shrink-0" />
                          <span>{item.label}</span>
                        </div>
                      );
                    }

                    return (
                      <a
                        key={item.label}
                        href={getAppHref(item.href)}
                        target={item.external ? '_blank' : undefined}
                        rel={item.external ? 'noopener noreferrer' : undefined}
                        onClick={() => setMobileSidebarOpen(false)}
                        className="relative flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-[#A9C7B8] hover:bg-[#104737] hover:text-white"
                      >
                        <div className="flex items-center gap-3 truncate">
                          <Icon size={19} className="text-[#A9CFC0] shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </div>
                        {item.external && <ExternalLink size={12} className="text-[#80AD98] shrink-0" />}
                      </a>
                    );
                  })}
                </nav>

                {/* Mobile Drawer Bottom Info */}
                <div className="p-4 border-t border-[#174B3C] bg-[#062F25] shrink-0 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#F5FFF9]">
                    <span className={`inline-flex rounded-full h-2 w-2 ${isOnline ? 'bg-[#20D99A]' : 'bg-red-500'}`} />
                    <span>{isOnline ? 'Kitchen Online' : 'Kitchen Offline'}</span>
                  </div>
                  <div className="text-[11px] font-mono text-[#A9C7B8]">{formattedTime}</div>
                  <div className="text-[10px] text-[#80AD98]">{formattedDate}</div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Right side: Main Kitchen Workspace (Warm Cream #FAF8F3) */}
        <main className="flex-1 min-h-0 overflow-y-auto bg-[#FAF8F3] p-3 sm:p-5 lg:p-6 kds-scrollbar">
          <ErrorBoundary>
            <KitchenDisplayPage />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
