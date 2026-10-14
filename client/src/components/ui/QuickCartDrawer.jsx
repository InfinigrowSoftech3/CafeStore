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
            className="absolute inset-0 bg-espresso-950/70 backdrop-blur-sm"
          />

          {/* Drawer Panel */}
          <div className="fixed inset-y-0 right-0 flex max-w-full pl-0 sm:pl-10">
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative flex h-full w-screen max-w-md flex-col bg-[#FAF6EF] text-espresso-950 shadow-2xl border-l border-[#E9E0D2]"
              aria-label="Quick View Cart"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#E9E0D2] bg-white px-5 py-4 sm:px-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sand-100 text-brew-700">
                    <ShoppingBag size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-display text-xl font-bold text-espresso-950 sm:text-2xl">
                        Your Cart
                      </h2>
                      {itemCount > 0 && (
                        <span className="rounded-full bg-brew-500 px-2 py-0.5 text-[11px] font-bold text-espresso-950">
                          {itemCount} {itemCount === 1 ? 'item' : 'items'}
                        </span>
                      )}
                    </div>
                    {tableNumber ? (
                      <p className="text-xs font-semibold uppercase tracking-wider text-brew-700">
                        Dining at Table {String(tableNumber).padStart(2, '0')}
                      </p>
                    ) : (
                      <p className="text-xs text-espresso-500">Freshly handcrafted for you</p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeQuickCart}
                  aria-label="Close cart"
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-sand-200 bg-[#FAF6EF] text-espresso-700 transition hover:bg-espresso-950 hover:text-white active:scale-90 focus:outline-none focus:ring-2 focus:ring-brew-500"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </div>

              {/* Freshly added item notice */}
              {lastAddedItemKey && items.some((i) => i.key === lastAddedItemKey) && (
                <div className="flex items-center gap-2 border-b border-sand-200 bg-sand-50 px-5 py-2.5 text-xs font-semibold text-espresso-950" role="status" aria-live="polite">
                  <CheckCircle2 size={15} className="text-emerald-600 flex-shrink-0" aria-hidden="true" />
                  <span>Item updated in your order!</span>
                </div>
              )}

              {/* Body / Items List */}
              <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
                {items.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center py-12 text-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-sand-100 text-espresso-400">
                      <UtensilsCrossed size={36} aria-hidden="true" />
                    </div>
                    <h3 className="mt-4 font-display text-2xl font-bold text-espresso-950">
                      Your cart is empty
                    </h3>
                    <p className="mt-2 max-w-xs text-sm text-espresso-500">
                      Explore our handcrafted brews, comforting meals, and pastries.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        closeQuickCart();
                        navigate('/menu');
                      }}
                      className="mt-6 btn-primary min-h-[44px] px-6 py-3 text-xs uppercase tracking-[0.16em]"
                    >
                      Browse Menu <ArrowRight size={14} aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between pb-1 text-xs text-espresso-500">
                      <span>Order Items</span>
                      <button
                        type="button"
                        onClick={clearCart}
                        className="min-h-[44px] inline-flex items-center px-2 py-1 text-xs font-medium text-rose-600 hover:text-rose-700 transition focus:outline-none focus:ring-2 focus:ring-rose-400 rounded-lg"
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
                                ? 'border-brew-400 bg-white shadow-md ring-1 ring-brew-200'
                                : 'border-[#E9E0D2] bg-white shadow-2xs hover:border-brew-300'
                            }`}
                          >
                            {/* Product Thumbnail */}
                            <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-sand-100">
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
                                  <h4 className="font-display text-base font-bold leading-tight text-espresso-950 line-clamp-1">
                                    {item.name}
                                  </h4>
                                  <button
                                    type="button"
                                    onClick={() => removeItem(item.key)}
                                    aria-label={`Remove ${item.name}`}
                                    className="min-h-[44px] min-w-[44px] flex items-center justify-center text-espresso-400 hover:text-rose-600 transition focus:outline-none focus:ring-2 focus:ring-rose-400 rounded-lg -mr-2 -mt-2"
                                  >
                                    <Trash2 size={16} aria-hidden="true" />
                                  </button>
                                </div>

                                {item.variant && (
                                  <span className="mt-0.5 inline-block rounded-md bg-sand-100 px-1.5 py-0.5 text-[10px] font-semibold text-espresso-700">
                                    {item.variant.name}
                                  </span>
                                )}

                                {item.addons?.length > 0 && (
                                  <p className="mt-1 text-[11px] text-espresso-500 line-clamp-1">
                                    + {item.addons.map((a) => a.name).join(', ')}
                                  </p>
                                )}

                                {item.specialInstructions && (
                                  <p className="mt-0.5 text-[10px] italic text-brew-700 line-clamp-1">
                                    “{item.specialInstructions}”
                                  </p>
                                )}
                              </div>

                              <div className="mt-2.5 flex items-center justify-between">
                                {/* Quantity Controls */}
                                <div className="flex items-center gap-1 rounded-xl border border-sand-200 bg-[#FAF6EF] p-0.5">
                                  <button
                                    type="button"
                                    onClick={() => updateQuantity(item.key, item.quantity - 1)}
                                    aria-label={`Decrease quantity of ${item.name}`}
                                    className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-espresso-700 hover:bg-espresso-950 hover:text-cream transition active:scale-90 focus:outline-none focus:ring-2 focus:ring-brew-500"
                                  >
                                    <Minus size={14} aria-hidden="true" />
                                  </button>
                                  <span className="min-w-[20px] text-center text-xs font-bold text-espresso-950 px-1 font-mono">
                                    {item.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => updateQuantity(item.key, item.quantity + 1)}
                                    aria-label={`Increase quantity of ${item.name}`}
                                    className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-espresso-700 hover:bg-espresso-950 hover:text-cream transition active:scale-90 focus:outline-none focus:ring-2 focus:ring-brew-500"
                                  >
                                    <Plus size={14} aria-hidden="true" />
                                  </button>
                                </div>

                                {/* Total Price for Item */}
                                <div className="text-right">
                                  <span className="price-tag text-base font-bold text-brew-500">
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
                <div className="border-t border-[#E9E0D2] bg-white p-5 sm:p-6 shadow-[0_-10px_25px_rgba(23,17,12,0.04)]">
                  {/* Bill breakdown */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-espresso-600">
                      <span>Subtotal</span>
                      <span className="price-tag text-xs text-espresso-900">{formatMoney(subtotal, tenant.currency)}</span>
                    </div>
                    <div className="flex justify-between text-espresso-600">
                      <span>Taxes & GST ({tenant.taxRate}%)</span>
                      <span className="price-tag text-xs text-espresso-900">{formatMoney(tax, tenant.currency)}</span>
                    </div>
                    <div className="flex justify-between border-t border-dashed border-[#E9E0D2] pt-2 text-sm font-bold text-espresso-950">
                      <span>Total Amount</span>
                      <span className="price-tag text-xl text-brew-500">{formatMoney(grandTotal, tenant.currency)}</span>
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
                      className="btn-primary min-h-[48px] w-full justify-between px-6 py-3.5 text-xs uppercase tracking-[0.16em]"
                    >
                      <div className="flex items-center gap-2">
                        <ShoppingBag size={15} aria-hidden="true" />
                        <span>Proceed to Checkout</span>
                      </div>
                      <span className="price-tag text-base text-espresso-950">{formatMoney(grandTotal, tenant.currency)}</span>
                    </button>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          closeQuickCart();
                          navigate('/cart');
                        }}
                        className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-sand-200 bg-[#FAF6EF] py-2.5 px-3 text-xs font-semibold text-espresso-900 transition hover:bg-foam focus:outline-none focus:ring-2 focus:ring-brew-500"
                      >
                        <span>View Full Cart</span>
                        <ChevronRight size={14} aria-hidden="true" />
                      </button>

                      <button
                        type="button"
                        onClick={closeQuickCart}
                        className="flex-1 min-h-[44px] inline-flex items-center justify-center rounded-xl border border-transparent py-2.5 px-3 text-xs font-semibold text-espresso-600 transition hover:text-espresso-950 focus:outline-none focus:ring-2 focus:ring-brew-500"
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
