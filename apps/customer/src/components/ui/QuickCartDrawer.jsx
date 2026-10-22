import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  X,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  ShoppingBag,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  UtensilsCrossed,
} from 'lucide-react';
import useCartStore from '../../context/cartStore';
import { useTenant } from '../../context/TenantContext';
import { formatMoney } from '../../utils/money';

const PLACEHOLDER = '/images/coffee-placeholder.svg';

export default function QuickCartDrawer() {
  const tenant = useTenant();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    items,
    tableNumber,
    isQuickCartOpen,
    lastAddedItemKey,
    closeQuickCart,
    updateQuantity,
    removeItem,
    clearCart,
  } = useCartStore();

  const itemCount = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = items.reduce((s, i) => s + i.itemTotal, 0);
  const tax = Math.round(subtotal * Number(tenant.taxRate || 0) / 100);
  const grandTotal = subtotal + tax;

  // Close drawer if user navigates to /cart or /checkout
  useEffect(() => {
    if (location.pathname === '/cart' || location.pathname === '/checkout') {
      closeQuickCart();
    }
  }, [location.pathname, closeQuickCart]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isQuickCartOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isQuickCartOpen]);

  // Handle ESC key to close drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isQuickCartOpen) {
        closeQuickCart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isQuickCartOpen, closeQuickCart]);

  return (
    <AnimatePresence>
      {isQuickCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={closeQuickCart}
            className="absolute inset-0 bg-[#7A3316]/40 backdrop-blur-xs"
          />

          {/* Drawer Panel */}
          <div className="fixed inset-y-0 right-0 flex max-w-full pl-0">
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative flex h-full w-screen max-w-md flex-col bg-[#FFFDF9] text-[#2B1810] shadow-2xl border-l border-[#EFE4D6]"
              aria-label="Quick View Cart"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#EFE4D6] bg-[#FFFDF9] px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-300 bg-[#F3E9DC] text-[#7A3316]">
                    <ShoppingBag size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-display text-xl font-bold text-[#2B1810]">
                        Your Cart
                      </h2>
                      {itemCount > 0 && (
                        <span className="rounded-full bg-[#F3E9DC] border border-amber-300 px-2.5 py-0.5 text-[11px] font-bold text-[#7A3316]">
                          {itemCount} {itemCount === 1 ? 'item' : 'items'}
                        </span>
                      )}
                    </div>
                    {tableNumber ? (
                      <p className="text-xs font-semibold uppercase tracking-wider text-[#7A3316]">
                        Dining at Table {String(tableNumber).padStart(2, '0')}
                      </p>
                    ) : (
                      <p className="text-xs text-stone-500">Freshly handcrafted for you</p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeQuickCart}
                  aria-label="Close cart"
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-[#EFE4D6] bg-[#FBF6EF] text-stone-700 transition hover:bg-[#F3E9DC] hover:text-[#2B1810] active:scale-90 focus:outline-none focus:ring-2 focus:ring-[#7A3316]/20"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </div>

              {/* Freshly added item notice */}
              {lastAddedItemKey && items.some((i) => i.key === lastAddedItemKey) && (
                <div className="flex items-center gap-2 border-b border-amber-300 bg-[#F3E9DC]/50 px-5 py-2.5 text-xs font-semibold text-[#7A3316]" role="status" aria-live="polite">
                  <CheckCircle2 size={15} className="text-emerald-600 flex-shrink-0" aria-hidden="true" />
                  <span>Item updated in your order!</span>
                </div>
              )}

              {/* Body / Items List */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                {items.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center py-12 text-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-[#EFE4D6] bg-[#FBF6EF] text-stone-400">
                      <UtensilsCrossed size={36} aria-hidden="true" />
                    </div>
                    <h3 className="mt-4 font-display text-2xl font-bold text-[#2B1810]">
                      Your cart is empty
                    </h3>
                    <p className="mt-2 max-w-xs text-sm text-stone-500">
                      Explore our handcrafted brews, comforting meals, and pastries.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        closeQuickCart();
                        navigate('/menu');
                      }}
                      className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#7A3316] px-6 py-3 text-xs font-bold uppercase tracking-[0.16em] text-white transition hover:bg-[#5E2610]"
                    >
                      Browse Menu <ArrowRight size={14} aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between pb-1 text-xs text-stone-500">
                      <span>Order Items</span>
                      <button
                        type="button"
                        onClick={clearCart}
                        className="min-h-[44px] inline-flex items-center px-2 py-1 text-xs font-medium text-rose-600 hover:text-rose-700 transition focus:outline-none focus:ring-2 focus:ring-rose-400 rounded-full"
                      >
                        Clear all
                      </button>
                    </div>

                    <AnimatePresence initial={false}>
                      {items.map((item) => {
                        const isRecentlyAdded = item.key === lastAddedItemKey;
                        return (
                          <motion.article
                            key={item.key}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, height: 0, marginBottom: 0 }}
                            transition={{ duration: 0.2 }}
                            className={`relative flex gap-3.5 rounded-2xl border p-3.5 transition-all ${
                              isRecentlyAdded
                                ? 'border-[#7A3316] bg-[#FFFDF9] shadow-xs ring-1 ring-[#7A3316]/20'
                                : 'border-[#EFE4D6] bg-[#FFFDF9] shadow-2xs hover:border-[#7A3316]/30'
                            }`}
                          >
                            {/* Product Thumbnail */}
                            <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border border-[#EFE4D6] bg-[#F3E9DC]">
                              <img
                                src={item.image || PLACEHOLDER}
                                alt={item.name}
                                width="80"
                                height="80"
                                loading="lazy"
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = PLACEHOLDER;
                                }}
                              />
                            </div>

                            {/* Info & Actions */}
                            <div className="flex flex-1 flex-col justify-between min-w-0">
                              <div>
                                <div className="flex items-start justify-between gap-2">
                                  <h4 className="font-display text-base font-bold leading-tight text-[#2B1810] line-clamp-1">
                                    {item.name}
                                  </h4>
                                  <button
                                    type="button"
                                    onClick={() => removeItem(item.key)}
                                    aria-label={`Remove ${item.name}`}
                                    className="min-h-[44px] min-w-[44px] flex items-center justify-center text-stone-400 hover:text-rose-600 transition focus:outline-none focus:ring-2 focus:ring-rose-400 rounded-full -mr-2 -mt-2"
                                  >
                                    <Trash2 size={16} aria-hidden="true" />
                                  </button>
                                </div>

                                {item.variant && (
                                  <span className="mt-0.5 inline-block rounded-full border border-[#EFE4D6] bg-[#F3E9DC] px-2 py-0.5 text-[10px] font-semibold text-stone-700">
                                    {item.variant.name}
                                  </span>
                                )}

                                {item.addons?.length > 0 && (
                                  <p className="mt-1 text-[11px] text-stone-500 line-clamp-1">
                                    + {item.addons.map((a) => a.name).join(', ')}
                                  </p>
                                )}

                                {item.specialInstructions && (
                                  <p className="mt-0.5 text-[10px] italic text-[#7A3316] line-clamp-1">
                                    “{item.specialInstructions}”
                                  </p>
                                )}
                              </div>

                              <div className="mt-2.5 flex items-center justify-between">
                                {/* Quantity Controls */}
                                <div className="flex items-center gap-1 rounded-full border border-[#EFE4D6] bg-[#FBF6EF] p-1 shadow-2xs">
                                  <button
                                    type="button"
                                    onClick={() => updateQuantity(item.key, item.quantity - 1)}
                                    aria-label={`Decrease quantity of ${item.name}`}
                                    className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full text-stone-700 hover:bg-[#7A3316] hover:text-[#FFFDF9] transition active:scale-90 focus:outline-none focus:ring-2 focus:ring-[#7A3316]/20"
                                  >
                                    <Minus size={14} aria-hidden="true" />
                                  </button>
                                  <span className="min-w-[20px] text-center text-xs font-bold text-[#2B1810] px-1 font-mono">
                                    {item.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => updateQuantity(item.key, item.quantity + 1)}
                                    aria-label={`Increase quantity of ${item.name}`}
                                    className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full text-stone-700 hover:bg-[#7A3316] hover:text-white transition active:scale-90 focus:outline-none focus:ring-2 focus:ring-[#7A3316]/20"
                                  >
                                    <Plus size={14} aria-hidden="true" />
                                  </button>
                                </div>

                                {/* Total Price for Item */}
                                <div className="text-right">
                                  <span className="price-tag text-base font-bold text-[#7A3316]">
                                    {formatMoney(item.itemTotal, tenant.currency)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </motion.article>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* Footer / Checkout Actions */}
              {items.length > 0 && (
                <div className="border-t border-[#EFE4D6] bg-[#FFFDF9] p-5 shadow-sm">
                  {/* Bill breakdown */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-stone-600">
                      <span>Subtotal</span>
                      <span className="price-tag text-xs text-[#2B1810]">{formatMoney(subtotal, tenant.currency)}</span>
                    </div>
                    <div className="flex justify-between text-stone-600">
                      <span>Taxes & GST ({tenant.taxRate}%)</span>
                      <span className="price-tag text-xs text-[#2B1810]">{formatMoney(tax, tenant.currency)}</span>
                    </div>
                    <div className="flex justify-between border-t border-dashed border-[#EFE4D6] pt-2 text-sm font-bold text-[#2B1810]">
                      <span>Total Amount</span>
                      <span className="price-tag text-xl text-[#7A3316]">{formatMoney(grandTotal, tenant.currency)}</span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="mt-5 space-y-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        closeQuickCart();
                        navigate('/checkout');
                      }}
                      className="inline-flex min-h-[48px] w-full items-center justify-between rounded-full bg-[#7A3316] px-6 py-3.5 text-xs font-bold uppercase tracking-[0.16em] text-white shadow-xs transition hover:bg-[#5E2610]"
                    >
                      <div className="flex items-center gap-2">
                        <ShoppingBag size={15} aria-hidden="true" />
                        <span>Proceed to Checkout</span>
                      </div>
                      <span className="price-tag text-base text-[#F3E9DC]">{formatMoney(grandTotal, tenant.currency)}</span>
                    </button>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          closeQuickCart();
                          navigate('/cart');
                        }}
                        className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-full border border-[#EFE4D6] bg-[#FFFDF9] py-2.5 px-3 text-xs font-semibold text-[#2B1810] transition hover:bg-[#F3E9DC] focus:outline-none focus:ring-2 focus:ring-[#7A3316]/20"
                      >
                        <span>View Full Cart</span>
                        <ChevronRight size={14} aria-hidden="true" />
                      </button>

                      <button
                        type="button"
                        onClick={closeQuickCart}
                        className="flex-1 min-h-[44px] inline-flex items-center justify-center rounded-full border border-[#EFE4D6] py-2.5 px-3 text-xs font-semibold text-stone-600 transition hover:text-[#2B1810] focus:outline-none focus:ring-2 focus:ring-[#7A3316]/20"
                      >
                        Keep Browsing
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.aside>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
