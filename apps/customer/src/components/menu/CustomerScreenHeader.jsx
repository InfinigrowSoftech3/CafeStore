import { ArrowLeft, Search, Bell, ShoppingBag, X, QrCode } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import useCartStore, { cartItemCount } from '../../context/cartStore';

export default function CustomerScreenHeader({
  mode = 'home', // 'home' | 'category'
  categoryName = '',
  categorySubtitle = '',
  onBack,
  onOpenSearch,
  isSearchOpen = false,
  searchValue = '',
  onSearchChange,
  onClearSearch,
  activeTab = 'home',
  onSelectHome,
  onSelectMenu,
}) {
  const tenant = useTenant();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const itemCount = useCartStore(cartItemCount);
  const { tableNumber, openScanner } = useCartStore();

  const currentSearch = searchParams.toString() ? `?${searchParams.toString()}` : '';

  const handleBellClick = () => {
    navigate(`/offers${currentSearch}`);
  };

  const handleCartClick = () => {
    navigate(`/cart${currentSearch}`);
  };

  const navLinks = [
    { label: 'Home', action: onSelectHome, to: `/menu${currentSearch}`, active: mode === 'home' && activeTab === 'home' },
    { label: 'Menu', action: onSelectMenu, to: `/menu${currentSearch}`, active: mode === 'category' || activeTab === 'menu' },
    { label: 'Offers', to: `/offers${currentSearch}`, active: false },
    { label: 'Orders', to: `/orders${currentSearch}`, active: false },
  ];

  return (
    <header className="w-full py-3">
      {/* ── Search Input Bar (Visible when search is open) ── */}
      {isSearchOpen ? (
        <div className="flex items-center gap-2.5 w-full bg-[#FFFDF9] border border-[#EFE4D6] rounded-full px-4 py-2 shadow-[0_4px_16px_rgba(90,50,20,0.06)] animate-in fade-in-50">
          <Search size={18} className="text-[#7B6B5F] shrink-0" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={`Search ${mode === 'category' && categoryName ? categoryName : 'menu items'}...`}
            autoFocus
            className="w-full bg-transparent text-sm text-[#2B1810] placeholder-[#7B6B5F] focus:outline-none"
          />
          {searchValue && (
            <button
              type="button"
              onClick={onClearSearch}
              aria-label="Clear search"
              className="text-[#7B6B5F] hover:text-[#2B1810] p-1"
            >
              <X size={16} />
            </button>
          )}
          <button
            type="button"
            onClick={onOpenSearch}
            aria-label="Close search"
            className="text-xs font-bold text-[#7A3316] uppercase tracking-wider px-2 py-1 rounded-full hover:bg-[#F3E9DC]"
          >
            Done
          </button>
        </div>
      ) : (
        <>
          {/* ═══════════════════════════════════════════════════════════
              MOBILE HEADER (< 768px) — Exactly matches mockups
             ═══════════════════════════════════════════════════════════ */}
          <div className="md:hidden">
            {mode === 'category' ? (
              /* SCREEN 2 MOBILE HEADER: Back Arrow + Category Title/Subtitle + Search */
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={onBack}
                    aria-label="Back to all categories"
                    className="w-10 h-10 rounded-full bg-[#FFFDF9] border border-[#EFE4D6] flex items-center justify-center text-[#2B1810] shadow-[0_4px_12px_rgba(90,50,20,0.06)] active:scale-95 transition-transform shrink-0"
                  >
                    <ArrowLeft size={18} strokeWidth={2.4} />
                  </button>
                  <div className="min-w-0 truncate">
                    <h1 className="font-display font-bold text-lg text-[#2B1810] truncate leading-tight">
                      {categoryName || 'Menu'}
                    </h1>
                    <p className="text-[11px] text-[#7B6B5F] truncate">
                      {categorySubtitle || 'Freshly brewed happiness'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={onOpenSearch}
                    aria-label="Search items"
                    className="w-10 h-10 rounded-full bg-[#FFFDF9] border border-[#EFE4D6] flex items-center justify-center text-[#2B1810] shadow-[0_4px_12px_rgba(90,50,20,0.06)] active:scale-95 transition-transform"
                  >
                    <Search size={18} strokeWidth={2.2} />
                  </button>
                </div>
              </div>
            ) : (
              /* SCREEN 1 MOBILE HEADER: Logo/Serif Wordmark + Round Search + Brown Bell */
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {tenant.logoUrl ? (
                    <img
                      src={tenant.logoUrl}
                      alt={tenant.name || 'Café'}
                      className="h-10 w-auto max-w-[150px] object-contain drop-shadow-xs"
                    />
                  ) : (
                    <div className="flex flex-col">
                      <span className="font-display font-extrabold text-xl text-[#2B1810] tracking-tight leading-none">
                        {tenant.name || 'Café'}
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#7B6B5F] mt-0.5">
                        CAFÉ
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={onOpenSearch}
                    aria-label="Search menu"
                    className="w-10 h-10 rounded-full bg-[#FFFDF9] border border-[#EFE4D6] flex items-center justify-center text-[#2B1810] shadow-[0_4px_12px_rgba(90,50,20,0.06)] hover:border-[#7A3316]/30 active:scale-95 transition-transform"
                  >
                    <Search size={18} strokeWidth={2.2} />
                  </button>

                  <button
                    type="button"
                    onClick={handleBellClick}
                    aria-label="View offers and notices"
                    className="relative w-10 h-10 rounded-full bg-[#2B1810] text-[#FFFDF9] flex items-center justify-center shadow-[0_4px_12px_rgba(43,24,16,0.22)] active:scale-95 transition-transform hover:bg-[#1C110A]"
                  >
                    <Bell size={18} strokeWidth={2.2} />
                    <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#E23B2E] ring-2 ring-[#2B1810]" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════
              DESKTOP HEADER (>= 768px) — Clean sticky desktop navigation
             ═══════════════════════════════════════════════════════════ */}
          <div className="hidden md:flex items-center justify-between gap-6">
            {/* Left: Brand Logo / Wordmark */}
            <div className="flex items-center gap-4 min-w-0 shrink-0">
              {mode === 'category' && (
                <button
                  type="button"
                  onClick={onBack}
                  aria-label="Back to all categories"
                  className="w-9 h-9 rounded-full bg-[#FFFDF9] border border-[#EFE4D6] flex items-center justify-center text-[#2B1810] shadow-xs hover:bg-[#F3E9DC] transition active:scale-95"
                >
                  <ArrowLeft size={16} strokeWidth={2.4} />
                </button>
              )}

              <Link
                to={`/menu${currentSearch}`}
                className="flex items-center gap-3 min-w-0 group"
              >
                {tenant.logoUrl ? (
                  <img
                    src={tenant.logoUrl}
                    alt={tenant.name || 'Café'}
                    className="h-11 w-auto max-w-[160px] object-contain transition-transform group-hover:scale-102"
                  />
                ) : (
                  <div className="flex flex-col">
                    <span className="font-display font-extrabold text-2xl text-[#2B1810] tracking-tight leading-none">
                      {tenant.name || 'Café'}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#7B6B5F] mt-0.5">
                      CAFÉ
                    </span>
                  </div>
                )}
              </Link>
            </div>

            {/* Middle: Navigation Links */}
            <nav aria-label="Desktop Navigation" className="flex items-center gap-1.5">
              {navLinks.map((link) => {
                const isSelected = link.active;
                return (
                  <button
                    key={link.label}
                    type="button"
                    onClick={() => {
                      if (link.action) {
                        link.action();
                      } else {
                        navigate(link.to);
                      }
                    }}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 ${
                      isSelected
                        ? 'bg-[#7A3316] text-[#FFFDF9] shadow-xs'
                        : 'text-[#7B6B5F] hover:text-[#2B1810] hover:bg-[#FFFDF9]'
                    }`}
                  >
                    {link.label}
                  </button>
                );
              })}
            </nav>

            {/* Right: Search, Table Indicator, Cart Button */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={onOpenSearch}
                aria-label="Search items"
                className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#FFFDF9] border border-[#EFE4D6] text-xs font-semibold text-[#7B6B5F] hover:text-[#2B1810] hover:border-[#7A3316]/40 shadow-xs transition"
              >
                <Search size={15} strokeWidth={2.2} />
                <span>Search</span>
              </button>

              {/* Table status / Scan */}
              {tableNumber ? (
                <button
                  type="button"
                  onClick={openScanner}
                  title="Click to change table"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold shadow-2xs hover:bg-emerald-100 transition"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Table {tableNumber}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={openScanner}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFFDF9] border border-[#EFE4D6] text-xs font-bold text-[#7A3316] shadow-2xs hover:bg-[#F3E9DC] transition"
                >
                  <QrCode size={14} />
                  <span>Scan Table</span>
                </button>
              )}

              {/* Notifications */}
              <button
                type="button"
                onClick={handleBellClick}
                aria-label="Offers and Notices"
                className="relative w-9 h-9 rounded-full bg-[#2B1810] text-[#FFFDF9] flex items-center justify-center shadow-xs hover:bg-[#1C110A] transition"
              >
                <Bell size={16} />
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#E23B2E] ring-2 ring-[#2B1810]" />
              </button>

              {/* Cart Button with Count Badge */}
              <button
                type="button"
                onClick={handleCartClick}
                aria-label={`View Cart (${itemCount} items)`}
                className="relative flex items-center gap-2 px-4 py-2 rounded-full bg-[#7A3316] text-[#FFFDF9] text-xs font-bold shadow-[0_4px_14px_rgba(122,51,22,0.28)] hover:bg-[#5E2610] active:scale-95 transition"
              >
                <ShoppingBag size={16} strokeWidth={2.2} />
                <span>Cart</span>
                {itemCount > 0 && (
                  <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#E23B2E] text-white text-[10px] font-black border border-white">
                    {itemCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
