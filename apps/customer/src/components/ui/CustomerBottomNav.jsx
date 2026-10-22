import { useMemo, useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Home,
  UtensilsCrossed,
  ShoppingCart,
  QrCode,
  Clock,
  MoreHorizontal,
  X,
  Sparkles,
  Info,
  Phone,
  Image,
  FileText,
  MailMinus,
  Receipt,
} from 'lucide-react';
import useCartStore, { cartItemCount } from '../../context/cartStore';

// Pages exposed in the "More" sheet
const MORE_ITEMS = [
  { label: 'Offers',      path: '/offers',      icon: Sparkles,  desc: 'Daily deals & specials'  },
  { label: 'About',       path: '/about',       icon: Info,      desc: 'Our story & team'         },
  { label: 'Contact',     path: '/contact',     icon: Phone,     desc: 'Location & hours'         },
  { label: 'Gallery',     path: '/gallery',     icon: Image,     desc: 'Photos & guest moments'   },
  { label: 'Receipt',     path: '/receipt',     icon: Receipt,   desc: 'View session receipt'     },
  { label: 'Bill',        path: '/bill',        icon: FileText,  desc: 'Table bill & payment'     },
  { label: 'Legal',       path: '/privacy',     icon: FileText,  desc: 'Terms & privacy'          },
  { label: 'Unsub',       path: '/unsubscribe', icon: MailMinus, desc: 'Manage notifications'     },
];

export default function CustomerBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const itemCount = useCartStore(cartItemCount);
  const tableNumber = useCartStore((state) => state.tableNumber);
  const openScanner = useCartStore((state) => state.openScanner);
  const [menuView, setMenuView] = useState('home');
  const [moreOpen, setMoreOpen] = useState(false);
  const sheetRef = useRef(null);

  // Track active menu view (home vs category) via custom event
  useEffect(() => {
    const handleViewChange = (e) => {
      if (e.detail?.view) setMenuView(e.detail.view);
    };
    window.addEventListener('menu:viewchange', handleViewChange);
    return () => window.removeEventListener('menu:viewchange', handleViewChange);
  }, []);

  // Close More sheet on route change
  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  // Close on outside tap
  useEffect(() => {
    if (!moreOpen) return;
    const onOutside = (e) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('pointerdown', onOutside);
    return () => document.removeEventListener('pointerdown', onOutside);
  }, [moreOpen]);

  // Hidden on checkout, cart, or order confirmation flows
  const isHiddenRoute = useMemo(() => {
    const p = location.pathname;
    return (
      p.startsWith('/checkout') ||
      p.startsWith('/cart') ||
      p.startsWith('/order-confirm') ||
      p.startsWith('/receipt')
    );
  }, [location.pathname]);

  if (isHiddenRoute) return null;

  const currentSearch = searchParams.toString() ? `?${searchParams.toString()}` : '';

  const handleHomeClick = (e) => {
    e.preventDefault();
    setMoreOpen(false);
    if (location.pathname === '/menu') {
      window.dispatchEvent(new CustomEvent('nav:home'));
      setMenuView('home');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate(`/menu${currentSearch}`);
    }
  };

  const handleMenuClick = (e) => {
    e.preventDefault();
    setMoreOpen(false);
    if (location.pathname === '/menu') {
      window.dispatchEvent(new CustomEvent('nav:menu'));
      setMenuView('category');
    } else {
      navigate(`/menu${currentSearch}`);
    }
  };

  const handleOrdersClick = (e) => {
    e.preventDefault();
    setMoreOpen(false);
    navigate(`/orders${currentSearch}`);
  };

  const handleCartClick = (e) => {
    e.preventDefault();
    setMoreOpen(false);
    navigate(`/cart${currentSearch}`);
  };

  const handleScanClick = (e) => {
    e.preventDefault();
    setMoreOpen(false);
    openScanner();
  };

  const handleMoreNav = (path) => {
    setMoreOpen(false);
    navigate(`${path}${currentSearch}`);
  };

  const isHomeActive   = location.pathname === '/menu' && menuView === 'home';
  const isMenuActive   = location.pathname === '/menu' && menuView === 'category';
  const isOrdersActive = location.pathname === '/orders';
  const isMoreActive   = MORE_ITEMS.some((item) => location.pathname.startsWith(item.path));

  return (
    <>
      {/* ── More sheet backdrop ── */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-30 bg-[#2B1810]/30 backdrop-blur-xs"
          aria-hidden="true"
        />
      )}

      {/* ── More sheet (slides up above nav bar) ── */}
      {moreOpen && (
        <div
          ref={sheetRef}
          className="fixed left-1/2 z-40 w-[calc(100%-32px)] max-w-[640px] -translate-x-1/2 rounded-[24px] bg-[#FFFDF9] border border-[#EFE4D6] shadow-[0_-8px_32px_rgba(90,50,20,0.14)] overflow-hidden"
          style={{ bottom: 'calc(82px + env(safe-area-inset-bottom, 0px))' }}
          role="dialog"
          aria-label="More options"
        >
          {/* Sheet header */}
          <div className="flex items-center justify-between px-4 pt-3.5 pb-3 border-b border-[#EFE4D6]">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#7B6B5F]">More pages</p>
            <button
              type="button"
              onClick={() => setMoreOpen(false)}
              aria-label="Close more menu"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F3E9DC] text-[#7B6B5F] hover:bg-[#EFE4D6] transition"
            >
              <X size={14} />
            </button>
          </div>

          {/* 4-column grid of icon links */}
          <div className="grid grid-cols-4 gap-1.5 p-3">
            {MORE_ITEMS.map(({ label, path, icon: Icon, desc }) => {
              const active = location.pathname.startsWith(path);
              return (
                <button
                  key={path}
                  type="button"
                  onClick={() => handleMoreNav(path)}
                  aria-label={desc}
                  className={`flex flex-col items-center gap-1.5 rounded-2xl py-3 px-1 transition-all active:scale-95 ${
                    active
                      ? 'bg-[#7A3316] text-[#FFFDF9]'
                      : 'bg-[#F3E9DC] text-[#2B1810] hover:bg-[#EFE4D6]'
                  }`}
                >
                  <Icon size={19} strokeWidth={1.8} />
                  <span className="text-[9px] font-bold tracking-tight leading-none text-center">
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Bottom nav bar ── */}
      <nav
        aria-label="Bottom Navigation"
        className="fixed left-1/2 z-40 w-[calc(100%-32px)] max-w-[640px] -translate-x-1/2"
        style={{ bottom: 'calc(14px + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="relative flex items-center justify-between px-1 py-2 bg-[#FFFDF9]/95 backdrop-blur-md border border-[#EFE4D6] rounded-[28px] shadow-[0_10px_30px_rgba(90,50,20,0.12)] sm:px-2">

          {/* Home Tab */}
          <button
            type="button"
            onClick={handleHomeClick}
            aria-label="Go to Home"
            className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-full transition-all duration-200 min-w-[36px] min-h-[44px] min-[360px]:min-w-[42px] min-[360px]:px-1.5 sm:min-w-[48px] sm:px-2 ${
              isHomeActive
                ? 'bg-[#7A3316] text-[#FFFDF9] shadow-xs'
                : 'text-[#7B6B5F] hover:text-[#2B1810]'
            }`}
          >
            <Home size={18} strokeWidth={isHomeActive ? 2.5 : 2} />
            <span className="text-[10px] font-semibold mt-0.5 tracking-tight">Home</span>
          </button>

          {/* Menu Tab */}
          <button
            type="button"
            onClick={handleMenuClick}
            aria-label="Browse Menu Categories"
            className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-full transition-all duration-200 min-w-[36px] min-h-[44px] min-[360px]:min-w-[42px] min-[360px]:px-1.5 sm:min-w-[48px] sm:px-2 ${
              isMenuActive
                ? 'bg-[#7A3316] text-[#FFFDF9] shadow-xs'
                : 'text-[#7B6B5F] hover:text-[#2B1810]'
            }`}
          >
            <UtensilsCrossed size={18} strokeWidth={isMenuActive ? 2.5 : 2} />
            <span className="text-[10px] font-semibold mt-0.5 tracking-tight">Menu</span>
          </button>

          {/* Center Raised Scan + Cart Actions */}
          <div className="relative -mt-7 flex items-center justify-center gap-1 sm:gap-1.5">
            <button
              type="button"
              onClick={handleScanClick}
              aria-label={
                tableNumber
                  ? `Table ${String(tableNumber).padStart(2, '0')} selected - tap to scan again`
                  : 'Scan Table QR Code'
              }
              title={tableNumber ? `Table ${String(tableNumber).padStart(2, '0')} - tap to change` : 'Scan Table'}
              className="relative flex items-center justify-center w-14 h-14 rounded-full bg-[#7A3316] text-[#FFFDF9] shadow-[0_10px_22px_rgba(122,51,22,0.38)] border-4 border-[#FFFDF9] active:scale-95 transition-transform"
            >
              <QrCode size={22} strokeWidth={2.4} />
              {tableNumber ? (
                <span className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-[#FFFDF9] bg-emerald-500" />
              ) : null}
            </button>
            <button
              type="button"
              onClick={handleCartClick}
              aria-label={`View Cart (${itemCount} items)`}
              className="relative flex items-center justify-center w-14 h-14 rounded-full bg-[#7A3316] text-[#FFFDF9] shadow-[0_10px_22px_rgba(122,51,22,0.38)] border-4 border-[#FFFDF9] active:scale-95 transition-transform"
            >
              <ShoppingCart size={22} strokeWidth={2.4} />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full bg-[#E23B2E] text-white text-[10px] font-black border-2 border-white shadow-xs animate-in zoom-in-50">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </button>
          </div>

          {/* Orders Tab */}
          <button
            type="button"
            onClick={handleOrdersClick}
            aria-label="View My Orders"
            className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-full transition-all duration-200 min-w-[36px] min-h-[44px] min-[360px]:min-w-[42px] min-[360px]:px-1.5 sm:min-w-[48px] sm:px-2 ${
              isOrdersActive
                ? 'bg-[#7A3316] text-[#FFFDF9] shadow-xs'
                : 'text-[#7B6B5F] hover:text-[#2B1810]'
            }`}
          >
            <Clock size={18} strokeWidth={isOrdersActive ? 2.5 : 2} />
            <span className="text-[10px] font-semibold mt-0.5 tracking-tight">Orders</span>
          </button>

          {/* More Tab */}
          <button
            type="button"
            onClick={() => setMoreOpen((prev) => !prev)}
            aria-label="More pages"
            aria-expanded={moreOpen}
            className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-full transition-all duration-200 min-w-[36px] min-h-[44px] min-[360px]:min-w-[42px] min-[360px]:px-1.5 sm:min-w-[48px] sm:px-2 ${
              moreOpen || isMoreActive
                ? 'bg-[#7A3316] text-[#FFFDF9] shadow-xs'
                : 'text-[#7B6B5F] hover:text-[#2B1810]'
            }`}
          >
            {moreOpen
              ? <X size={18} strokeWidth={2.5} />
              : <MoreHorizontal size={18} strokeWidth={2} />
            }
            <span className="text-[10px] font-semibold mt-0.5 tracking-tight">More</span>
          </button>

        </div>
      </nav>
    </>
  );
}
