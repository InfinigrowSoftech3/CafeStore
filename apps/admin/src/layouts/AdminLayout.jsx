import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard, Monitor, ShoppingBag, UtensilsCrossed, Tag,
  Users, Star, BadgePercent, Bell, Package, PackageCheck, Truck,
  TrendingDown, BarChart2, Settings, CreditCard, LogOut, ChevronLeft,
  ChevronRight, Menu, RefreshCw, Store, Smartphone, Wifi,
  WifiOff, Search, Clock, Shield, AlertTriangle, CheckCircle2, ChevronDown,
  Layers, ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { canAccessPos, canManageMenu, canManageTeam, canViewOrders } from '../utils/roles';
import api from '../services/api';
import { env } from '../config/env';
import { getAccessToken } from '@cafe/shared';
import CommandPaletteModal from '../components/common/CommandPaletteModal';
import CustomSelect from '../components/common/CustomSelect';

const getAppHref = (href) => {
  if (!href) return '';
  const token = getAccessToken();
  if (token && (href.startsWith(env.posUrl) || href.startsWith(env.kdsUrl))) {
    const sep = href.includes('?') ? '&' : '?';
    return `${href}${sep}sso=${encodeURIComponent(token)}`;
  }
  return href;
};

// 5 Grouped Navigation Modules
const NAV_GROUPS = [
  {
    title: 'Operations',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', access: 'any' },
      { href: env.posUrl, icon: Monitor, label: 'POS Terminal', access: 'pos', isExternal: true },
      { to: '/orders', icon: ShoppingBag, label: 'Orders', access: 'orders' },
      { href: env.kdsUrl, icon: Clock, label: 'Kitchen Display', access: 'orders', isExternal: true },
      { to: '/tables', icon: Layers, label: 'Tables & Floor', access: 'menu' },
    ],
  },
  {
    title: 'Catalog',
    items: [
      { to: '/products', icon: UtensilsCrossed, label: 'Products', access: 'menu' },
      { to: '/categories', icon: Tag, label: 'Categories', access: 'menu' },
      { to: '/inventory', icon: Package, label: 'Inventory', access: 'menu' },
    ],
  },
  {
    title: 'Growth',
    items: [
      { to: '/customers', icon: Users, label: 'Customers CRM', access: 'menu' },
      { to: '/reviews', icon: Star, label: 'Reviews', access: 'menu' },
      { to: '/coupons', icon: BadgePercent, label: 'Coupons & Offers', access: 'menu' },
      { to: '/notifications', icon: Bell, label: 'Notifications', access: 'menu' },
    ],
  },
  {
    title: 'Finance',
    items: [
      { to: '/purchases', icon: PackageCheck, label: 'Purchases / PO', access: 'menu' },
      { to: '/suppliers', icon: Truck, label: 'Suppliers', access: 'menu' },
      { to: '/expenses', icon: TrendingDown, label: 'Expenses', access: 'menu' },
      { to: '/analytics', icon: BarChart2, label: 'Analytics', access: 'menu' },
    ],
  },
  {
    title: 'Administration',
    items: [
      { to: '/team', icon: Shield, label: 'Team & Security', access: 'owner' },
      { to: '/billing', icon: CreditCard, label: 'Plan & Billing', access: 'owner' },
      { to: '/settings', icon: Settings, label: 'Café Settings', access: 'owner' },
    ],
  },
];

export default function AdminLayout({ children, title }) {
  const { user, logout } = useAuth();
  const tenant = useTenant();
  const navigate = useNavigate();
  const location = useLocation();

  // Layout states
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem('admin:sidebar_collapsed') === 'true' || localStorage.getItem('cafe_admin_sidebar_collapsed') === 'true');
  const [refreshing, setRefreshing] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  // Connectivity & Sync status
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Branches
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState(() => localStorage.getItem('admin:activeBranchId') || localStorage.getItem('activeBranchId') || '');

  // Live alerts & billing summary for contextual banners
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [billingSummary, setBillingSummary] = useState(null);

  // Toggle collapse
  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('admin:sidebar_collapsed', String(next));
      return next;
    });
  };

  // ⌘K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowCommandPalette(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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

  // Close mobile drawer on route navigation
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Load branches
  useEffect(() => {
    api.get('/branches').then(res => {
      const list = res.data?.branches || [];
      setBranches(list);
      if (!selectedBranchId && list.length > 0) {
        const main = list.find(b => b.isMain) || list[0];
        setSelectedBranchId(main._id);
        localStorage.setItem('admin:activeBranchId', main._id);
        api.defaults.headers.common['X-Branch-Id'] = main._id;
      } else if (selectedBranchId) {
        api.defaults.headers.common['X-Branch-Id'] = selectedBranchId;
      }
    }).catch(() => {});
  }, []);

  // Poll pending orders count and check billing usage
  useEffect(() => {
    const checkLiveCounters = () => {
      api.get('/orders?status=pending&limit=1').then(res => {
        setPendingOrdersCount(res.data?.total || res.data?.orders?.length || 0);
      }).catch(() => {});

      if (user?.role === 'owner') {
        api.get('/tenant/billing/summary').then(res => {
          setBillingSummary(res.data);
        }).catch(() => {});
      }
    };

    checkLiveCounters();
    const interval = setInterval(checkLiveCounters, 30000);
    return () => clearInterval(interval);
  }, [user?.role]);

  const handleBranchChange = (newBranchId) => {
    setSelectedBranchId(newBranchId);
    localStorage.setItem('admin:activeBranchId', newBranchId);
    api.defaults.headers.common['X-Branch-Id'] = newBranchId;
    window.location.reload();
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleRefresh = () => {
    setRefreshing(true);
    window.location.reload();
  };

  // Role check helper
  const canAccessItem = (access) => {
    if (access === 'any') return true;
    if (access === 'pos') return canAccessPos(user?.role);
    if (access === 'orders') return canViewOrders(user?.role);
    if (access === 'menu') return canManageMenu(user?.role);
    if (access === 'owner') return canManageTeam(user?.role);
    return true;
  };

  // Check if over plan limits
  const isOverMenuLimit = billingSummary?.usage?.menuItems > billingSummary?.limits?.menuItems;
  const isTrialActive = billingSummary?.subscription?.status === 'trial';
  const trialDaysRemaining = billingSummary?.subscription?.trialDaysRemaining;

  return (
    <div className="flex h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] overflow-hidden font-body select-none" style={{ height: '100dvh' }}>
      {/* ── Left Sidebar ────────────────────────────────────────── */}
      <aside
        className={`hidden md:flex flex-col h-full shrink-0 border-r border-slate-200 bg-white transition-all duration-300 z-30 custom-scrollbar ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* 1. Tenant Brand Header */}
        <div className="h-16 shrink-0 flex items-center justify-between px-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-3 min-w-0 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-none border border-slate-200 bg-[#0F3D2E] font-display text-base font-extrabold text-white shadow-2xs overflow-hidden">
              {tenant.logoUrl ? (
                <img src={tenant.logoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                ((tenant.name && tenant.name !== 'Café') ? tenant.name : user?.tenantName || tenant.name || 'V').charAt(0).toUpperCase()
              )}
            </div>

            {!isCollapsed && (
              <div className="min-w-0 truncate">
                <div className="truncate font-display text-sm font-extrabold text-slate-900 tracking-wide">
                  {(tenant.name && tenant.name !== 'Café') ? tenant.name : user?.tenantName || tenant.name || 'Café'}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="truncate">Admin Console</span>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={toggleCollapse}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse to icon rail'}
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* 2. Grouped Navigation Modules (Scrollable independently) */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar min-h-0">
          {NAV_GROUPS.map((group) => {
            const visibleItems = group.items.filter(item => canAccessItem(item.access));
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.title} className="space-y-1">
                {!isCollapsed && (
                  <div className="px-3 pt-1 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    {group.title}
                  </div>
                )}

                {visibleItems.map(({ to, href, icon: Icon, label, isExternal }) => {
                  if (isExternal && href) {
                    return (
                      <a
                        key={label}
                        href={getAppHref(href)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={isCollapsed ? label : undefined}
                        className={`w-full flex items-center gap-3 rounded-none px-3 py-2 text-xs font-semibold transition group text-slate-600 hover:bg-slate-50 hover:text-slate-950 border-l-4 border-transparent ${
                          isCollapsed ? 'justify-center' : ''
                        }`}
                      >
                        <Icon size={17} className="shrink-0 text-slate-400 group-hover:text-slate-700 transition" />
                        {!isCollapsed && (
                          <div className="flex items-center justify-between flex-1 truncate">
                            <span className="truncate">{label}</span>
                            <ExternalLink size={11} className="text-slate-400 group-hover:text-slate-600 ml-1.5" />
                          </div>
                        )}
                      </a>
                    );
                  }
                  const isActive = location.pathname === to || (to !== '/dashboard' && location.pathname.startsWith(to) && to !== '/orders');
                  return (
                    <NavLink
                      key={to}
                      to={to}
                      title={isCollapsed ? label : undefined}
                      className={({ isActive: directActive }) => {
                        const active = directActive || isActive;
                        return `w-full flex items-center gap-3 rounded-none px-3 py-2 text-xs font-semibold transition group ${
                          active
                            ? 'bg-emerald-50 text-emerald-950 font-bold border-l-4 border-[#0F3D2E] shadow-2xs'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950 border-l-4 border-transparent'
                        } ${isCollapsed ? 'justify-center' : ''}`;
                      }}
                    >
                      <Icon
                        size={17}
                        className={`shrink-0 transition ${
                          isActive ? 'text-[#0F3D2E]' : 'text-slate-400 group-hover:text-slate-700'
                        }`}
                      />
                      {!isCollapsed && <span className="truncate">{label}</span>}
                    </NavLink>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* 3. Sticky User Profile & Sign Out Footer */}
        <div className="border-t border-slate-200 p-3 bg-slate-50/80 shrink-0 space-y-2">
          <NavLink
            to="/profile"
            title={isCollapsed ? `${user?.name} (${user?.role})` : undefined}
            className={`flex items-center gap-3 rounded-none p-2 transition hover:bg-slate-100 ${
              isCollapsed ? 'justify-center' : ''
            }`}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0F3D2E] text-white font-bold text-xs shadow-2xs">
              {user?.name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1 truncate">
                <div className="truncate text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="truncate">{user?.name || 'Staff Member'}</span>
                  <span className="text-[9px] uppercase px-1.5 py-0.5 rounded-full font-bold bg-slate-200 text-slate-700 font-mono">
                    {user?.role || 'staff'}
                  </span>
                </div>
                <div className="truncate text-[10px] text-slate-500 font-mono">
                  {user?.email || ''}
                </div>
              </div>
            )}
          </NavLink>

          <button
            onClick={handleLogout}
            title={isCollapsed ? 'Sign out' : undefined}
            className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition bg-white hover:bg-red-50 hover:text-red-700 hover:border-red-200 border border-slate-200 text-slate-600 ${
              isCollapsed ? 'justify-center' : ''
            }`}
          >
            <LogOut size={14} className="shrink-0" />
            {!isCollapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* ── Mobile Drawer ───────────────────────────────────────── */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 z-40 md:hidden bg-slate-900/50 backdrop-blur-xs"
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              className="fixed inset-y-0 left-0 z-50 w-[calc(100vw-2.5rem)] max-w-72 md:hidden flex flex-col bg-white border-r border-slate-200 text-slate-800 custom-scrollbar touch-scroll pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
            >
              {/* Mobile Header */}
              <div className="h-16 shrink-0 flex items-center justify-between px-4 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-none bg-[#0F3D2E] border border-slate-200 flex items-center justify-center font-bold text-white shadow-2xs">
                    {tenant.logoUrl ? (
                      <img src={tenant.logoUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      ((tenant.name && tenant.name !== 'Café') ? tenant.name : user?.tenantName || tenant.name || 'V').charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <div className="font-extrabold text-sm text-slate-900">
                      {(tenant.name && tenant.name !== 'Café') ? tenant.name : user?.tenantName || tenant.name || 'Café'}
                    </div>
                    <div className="text-[10px] text-emerald-700 font-semibold">Admin Console</div>
                  </div>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-700"
                >
                  <ChevronLeft size={18} />
                </button>
              </div>

              {branches.length > 0 && (
                <div className="shrink-0 border-b border-slate-200 px-4 py-3 bg-slate-50">
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Current branch
                  </label>
                  <CustomSelect
                    value={selectedBranchId}
                    onChange={(val) => {
                      handleBranchChange(typeof val === 'object' ? val.target.value : val);
                      setSidebarOpen(false);
                    }}
                    options={branches.map((b) => ({
                      value: b._id,
                      label: `${b.name} (${b.code})${b.isMain ? ' ★' : ''}`,
                      dot: b.isMain ? 'bg-amber-500' : 'bg-emerald-500',
                    }))}
                    icon={Store}
                    className="w-full bg-white border-slate-300"
                  />
                </div>
              )}

              {/* Mobile Nav */}
              <nav className="flex-1 overflow-y-auto p-3 space-y-4">
                {NAV_GROUPS.map((group) => (
                  <div key={group.title} className="space-y-1">
                    <div className="px-3 pt-1 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      {group.title}
                    </div>
                    {group.items.filter(item => canAccessItem(item.access)).map(({ to, href, icon: Icon, label, isExternal }) => {
                      if (isExternal && href) {
                        return (
                          <a
                            key={label}
                            href={getAppHref(href)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setSidebarOpen(false)}
                            className="flex items-center justify-between gap-3 rounded-none px-3 py-2.5 text-xs font-semibold transition text-slate-600 hover:bg-slate-50 hover:text-slate-950 border-l-4 border-transparent"
                          >
                            <div className="flex items-center gap-3">
                              <Icon size={16} />
                              <span>{label}</span>
                            </div>
                            <ExternalLink size={12} className="text-slate-400" />
                          </a>
                        );
                      }
                      return (
                        <NavLink
                          key={to}
                          to={to}
                          onClick={() => setSidebarOpen(false)}
                          className={({ isActive }) =>
                            `flex items-center gap-3 rounded-none px-3 py-2.5 text-xs font-semibold transition ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-950 font-bold border-l-4 border-[#0F3D2E]'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950 border-l-4 border-transparent'
                            }`
                          }
                        >
                          <Icon size={16} />
                          <span>{label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                ))}
              </nav>

              {/* Mobile Footer */}
              <div className="border-t border-slate-200 p-3 bg-slate-50">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center justify-center gap-2 rounded-md p-2 text-xs font-semibold text-red-600 bg-white border border-slate-200 hover:bg-red-50"
                >
                  <LogOut size={14} /> Sign out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Main Content Area ───────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col h-full overflow-hidden">
        {/* Impersonation Banner if active */}
        {user?.impersonatedBy && (
          <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-4 py-2 text-white text-xs font-semibold flex items-center justify-between shadow-sm shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-base">🕵️</span>
              <span>Platform Impersonation Mode: viewing café as Super Admin ({user.impersonatedBy})</span>
            </div>
            <button
              onClick={() => { window.location.href = '/super-admin'; }}
              className="bg-black/30 hover:bg-black/50 text-white rounded-lg px-2.5 py-1 text-[11px] font-bold transition"
            >
              Exit to Super Admin
            </button>
          </div>
        )}

        {/* Offline Warning Banner */}
        {!isOnline && (
          <div className="bg-amber-600 px-4 py-1.5 text-white text-xs font-semibold flex items-center justify-between shrink-0 shadow-sm animate-pulse">
            <div className="flex items-center gap-2">
              <WifiOff size={14} />
              <span>Offline Mode Active: New POS orders are saved locally and will auto-sync when connected.</span>
            </div>
          </div>
        )}

        {/* Plan Limit Warning Banner (e.g. Menu Items 35/15) */}
        {isOverMenuLimit && (
          <div className="bg-red-500 px-4 py-1.5 text-white text-xs font-semibold flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} />
              <span>
                Plan Quota Exceeded: Menu Items ({billingSummary.usage.menuItems} / {billingSummary.limits.menuItems}). Upgrade plan to lift restrictions.
              </span>
            </div>
            <NavLink
              to="/billing"
              className="bg-white text-red-700 hover:bg-red-50 rounded-lg px-2.5 py-0.5 text-[11px] font-bold transition shadow-xs"
            >
              Upgrade to Pro
            </NavLink>
          </div>
        )}

        {/* Top Header */}
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-2.5 shadow-2xs sm:px-4 md:px-6"
          style={{
            backgroundColor: 'var(--header-bg)',
            borderColor: 'var(--header-border)',
            backdropFilter: 'blur(8px)',
          }}
        >
          {/* Left: Mobile Toggle & Page Title */}
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border p-2 md:hidden hover:bg-[var(--hover-bg)]"
              style={{ borderColor: 'var(--border-primary)', color: 'var(--header-text-muted)' }}
              aria-label="Open sidebar"
            >
              <Menu size={18} />
            </button>

            <div className="min-w-0">
              <div className="hidden items-center gap-2 truncate text-[11px] font-semibold text-[var(--header-text-muted)] uppercase tracking-wider sm:flex">
                <span>{(tenant.name && tenant.name !== 'Café') ? tenant.name : user?.tenantName || tenant.name || 'Café'}</span>
                <span>/</span>
                <span className="text-[var(--header-text)]">{title}</span>
              </div>
              <h1 className="min-w-0 truncate font-display text-sm sm:text-base md:text-xl font-bold text-[var(--header-text)] leading-tight">
                {title}
              </h1>
            </div>
          </div>

          {/* Right Action Cluster */}
          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
            {/* Live Storefront External Link Button */}
            <a
              href={`${env.customerUrl}/menu?cafe=${tenant.slug || ''}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-2.5 sm:px-3 text-xs font-bold text-emerald-900 hover:bg-emerald-100 hover:border-emerald-400 transition shadow-2xs"
              title="Open Live Customer Ordering Storefront in new tab"
            >
              <ExternalLink size={13} className="text-emerald-700" />
              <span className="hidden sm:inline">Live Storefront</span>
              <span className="sm:hidden text-[10px]">Store ↗</span>
            </a>

            {/* Global ⌘K Trigger Button */}
            <button
              type="button"
              onClick={() => setShowCommandPalette(true)}
              className="hidden lg:flex items-center gap-2 h-9 px-3 rounded-md border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 text-xs font-medium transition shadow-2xs"
              title="Global quick navigation (⌘K)"
            >
              <Search size={14} />
              <span>Search...</span>
              <kbd className="ml-1 rounded px-1.5 py-0.5 text-[10px] font-bold text-slate-500 font-mono bg-slate-200/80">
                ⌘K
              </kbd>
            </button>

            {/* Branch Switcher (Desktop / Tablet only — on mobile it is in the drawer) */}
            {branches.length > 0 && (
              <div className="hidden md:block">
                <CustomSelect
                  value={selectedBranchId}
                  onChange={(val) => handleBranchChange(typeof val === 'object' ? val.target.value : val)}
                  options={branches.map((b) => ({
                    value: b._id,
                    label: `${b.name} (${b.code})${b.isMain ? ' ★' : ''}`,
                    dot: b.isMain ? 'bg-amber-500' : 'bg-emerald-500',
                  }))}
                  icon={Store}
                  className="bg-slate-50 border-slate-200 text-slate-800 max-w-[210px]"
                  title="Switch Branch Outlet"
                />
              </div>
            )}

            {/* Online / Sync Badge */}
            <div
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                isOnline
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-red-50 text-red-800 border-red-200 animate-pulse'
              }`}
              title={isOnline ? 'Online: System synced in real-time' : 'Offline mode'}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-red-500 animate-ping'}`} />
              <span className="text-[10px] tracking-wider">{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
            </div>

            {/* Live Orders Notification Bell */}
            <NavLink
              to="/orders"
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition shadow-2xs"
              title={`${pendingOrdersCount} pending orders`}
            >
              <Bell size={16} />
              {pendingOrdersCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-extrabold text-white shadow-xs animate-bounce">
                  {pendingOrdersCount}
                </span>
              )}
            </NavLink>

            {/* Quick "Open POS" CTA Button */}
            {canAccessPos(user?.role) && (
              <a
                href={getAppHref(env.posUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex h-9 items-center justify-center gap-1.5 rounded-md px-3.5 text-xs font-bold text-white shadow-xs hover:bg-[#165a44] active:scale-98 transition"
                title="Launch Fast POS Terminal"
                style={{ backgroundColor: '#0F3D2E' }}
              >
                <Monitor size={14} />
                <span>Open POS</span>
              </a>
            )}

            {/* Refresh Button */}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              title="Refresh all admin data"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-wait transition shadow-2xs"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </header>

        {/* Main Body */}
        <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-3.5 pb-24 sm:p-6 sm:pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:p-8 touch-scroll" style={{ backgroundColor: 'var(--bg-canvas)' }}>
          {children}
        </main>

        {/* Mobile Bottom Navigation Bar (Shown on phones < 768px) */}
        <nav
          className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-slate-200 bg-white/95 backdrop-blur-md px-1 pb-[env(safe-area-inset-bottom)] shadow-lg md:hidden select-none"
          aria-label="Mobile Bottom Navigation"
        >
          {/* 1. Dashboard */}
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center justify-center py-1 text-[10px] font-semibold transition ${
                isActive ? 'text-[#0F3D2E] font-bold' : 'text-slate-500 hover:text-slate-900'
              }`
            }
          >
            <LayoutDashboard size={18} className="mb-0.5" />
            <span>Home</span>
          </NavLink>

          {/* 2. Orders with pending count */}
          <NavLink
            to="/orders"
            className={({ isActive }) =>
              `relative flex flex-1 flex-col items-center justify-center py-1 text-[10px] font-semibold transition ${
                isActive ? 'text-[#0F3D2E] font-bold' : 'text-slate-500 hover:text-slate-900'
              }`
            }
          >
            <div className="relative">
              <ShoppingBag size={18} className="mb-0.5" />
              {pendingOrdersCount > 0 && (
                <span className="absolute -top-1 -right-2 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-red-600 px-1 text-[8px] font-extrabold text-white animate-bounce">
                  {pendingOrdersCount}
                </span>
              )}
            </div>
            <span>Orders</span>
          </NavLink>

          {/* 3. Products / Menu */}
          <NavLink
            to="/products"
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center justify-center py-1 text-[10px] font-semibold transition ${
                isActive ? 'text-[#0F3D2E] font-bold' : 'text-slate-500 hover:text-slate-900'
              }`
            }
          >
            <UtensilsCrossed size={18} className="mb-0.5" />
            <span>Menu</span>
          </NavLink>

          {/* 4. Tables & Floor */}
          <NavLink
            to="/tables"
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center justify-center py-1 text-[10px] font-semibold transition ${
                isActive ? 'text-[#0F3D2E] font-bold' : 'text-slate-500 hover:text-slate-900'
              }`
            }
          >
            <Layers size={18} className="mb-0.5" />
            <span>Tables</span>
          </NavLink>

          {/* 5. More Menu Drawer Toggle */}
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="flex flex-1 flex-col items-center justify-center py-1 text-[10px] font-semibold text-slate-500 hover:text-slate-900 transition cursor-pointer"
            aria-label="Open navigation menu"
          >
            <Menu size={18} className="mb-0.5" />
            <span>More</span>
          </button>
        </nav>

        {/* Global Modals */}
        <CommandPaletteModal isOpen={showCommandPalette} onClose={() => setShowCommandPalette(false)} />
      </div>
    </div>
  );
}
