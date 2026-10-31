import React, { useState, useEffect } from 'react';
import {
  Zap,
  UtensilsCrossed,
  ShoppingBag,
  Bike,
  Receipt,
  Users,
  LayoutGrid,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Wifi,
  WifiOff,
} from 'lucide-react';

export default function POSSidebar({
  activeNav = 'counter',
  onSelectNav,
  heldOrdersCount = 0,
  isOnline = true,
  isCollapsed = false,
  onToggleCollapse,
}) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const navItems = [
    { id: 'counter', label: 'Counter', icon: Zap },
    { id: 'dine_in', label: 'Dine-in', icon: UtensilsCrossed },
    { id: 'takeaway', label: 'Takeaway', icon: ShoppingBag },
    { id: 'delivery', label: 'Delivery', icon: Bike },
    {
      id: 'orders',
      label: 'Orders',
      icon: Receipt,
      badge: heldOrdersCount > 0 ? heldOrdersCount : null,
    },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'tables', label: 'Tables & Floor', icon: LayoutGrid },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const formattedTime = currentTime.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  const formattedDate = currentTime.toLocaleDateString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return (
    <aside
      className={`h-full bg-[#062F25] border-r border-[#174B3C] flex flex-col justify-between select-none shrink-0 transition-all duration-200 z-20 ${
        isCollapsed ? 'w-[70px]' : 'w-[215px]'
      }`}
    >
      {/* ── Navigation Items List ─────────────────────────────────── */}
      <div className="p-2 sm:p-2.5 space-y-1 overflow-y-auto sidebar-scrollbar flex-1">
        {!isCollapsed && (
          <div className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-[#80AD98]">
            POS Operations
          </div>
        )}

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeNav === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectNav(item.id)}
              title={isCollapsed ? item.label : undefined}
              className={`group relative w-full flex items-center rounded-xl transition-all duration-150 touch-press text-left ${
                isCollapsed
                  ? 'justify-center p-3'
                  : 'gap-3 px-3 py-2.5 min-h-[44px]'
              } ${
                isActive
                  ? 'bg-[#105B43] text-white shadow-sm font-bold'
                  : 'text-[#A9C7B8] hover:text-[#F5FFF9] hover:bg-[#104737] font-semibold'
              }`}
            >
              {/* Active Indicator on the Left */}
              {isActive && (
                <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[#20D99A] shadow-xs" />
              )}

              <Icon
                size={20}
                className={`shrink-0 transition-colors ${
                  isActive
                    ? 'text-[#20D99A]'
                    : 'text-[#A9CFC0] group-hover:text-white'
                }`}
              />

              {!isCollapsed && (
                <span className="text-xs sm:text-sm truncate flex-1">
                  {item.label}
                </span>
              )}

              {/* Badge (e.g. held orders count) */}
              {item.badge !== null && item.badge !== undefined && (
                <span
                  className={`text-[10px] font-mono font-extrabold px-1.5 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-[#20D99A] text-[#062F25]'
                      : 'bg-[#F59E0B] text-white'
                  } ${isCollapsed ? 'absolute top-1.5 right-1.5 text-[9px] px-1 py-0' : ''}`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Bottom Section: Online Status, Clock, Collapse Toggle ───── */}
      <div className="p-2 sm:p-2.5 border-t border-[#174B3C] bg-[#041F18]/40 space-y-2 shrink-0">
        {/* Status Pill */}
        <div
          className={`flex items-center rounded-xl px-2.5 py-1.5 text-xs border ${
            isOnline
              ? 'bg-[#105B43]/30 border-[#20D99A]/30 text-[#A9E8C0]'
              : 'bg-[#EF4444]/20 border-[#EF4444]/40 text-[#FCA5A5]'
          } ${isCollapsed ? 'justify-center' : 'justify-between'}`}
          title={isOnline ? 'Terminal Online' : 'Terminal Offline'}
        >
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                isOnline
                  ? 'bg-[#20D99A] animate-pulse shadow-[0_0_8px_#20D99A]'
                  : 'bg-[#EF4444]'
              }`}
            />
            {!isCollapsed && (
              <span className="font-bold text-[11px] uppercase tracking-wider">
                {isOnline ? 'Station Online' : 'Offline Mode'}
              </span>
            )}
          </div>
          {!isCollapsed && (
            <span className="text-[10px] opacity-75 font-mono">Live</span>
          )}
        </div>

        {/* Live Clock & Date */}
        {!isCollapsed && (
          <div className="px-2.5 py-1 text-center bg-[#0B3B2E]/60 rounded-xl border border-[#174B3C]/50">
            <div className="font-display font-extrabold text-sm text-[#F5FFF9] tracking-wider font-mono">
              {formattedTime}
            </div>
            <div className="text-[10px] font-semibold text-[#8EAA9B]">
              {formattedDate}
            </div>
          </div>
        )}

        {/* Sidebar Collapse Toggle Button */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center p-2 rounded-xl text-[#8EAA9B] hover:text-white hover:bg-[#104737] transition border border-[#174B3C]/50 touch-press"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </aside>
  );
}
