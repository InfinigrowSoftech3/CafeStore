import {
  LayoutDashboard, Store, CreditCard, ScrollText, UserCheck,
  Settings, Smartphone, LogOut, ChevronLeft, ChevronRight,
  ShieldCheck, X
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'tenants', label: 'Cafés Directory', icon: Store, badgeKey: 'tenantCount' },
  { id: 'plans', label: 'Plans & Billing', icon: CreditCard },
  { id: 'audit', label: 'Audit Trail', icon: ScrollText },
  { id: 'impersonation', label: 'Impersonations', icon: UserCheck },
  { id: 'settings', label: 'Platform Settings', icon: Settings },
];

export default function Sidebar({
  activeTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  tenantCount = 0,
  adminUser = null,
  onLogout,
  onOpenUserPanels,
}) {
  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-50 bg-[#07123A]/80 backdrop-blur-sm lg:hidden animate-in fade-in duration-200"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container: Sticky 100vh on desktop, fixed slide-over on mobile */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col h-screen shrink-0 border-r transition-all duration-300 lg:sticky lg:top-0 lg:z-30 custom-scrollbar bg-[var(--sidebar-bg,#0B1B4D)] border-[var(--sidebar-border,rgba(227,232,245,0.12))] text-[var(--sidebar-text,#FFFFFF)] shadow-2xl lg:shadow-xl ${
          isMobileOpen
            ? 'translate-x-0 w-72 sm:w-80 max-w-[85vw]'
            : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}`}
      >
        {/* ── 1. Top Brand Header (h-16 pinned) ───────────────── */}
        <div className="flex h-16 shrink-0 items-center justify-between px-4 border-b border-[var(--sidebar-border,rgba(227,232,245,0.12))]">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1E3FAE]/30 to-[#0B1B4D] border border-[#D4AF37]/50 text-[#D4AF37] font-bold shadow-inner">
              <ShieldCheck size={20} />
            </div>

            {(!isCollapsed || isMobileOpen) && (
              <div className="truncate">
                <span className="font-display text-sm font-bold tracking-tight text-white block truncate">
                  Brewhaus Core
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37] block">
                  Super Admin
                </span>
              </div>
            )}
          </div>

          {/* Desktop collapse toggle */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--sidebar-border,rgba(227,232,245,0.12))] text-[var(--sidebar-text-muted,#8E9BBF)] hover:bg-[var(--sidebar-hover-bg,rgba(255,255,255,0.08))] hover:text-white transition"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>

          {/* Mobile close button */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-2 text-[var(--sidebar-text-muted,#8E9BBF)] hover:text-white transition rounded-lg hover:bg-[var(--sidebar-hover-bg,rgba(255,255,255,0.08))]"
            aria-label="Close Sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── 2. Middle: Navigation Items List (Scrollable) ───── */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 custom-scrollbar">
          {(!isCollapsed || isMobileOpen) && (
            <div className="px-2 pt-1 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--sidebar-text-muted,#8E9BBF)]">
              Platform Modules
            </div>
          )}

          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const showText = !isCollapsed || isMobileOpen;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  title={!showText ? item.label : undefined}
                  className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition group ${
                    isActive
                      ? 'bg-[#D4AF37]/14 text-white border-l-[3px] border-l-[#D4AF37] border-y-transparent border-r-transparent rounded-r-xl rounded-l-none pl-2.5 shadow-sm font-bold'
                      : 'text-[#8E9BBF] hover:bg-white/[0.08] hover:text-white border-l-[3px] border-transparent'
                  }`}
                >
                  <Icon
                    size={18}
                    className={`shrink-0 transition ${
                      isActive
                        ? 'text-[#D4AF37]'
                        : 'text-[#8E9BBF] group-hover:text-white'
                    }`}
                  />

                  {showText && (
                    <div className="flex flex-1 items-center justify-between truncate">
                      <span className="truncate">{item.label}</span>
                      {item.badgeKey === 'tenantCount' && tenantCount > 0 && (
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold bg-[#D4AF37] text-[#0B1B4D]">
                          {tenantCount}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* ── 3. Bottom Section: Pinned at bottom of screen ────── */}
        <div className="shrink-0 p-3 space-y-2 border-t border-[var(--sidebar-border,rgba(227,232,245,0.12))] bg-[var(--sidebar-hover-bg,rgba(255,255,255,0.08))]/60">
          {/* Workstation Launcher - Gold Outline Button */}
          <button
            onClick={() => {
              onOpenUserPanels();
              if (onCloseMobile) onCloseMobile();
            }}
            title={isCollapsed && !isMobileOpen ? 'User Panel Workstation' : undefined}
            className={`w-full flex items-center gap-2.5 rounded-xl border border-[#D4AF37] bg-transparent py-2.5 px-3 text-xs font-bold text-[#D4AF37] hover:bg-[#D4AF37]/10 transition ${
              isCollapsed && !isMobileOpen ? 'justify-center' : ''
            }`}
          >
            <Smartphone size={16} className="shrink-0 text-[#D4AF37]" />
            {(!isCollapsed || isMobileOpen) && <span className="truncate font-bold">User Panel Workstation</span>}
          </button>

          {/* Admin User Profile Chip & Logout */}
          <div className={`pt-2 border-t border-[var(--sidebar-border,rgba(227,232,245,0.12))]/80 flex items-center gap-2.5 ${isCollapsed && !isMobileOpen ? 'justify-center' : ''}`}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#D4AF37] text-[#0B1B4D] font-black text-xs shadow-sm">
              SA
            </div>

            {(!isCollapsed || isMobileOpen) && (
              <div className="flex-1 truncate">
                <div className="text-xs font-bold text-white truncate">
                  {adminUser?.name || 'Platform Admin'}
                </div>
                <div className="text-[10px] text-[#8E9BBF] font-mono truncate">
                  {adminUser?.email || 'admin@brewhaus.com'}
                </div>
              </div>
            )}

            {(!isCollapsed || isMobileOpen) && (
              <button
                onClick={onLogout}
                className="p-1.5 text-[var(--sidebar-text-muted,#8E9BBF)] hover:text-red-400 transition rounded-lg hover:bg-white/10"
                title="Sign out of Super Admin"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
