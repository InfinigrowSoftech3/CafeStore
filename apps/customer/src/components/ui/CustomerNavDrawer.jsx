import { useEffect, useRef } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  UtensilsCrossed,
  Sparkles,
  Clock,
  Coffee,
  Image as ImageIcon,
  Phone,
  ShoppingBag,
  ScanLine,
  ChevronRight,
  MapPin,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import useCartStore, { cartItemCount } from '../../context/cartStore';
import { useTenant } from '../../context/TenantContext';
import { formatMoney } from '../../utils/money';

const NAV_ITEMS = [
  {
    to: '/menu',
    title: 'Food & Drinks Menu',
    subtitle: 'Browse all dishes, beverages & specials',
    icon: UtensilsCrossed,
    color: 'bg-emerald-50 text-[#7A3316] border-emerald-200/60',
  },
  {
    to: '/offers',
    title: 'Offers & Discounts',
    subtitle: 'Exclusive coupons & daily deals',
    icon: Sparkles,
    color: 'bg-amber-50 text-amber-900 border-amber-200/60',
  },
  {
    to: '/orders',
    title: 'My Orders & History',
    subtitle: 'Live order tracking & digital bills',
    icon: Clock,
    color: 'bg-[#F3E9DC] text-[#2B1810] border-[#EFE4D6]',
  },
  {
    to: '/about',
    title: 'About Our Café',
    subtitle: 'Our story, ingredients & artisan craft',
    icon: Coffee,
    color: 'bg-orange-50 text-orange-900 border-orange-200/60',
  },
  {
    to: '/gallery',
    title: 'Photo Gallery',
    subtitle: 'Café vibe, ambiance & culinary shots',
    icon: ImageIcon,
    color: 'bg-sky-50 text-sky-900 border-sky-200/60',
  },
  {
    to: '/contact',
    title: 'Contact & Location',
    subtitle: 'Timings, map directions & direct call',
    icon: Phone,
    color: 'bg-teal-50 text-teal-900 border-teal-200/60',
  },
];

export default function CustomerNavDrawer() {
  const tenant = useTenant();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const currentSearch = searchParams.toString() ? `?${searchParams.toString()}` : '';
  const drawerRef = useRef(null);

  const {
    isNavDrawerOpen,
    closeNavDrawer,
    tableNumber,
    openScanner,
    items,
  } = useCartStore();
  const itemCount = useCartStore(cartItemCount);
  const cartSubtotal = items.reduce((sum, item) => sum + (item.itemTotal || 0), 0);

  // Close drawer on route change
  useEffect(() => {
    closeNavDrawer();
  }, [location.pathname, closeNavDrawer]);

  // Handle ESC key press
  useEffect(() => {
    if (!isNavDrawerOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeNavDrawer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isNavDrawerOpen, closeNavDrawer]);

  // Lock scroll when open
  useEffect(() => {
    if (isNavDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isNavDrawerOpen]);

  return (
    <AnimatePresence>
      {isNavDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeNavDrawer}
            className="fixed inset-0 bg-[#7A3316]/40 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Drawer Sheet */}
          <motion.aside
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation Menu - All Pages"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="relative z-10 w-full sm:w-[420px] max-w-full h-full bg-[#FFFDF9] text-[#2B1810] shadow-2xl flex flex-col border-l border-[#EFE4D6] overflow-hidden"
          >
            {/* ─── Drawer Top Header ────────────────────────────────────────── */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#EFE4D6] bg-white">
              <div className="flex items-center gap-3 min-w-0">
                {tenant.logoUrl ? (
                  <img
                    src={tenant.logoUrl}
                    alt={tenant.name || 'Café'}
                    className="w-10 h-10 rounded-2xl object-cover border border-[#EFE4D6] flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-2xl bg-[#7A3316] text-white flex items-center justify-center font-sora font-extrabold text-base flex-shrink-0 shadow-xs">
                    <Coffee size={20} strokeWidth={2.4} />
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="font-sora font-extrabold text-lg text-[#2B1810] leading-tight truncate">
                    {tenant.name || 'APNA DOST'}
                  </h2>
                  <p className="text-[11px] font-semibold text-stone-500 truncate">
                    {tenant.tagline || 'Artisanal Food & Premium Coffee'}
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={closeNavDrawer}
                aria-label="Close navigation menu"
                className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full border border-[#EFE4D6] bg-[#FFFDF9] flex items-center justify-center text-stone-700 hover:text-[#2B1810] hover:bg-[#FBF6EF] transition active:scale-95 shadow-2xs"
              >
                <X size={18} strokeWidth={2.4} />
              </button>
            </div>

            {/* ─── Scrollable Content ───────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-4 bg-white">
              {/* Table Status Card */}
              <div className="rounded-2xl border border-[#EFE4D6] bg-[#FFFDF9] p-3.5 shadow-2xs">
                {tableNumber ? (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="relative flex h-3 w-3 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-2 bg-emerald-500" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-800">
                          Seated Session
                        </span>
                        <p className="font-sora text-sm font-bold text-[#2B1810] leading-tight">
                          Table {String(tableNumber).padStart(2, '0')}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        closeNavDrawer();
                        openScanner();
                      }}
                      className="min-h-[36px] px-3.5 py-1 rounded-full border border-[#EFE4D6] bg-[#FFFDF9] hover:bg-[#FBF6EF] text-xs font-sora font-bold text-[#2B1810] transition active:scale-95 shadow-2xs"
                    >
                      Change Table
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-sora text-xs font-bold text-[#2B1810]">Ordering at table?</p>
                      <p className="text-[11px] text-stone-500 truncate">Scan table QR for instant ordering</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        closeNavDrawer();
                        openScanner();
                      }}
                      className="min-h-[38px] px-4 flex items-center gap-1.5 rounded-full bg-[#7A3316] text-white hover:bg-[#5E2610] text-xs font-sora font-bold transition active:scale-95 shadow-2xs shrink-0"
                    >
                      <ScanLine size={14} />
                      <span>Scan Table</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Cart Quick Shortcut */}
              <Link
                to={`/cart${currentSearch}`}
                onClick={closeNavDrawer}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FBF6EF] border border-[#EFE4D6] hover:bg-[#F3E9DC] transition group shadow-2xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#7A3316] text-white flex items-center justify-center shrink-0">
                    <ShoppingBag size={18} strokeWidth={2.4} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-sora text-sm font-bold text-[#2B1810]">Your Cart</p>
                      {itemCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-[var(--menu-accent,#7A3316)] text-white text-[10px] font-extrabold font-sora">
                          {itemCount} {itemCount === 1 ? 'item' : 'items'}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-stone-600 truncate">
                      {itemCount > 0
                        ? `Subtotal: ${formatMoney(cartSubtotal, tenant.currency)}`
                        : 'Cart is empty · Add items from menu'}
                    </p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-[#2B1810] shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              {/* Section Header */}
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-stone-500 px-1 mb-2">
                  All Café Pages
                </p>
                <nav aria-label="Customer pages navigation" className="space-y-1.5">
                  {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.to;
                    return (
                      <Link
                        key={item.to}
                        to={`${item.to}${currentSearch}`}
                        onClick={closeNavDrawer}
                        className={`group flex items-center justify-between p-3 rounded-2xl border transition-all ${
                          isActive
                            ? 'bg-[#FBF6EF] border-stone-900 shadow-2xs'
                            : 'bg-[#FFFDF9] border-[#EFE4D6] hover:border-stone-400 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${item.color} ${
                              isActive ? 'ring-1 ring-[#7A3316]' : ''
                            }`}
                          >
                            <Icon size={18} strokeWidth={2.4} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p
                                className={`font-sora text-sm font-bold truncate ${
                                  isActive ? 'text-[#2B1810]' : 'text-[#2B1810] group-hover:text-[#2B1810]'
                                }`}
                              >
                                {item.title}
                              </p>
                              {isActive && (
                                <span className="px-2 py-0.5 rounded-full bg-[#7A3316] text-white text-[9px] font-sora font-extrabold uppercase tracking-wider">
                                  Current
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-stone-500 truncate leading-snug">
                              {item.subtitle}
                            </p>
                          </div>
                        </div>
                        <ChevronRight
                          size={16}
                          className={`shrink-0 transition-transform ${
                            isActive
                              ? 'text-[#2B1810]'
                              : 'text-stone-400 group-hover:text-[#2B1810] group-hover:translate-x-0.5'
                          }`}
                        />
                      </Link>
                    );
                  })}
                </nav>
              </div>

              {/* Direct Café Contact / Address Card */}
              {(tenant.address || tenant.contactPhone) && (
                <div className="rounded-2xl border border-[#EFE4D6] bg-[#FFFDF9] p-3.5 space-y-2.5 shadow-2xs">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-stone-500">
                    Visit or Call Us
                  </p>
                  {tenant.address && (
                    <div className="flex items-start gap-2.5 text-xs text-stone-600">
                      <MapPin size={15} className="text-[#2B1810] shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{tenant.address}</span>
                    </div>
                  )}
                  {tenant.contactPhone && (
                    <a
                      href={`tel:${tenant.contactPhone}`}
                      className="inline-flex items-center gap-2 text-xs font-sora font-bold text-[#2B1810] hover:underline"
                    >
                      <Phone size={14} />
                      <span>{tenant.contactPhone}</span>
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* ─── Footer: Legal Links ───────────────────────────────────────── */}
            <div className="p-4 border-t border-[#EFE4D6]/80 bg-white space-y-2">
              <div className="flex items-center justify-center gap-4 text-xs font-medium text-stone-500">
                <Link to={`/privacy${currentSearch}`} onClick={closeNavDrawer} className="hover:text-[#7A3316]">
                  Privacy Policy
                </Link>
                <span>•</span>
                <Link to={`/terms${currentSearch}`} onClick={closeNavDrawer} className="hover:text-[#7A3316]">
                  Terms of Service
                </Link>
                <span>•</span>
                <Link to={`/refund-policy${currentSearch}`} onClick={closeNavDrawer} className="hover:text-[#7A3316]">
                  Refunds
                </Link>
              </div>
              <p className="text-[10px] text-center text-stone-400">
                Freshly prepared with love by {tenant.name || 'Café'}
              </p>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
