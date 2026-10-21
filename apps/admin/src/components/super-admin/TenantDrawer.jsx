import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Store, ArrowUpRight, ShieldAlert, CheckCircle2, Eye, ExternalLink,
  Layers, Copy, Calendar, Mail, MapPin, Phone, DollarSign, Clock, Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import { env } from '../../config/env';

export default function TenantDrawer({
  isOpen,
  onClose,
  tenant,
  auditLogs = [],
  onOpenPanel,
  onImpersonate,
  onChangePlan,
  onToggleStatus,
}) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'settings' | 'orders' | 'audit'
  const [copied, setCopied] = useState(false);

  if (!isOpen || !tenant) return null;

  const customerBase = env?.customerUrl || 'https://cafestore-customer.vercel.app';
  const liveStorefrontUrl = `${customerBase}/menu?cafe=${tenant.slug}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(liveStorefrontUrl);
    setCopied(true);
    toast.success('Live URL copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const isSuspended = tenant.status === 'suspended';

  // Filter audit logs for this specific tenant
  const tenantAuditLogs = auditLogs.filter(
    (log) =>
      log.targetTenantSlug === tenant.slug ||
      String(log.targetTenantId) === String(tenant.id) ||
      (log.details && log.details.targetTenantSlug === tenant.slug)
  );

  // Realistic mock recent orders for this tenant
  const mockRecentOrders = [
    { id: 'ORD-8921', table: 'Table 4', total: '₹480', status: 'completed', time: '12m ago', items: 3 },
    { id: 'ORD-8920', table: 'Table 2', total: '₹720', status: 'preparing', time: '28m ago', items: 4 },
    { id: 'ORD-8919', table: 'Table 6', total: '₹340', status: 'completed', time: '1h ago', items: 2 },
    { id: 'ORD-8918', table: 'Table 1', total: '₹950', status: 'completed', time: '2h ago', items: 5 },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0"
          style={{ backgroundColor: 'var(--drawer-backdrop, rgba(7, 18, 58, 0.65))', backdropFilter: 'blur(4px)' }}
        />

        {/* Drawer panel */}
        <div className="fixed inset-y-0 right-0 flex max-w-full pl-0 sm:pl-10">
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
            className="w-screen max-w-full sm:max-w-xl flex flex-col justify-between custom-scrollbar"
            style={{
              backgroundColor: 'var(--bg-card, #FFFFFF)',
              borderLeftColor: 'var(--border-primary, #E3E8F5)',
              color: 'var(--text-primary, #1B2559)',
              boxShadow: 'var(--popover-shadow, 0 4px 20px -2px rgba(11, 27, 77, 0.06))',
            }}
          >
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-[var(--border-primary,#E3E8F5)] bg-[var(--hover-bg,#EEF2FA)]/80">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1E3FAE]/15 to-[#D4AF37]/20 border border-[#E6CF7A]/60 text-[#0B1B4D] font-bold text-sm sm:text-base shadow-inner">
                    {tenant.settings?.logoUrl ? (
                      <img src={tenant.settings.logoUrl} alt="" className="h-full w-full rounded-2xl object-cover" />
                    ) : (
                      tenant.name.slice(0, 2).toUpperCase()
                    )}
                  </div>

                  <div className="min-w-0 truncate">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary,#1B2559)] tracking-tight truncate">
                        {tenant.name}
                      </h2>
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border shrink-0"
                        style={{
                          backgroundColor: isSuspended ? 'var(--status-suspended-bg, rgba(220,38,38,0.1))' : 'var(--status-active-bg, rgba(18,163,122,0.1))',
                          color: isSuspended ? 'var(--status-suspended-text, #B91C1C)' : 'var(--status-active-text, #0E7D5D)',
                          borderColor: isSuspended ? 'var(--status-suspended-border, rgba(220,38,38,0.25))' : 'var(--status-active-border, rgba(18,163,122,0.25))',
                        }}
                      >
                        {tenant.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <a
                        href={liveStorefrontUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-xs text-[#1E3FAE] hover:underline inline-flex items-center gap-1 font-semibold truncate"
                      >
                        {tenant.slug} <ExternalLink size={10} />
                      </a>
                      <button
                        onClick={handleCopyLink}
                        className="text-[var(--text-muted,#8E9BBF)] hover:text-[#1E3FAE] transition p-0.5 shrink-0"
                        title="Copy live link"
                      >
                        {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="rounded-xl p-2 text-[var(--text-muted,#8E9BBF)] hover:bg-[var(--hover-bg,#EEF2FA)] hover:text-[var(--text-primary,#1B2559)] transition shrink-0"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Quick Actions Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 sm:mt-5">
                <button
                  onClick={() => onOpenPanel && onOpenPanel(tenant)}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-[#1E3FAE]/30 bg-[#1E3FAE]/10 py-2 px-2 text-xs font-semibold text-[#1E3FAE] hover:bg-[#1E3FAE]/20 transition"
                >
                  <Eye size={12} /> User Panel
                </button>

                <button
                  onClick={() => onImpersonate && onImpersonate(tenant)}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--border-primary,#E3E8F5)] bg-[var(--bg-surface,#FFFFFF)] py-2 px-2 text-xs font-semibold text-[var(--text-secondary,#3B4874)] hover:border-[#1E3FAE]/50 hover:text-[#1E3FAE] transition"
                >
                  <ArrowUpRight size={12} /> Impersonate
                </button>

                <button
                  onClick={() => onChangePlan && onChangePlan(tenant)}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--border-primary,#E3E8F5)] bg-[var(--bg-surface,#FFFFFF)] py-2 px-2 text-xs font-semibold text-[var(--text-secondary,#3B4874)] hover:border-[#1E3FAE]/50 hover:text-[#1E3FAE] transition capitalize"
                >
                  <Layers size={12} /> Plan ({tenant.plan || 'Starter'})
                </button>

                <button
                  onClick={() => onToggleStatus && onToggleStatus(tenant)}
                  className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-2 text-xs font-semibold transition ${
                    isSuspended
                      ? 'border border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      : 'border border-red-500/30 bg-red-50 text-red-700 hover:bg-red-100'
                  }`}
                >
                  <ShieldAlert size={12} /> {isSuspended ? 'Reactivate' : 'Suspend'}
                </button>
              </div>

              {/* Drawer Tabs Navigation */}
              <div className="flex border-b border-[var(--border-primary,#E3E8F5)] mt-4 -mb-4 sm:-mb-6 space-x-4 sm:space-x-6 overflow-x-auto no-scrollbar">
                {[
                  { id: 'overview', label: 'Overview & Usage' },
                  { id: 'settings', label: 'Branding & Info' },
                  { id: 'orders', label: 'Recent Orders' },
                  { id: 'audit', label: `Audit Trail (${tenantAuditLogs.length})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`pb-3 text-xs font-semibold tracking-wide transition border-b-2 -mb-px shrink-0 whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-[#D4AF37] text-[#1E3FAE] font-bold'
                        : 'border-transparent text-[var(--text-muted,#8E9BBF)] hover:text-[var(--text-primary,#1B2559)]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Contents */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
              {/* TAB 1: Overview & Usage */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Quotas & Counts */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted,#8E9BBF)] mb-3">
                      Resource Usage & Allocation
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-[var(--border-primary,#E3E8F5)] bg-[var(--bg-card,#FFFFFF)] p-3 sm:p-4 shadow-xs">
                        <div className="text-[11px] text-[var(--text-muted,#8E9BBF)]">Total QR Tables</div>
                        <div className="text-xl sm:text-2xl font-black text-[var(--text-primary,#1B2559)] mt-1 tabular-nums">
                          {tenant.tableCount || 0}
                        </div>
                        <div className="text-[10px] text-[var(--text-muted,#8E9BBF)] mt-0.5">Assigned dine-in stations</div>
                      </div>

                      <div className="rounded-2xl border border-[var(--border-primary,#E3E8F5)] bg-[var(--bg-card,#FFFFFF)] p-3 sm:p-4 shadow-xs">
                        <div className="text-[11px] text-[var(--text-muted,#8E9BBF)]">Menu Food & Beverages</div>
                        <div className="text-xl sm:text-2xl font-black text-[var(--text-primary,#1B2559)] mt-1 tabular-nums">
                          {tenant.productCount || 0}
                        </div>
                        <div className="text-[10px] text-[var(--text-muted,#8E9BBF)] mt-0.5">Active catalog items</div>
                      </div>
                    </div>
                  </div>

                  {/* Owner Credentials */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted,#8E9BBF)] mb-3">
                      Account Ownership
                    </h3>
                    <div className="rounded-2xl border border-[var(--border-primary,#E3E8F5)] bg-[var(--bg-card,#FFFFFF)] p-4 space-y-2.5 text-xs shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--text-muted,#8E9BBF)]">Owner Name:</span>
                        <span className="font-semibold text-[var(--text-primary,#1B2559)]">{tenant.ownerName || 'Unassigned'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--text-muted,#8E9BBF)]">Contact Email:</span>
                        <span className="font-mono text-[var(--text-secondary,#3B4874)]">{tenant.ownerEmail || 'Unassigned'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--text-muted,#8E9BBF)]">Tenant UUID:</span>
                        <span className="font-mono text-[10px] sm:text-[11px] text-[var(--text-muted,#8E9BBF)] truncate max-w-[200px]">{tenant.id}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--text-muted,#8E9BBF)]">Registration Date:</span>
                        <span className="text-[var(--text-secondary,#3B4874)]">{new Date(tenant.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Settings & Branding */}
              {activeTab === 'settings' && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-[var(--border-primary,#E3E8F5)] bg-[var(--bg-card,#FFFFFF)] p-4 space-y-3 text-xs shadow-xs">
                    <h4 className="font-bold text-[var(--text-primary,#1B2559)]">Storefront Appearance</h4>
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-muted,#8E9BBF)]">Theme Palette:</span>
                      <span className="font-semibold text-[var(--text-primary,#1B2559)] capitalize">{tenant.settings?.theme || 'Default Emerald'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-muted,#8E9BBF)]">Pure Vegetarian Mode:</span>
                      <span className="font-semibold text-emerald-600">Active (100% Veg Enforced)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: Recent Orders */}
              {activeTab === 'orders' && (
                <div className="space-y-3">
                  {mockRecentOrders.map((ord) => (
                    <div
                      key={ord.id}
                      className="p-3.5 rounded-xl border border-[var(--border-primary,#E3E8F5)] bg-[var(--hover-bg,#EEF2FA)] text-xs flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-[var(--text-primary,#1B2559)]">{ord.id} · {ord.table}</div>
                        <div className="text-[11px] text-[var(--text-muted,#8E9BBF)]">{ord.items} items · {ord.time}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-[#1E3FAE] tabular-nums">{ord.total}</div>
                        <div className="text-[10px] text-[var(--text-muted,#8E9BBF)]">Paid online</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 4: Audit Trail */}
              {activeTab === 'audit' && (
                <div className="space-y-3">
                  {tenantAuditLogs.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[var(--text-muted,#8E9BBF)]">
                      No specific administrative events logged for this café yet.
                    </div>
                  ) : (
                    tenantAuditLogs.map((log) => (
                      <div
                        key={log._id || Math.random()}
                        className="p-3.5 rounded-xl border border-[var(--border-primary,#E3E8F5)] bg-[var(--hover-bg,#EEF2FA)] text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#1E3FAE]">{log.action}</span>
                          <span className="text-[10px] text-[var(--text-muted,#8E9BBF)]">
                            {new Date(log.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-[var(--text-muted,#8E9BBF)] text-[11px]">
                          Actor: <span className="text-[var(--text-secondary,#3B4874)]">{log.actorEmail}</span>
                        </div>
                        {log.details?.reason && (
                          <div className="text-[var(--text-secondary,#3B4874)] italic text-[11px]">
                            Reason: "{log.details.reason}"
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[var(--border-primary,#E3E8F5)] bg-[var(--hover-bg,#EEF2FA)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[var(--text-muted,#5B6585)]">
              <span className="truncate">Tenant ID: <span className="font-mono text-[10px]">{tenant.id}</span></span>
              <button
                onClick={onClose}
                className="w-full sm:w-auto rounded-xl border border-[var(--border-primary,#E3E8F5)] bg-[var(--bg-surface,#FFFFFF)] px-4 py-2 font-semibold text-[var(--text-secondary,#3B4874)] hover:bg-[var(--hover-bg,#EEF2FA)] transition text-center"
              >
                Close Drawer
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
