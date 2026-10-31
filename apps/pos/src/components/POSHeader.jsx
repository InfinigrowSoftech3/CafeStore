import React from 'react';
import { User, QrCode, Clock, ExternalLink, LogOut, Menu } from 'lucide-react';
import { getAccessToken } from '@cafe/shared';
import { env } from '../config/env';

export default function POSHeader({
  tenant,
  user,
  onLogout,
  onOpenScanQr,
  onToggleMobileSidebar,
}) {
  const isManagerOrOwner = ['owner', 'manager'].includes(user?.role);
  const token = getAccessToken();
  const kdsUrl = env.kdsUrl ? `${env.kdsUrl}${token ? `?sso=${encodeURIComponent(token)}` : ''}` : null;
  const adminUrl = env.adminUrl ? `${env.adminUrl}${token ? `?sso=${encodeURIComponent(token)}` : ''}` : null;

  return (
    <header className="h-16 bg-[#062F25] text-white px-3 sm:px-5 flex items-center justify-between border-b border-[#174B3C] shrink-0 z-30 select-none shadow-md">
      {/* ── Left Branding ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 rounded-xl text-[#A9C7B8] hover:text-white hover:bg-[#104737] transition touch-press"
          aria-label="Toggle navigation menu"
        >
          <Menu size={20} />
        </button>

        {/* Square Cafe Logo with Rounded Corners */}
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#105B43] to-[#0B3B2E] border border-[#174B3C] text-white font-extrabold text-base shadow-sm overflow-hidden shrink-0">
          {tenant?.logoUrl ? (
            <img
              src={tenant.logoUrl}
              alt={tenant.name || 'Logo'}
              className="h-full w-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <span>{tenant?.name?.charAt(0)?.toUpperCase() || 'V'}</span>
          )}
        </div>

        {/* Cafe Name & Counter POS Badge */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-display font-extrabold text-base sm:text-lg tracking-tight text-[#F5FFF9] leading-tight">
              {tenant?.name || 'VelvetRosiee'}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#105B43] text-[#20D99A] border border-[#20D99A]/40 shadow-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-[#20D99A] animate-pulse" />
              Counter POS
            </span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#8EAA9B]">
            CAFE & BISTRO
          </span>
        </div>
      </div>

      {/* ── Right Actions & Staff Profile ─────────────────────────── */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Scan QR Button */}
        <button
          type="button"
          onClick={onOpenScanQr}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0B3B2E] hover:bg-[#104737] text-xs font-semibold text-[#A9CFC0] hover:text-white border border-[#174B3C] hover:border-[#20D99A]/40 transition min-h-[38px] touch-press shadow-xs"
          title="Scan Table or Customer QR"
        >
          <QrCode size={15} className="text-[#20D99A]" />
          <span className="hidden sm:inline">Scan QR</span>
        </button>

        {/* Staff Profile Pill */}
        <div className="flex items-center gap-2 text-xs text-[#F5FFF9] bg-[#0B3B2E] px-3 py-1.5 rounded-xl border border-[#174B3C]">
          <div className="h-6 w-6 rounded-lg bg-[#087A55] text-white font-bold flex items-center justify-center text-[11px] shadow-xs">
            {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'S'}
          </div>
          <span className="font-semibold text-[#F5FFF9] max-w-[100px] sm:max-w-[140px] truncate">
            {user?.name || user?.email?.split('@')[0]}
          </span>
          <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded bg-[#105B43] text-[#20D99A] border border-[#20D99A]/30">
            {user?.role || 'Staff'}
          </span>
        </div>

        {/* KDS Shortcut */}
        {kdsUrl && (
          <a
            href={kdsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0B3B2E] hover:bg-[#104737] text-xs font-semibold text-[#20D99A] border border-[#174B3C] hover:border-[#20D99A]/50 transition min-h-[38px] shadow-xs"
            title="Open Kitchen Display System (KDS)"
          >
            <Clock size={14} />
            <span>KDS</span>
          </a>
        )}

        {/* Back Office / Admin Shortcut (Owners & Managers) */}
        {isManagerOrOwner && adminUrl && (
          <a
            href={adminUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0B3B2E] hover:bg-[#104737] text-xs font-semibold text-[#A9C7B8] hover:text-white border border-[#174B3C] hover:border-[#A9C7B8]/40 transition min-h-[38px] shadow-xs"
            title="Open Back-Office Admin"
          >
            <ExternalLink size={14} />
            <span>Admin</span>
          </a>
        )}

        {/* Exit Button */}
        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0B3B2E] hover:bg-[#EF4444]/20 text-[#A9C7B8] hover:text-[#EF4444] text-xs font-semibold border border-[#174B3C] hover:border-[#EF4444]/40 transition min-h-[38px] touch-press shadow-xs"
          title="Sign out of station"
        >
          <LogOut size={14} />
          <span className="hidden sm:inline">Exit</span>
        </button>
      </div>
    </header>
  );
}
