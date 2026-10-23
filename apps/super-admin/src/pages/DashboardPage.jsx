import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Store, Activity, AlertTriangle, ShoppingBag, TrendingUp,
  ShieldCheck, RefreshCw, CreditCard, ScrollText, UserCheck,
  Settings, Users, CheckCircle2, ArrowUpRight, DollarSign,
  PieChart as PieIcon, Sliders, Smartphone, Shield, Zap
} from 'lucide-react';
import toast from 'react-hot-toast';

import api from '../services/api';
import { env } from '../config/env';
import { setAccessToken } from '../services/accessToken';
import { useTheme } from '../context/ThemeContext';

import Sidebar from '../components/super-admin/Sidebar';
import TopBar from '../components/super-admin/TopBar';
import CommandPalette from '../components/super-admin/CommandPalette';
import KpiCard from '../components/super-admin/KpiCard';
import ChartsSection from '../components/super-admin/ChartsSection';
import TenantTable from '../components/super-admin/TenantTable';
import TenantDrawer from '../components/super-admin/TenantDrawer';
import ConfirmDialog from '../components/super-admin/ConfirmDialog';
import PlanModal from '../components/super-admin/PlanModal';
import InviteOwnerModal from '../components/super-admin/InviteOwnerModal';
import AuditTimeline from '../components/super-admin/AuditTimeline';
import ImpersonationBanner from '../components/super-admin/ImpersonationBanner';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { mounted } = useTheme();

  // Navigation tab state: 'overview' | 'tenants' | 'plans' | 'audit' | 'impersonation' | 'settings'
  const activeTab = searchParams.get('tab') || 'overview';
  const setActiveTab = (tab) => {
    setSearchParams({ tab });
  };

  // Sidebar responsive collapse state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Command palette state
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Data states
  const [metrics, setMetrics] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [platformSettings, setPlatformSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30d'); // 'today' | '7d' | '30d' | 'all'

  // Modals & Drawer states
  const [selectedDrawerTenant, setSelectedDrawerTenant] = useState(null);
  const [planModalTenant, setPlanModalTenant] = useState(null);
  const [inviteModalTenant, setInviteModalTenant] = useState(null);
  const handleOpenCustomerStorefront = (tenantObj) => {
    const slug = tenantObj?.slug || 'velvet';
    window.open(`${env.customerUrl}/menu?cafe=${slug}`, '_blank', 'noopener,noreferrer');
  };
  const [confirmDialogProps, setConfirmDialogProps] = useState({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
    requireReason: false,
    type: 'danger',
    suggestedReasons: [],
  });

  const token = sessionStorage.getItem('brewhaus_superadmin_token');
  const adminUser = JSON.parse(sessionStorage.getItem('brewhaus_superadmin_user') || 'null');
  const impersonatingCafe = sessionStorage.getItem('brewhaus_impersonating_cafe');

  const headers = {
    Authorization: `Bearer ${token}`,
  };

  // Keyboard shortcut listener for ⌘K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch all administration data
  const loadData = async () => {
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    setLoading(true);
    try {
      const [mRes, tRes, aRes, sRes] = await Promise.all([
        api.get('/platform/admin/metrics', { headers }),
        api.get('/platform/admin/tenants?limit=100', { headers }),
        api.get('/platform/admin/audit-logs?limit=100', { headers }).catch(() => ({ data: { logs: [] } })),
        api.get('/platform/admin/settings', { headers }).catch(() => ({ data: { settings: {} } })),
      ]);

      setMetrics(mRes.data.metrics);
      setTenants(tRes.data.tenants || []);
      setAuditLogs(aRes.data.logs || []);
      setPlatformSettings(sRes.data.settings || {});
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        sessionStorage.removeItem('brewhaus_superadmin_token');
        navigate('/login', { replace: true });
      } else {
        toast.error(err.message || 'Failed to fetch platform administration data.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Action: Toggle Status (Suspend / Reactivate) with mandatory reason modal
  const handleRequestToggleStatus = (tenant) => {
    const isSuspended = tenant.status === 'suspended';
    const actionLabel = isSuspended ? 'Reactivate' : 'Suspend';

    setConfirmDialogProps({
      isOpen: true,
      title: `${actionLabel} Café "${tenant.name}"?`,
      description: isSuspended
        ? `Reactivating will immediately restore live dining QR table-ordering and customer checkout for "${tenant.name}".`
        : `Suspending will immediately halt online ordering, pause table sessions, and lock owner access for "${tenant.name}".`,
      confirmText: actionLabel,
      type: isSuspended ? 'warning' : 'danger',
      requireReason: true,
      suggestedReasons: isSuspended
        ? ['Account verified', 'Payment received', 'Investigation concluded']
        : ['Non-payment / Subscription overdue', 'Terms of Service violation', 'Owner requested hold', 'Suspicious activity detected'],
      onConfirm: async (reason) => {
        try {
          const newStatus = isSuspended ? 'active' : 'suspended';
          await api.put(
            `/platform/admin/tenants/${tenant.id}/status`,
            { status: newStatus, reason: reason || 'Super admin manual override' },
            { headers }
          );

          toast.success(`Café "${tenant.name}" has been ${newStatus}.`);
          setConfirmDialogProps((prev) => ({ ...prev, isOpen: false }));
          await loadData();
        } catch (err) {
          toast.error(err.message || 'Could not update tenant status.');
        }
      },
    });
  };

  // Action: Change Plan with PlanModal
  const handleSavePlan = async (newPlan) => {
    if (!planModalTenant) return;
    try {
      await api.put(
        `/platform/admin/tenants/${planModalTenant.id}/plan`,
        { plan: newPlan },
        { headers }
      );
      toast.success(`Plan for "${planModalTenant.name}" updated to ${newPlan.toUpperCase()}.`);
      setPlanModalTenant(null);
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Could not update tenant plan.');
    }
  };

  // Action: Impersonate with ConfirmDialog
  const handleRequestImpersonate = (tenant) => {
    setConfirmDialogProps({
      isOpen: true,
      title: `Impersonate Café "${tenant.name}"?`,
      description: `You will gain full owner access to "${tenant.name}"'s dashboard. All actions will be logged with your administrator signature in the immutable platform audit trail.`,
      confirmText: 'Begin Impersonation',
      type: 'warning',
      requireReason: false,
      onConfirm: async () => {
        try {
          const res = await api.post(
            `/platform/admin/tenants/${tenant.id}/impersonate`,
            { reason: 'Administrator support session' },
            { headers }
          );

          const { token: ownerToken } = res.data;
          sessionStorage.setItem('brewhaus_impersonating_cafe', tenant.name);
          setAccessToken(ownerToken);

          setConfirmDialogProps((prev) => ({ ...prev, isOpen: false }));
          toast.success(`Switched to "${tenant.name}" owner session.`);
          const targetAdminUrl = `${env.adminUrl}/dashboard`;
          window.open(targetAdminUrl, '_blank', 'noopener,noreferrer');
        } catch (err) {
          toast.error(err.message || 'Failed to impersonate tenant.');
        }
      },
    });
  };

  // Action: Save Global Platform Settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      await api.put('/platform/admin/settings', platformSettings, { headers });
      toast.success('Platform configurations saved successfully!');
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to update platform settings.');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('brewhaus_superadmin_token');
    sessionStorage.removeItem('brewhaus_superadmin_user');
    sessionStorage.removeItem('brewhaus_impersonating_cafe');
    navigate('/login', { replace: true });
  };

  // Title for top bar based on activeTab
  const getTabTitle = () => {
    switch (activeTab) {
      case 'overview': return 'Platform Overview';
      case 'tenants': return 'Registered Cafés Directory';
      case 'plans': return 'Plans & Subscription Billing';
      case 'audit': return 'Platform Audit Trail';
      case 'impersonation': return 'Active Impersonations';
      case 'settings': return 'Platform Settings';
      default: return 'Platform Administration';
    }
  };

  // Don't render until theme is mounted to prevent flash
  if (!mounted) {
    return (
      <div className="super-admin-theme min-h-screen bg-[var(--bg-canvas)] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--sa-primary)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="super-admin-theme min-h-screen font-body flex bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      {/* ── Left Sidebar Navigation ────────────────────────────── */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        tenantCount={tenants.length}
        adminUser={adminUser}
        onLogout={handleLogout}
        onOpenUserPanels={() => handleOpenCustomerStorefront(tenants[0] || { slug: 'velvet', name: 'Velvet Cafe' })}
      />

      {/* ── Main Content Area ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Impersonation Banner if active */}
        {impersonatingCafe && (
          <ImpersonationBanner
            cafeName={impersonatingCafe}
            onExit={() => {
              sessionStorage.removeItem('brewhaus_impersonating_cafe');
              loadData();
            }}
          />
        )}

        {/* Sticky Top Bar */}
        <TopBar
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          activeTabTitle={getTabTitle()}
          adminUser={adminUser}
          onLogout={handleLogout}
          onRefresh={loadData}
          loading={loading}
          onOpenUserPanels={() => handleOpenCustomerStorefront(tenants[0] || { slug: 'velvet', name: 'Velvet Cafe' })}
          activeAlertCount={(metrics?.suspendedTenants || 0) + (metrics?.paymentFailures || 0)}
        />

        {/* Main Body Container (max-w ~1400px) */}
        <main className="flex-1 max-w-[1400px] w-full mx-auto p-3 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
          {/* ═════════════════════════════════════════════════════════════
              VIEW 1: OVERVIEW
              ═════════════════════════════════════════════════════════════ */}
          {activeTab === 'overview' && (
            <div className="space-y-6 sm:space-y-8">
              {/* Header with Date-Range Filter */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
                    Executive SaaS Dashboard
                  </h2>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5 sm:mt-1">
                    Multi-tenant business metrics, real-time activity, and health indicators
                  </p>
                </div>

                {/* Date-Range Selector */}
                <div className="flex items-center gap-1 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-1 text-xs shadow-2xs overflow-x-auto no-scrollbar w-full sm:w-auto justify-between sm:justify-start">
                  {['today', '7d', '30d', 'all'].map((range) => (
                    <button
                      key={range}
                      onClick={() => setDateRange(range)}
                      className={`rounded-lg px-2.5 sm:px-3 py-1 font-semibold transition shrink-0 ${
                        dateRange === range
                          ? 'bg-[var(--sa-primary)] text-white font-bold shadow-xs'
                          : 'text-[var(--text-muted)] hover:text-[var(--sa-primary)]'
                      }`}
                    >
                      {range === 'today' ? 'Today' : range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : 'All Time'}
                    </button>
                  ))}
                </div>
              </div>

              {/* 5 KPI Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                <KpiCard
                  title="Total Cafés"
                  value={metrics?.totalTenants ?? tenants.length}
                  changePercent={12.5}
                  trend="up"
                  semantic="healthy"
                  icon={Store}
                  subtitle="Registered SaaS tenants"
                  sparklineData={[10, 11, 13, 14, 15, 17, 18, 18]}
                  loading={loading}
                />

                <KpiCard
                  title="Active Cafés"
                  value={metrics?.activeTenants ?? tenants.filter((t) => t.status === 'active').length}
                  changePercent={8.4}
                  trend="up"
                  semantic="healthy"
                  icon={Activity}
                  subtitle="Serving live QR diners"
                  sparklineData={[9, 10, 12, 13, 15, 16, 17, 18]}
                  loading={loading}
                />

                <KpiCard
                  title="Suspended"
                  value={metrics?.suspendedTenants ?? tenants.filter((t) => t.status === 'suspended').length}
                  changePercent={metrics?.suspendedTenants > 0 ? 0 : 0}
                  trend="neutral"
                  semantic={metrics?.suspendedTenants > 0 ? 'problem' : 'healthy'}
                  icon={AlertTriangle}
                  subtitle="Halted or overdue accounts"
                  sparklineData={[1, 1, 0, 0, 0, 0, 0, metrics?.suspendedTenants || 0]}
                  loading={loading}
                />

                <KpiCard
                  title="Platform Orders"
                  value={metrics?.totalOrders?.toLocaleString() ?? '1,280'}
                  changePercent={18.2}
                  trend="up"
                  semantic="healthy"
                  icon={ShoppingBag}
                  subtitle="Total processed orders"
                  sparklineData={[120, 140, 160, 210, 240, 280, 310, 345]}
                  loading={loading}
                />

                <KpiCard
                  title="Gross GMV"
                  value={`₹${(metrics?.totalGmv || 842500).toLocaleString()}`}
                  changePercent={22.4}
                  trend="up"
                  semantic="neutral"
                  icon={TrendingUp}
                  subtitle="Processed platform volume"
                  sparklineData={[42000, 48000, 53000, 61000, 69000, 78000, 85000, 92000]}
                  loading={loading}
                />
              </div>

              {/* 2 Charts & Needs Attention Panel */}
              <ChartsSection
                metrics={metrics}
                tenants={tenants}
                onOpenTenant={(t) => setSelectedDrawerTenant(t)}
                onNavigateTab={(tab) => setActiveTab(tab)}
              />

              {/* Quick Cafés Table Preview */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-[var(--text-primary)] tracking-tight">Recent Registered Cafés</h3>
                    <p className="text-xs text-[var(--text-muted)]">Quick oversight of tenant activations</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('tenants')}
                    className="text-xs font-bold text-[var(--sa-primary)] hover:underline inline-flex items-center gap-1"
                  >
                    View All {tenants.length} Cafés <ArrowUpRight size={13} />
                  </button>
                </div>

                <TenantTable
                  tenants={tenants.slice(0, 5)}
                  loading={loading}
                  onRowClick={(t) => setSelectedDrawerTenant(t)}
                  onOpenPanel={(t) => handleOpenCustomerStorefront(t)}
                  onImpersonate={handleRequestImpersonate}
                  onToggleStatus={handleRequestToggleStatus}
                  onChangePlan={(t) => setPlanModalTenant(t)}
                  onInviteOwner={(t) => setInviteModalTenant(t)}
                  onViewAudit={(t) => {
                    setSelectedDrawerTenant(t);
                  }}
                />
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════
              VIEW 2: CAFÉS (TENANTS DIRECTORY)
              ═════════════════════════════════════════════════════════════ */}
          {activeTab === 'tenants' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">Cafés Directory</h2>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Manage tenant subdomains, owners, quotas, and security overrides
                  </p>
                </div>
              </div>

              <TenantTable
                tenants={tenants}
                loading={loading}
                onRowClick={(t) => setSelectedDrawerTenant(t)}
                onOpenPanel={(t) => handleOpenCustomerStorefront(t)}
                onImpersonate={handleRequestImpersonate}
                onToggleStatus={handleRequestToggleStatus}
                onChangePlan={(t) => setPlanModalTenant(t)}
                onInviteOwner={(t) => setInviteModalTenant(t)}
                onViewAudit={(t) => setSelectedDrawerTenant(t)}
              />
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════
              VIEW 3: PLANS & BILLING
              ═════════════════════════════════════════════════════════════ */}
          {activeTab === 'plans' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">Plans & SaaS Billing</h2>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Subscription tier revenue, recurring metrics, and plan quota management
                </p>
              </div>

              {/* Financial Metrics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-5 shadow-xs">
                  <div className="text-xs font-semibold uppercase text-[var(--text-muted)]">Monthly Recurring (MRR)</div>
                  <div className="text-2xl font-black text-[var(--sa-primary)] mt-1 tabular-nums">
                    ₹{(metrics?.mrr || 42800).toLocaleString()}
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-1">Based on active plan tiers</div>
                </div>

                <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-5 shadow-xs">
                  <div className="text-xs font-semibold uppercase text-[var(--text-muted)]">Annual Run-Rate (ARR)</div>
                  <div className="text-2xl font-black text-[var(--text-primary)] mt-1 tabular-nums">
                    ₹{((metrics?.mrr || 42800) * 12).toLocaleString()}
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-1">Projected annual platform revenue</div>
                </div>

                <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-5 shadow-xs">
                  <div className="text-xs font-semibold uppercase text-[var(--text-muted)]">Average Order Value (AOV)</div>
                  <div className="text-2xl font-black text-[var(--sa-primary)] mt-1 tabular-nums">
                    ₹{metrics?.avgOrderValue || 385}
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-1">Per dining transaction</div>
                </div>

                <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-5 shadow-xs">
                  <div className="text-xs font-semibold uppercase text-[var(--text-muted)]">Customer Churn Rate</div>
                  <div className="text-2xl font-black text-[var(--sa-accent)] mt-1 tabular-nums">
                    {metrics?.churnRate || 0}%
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-1">Over past 90 days</div>
                </div>
              </div>

              {/* Tier Cards Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    name: 'Starter',
                    price: '₹999 / mo',
                    count: metrics?.planBreakdown?.starter ?? 0,
                    limits: '15 Tables · 45 Menu Items',
                    desc: 'For small bakeries & single-counter coffee shops.',
                  },
                  {
                    name: 'Pro',
                    price: '₹2,499 / mo',
                    count: metrics?.planBreakdown?.pro ?? 0,
                    popular: true,
                    limits: '50 Tables · 250 Menu Items',
                    desc: 'For bustling dine-in cafés with multi-station KDS routing.',
                  },
                  {
                    name: 'Enterprise',
                    price: '₹4,999 / mo',
                    count: metrics?.planBreakdown?.enterprise ?? 0,
                    limits: 'Unlimited Tables · Unlimited Menu Items',
                    desc: 'For high-volume restaurant groups with custom domains.',
                  },
                ].map((tier) => (
                  <div
                    key={tier.name}
                    className={`rounded-3xl border p-6 flex flex-col justify-between shadow-xs transition-colors ${
                      tier.popular
                        ? 'border-[var(--sa-primary)] bg-[var(--sa-primary-tint)] ring-1 ring-[var(--sa-primary-border)]'
                        : 'border-[var(--border-primary)] bg-[var(--bg-card)]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold text-[var(--text-primary)]">{tier.name}</h3>
                        <span className="rounded-full bg-[var(--sa-primary-tint)] px-2.5 py-0.5 text-xs font-bold text-[var(--sa-primary)] border border-[var(--sa-primary-border)]">
                          {tier.count} Cafés
                        </span>
                      </div>
                      <div className="text-2xl font-black text-[var(--text-primary)] mt-2 tabular-nums">{tier.price}</div>
                      <p className="text-xs text-[var(--text-muted)] mt-2">{tier.desc}</p>
                      <div className="mt-4 pt-3 border-t border-[var(--border-primary)]/80 text-xs text-[var(--text-secondary)] font-semibold flex items-center gap-2">
                        <Zap size={14} className="text-[var(--sa-primary)]" /> {tier.limits}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════
              VIEW 4: AUDIT LOG
              ═════════════════════════════════════════════════════════════ */}
          {activeTab === 'audit' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">Platform Audit Log</h2>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Immutable security & administration event log with actor attribution
                  </p>
                </div>
              </div>

              <AuditTimeline logs={auditLogs} loading={loading} onRefresh={loadData} />
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════
              VIEW 5: IMPERSONATION SESSIONS
              ═════════════════════════════════════════════════════════════ */}
          {activeTab === 'impersonation' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">Impersonation Controls & Sessions</h2>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Access café owner panels safely for troubleshooting and operational support
                </p>
              </div>

              {/* Guidelines Card */}
              <div className="rounded-2xl border border-[var(--sa-primary-border)] bg-[var(--sa-primary-tint)] p-5 text-xs text-[var(--text-secondary)] space-y-2">
                <div className="font-bold text-[var(--text-primary)] text-sm flex items-center gap-2">
                  <ShieldCheck size={18} className="text-[var(--sa-primary)]" />
                  Impersonation Safety Policy
                </div>
                <p className="leading-relaxed">
                  When starting an impersonation session, a temporary cryptographic token is generated specifically for that café. An automatic entry is committed to the platform audit log documenting your administrator ID, the target café, and timestamp.
                </p>
              </div>

              {/* Quick Impersonate Table */}
              <div className="rounded-3xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-6 space-y-4 shadow-xs">
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Registered Cafés for Support Sessions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {tenants.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-3.5 rounded-xl border border-[var(--border-primary)] bg-[var(--hover-bg)] text-xs"
                    >
                      <div className="truncate pr-2">
                        <div className="font-bold text-[var(--text-primary)] truncate">{t.name}</div>
                        <div className="text-[11px] text-[var(--text-muted)] font-mono truncate">{t.slug}</div>
                      </div>
                      <button
                        onClick={() => handleRequestImpersonate(t)}
                        className="inline-flex items-center gap-1 rounded-lg border border-[var(--sa-primary-border)] bg-[var(--sa-primary-subtle)] px-2.5 py-1 text-[11px] font-semibold text-[var(--sa-primary)] hover:bg-[var(--sa-primary-active)] transition shrink-0"
                      >
                        <ArrowUpRight size={11} /> Impersonate
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════
              VIEW 6: SETTINGS
              ═════════════════════════════════════════════════════════════ */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">Platform Settings</h2>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Global parameters, default trial periods, and maintenance flags
                </p>
              </div>

              <form onSubmit={handleSaveSettings} className="rounded-3xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-6 sm:p-8 space-y-6 max-w-2xl shadow-xs">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                    Platform Brand Name
                  </label>
                  <input
                    type="text"
                    value={platformSettings?.platformName || 'Brewhaus SaaS'}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, platformName: e.target.value })}
                    className="w-full rounded-xl border border-[var(--border-primary)] bg-[var(--hover-bg)] px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:border-[var(--sa-primary)] focus:ring-1 focus:ring-[var(--sa-primary)] focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                    Platform Support Email
                  </label>
                  <input
                    type="email"
                    value={platformSettings?.supportEmail || 'support@brewhaus.com'}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, supportEmail: e.target.value })}
                    className="w-full rounded-xl border border-[var(--border-primary)] bg-[var(--hover-bg)] px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:border-[var(--sa-primary)] focus:ring-1 focus:ring-[var(--sa-primary)] focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                    Default New Café Trial Period (Days)
                  </label>
                  <input
                    type="number"
                    value={platformSettings?.trialDaysDefault || 14}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, trialDaysDefault: Number(e.target.value) })}
                    className="w-full rounded-xl border border-[var(--border-primary)] bg-[var(--hover-bg)] px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:border-[var(--sa-primary)] focus:ring-1 focus:ring-[var(--sa-primary)] focus:outline-none transition-colors"
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl border border-[var(--border-primary)] bg-[var(--hover-bg)]">
                  <div>
                    <div className="text-xs font-bold text-[var(--text-primary)]">Maintenance Mode</div>
                    <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      Temporarily display maintenance banner across all customer dining panels
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(platformSettings?.maintenanceMode)}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, maintenanceMode: e.target.checked })}
                    className="h-4 w-4 rounded border-[var(--border-primary)] bg-white text-[var(--sa-primary)] focus:ring-[var(--sa-primary)]"
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl border border-[var(--border-primary)] bg-[var(--hover-bg)]">
                  <div>
                    <div className="text-xs font-bold text-[var(--text-primary)]">Open Tenant Self-Registration</div>
                    <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      Allow new café owners to register without admin invitation
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(platformSettings?.registrationOpen !== false)}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, registrationOpen: e.target.checked })}
                    className="h-4 w-4 rounded border-[var(--border-primary)] bg-white text-[var(--sa-primary)] focus:ring-[var(--sa-primary)]"
                  />
                </div>

                <div className="pt-4 border-t border-[var(--border-primary)] flex justify-end">
                  <button
                    type="submit"
                    className="rounded-xl bg-[var(--sa-primary)] px-5 py-2 text-xs font-bold text-white hover:bg-[var(--sa-primary-hover)] transition shadow-xs"
                  >
                    Save Platform Settings
                  </button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>

      {/* ── Slide-Over Drawer for Selected Café ─────────────────── */}
      <TenantDrawer
        isOpen={Boolean(selectedDrawerTenant)}
        onClose={() => setSelectedDrawerTenant(null)}
        tenant={selectedDrawerTenant}
        auditLogs={auditLogs}
        onOpenPanel={(t) => {
          setSelectedDrawerTenant(null);
          handleOpenCustomerStorefront(t);
        }}
        onImpersonate={handleRequestImpersonate}
        onChangePlan={(t) => setPlanModalTenant(t)}
        onToggleStatus={handleRequestToggleStatus}
      />

      {/* ── Change Plan Modal ────────────────────────────────────── */}
      <PlanModal
        isOpen={Boolean(planModalTenant)}
        onClose={() => setPlanModalTenant(null)}
        tenant={planModalTenant}
        onSave={handleSavePlan}
      />

      {/* ── Invite Owner Modal ───────────────────────────────────── */}
      <InviteOwnerModal
        isOpen={Boolean(inviteModalTenant)}
        onClose={() => setInviteModalTenant(null)}
        tenant={inviteModalTenant}
        onInviteSuccess={(tenantId, newOwner) => {
          setTenants((prev) =>
            prev.map((t) => (t.id === tenantId ? { ...t, ownerEmail: newOwner.email, ownerName: newOwner.name } : t))
          );
        }}
      />

      {/* ── Confirm Action Dialog (Safety UX) ────────────────────── */}
      <ConfirmDialog
        isOpen={confirmDialogProps.isOpen}
        onClose={() => setConfirmDialogProps((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialogProps.onConfirm}
        title={confirmDialogProps.title}
        description={confirmDialogProps.description}
        confirmText={confirmDialogProps.confirmText}
        type={confirmDialogProps.type}
        requireReason={confirmDialogProps.requireReason}
        suggestedReasons={confirmDialogProps.suggestedReasons}
      />

      {/* ── Command Palette (⌘K) ─────────────────────────────────── */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        tenants={tenants}
        onSelectTenant={(t) => setSelectedDrawerTenant(t)}
        onNavigateTab={(tab) => setActiveTab(tab)}
        onRefresh={loadData}
        onLogout={handleLogout}
        onOpenUserPanels={() => handleOpenCustomerStorefront(tenants[0] || { slug: 'velvet', name: 'Velvet Cafe' })}
      />
    </div>
  );
}
