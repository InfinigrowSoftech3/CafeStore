import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  X,
  Plus,
  Minus,
  ShoppingBag,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Trash2,
} from 'lucide-react';
import useCartStore from '../../context/cartStore';
import { useTenant } from '../../context/TenantContext';
import { formatMoney } from '../../utils/money';

const PLACEHOLDER = '/images/coffee-placeholder.svg';

export default function QuickCartPopup() {
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
  } = useCartStore();

  const [isHovered, setIsHovered] = useState(false);
  const [showAllItems, setShowAllItems] = useState(false);
  const [progress, setProgress] = useState(100);

  const itemCount = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = items.reduce((s, i) => s + i.itemTotal, 0);
  const tax = Number((subtotal * Number(tenant.taxRate || 0) / 100).toFixed(2));
  const total = subtotal + tax;

  // Find the last added item or the first item
  const recentItem =
    items.find((i) => i.key === lastAddedItemKey) || items[items.length - 1] || null;

  // Don't show popup on Cart, Checkout, or Menu pages (Menu has dedicated floating order bar)
  const isExcludedPage = location.pathname === '/cart' || location.pathname === '/checkout' || location.pathname === '/menu';

  // Auto-dismiss countdown (5.5 seconds), pauses on hover
  useEffect(() => {
    if (!isQuickCartOpen || isExcludedPage || items.length === 0) {
      setProgress(100);
      return;
    }

    if (isHovered || showAllItems) {
      return;
    }

    const duration = 5500;
    const intervalTime = 50;
    const step = (intervalTime / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= step) {
          clearInterval(timer);
          closeQuickCart();
          return 100;
        }
        return prev - step;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isQuickCartOpen, isHovered, showAllItems, isExcludedPage, items.length, closeQuickCart, lastAddedItemKey]);

  // Reset progress bar on new item add
  useEffect(() => {
    if (isQuickCartOpen) {
      setProgress(100);
    }
  }, [lastAddedItemKey, isQuickCartOpen]);

  if (isExcludedPage || items.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      {isQuickCartOpen && (
        <aside
          aria-label="Quick Cart Notification Popup"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-[448px] pointer-events-auto"
        >
          <motion.div
            initial={{ opacity: 0, y: 35, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 25, scale: 0.94 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="overflow-hidden rounded-2xl border border-[#EFE4D6] bg-[#FFFDF9] text-[#2B1810] shadow-xl"
          >
            {/* Auto-dismiss progress indicator line */}
            <div className="h-1 w-full bg-[#F3E9DC]">
              <div
                className="h-full bg-[#7A3316] transition-all duration-75 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Popup Header */}
            <div className="flex items-center justify-between border-b border-[#EFE4D6] bg-white px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F3E9DC] border border-amber-300 text-[#7A3316] shadow-2xs">
                  <CheckCircle2 size={15} />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#2B1810]">
                    Added to Order
                  </p>
                  <p className="text-[11px] text-stone-500">
                    {itemCount} {itemCount === 1 ? 'item' : 'items'} in cart
                    {tableNumber ? ` • Table ${String(tableNumber).padStart(2, '0')}` : ''}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeQuickCart}
                aria-label="Dismiss quick cart popup"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-[#EFE4D6] text-stone-400 transition hover:bg-[#F3E9DC] hover:text-[#2B1810] active:scale-90"
              >
                <X size={15} />
              </button>
            </div>

            {/* Recent Item Highlight Card */}
            {recentItem && (
              <div className="p-4">
                <div className="flex gap-3.5">
                  <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-[#EFE4D6] bg-[#F3E9DC]">
                    <img
                      src={recentItem.image || PLACEHOLDER}
                      alt={recentItem.name}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.target.src = PLACEHOLDER;
                      }}
                    />
                  </div>

                  <div className="flex flex-1 flex-col justify-between min-w-0">
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="font-display text-base font-bold leading-tight text-[#2B1810] line-clamp-1">
                          {recentItem.name}
                        </h4>
                        <span className="price-tag text-sm font-bold text-[#7A3316] flex-shrink-0">
                          {formatMoney(recentItem.itemTotal, tenant.currency)}
                        </span>
                      </div>

                      {recentItem.variant && (
                        <span className="mt-0.5 inline-block rounded-full border border-[#EFE4D6] bg-[#F3E9DC] px-2 py-0.5 text-[10px] font-semibold text-stone-700">
                          {recentItem.variant.name}
                        </span>
                      )}

                      {recentItem.addons?.length > 0 && (
                        <p className="text-[10px] text-stone-500 line-clamp-1">
                          + {recentItem.addons.map((a) => a.name).join(', ')}
                        </p>
                      )}
                    </div>

                    {/* Quantity controls inside popup */}
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-2 rounded-full border border-[#EFE4D6] bg-[#FBF6EF] px-2 py-0.5 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => updateQuantity(recentItem.key, recentItem.quantity - 1)}
                          className="flex h-5 w-5 items-center justify-center rounded-full text-stone-700 hover:bg-[#7A3316] hover:text-white transition active:scale-90"
                          aria-label="Decrease quantity"
                        >
                          <Minus size={10} />
                        </button>
                        <span className="w-4 text-center text-xs font-bold text-[#2B1810] font-mono">
                          {recentItem.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(recentItem.key, recentItem.quantity + 1)}
                          className="flex h-5 w-5 items-center justify-center rounded-full text-stone-700 hover:bg-[#7A3316] hover:text-white transition active:scale-90"
                          aria-label="Increase quantity"
                        >
                          <Plus size={10} />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(recentItem.key)}
                        className="text-stone-400 hover:text-rose-600 transition text-[11px] flex items-center gap-1"
                        aria-label="Remove item"
                      >
                        <Trash2 size={12} />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* If multiple items exist in cart, allow expanding to view list */}
                {items.length > 1 && (
                  <div className="mt-3 border-t border-[#EFE4D6] pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAllItems((prev) => !prev)}
                      className="flex w-full items-center justify-between text-[11px] font-semibold text-[#7A3316] hover:text-[#5E2610] transition py-0.5"
                    >
                      <span>
                        {showAllItems ? 'Hide other items' : `View all ${items.length} items in cart`}
                      </span>
                      {showAllItems ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    <AnimatePresence>
                      {showAllItems && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-2 space-y-2 max-h-40 overflow-y-auto pr-1"
                        >
                          {items
                            .filter((item) => item.key !== recentItem.key)
                            .map((item) => (
                              <div
                                key={item.key}
                                className="flex items-center justify-between rounded-xl bg-[#FBF6EF] p-2 text-xs border border-[#EFE4D6]"
                              >
                                <div className="min-w-0 flex-1 pr-2">
                                  <p className="font-medium text-[#2B1810] truncate">
                                    {item.name}
                                  </p>
                                  <p className="text-[10px] text-stone-500">
                                    Qty: {item.quantity} {item.variant ? `• ${item.variant.name}` : ''}
                                  </p>
                                </div>
                                <span className="font-mono font-bold text-[#7A3316]">
                                  {formatMoney(item.itemTotal, tenant.currency)}
                                </span>
                              </div>
                            ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            )}

            {/* Popup Actions & Total */}
            <div className="border-t border-[#EFE4D6] bg-white p-4">
              <div className="flex items-center justify-between pb-3 text-xs">
                <span className="text-stone-600 font-medium">Cart Total (incl. tax)</span>
                <span className="price-tag text-lg font-bold text-[#7A3316]">{formatMoney(total, tenant.currency)}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    closeQuickCart();
                    navigate('/cart');
                  }}
                  className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full border border-[#EFE4D6] bg-[#FFFDF9] py-2.5 text-xs font-bold uppercase tracking-[0.1em] text-[#2B1810] shadow-2xs transition hover:bg-[#FBF6EF] active:scale-95"
                >
                  <ShoppingBag size={13} />
                  <span>View Cart</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    closeQuickCart();
                    navigate('/checkout');
                  }}
                  className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full bg-[#7A3316] py-2.5 text-xs font-bold uppercase tracking-[0.1em] text-white shadow-2xs transition hover:bg-[#5E2610] active:scale-95"
                >
                  <span>Checkout</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          </motion.div>
        </aside>
      )}
    </AnimatePresence>
  );
}
