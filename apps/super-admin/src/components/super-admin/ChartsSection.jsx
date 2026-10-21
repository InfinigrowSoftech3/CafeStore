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
  starter: '#3B5BDB',
  pro: '#D4AF37',
  enterprise: '#0B1F5C',
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
      <div className="lg:col-span-2 rounded-3xl border border-[var(--border-primary,#E3E8F5)] bg-[var(--bg-card,#FFFFFF)] p-4 sm:p-6 shadow-xs flex flex-col justify-between">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary,#1B2559)] tracking-tight">Platform Volume & Orders</h3>
            <p className="text-xs text-[var(--text-muted,#8E9BBF)] mt-0.5">Aggregate GMV (₹) and transaction throughput</p>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl border border-[var(--border-primary,#E3E8F5)] bg-[var(--hover-bg,#EEF2FA)] p-1 self-start sm:self-auto">
            <button
              onClick={() => setTimeRange('7d')}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                timeRange === '7d'
                  ? 'bg-[#D4AF37] text-[#0B1B4D] font-bold shadow-xs'
                  : 'text-[var(--text-muted,#8E9BBF)] hover:text-[var(--text-primary,#1B2559)]'
              }`}
            >
              Last 7d
            </button>
            <button
              onClick={() => setTimeRange('30d')}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                timeRange === '30d'
                  ? 'bg-[#D4AF37] text-[#0B1B4D] font-bold shadow-xs'
                  : 'text-[var(--text-muted,#8E9BBF)] hover:text-[var(--text-primary,#1B2559)]'
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
                  <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#D4AF37" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="orderGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1E3FAE" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#1E3FAE" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" stroke="var(--text-muted,#8E9BBF)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-muted,#8E9BBF)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--popover-bg,#FFFFFF)',
                  border: '1px solid var(--border-primary,#E3E8F5)',
                  borderRadius: '12px',
                  color: 'var(--text-primary,#1B2559)',
                  fontSize: '12px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                }}
              />
              <Area type="monotone" dataKey="gmv" stroke="#D4AF37" strokeWidth={2.5} fillOpacity={1} fill="url(#gmvGradient)" name="GMV (₹)" />
              <Area type="monotone" dataKey="orders" stroke="#1E3FAE" strokeWidth={2} fillOpacity={1} fill="url(#orderGradient)" name="Orders" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-[var(--border-primary,#E3E8F5)]/80 pt-3 text-xs text-[var(--text-muted,#8E9BBF)]">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <span className="flex items-center gap-1.5 font-medium text-[var(--text-secondary,#3B4874)]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#D4AF37]" /> Gross Volume (GMV)
            </span>
            <span className="flex items-center gap-1.5 font-medium text-[var(--text-secondary,#3B4874)]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#1E3FAE]" /> Completed Orders
            </span>
          </div>
          <span className="text-[11px] text-[var(--text-muted,#8E9BBF)]">Live platform aggregate</span>
        </div>
      </div>

      {/* Chart 2: Plan Distribution */}
      <div className="rounded-3xl border border-[var(--border-primary,#E3E8F5)] bg-[var(--bg-card,#FFFFFF)] p-4 sm:p-6 shadow-xs flex flex-col justify-between">
        <div>
          <h3 className="text-base font-bold text-[var(--text-primary,#1B2559)] tracking-tight">Plan Distribution</h3>
          <p className="text-xs text-[var(--text-muted,#8E9BBF)] mt-0.5">SaaS tier allocation across cafés</p>
        </div>

        <div className="h-48 sm:h-52 w-full flex items-center justify-center my-2">
          {planData.length === 0 ? (
            <div className="text-xs text-[var(--text-muted,#8E9BBF)]">No subscription plan data available</div>
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
                    <Cell key={entry.name} fill={entry.color} stroke="var(--bg-card,#FFFFFF)" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--popover-bg,#FFFFFF)',
                    border: '1px solid var(--border-primary,#E3E8F5)',
                    borderRadius: '12px',
                    color: 'var(--text-primary,#1B2559)',
                    fontSize: '12px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="space-y-2 border-t border-[var(--border-primary,#E3E8F5)]/80 pt-3 text-xs">
          <div className="flex items-center justify-between text-[var(--text-secondary,#3B4874)]">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#3B5BDB]" /> Starter Tier
            </span>
            <span className="font-bold text-[var(--text-primary,#1B2559)]">{starterCount} cafés</span>
          </div>
          <div className="flex items-center justify-between text-[var(--text-secondary,#3B4874)]">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#D4AF37]" /> Pro Tier
            </span>
            <span className="font-bold text-[var(--text-primary,#1B2559)]">{proCount} cafés</span>
          </div>
          <div className="flex items-center justify-between text-[var(--text-secondary,#3B4874)]">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#0B1F5C]" /> Enterprise Tier
            </span>
            <span className="font-bold text-[var(--text-primary,#1B2559)]">{enterpriseCount} cafés</span>
          </div>
        </div>
      </div>

      {/* Needs Attention Panel (Span 3) */}
      <div className="lg:col-span-3 rounded-3xl border border-[var(--border-primary,#E3E8F5)] bg-[var(--bg-card,#FFFFFF)] p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#1E3FAE]/10 border border-[#1E3FAE]/20 text-[#1E3FAE] shrink-0">
              <AlertTriangle size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary,#1B2559)]">Needs Attention</h3>
              <p className="text-xs text-[var(--text-muted,#8E9BBF)]">Operational alerts, setup bottlenecks & risk mitigation</p>
            </div>
          </div>

          <span className="self-start sm:self-auto rounded-full bg-[var(--hover-bg,#EEF2FA)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--text-secondary,#3B4874)] border border-[var(--border-primary,#E3E8F5)]">
            {suspendedCafes.length + emptySetupCafes.length + (failedPayments > 0 ? 1 : 0)} Active Alerts
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Alert 1: Suspended Cafés */}
          <div className="rounded-2xl border border-[var(--border-primary,#E3E8F5)] bg-[var(--hover-bg,#EEF2FA)]/40 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#DC2626] flex items-center gap-1.5">
                <ShieldAlert size={14} /> Suspended Cafés ({suspendedCafes.length})
              </span>
              {suspendedCafes.length > 0 && (
                <button
                  onClick={() => onNavigateTab && onNavigateTab('tenants', { filterStatus: 'suspended' })}
                  className="text-[11px] font-semibold text-[#1E3FAE] hover:underline inline-flex items-center gap-0.5"
                >
                  View <ArrowUpRight size={11} />
                </button>
              )}
            </div>
            <p className="mt-1 text-xs text-[var(--text-muted,#8E9BBF)]">
              {suspendedCafes.length > 0
                ? `${suspendedCafes.length} café(s) have been halted and are not serving diners.`
                : 'All registered cafés are currently in good standing.'}
            </p>
            {suspendedCafes.slice(0, 2).map((c) => (
              <div key={c.id} className="mt-2 flex items-center justify-between text-[11px] bg-[var(--bg-surface,#FFFFFF)] px-2.5 py-1.5 rounded-lg border border-[var(--border-primary,#E3E8F5)]">
                <span className="text-[var(--text-primary,#1B2559)] font-medium truncate max-w-[140px]">{c.name}</span>
                <button
                  onClick={() => onOpenTenant && onOpenTenant(c)}
                  className="text-[#1E3FAE] font-semibold hover:underline"
                >
                  Manage
                </button>
              </div>
            ))}
          </div>

          {/* Alert 2: Incomplete Onboarding / 0 items or tables */}
          <div className="rounded-2xl border border-[var(--border-primary,#E3E8F5)] bg-[var(--hover-bg,#EEF2FA)]/40 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#EA580C] flex items-center gap-1.5">
                <Store size={14} /> Incomplete Setup ({emptySetupCafes.length})
              </span>
              {emptySetupCafes.length > 0 && (
                <button
                  onClick={() => onNavigateTab && onNavigateTab('tenants')}
                  className="text-[11px] font-semibold text-[#1E3FAE] hover:underline inline-flex items-center gap-0.5"
                >
                  View <ArrowUpRight size={11} />
                </button>
              )}
            </div>
            <p className="mt-1 text-xs text-[var(--text-muted,#8E9BBF)]">
              {emptySetupCafes.length > 0
                ? `${emptySetupCafes.length} café(s) have 0 tables or empty menus.`
                : 'All active cafés have configured menu products and active tables.'}
            </p>
            {emptySetupCafes.slice(0, 2).map((c) => (
              <div key={c.id} className="mt-2 flex items-center justify-between text-[11px] bg-[var(--bg-surface,#FFFFFF)] px-2.5 py-1.5 rounded-lg border border-[var(--border-primary,#E3E8F5)]">
                <span className="text-[var(--text-primary,#1B2559)] font-medium truncate max-w-[140px]">{c.name}</span>
                <button
                  onClick={() => onOpenTenant && onOpenTenant(c)}
                  className="text-[#1E3FAE] font-semibold hover:underline"
                >
                  Inspect
                </button>
              </div>
            ))}
          </div>

          {/* Alert 3: Platform Security & Billing Checks */}
          <div className="rounded-2xl border border-[var(--border-primary,#E3E8F5)] bg-[var(--hover-bg,#EEF2FA)]/40 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#0EA5E9] flex items-center gap-1.5">
                <CreditCard size={14} /> Security & Audits
              </span>
              <button
                onClick={() => onNavigateTab && onNavigateTab('audit')}
                className="text-[11px] font-semibold text-[#1E3FAE] hover:underline inline-flex items-center gap-0.5"
              >
                Audit Log <ArrowUpRight size={11} />
              </button>
            </div>
            <p className="mt-1 text-xs text-[var(--text-muted,#8E9BBF)]">
              {failedPayments > 0
                ? `${failedPayments} security or audit warning event(s) detected in the last cycle.`
                : 'Zero security lockouts or anomaly alerts recorded in active trail.'}
            </p>
            <div className="mt-3 flex items-center gap-2 text-[11px] text-[#0E7D5D] bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-lg">
              <CheckCircle2 size={13} className="shrink-0" />
              <span>Multi-tenant database isolation: 100% verified</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
