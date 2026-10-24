import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Coffee, QrCode } from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import useCartStore from '../../context/cartStore';

export default function Navbar() {
  const tenant = useTenant();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const currentSearch = searchParams.toString() ? `?${searchParams.toString()}` : '';
  const tableNumber = useCartStore((state) => state.tableNumber);
  const openScanner = useCartStore((state) => state.openScanner);

  // Focused checkout flows and the immersive About story use their own header.
  if (['/cart', '/checkout', '/about'].includes(location.pathname)) {
    return null;
  }

  const subtitle = tenant.tagline || `Welcome to ${tenant.name || 'our café'}`;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#EFE4D6] bg-[#FFFDF9]/95 shadow-[0_2px_12px_-2px_rgba(15,61,46,0.04)] backdrop-blur-xl">
      <div className="customer-container flex items-center justify-between gap-3 py-2.5">
        <Link
          to={`/menu${currentSearch}`}
          aria-label={`${tenant.name || 'Café'} - Homepage`}
          className="group flex min-h-[44px] min-w-0 items-center gap-2.5 rounded-xl transition-transform active:scale-98 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7A3316]"
        >
          {tenant.logoUrl ? (
            <img
              src={tenant.logoUrl}
              alt={`${tenant.name || 'Café'} Logo`}
              className="h-10 w-auto max-w-[130px] flex-shrink-0 object-contain transition-transform group-hover:scale-102"
              width={150}
              height={40}
            />
          ) : (
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-[#7A3316] text-[#FFFDF9] shadow-xs">
              <Coffee size={20} className="stroke-[2.2]" />
            </div>
          )}
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-display text-base font-bold leading-tight tracking-tight text-[#2B1810] transition-colors group-hover:text-[#7A3316]">
              {tenant.name || 'Café'}
            </span>
            <span className="truncate text-[10px] font-bold uppercase leading-none tracking-wider text-stone-500">
              {subtitle}
            </span>
          </div>
        </Link>

        {/* Connected Table Indicator / Scanner trigger */}
        <div className="flex flex-shrink-0 items-center">
          {tableNumber ? (
            <button
              type="button"
              onClick={openScanner}
              title={`Connected to Table ${tableNumber}. Tap to switch or re-scan table.`}
              aria-label={`Connected to Table ${tableNumber}. Tap to switch or re-scan table.`}
              className="group flex min-h-[38px] items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50/90 px-3 py-1 text-emerald-900 shadow-2xs transition hover:bg-emerald-100 hover:border-emerald-400 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              <span className="relative flex h-2.5 w-2.5 flex-shrink-0" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-600" />
              </span>
              <div className="flex flex-col items-start leading-none">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-emerald-700">Connected</span>
                <span className="font-display text-xs font-bold text-emerald-950">Table {String(tableNumber).padStart(2, '0')}</span>
              </div>
            </button>
          ) : (
            <button
              type="button"
              onClick={openScanner}
              title="Scan table QR code to order"
              aria-label="Scan table QR code to order"
              className="group flex min-h-[38px] items-center gap-1.5 rounded-full border border-[#EFE4D6] bg-[#FBF6EF] px-3 py-1.5 text-xs font-bold text-[#7A3316] shadow-2xs transition hover:bg-[#F3E9DC] hover:border-[#7A3316]/30 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7A3316]"
            >
              <QrCode size={16} className="stroke-[2.2] text-[#7A3316]" />
              <span className="font-display text-xs font-bold">Scan Table</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
