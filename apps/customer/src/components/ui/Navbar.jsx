import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { ScanLine, Coffee } from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import useCartStore from '../../context/cartStore';

export default function Navbar() {
  const tenant = useTenant();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const currentSearch = searchParams.toString() ? `?${searchParams.toString()}` : '';
  const { tableNumber, openScanner } = useCartStore();

  // Focused checkout flows and the immersive About story use their own header.
  if (['/cart', '/checkout', '/about'].includes(location.pathname)) {
    return null;
  }

  const subtitle = tenant.tagline || `Welcome to ${tenant.name || 'our café'}`;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#EFE4D6] bg-[#FFFDF9]/95 shadow-[0_2px_12px_-2px_rgba(15,61,46,0.04)] backdrop-blur-xl">
      <div className="flex w-full items-center justify-between gap-3 px-4 py-2.5">
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

        <button
          type="button"
          onClick={openScanner}
          aria-label={
            tableNumber
              ? `Table ${String(tableNumber).padStart(2, '0')} selected - tap to scan again`
              : 'Scan Table QR Code'
          }
          title={tableNumber ? `Table ${String(tableNumber).padStart(2, '0')} - tap to change` : 'Scan Table'}
          className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#7A3316] text-[#FFFDF9] shadow-[0_6px_16px_rgba(122,51,22,0.28)] transition-all hover:bg-[#5E2610] active:scale-95"
        >
          <ScanLine size={20} strokeWidth={2.2} />
          {tableNumber ? (
            <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-[#FFFDF9] bg-emerald-500" />
          ) : null}
        </button>
      </div>
    </header>
  );
}
