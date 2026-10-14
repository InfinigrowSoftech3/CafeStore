import React from 'react';
import { Coffee, AlertTriangle, RefreshCw, QrCode } from 'lucide-react';

export function TenantNotFoundScreen({ message }) {
  return (
    <main
      id="tenant-not-found-screen"
      role="main"
      className="flex min-h-screen flex-col items-center justify-center bg-espresso-950 bg-gradient-to-b from-[#1C1612] to-[#17110C] px-6 text-center text-white"
    >
      <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-brew-500/30 bg-gradient-to-b from-brew-500/20 to-transparent shadow-2xl backdrop-blur-md">
        <Coffee className="h-10 w-10 text-brew-400" />
        <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-xs font-bold text-white shadow-md">
          ?
        </span>
      </div>

      <p className="font-mono text-xs uppercase tracking-widest text-brew-400 font-semibold">404 Not Found</p>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
        Café Not Found
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-sand-200">
        {message || 'We could not find any active café registered at this web address. Please scan your café table QR code or browse our menu.'}
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => {
            try {
              sessionStorage.removeItem('cafe_tenant_slug');
              sessionStorage.removeItem('cafe_tenant_id');
            } catch {
              /* ignore storage errors */
            }
            window.location.href = '/menu';
          }}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-brew-500 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-espresso-950 shadow-md transition hover:bg-brew-400 active:scale-95"
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
      className="flex min-h-screen flex-col items-center justify-center bg-espresso-950 bg-gradient-to-b from-[#1C1612] to-[#17110C] px-6 text-center text-white"
    >
      <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-amber-500/30 bg-gradient-to-b from-amber-500/20 to-transparent shadow-2xl backdrop-blur-md">
        <AlertTriangle className="h-10 w-10 text-amber-400" />
      </div>

      <p className="font-mono text-xs uppercase tracking-widest text-amber-400 font-semibold">Account Inactive</p>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
        Ordering Temporarily Paused
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-sand-200">
        {message || 'Online table ordering for this café is temporarily paused. Please place your order directly with the counter or wait staff.'}
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-brew-500 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-espresso-950 shadow-md transition hover:bg-brew-400 active:scale-95"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Check Again</span>
        </button>
      </div>
    </main>
  );
}
