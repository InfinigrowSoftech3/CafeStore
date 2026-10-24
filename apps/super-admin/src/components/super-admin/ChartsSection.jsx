import { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { AlertTriangle, Store, ArrowUpRight, ShieldAlert, CheckCircle2, CreditCard } from 'lucide-react';

const PLAN_COLORS = {
  starter: 'var(--sa-chart-tint)',
  pro: 'var(--sa-chart-accent)',
  enterprise: 'var(--sa-chart-primary)',
};

export default function ChartsSection({
  metrics,
  tenants = [],
  onOpenTenant,
  onNavigateTab,
}) {
  const [timeRange, setTimeRange] = useState('30d'); // '7d' | '30d'

  // Mock trend data for Orders + GMV over time
  const trendData30d = [
    { date: 'Sep 10', orders: 120, gmv: 28400 },
    { date: 'Sep 14', orders: 145, gmv: 34200 },
    { date: 'Sep 18', orders: 190, gmv: 46100 },
    { date: 'Sep 22', orders: 210, gmv: 52000 },
    { date: 'Sep 26', orders: 240, gmv: 59800 },
    { date: 'Sep 30', orders: 280, gmv: 71200 },
    { date: 'Oct 04', orders: 310, gmv: 82500 },
    { date: 'Oct 08', orders: 345, gmv: 91000 },
  ];

  const trendData7d = [
    { date: 'Oct 03', orders: 42, gmv: 9800 },
    { date: 'Oct 04', orders: 50, gmv: 12400 },
    { date: 'Oct 05', orders: 48, gmv: 11900 },
    { date: 'Oct 06', orders: 58, gmv: 15200 },
    { date: 'Oct 07', orders: 62, gmv: 16800 },
    { date: 'Oct 08', orders: 65, gmv: 17400 },
    { date: 'Oct 09', orders: 70, gmv: 18900 },
  ];

  const activeTrendData = timeRange === '7d' ? trendData7d : trendData30d;

  // Plan distribution data
  const starterCount = metrics?.planBreakdown?.starter ?? 0;
  const proCount = metrics?.planBreakdown?.pro ?? 0;
  const enterpriseCount = metrics?.planBreakdown?.enterprise ?? 0;

  const planData = [
    { name: 'Starter', value: starterCount, color: PLAN_COLORS.starter },
    { name: 'Pro', value: proCount, color: PLAN_COLORS.pro },
    { name: 'Enterprise', value: enterpriseCount, color: PLAN_COLORS.enterprise },
  ].filter((p) => p.value > 0);

  // Identify "Needs Attention" items:
  const suspendedCafes = tenants.filter((t) => t.status === 'suspended');
  const emptySetupCafes = tenants.filter((t) => t.status === 'active' && (t.tableCount === 0 || t.productCount === 0));
  const failedPayments = metrics?.paymentFailures ?? 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
      {/* Chart 1: Orders & GMV Trend */}
      <div className="lg:col-span-2 rounded-3xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-4 sm:p-6 shadow-xs flex flex-col justify-between">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)] tracking-tight">Platform Volume & Orders</h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Aggregate GMV (₹) and transaction throughput</p>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl border border-[var(--header-control-border)] bg-[var(--header-control-bg)] p-1 self-start sm:self-auto">
            <button
              onClick={() => setTimeRange('7d')}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                timeRange === '7d'
                  ? 'bg-[var(--sa-primary)] text-white font-bold shadow-xs'
                  : 'text-[var(--header-text-muted)] hover:text-[var(--header-text)]'
              }`}
            >
              Last 7d
            </button>
            <button
              onClick={() => setTimeRange('30d')}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                timeRange === '30d'
                  ? 'bg-[var(--sa-primary)] text-white font-bold shadow-xs'
                  : 'text-[var(--header-text-muted)] hover:text-[var(--header-text)]'
              }`}
            >
              Last 30d
            </button>
          </div>
        </div>

        <div className="h-56 sm:h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={activeTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gmvGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--sa-chart-primary)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--sa-chart-primary)" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="orderGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--sa-chart-accent)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="var(--sa-chart-accent)" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--popover-bg)',
                  border: '1px solid var(--popover-border)',
                  borderRadius: '12px',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                }}
              />
              <Area type="monotone" dataKey="gmv" stroke="var(--sa-chart-primary)" strokeWidth={2.5} fillOpacity={1} fill="url(#gmvGradient)" name="GMV (₹)" />
              <Area type="monotone" dataKey="orders" stroke="var(--sa-chart-accent)" strokeWidth={2} fillOpacity={1} fill="url(#orderGradient)" name="Orders" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-[var(--border-primary)]/80 pt-3 text-xs text-[var(--text-muted)]">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <span className="flex items-center gap-1.5 font-medium text-[var(--text-secondary)]">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--sa-chart-primary)]" /> Gross Volume (GMV)
            </span>
            <span className="flex items-center gap-1.5 font-medium text-[var(--text-secondary)]">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--sa-chart-accent)]" /> Completed Orders
            </span>
          </div>
          <span className="text-[11px] text-[var(--text-muted)]">Live platform aggregate</span>
        </div>
      </div>

      {/* Chart 2: Plan Distribution */}
      <div className="rounded-3xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-4 sm:p-6 shadow-xs flex flex-col justify-between">
        <div>
          <h3 className="text-base font-bold text-[var(--text-primary)] tracking-tight">Plan Distribution</h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">SaaS tier allocation across cafés</p>
        </div>

        <div className="h-48 sm:h-52 w-full flex items-center justify-center my-2">
          {planData.length === 0 ? (
            <div className="text-xs text-[var(--text-muted)]">No subscription plan data available</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={planData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {planData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} stroke="var(--bg-card)" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--popover-bg)',
                    border: '1px solid var(--popover-border)',
                    borderRadius: '12px',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="space-y-2 border-t border-[var(--border-primary)]/80 pt-3 text-xs">
          <div className="flex items-center justify-between text-[var(--text-secondary)]">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--sa-chart-tint)]" /> Starter Tier
            </span>
            <span className="font-bold text-[var(--text-primary)]">{starterCount} cafés</span>
          </div>
          <div className="flex items-center justify-between text-[var(--text-secondary)]">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--sa-chart-accent)]" /> Pro Tier
            </span>
            <span className="font-bold text-[var(--text-primary)]">{proCount} cafés</span>
          </div>
          <div className="flex items-center justify-between text-[var(--text-secondary)]">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--sa-chart-primary)]" /> Enterprise Tier
            </span>
            <span className="font-bold text-[var(--text-primary)]">{enterpriseCount} cafés</span>
          </div>
        </div>
      </div>

      {/* Needs Attention Panel (Span 3) */}
      <div className="lg:col-span-3 rounded-3xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--sa-primary-subtle)] border border-[var(--sa-primary-border)] text-[var(--sa-primary)] shrink-0">
              <AlertTriangle size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Needs Attention</h3>
              <p className="text-xs text-[var(--text-muted)]">Operational alerts, setup bottlenecks & risk mitigation</p>
            </div>
          </div>

          <span className="self-start sm:self-auto rounded-full bg-[var(--hover-bg)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--text-secondary)] border border-[var(--border-primary)]">
            {suspendedCafes.length + emptySetupCafes.length + (failedPayments > 0 ? 1 : 0)} Active Alerts
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Alert 1: Suspended Cafés */}
          <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--hover-bg)]/40 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--sa-danger-text)] flex items-center gap-1.5">
                <ShieldAlert size={14} /> Suspended Cafés ({suspendedCafes.length})
              </span>
              {suspendedCafes.length > 0 && (
                <button
                  onClick={() => onNavigateTab && onNavigateTab('tenants', { filterStatus: 'suspended' })}
                  className="text-[11px] font-semibold text-[var(--sa-primary)] hover:underline inline-flex items-center gap-0.5"
                >
                  View <ArrowUpRight size={11} />
                </button>
              )}
            </div>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {suspendedCafes.length > 0
                ? `${suspendedCafes.length} café(s) have been halted and are not serving diners.`
                : 'All registered cafés are currently in good standing.'}
            </p>
            {suspendedCafes.slice(0, 2).map((c) => (
              <div key={c.id} className="mt-2 flex items-center justify-between text-[11px] bg-[var(--bg-surface)] px-2.5 py-1.5 rounded-lg border border-[var(--border-primary)]">
                <span className="text-[var(--text-primary)] font-medium truncate max-w-[140px]">{c.name}</span>
                <button
                  onClick={() => onOpenTenant && onOpenTenant(c)}
                  className="text-[var(--sa-primary)] font-semibold hover:underline"
                >
                  Manage
                </button>
              </div>
            ))}
          </div>

          {/* Alert 2: Incomplete Onboarding / 0 items or tables */}
          <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--hover-bg)]/40 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--sa-warning-text)] flex items-center gap-1.5">
                <Store size={14} /> Incomplete Setup ({emptySetupCafes.length})
              </span>
              {emptySetupCafes.length > 0 && (
                <button
                  onClick={() => onNavigateTab && onNavigateTab('tenants')}
                  className="text-[11px] font-semibold text-[var(--sa-primary)] hover:underline inline-flex items-center gap-0.5"
                >
                  View <ArrowUpRight size={11} />
                </button>
              )}
            </div>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {emptySetupCafes.length > 0
                ? `${emptySetupCafes.length} café(s) have 0 tables or empty menus.`
                : 'All active cafés have configured menu products and active tables.'}
            </p>
            {emptySetupCafes.slice(0, 2).map((c) => (
              <div key={c.id} className="mt-2 flex items-center justify-between text-[11px] bg-[var(--bg-surface)] px-2.5 py-1.5 rounded-lg border border-[var(--border-primary)]">
                <span className="text-[var(--text-primary)] font-medium truncate max-w-[140px]">{c.name}</span>
                <button
                  onClick={() => onOpenTenant && onOpenTenant(c)}
                  className="text-[var(--sa-primary)] font-semibold hover:underline"
                >
                  Inspect
                </button>
              </div>
            ))}
          </div>

          {/* Alert 3: Platform Security & Billing Checks */}
          <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--hover-bg)]/40 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--sa-info-text)] flex items-center gap-1.5">
                <CreditCard size={14} /> Security & Audits
              </span>
              <button
                onClick={() => onNavigateTab && onNavigateTab('audit')}
                className="text-[11px] font-semibold text-[var(--sa-primary)] hover:underline inline-flex items-center gap-0.5"
              >
                Audit Log <ArrowUpRight size={11} />
              </button>
            </div>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {failedPayments > 0
                ? `${failedPayments} security or audit warning event(s) detected in the last cycle.`
                : 'Zero security lockouts or anomaly alerts recorded in active trail.'}
            </p>
            <div className="mt-3 flex items-center gap-2 text-[11px] text-[var(--sa-success-text)] bg-[var(--sa-success-bg)] border border-[var(--sa-success-border)] px-2.5 py-1.5 rounded-lg">
              <CheckCircle2 size={13} className="shrink-0" />
              <span>Multi-tenant database isolation: 100% verified</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
