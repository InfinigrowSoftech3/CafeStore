import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, ShoppingBag, ScanLine, Coffee, UtensilsCrossed, Sparkles, Image, Phone, Clock } from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import useCartStore, { cartItemCount } from '../../context/cartStore';

const NAV_LINKS = [
  { to: '/menu', label: 'Menu', icon: UtensilsCrossed },
  { to: '/about', label: 'About', icon: Coffee },
  { to: '/offers', label: 'Offers', icon: Sparkles },
  { to: '/gallery', label: 'Gallery', icon: Image },
  { to: '/contact', label: 'Contact', icon: Phone },
  { to: '/orders', label: 'Orders', icon: Clock },
];

export default function Navbar() {
  const tenant = useTenant();
  const location = useLocation();

  // Hide global navbar on menu, cart, checkout, and about since they have their own dedicated headers
  if (['/menu', '/cart', '/checkout', '/about'].includes(location.pathname)) {
    return null;
  }

  const { tableNumber, openScanner, openNavDrawer } = useCartStore();
  const itemCount = useCartStore(cartItemCount);

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-xl border-b border-stone-200/80 shadow-[0_2px_12px_-2px_rgba(15,61,46,0.04)] transition-all duration-200">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3.5 py-2.5 sm:px-6 sm:py-3 lg:px-8">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <Link
            to="/menu"
            aria-label={`${tenant.name || 'Café'} - Homepage`}
            className="group flex items-center gap-2.5 sm:gap-3 rounded-xl transition-transform active:scale-98 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F3D2E] min-w-0"
          >
            {tenant.logoUrl ? (
              <img
                src={tenant.logoUrl}
                alt={`${tenant.name || 'Café'} Logo`}
                className="h-9 w-auto max-w-[130px] sm:max-w-[160px] object-contain transition-transform group-hover:scale-102 flex-shrink-0"
                width={150}
                height={36}
              />
            ) : (
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-2xl bg-[#0F3D2E] text-white shadow-xs flex-shrink-0">
                <Coffee size={20} className="stroke-[2.2]" />
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="font-display text-base sm:text-lg font-bold tracking-tight leading-tight text-[#0F3D2E] group-hover:text-[#16503D] transition-colors truncate">
                {tenant.name || 'Café'}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-stone-500 font-bold leading-none truncate">
                {tenant.tagline || 'Artisanal Food & Coffee'}
              </span>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav aria-label="Main Navigation" className="hidden lg:flex items-center gap-1 xl:gap-1.5">
          {NAV_LINKS.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`relative px-4 py-2 text-xs font-bold tracking-wide rounded-full transition-all duration-200 ${
                  isActive
                    ? 'text-stone-900 bg-stone-100 border border-stone-300 shadow-2xs font-bold'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50 font-medium'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Quick Actions (Table status, Cart button, Mobile drawer toggle) */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
          {/* Table indicator or scan button */}
          {tableNumber ? (
            <button
              type="button"
              onClick={openScanner}
              title="Tap to change table"
              className="inline-flex min-h-[38px] items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border border-emerald-300 bg-emerald-50 text-emerald-950 hover:bg-emerald-100 transition-all active:scale-95 shadow-2xs"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="tracking-wide">Table {String(tableNumber).padStart(2, '0')}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={openScanner}
              aria-label="Scan Table QR Code"
              className="min-h-[38px] inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-bold bg-[#0F3D2E] text-white hover:bg-[#16503D] transition-all active:scale-95 shadow-2xs"
            >
              <ScanLine size={15} className="text-white" />
              <span className="hidden sm:inline">Scan Table</span>
            </button>
          )}

          {/* Cart Icon Link */}
          <Link
            to="/cart"
            aria-label={`Open Cart (${itemCount} items)`}
            className="relative min-h-[38px] min-w-[38px] flex items-center justify-center rounded-full border border-stone-300 bg-white text-stone-900 hover:bg-stone-50 shadow-2xs transition-all active:scale-95"
          >
            <ShoppingBag size={18} className="stroke-[2.2]" />
            <AnimatePresence>
              {itemCount > 0 && (
                <motion.span
                  key={itemCount}
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.4, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  className="absolute -top-1.5 -right-1.5 flex h-4.5 min-w-[18px] px-1 items-center justify-center rounded-full bg-stone-900 text-[10px] font-bold text-white shadow-sm ring-1 ring-white"
                >
                  {itemCount}
                </motion.span>
              )}
            </AnimatePresence>
          </Link>

          {/* Hamburger Button for All Pages */}
          <button
            type="button"
            onClick={openNavDrawer}
            aria-label="Open navigation menu - show all pages"
            className="min-h-[38px] min-w-[38px] px-2.5 sm:px-3.5 flex items-center justify-center gap-1.5 rounded-full border border-stone-300 bg-white text-[#0F3D2E] hover:bg-stone-50 shadow-2xs transition-all active:scale-95"
          >
            <Menu size={18} strokeWidth={2.4} />
            <span className="hidden xl:inline text-xs font-sora font-bold">All Pages</span>
          </button>
        </div>
      </div>
    </header>
  );
}
