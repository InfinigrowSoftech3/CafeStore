import { useMemo, useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Home, UtensilsCrossed, ShoppingBag, Clock } from 'lucide-react';
import useCartStore, { cartItemCount } from '../../context/cartStore';

export default function CustomerBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const itemCount = useCartStore(cartItemCount);
  const [menuView, setMenuView] = useState('home');

  // Track active menu view (home vs category) via custom event
  useEffect(() => {
    const handleViewChange = (e) => {
      if (e.detail?.view) setMenuView(e.detail.view);
    };
    window.addEventListener('menu:viewchange', handleViewChange);
    return () => window.removeEventListener('menu:viewchange', handleViewChange);
  }, []);

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
    if (location.pathname === '/menu') {
      window.dispatchEvent(new CustomEvent('nav:menu'));
      setMenuView('category');
    } else {
      navigate(`/menu${currentSearch}`);
    }
  };

  const handleOrdersClick = (e) => {
    e.preventDefault();
    navigate(`/orders${currentSearch}`);
  };

  const handleCartClick = (e) => {
    e.preventDefault();
    navigate(`/cart${currentSearch}`);
  };

  const isHomeActive = location.pathname === '/menu' && menuView === 'home';
  const isMenuActive = location.pathname === '/menu' && menuView === 'category';
  const isOrdersActive = location.pathname === '/orders';

  return (
    <nav
      aria-label="Bottom Navigation"
      className="md:hidden fixed left-4 right-4 z-40 max-w-md mx-auto"
      style={{ bottom: 'calc(14px + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="relative flex items-center justify-between px-3 py-2 bg-[#FFFDF9]/95 backdrop-blur-md border border-[#EFE4D6] rounded-[28px] shadow-[0_10px_30px_rgba(90,50,20,0.12)]">
        {/* Home Tab */}
        <button
          type="button"
          onClick={handleHomeClick}
          aria-label="Go to Home"
          className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-full transition-all duration-200 min-w-[56px] min-h-[44px] ${
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
          className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-full transition-all duration-200 min-w-[56px] min-h-[44px] ${
            isMenuActive
              ? 'bg-[#7A3316] text-[#FFFDF9] shadow-xs'
              : 'text-[#7B6B5F] hover:text-[#2B1810]'
          }`}
        >
          <UtensilsCrossed size={18} strokeWidth={isMenuActive ? 2.5 : 2} />
          <span className="text-[10px] font-semibold mt-0.5 tracking-tight">Menu</span>
        </button>

        {/* Center Raised Cart Button */}
        <div className="relative -mt-7 flex flex-col items-center justify-center">
          <button
            type="button"
            onClick={handleCartClick}
            aria-label={`View Cart (${itemCount} items)`}
            className="relative flex items-center justify-center w-14 h-14 rounded-full bg-[#7A3316] text-[#FFFDF9] shadow-[0_10px_22px_rgba(122,51,22,0.38)] border-4 border-[#FFFDF9] active:scale-95 transition-transform"
          >
            <ShoppingBag size={22} strokeWidth={2.4} />
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
          className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-full transition-all duration-200 min-w-[56px] min-h-[44px] ${
            isOrdersActive
              ? 'bg-[#7A3316] text-[#FFFDF9] shadow-xs'
              : 'text-[#7B6B5F] hover:text-[#2B1810]'
          }`}
        >
          <Clock size={18} strokeWidth={isOrdersActive ? 2.5 : 2} />
          <span className="text-[10px] font-semibold mt-0.5 tracking-tight">Orders</span>
        </button>
      </div>
    </nav>
  );
}
