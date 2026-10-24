import { useState, useEffect, useRef } from 'react';
import {
  Menu, Search, RefreshCw, Bell, ShieldCheck,
  LogOut, Smartphone, CheckCircle2, ChevronDown, Sparkles
} from 'lucide-react';

export default function TopBar({
  onOpenMobileSidebar,
  onOpenCommandPalette,
  activeTabTitle = 'Overview',
  adminUser,
  onLogout,
  onRefresh,
  loading = false,
  onOpenUserPanels,
  activeAlertCount = 0,
}) {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);

  const profileRef = useRef(null);
  const notificationRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(e.target)) {
        setNotificationOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-[var(--header-border)] bg-[var(--header-bg)] backdrop-blur-md px-3 sm:px-6 transition-colors duration-200">
      <div className="flex h-full items-center justify-between gap-2 sm:gap-4 max-w-7xl mx-auto">
        {/* Left: Mobile hamburger + Active Section */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <button
            onClick={onOpenMobileSidebar}
            className="lg:hidden flex items-center justify-center h-10 w-10 rounded-xl border border-[var(--header-control-border)] bg-[var(--header-control-bg)] text-[var(--header-text-muted)] hover:bg-[var(--header-control-hover-bg)] hover:text-[var(--header-text)] transition shrink-0 active:scale-95"
            aria-label="Toggle navigation menu"
          >
            <Menu size={20} />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-[var(--header-text)] tracking-tight truncate">
                {activeTabTitle}
              </h1>
              {/* Environment badge */}
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--sa-success)] animate-pulse" />
                Live Production
              </span>
            </div>
            <div className="hidden sm:block text-[11px] text-[var(--header-text-muted)] truncate">
              Brewhaus Cloud Multi-Tenant SaaS Engine
            </div>
          </div>
        </div>

        {/* Center: Command Palette Search Bar */}
        <div className="flex-1 max-w-md hidden md:block">
          <button
            onClick={onOpenCommandPalette}
            className="w-full flex items-center justify-between rounded-xl border border-[var(--header-control-border)] bg-[var(--header-control-bg)] px-3.5 py-2 text-xs text-[var(--header-text-muted)] hover:border-white/40 hover:bg-[var(--header-control-hover-bg)] hover:text-[var(--header-text)] transition shadow-inner focus:outline-none focus:ring-2 focus:ring-white/30"
          >
            <div className="flex items-center gap-2.5">
              <Search size={14} className="text-white/80" />
              <span>Search cafés, commands or views...</span>
            </div>
            <kbd className="rounded border border-[var(--header-control-border)] bg-[var(--header-control-bg)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--header-text-muted)] shadow-2xs">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right Action Icons & Profile */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Mobile search trigger */}
          <button
            onClick={onOpenCommandPalette}
            className="md:hidden flex items-center justify-center h-10 w-10 rounded-xl border border-[var(--header-control-border)] bg-[var(--header-control-bg)] text-[var(--header-text-muted)] hover:bg-[var(--header-control-hover-bg)] hover:text-[var(--header-text)] transition active:scale-95"
            title="Search (⌘K)"
            aria-label="Search"
          >
            <Search size={17} />
          </button>

          {/* Refresh Platform Data */}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center justify-center h-10 w-10 rounded-xl border border-[var(--header-control-border)] bg-[var(--header-control-bg)] text-[var(--header-text-muted)] hover:bg-[var(--header-control-hover-bg)] hover:text-[var(--header-text)] transition disabled:opacity-40 active:scale-95"
            title="Refresh Platform Telemetry"
            aria-label="Refresh"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>

          {/* Notifications Popover */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => {
                setNotificationOpen(!notificationOpen);
                setProfileDropdownOpen(false);
              }}
              className="relative flex items-center justify-center h-10 w-10 rounded-xl border border-[var(--header-control-border)] bg-[var(--header-control-bg)] text-[var(--header-text-muted)] hover:bg-[var(--header-control-hover-bg)] hover:text-[var(--header-text)] transition active:scale-95"
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell size={16} />
              {activeAlertCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--sa-accent)] text-[9px] font-black text-white shadow-sm">
                  {activeAlertCount}
                </span>
              )}
            </button>

            {notificationOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-[var(--popover-border)] bg-[var(--popover-bg)] p-3 shadow-2xl text-xs z-40 animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="flex items-center justify-between pb-2 border-b border-[var(--border-primary)] font-bold text-[var(--text-primary)]">
                  <span>Platform Notifications</span>
                  <span className="text-[10px] text-[var(--sa-primary)] font-bold">Live</span>
                </div>
                <div className="py-3 space-y-2 text-[var(--text-secondary)]">
                  <div className="flex items-start gap-2 bg-[var(--hover-bg)] p-2.5 rounded-xl border border-[var(--border-primary)]">
                    <CheckCircle2 size={14} className="text-[var(--sa-success)] mt-0.5 shrink-0" />
                    <div>
                      <div className="font-semibold text-[var(--text-primary)]">Platform Health 100%</div>
                      <div className="text-[10px] text-[var(--text-muted)]">All registered café subdomains active and online.</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 bg-[var(--hover-bg)] p-2.5 rounded-xl border border-[var(--border-primary)]">
                    <ShieldCheck size={14} className="text-[var(--sa-primary)] mt-0.5 shrink-0" />
                    <div>
                      <div className="font-semibold text-[var(--text-primary)]">Pure Vegetarian Filter</div>
                      <div className="text-[10px] text-[var(--text-muted)]">Zero-meat / zero-egg verification active across all menus.</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="h-6 w-px bg-[var(--header-border)] mx-0.5 hidden sm:block" />

          {/* Admin Avatar Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => {
                setProfileDropdownOpen(!profileDropdownOpen);
                setNotificationOpen(false);
              }}
              className="flex items-center gap-1.5 sm:gap-2 rounded-xl border border-[var(--header-control-border)] bg-[var(--header-control-bg)] h-10 px-2 sm:px-2.5 text-xs font-semibold text-[var(--header-text)] hover:bg-[var(--header-control-hover-bg)] transition active:scale-95"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-white text-[var(--sa-primary)] font-bold text-[10px] shrink-0">
                SA
              </div>
              <span className="hidden sm:inline font-bold text-[var(--header-text)]">Super Admin</span>
              <ChevronDown size={12} className="text-[var(--header-text-muted)]" />
            </button>

            {profileDropdownOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-full mt-2 w-56 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-[var(--popover-border)] bg-[var(--popover-bg)] p-1.5 shadow-2xl text-xs z-40 animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="px-3 py-2 border-b border-[var(--border-primary)] text-[11px]">
                  <div className="font-bold text-[var(--text-primary)] truncate">{adminUser?.name || 'Platform Administrator'}</div>
                  <div className="text-[var(--text-muted)] font-mono text-[10px] truncate">{adminUser?.email || 'admin@brewhaus.com'}</div>
                </div>

                <button
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    onOpenUserPanels();
                  }}
                  className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] hover:text-[var(--sa-primary)] transition text-left"
                >
                  <Smartphone size={13} className="shrink-0" /> User Panels Workstation
                </button>

                <div className="my-1 border-t border-[var(--border-primary)]" />

                <button
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-2 rounded-xl px-3 py-2 font-semibold text-[var(--danger-text)] hover:bg-[var(--danger-bg)] transition text-left"
                >
                  <LogOut size={13} className="shrink-0" /> Exit Platform Admin
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
