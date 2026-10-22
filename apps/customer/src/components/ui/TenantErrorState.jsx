import React from 'react';
import { Coffee, AlertTriangle, RefreshCw, QrCode } from 'lucide-react';

export function TenantNotFoundScreen({ message }) {
  return (
    <main
      id="tenant-not-found-screen"
      role="main"
      className="flex min-h-[100dvh] flex-col items-center justify-center bg-white px-6 text-center text-[#2B1810]"
    >
      <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-amber-300 bg-[#F3E9DC] shadow-sm">
        <Coffee className="h-10 w-10 text-[#7A3316]" />
        <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-xs font-bold text-white shadow-xs">
          ?
        </span>
      </div>

      <p className="font-mono text-xs uppercase tracking-widest text-[#7A3316] font-semibold">404 Not Found</p>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-[#2B1810]">
        Cafe Not Found
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-stone-600">
        {message || 'We could not find any active cafe registered at this web address. Please scan your cafe table QR code or browse our menu.'}
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => {
            try {
              sessionStorage.removeItem('active_cafe_slug');
              sessionStorage.removeItem('active_tenant_id');
              sessionStorage.removeItem('cafe_tenant_slug');
              sessionStorage.removeItem('cafe_tenant_id');
              sessionStorage.removeItem('active_table_token');
              localStorage.removeItem('active_cafe_slug');
              localStorage.removeItem('active_tenant_id');
              localStorage.removeItem('cafe_tenant_slug');
              localStorage.removeItem('cafe_tenant_id');
              localStorage.removeItem('active_table_token');
            } catch {
              /* ignore storage errors */
            }
            window.location.href = '/menu';
          }}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#7A3316] px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-xs transition hover:bg-[#5E2610] active:scale-95"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Browse Menu</span>
        </button>
      </div>
    </main>
  );
}

export function TenantSuspendedScreen({ message }) {
  return (
    <main
      id="tenant-suspended-screen"
      role="main"
      className="flex min-h-[100dvh] flex-col items-center justify-center bg-white px-6 text-center text-[#2B1810]"
    >
      <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-amber-300 bg-[#F3E9DC] shadow-sm">
        <AlertTriangle className="h-10 w-10 text-amber-600" />
      </div>

      <p className="font-mono text-xs uppercase tracking-widest text-amber-700 font-semibold">Account Inactive</p>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-[#2B1810]">
        Ordering Temporarily Paused
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-stone-600">
        {message || 'Online table ordering for this cafe is temporarily paused. Please place your order directly with the counter or wait staff.'}
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#7A3316] px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-xs transition hover:bg-[#5E2610] active:scale-95"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Check Again</span>
        </button>
      </div>
    </main>
  );
}
