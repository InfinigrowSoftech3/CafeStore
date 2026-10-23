import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Store, LayoutDashboard, CreditCard, ScrollText,
  UserCheck, Settings, Eye, ArrowUpRight, LogOut,
  RefreshCw, Smartphone, X, CornerDownLeft
} from 'lucide-react';

export default function CommandPalette({
  isOpen,
  onClose,
  tenants = [],
  onSelectTenant,
  onNavigateTab,
  onRefresh,
  onLogout,
  onOpenUserPanels,
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Build searchable items
  const items = [];

  // 1. Navigation items
  items.push(
    { id: 'nav-overview', type: 'Navigation', title: 'Go to Overview', subtitle: 'Platform KPIs & Charts', icon: LayoutDashboard, action: () => onNavigateTab('overview') },
    { id: 'nav-tenants', type: 'Navigation', title: 'Go to Cafés Directory', subtitle: 'Manage all tenant accounts', icon: Store, action: () => onNavigateTab('tenants') },
    { id: 'nav-plans', type: 'Navigation', title: 'Go to Plans & Billing', subtitle: 'Subscription tiers & MRR', icon: CreditCard, action: () => onNavigateTab('plans') },
    { id: 'nav-audit', type: 'Navigation', title: 'Go to Audit Log', subtitle: 'Platform activity & security records', icon: ScrollText, action: () => onNavigateTab('audit') },
    { id: 'nav-impersonation', type: 'Navigation', title: 'Go to Impersonation Sessions', subtitle: 'Support sessions & audit', icon: UserCheck, action: () => onNavigateTab('impersonation') },
    { id: 'nav-settings', type: 'Navigation', title: 'Go to Platform Settings', subtitle: 'Global configurations', icon: Settings, action: () => onNavigateTab('settings') }
  );

  // 2. Global Actions
  items.push(
    { id: 'act-user-panels', type: 'Action', title: 'View All User Panels Workstation', subtitle: 'Responsive tablet/mobile tester', icon: Smartphone, action: onOpenUserPanels },
    { id: 'act-refresh', type: 'Action', title: 'Refresh Platform Data', subtitle: 'Reload latest metrics & tenants', icon: RefreshCw, action: onRefresh },
    { id: 'act-logout', type: 'Action', title: 'Sign Out of Super Admin', subtitle: 'Terminate platform session', icon: LogOut, action: onLogout }
  );

  // 3. Cafés items
  tenants.forEach((t) => {
    items.push({
      id: `cafe-${t.id}`,
      type: 'Café',
      title: t.name,
      subtitle: `${t.slug} · Tier: ${t.plan || 'starter'} · Status: ${t.status}`,
      icon: Store,
      badge: t.status,
      action: () => onSelectTenant(t),
    });
  });

  const filteredItems = items.filter((item) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      item.title.toLowerCase().includes(q) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
      item.type.toLowerCase().includes(q)
    );
  });

  // Handle keyboard arrows and Enter
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((idx) => (idx + 1) % Math.max(1, filteredItems.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((idx) => (idx - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = filteredItems[selectedIndex];
        if (selected) {
          selected.action();
          onClose();
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredItems, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-4 sm:pt-20 px-3 sm:px-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0"
          style={{ backgroundColor: 'var(--modal-backdrop)', backdropFilter: 'blur(8px)' }}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          className="relative w-full max-w-2xl max-h-[85vh] rounded-2xl border shadow-2xl text-[var(--text-primary)] overflow-hidden z-10 custom-scrollbar flex flex-col"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-primary)',
          }}
        >
          {/* Search bar */}
          <div className="flex items-center gap-3 border-b border-[var(--border-primary)] px-3.5 py-3 sm:px-4 sm:py-3.5 bg-[var(--hover-bg)]/70 shrink-0">
            <Search size={18} className="text-[var(--sa-primary)] shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Search anything... (café name, view, or command)"
              className="w-full bg-transparent text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
            />
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition shrink-0"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Results list */}
          <div className="overflow-y-auto p-2 space-y-1 flex-1">
            {filteredItems.length === 0 ? (
              <div className="py-8 text-center text-xs text-[var(--text-muted)]">
                No matching café, navigation, or action found for "{query}".
              </div>
            ) : (
              filteredItems.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                const Icon = item.icon;

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      item.action();
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center justify-between rounded-xl px-3 py-2 sm:px-3.5 sm:py-2.5 cursor-pointer text-xs transition ${
                      isSelected
                        ? 'bg-[var(--sa-primary-subtle)] border border-[var(--sa-primary)]/30 text-[var(--text-primary)] font-semibold'
                        : 'hover:bg-[var(--hover-bg)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-lg border shrink-0 ${
                          isSelected
                            ? 'border-[var(--sa-primary)]/30 bg-[var(--sa-primary-subtle)] text-[var(--sa-primary)]'
                            : 'border-[var(--border-primary)] bg-[var(--hover-bg)] text-[var(--text-muted)]'
                        }`}
                      >
                        <Icon size={14} />
                      </div>

                      <div className="min-w-0 truncate">
                        <div className="font-bold truncate text-[var(--text-primary)]">{item.title}</div>
                        <div className="text-[10px] sm:text-[11px] text-[var(--text-muted)] truncate">{item.subtitle}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.badge && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                            item.badge === 'active'
                              ? 'bg-[var(--sa-success-bg)] text-[var(--sa-success-text)]'
                              : 'bg-[var(--sa-danger-bg)] text-[var(--sa-danger-text)]'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                      <span className="hidden sm:inline-block rounded-md border border-[var(--border-primary)] bg-[var(--bg-surface)] px-1.5 py-0.5 text-[9px] uppercase font-bold text-[var(--text-muted)]">
                        {item.type}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer note */}
          <div className="border-t border-[var(--border-primary)] bg-[var(--hover-bg)]/60 px-4 py-2 text-[11px] text-[var(--text-muted)] flex items-center justify-between shrink-0">
            <span>
              Use <kbd className="font-mono bg-[var(--bg-surface)] px-1 py-0.5 rounded border border-[var(--border-primary)] text-[10px]">↑</kbd> <kbd className="font-mono bg-[var(--bg-surface)] px-1 py-0.5 rounded border border-[var(--border-primary)] text-[10px]">↓</kbd> to navigate
            </span>
            <span className="flex items-center gap-1">
              Select <CornerDownLeft size={11} />
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
