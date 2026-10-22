import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  QrCode,
  AlertCircle,
  CheckCircle2,
  UtensilsCrossed,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import useCartStore, { cartItemCount } from '../../context/cartStore';
import { useTenant } from '../../context/TenantContext';
import { formatMoney } from '../../utils/money';
import QrScannerModal from '../../components/ui/QrScannerModal';
import usePageMeta from '../../hooks/usePageMeta';

const FALLBACK_IMAGE = '/images/coffee-placeholder.svg';

export default function CartPage() {
  const tenant = useTenant();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const currentSearch = searchParams.toString() ? `?${searchParams.toString()}` : '';
  const {
    items,
    tableNumber,
    removeItem,
    updateQuantity,
    clearCart,
    isScannerOpen,
    openScanner,
    closeScanner,
  } = useCartStore();
  const itemCount = useCartStore(cartItemCount);

  usePageMeta(
    `Your Order Cart (${itemCount}) — ${tenant.name || 'Café'}`,
    'Review your selected dishes, beverages, and order items before table checkout.'
  );

  const subtotal = items.reduce((s, i) => s + i.itemTotal, 0);
  const tax = Number(((subtotal * Number(tenant.taxRate || 0)) / 100).toFixed(2));
  const total = (subtotal + tax).toFixed(2);

  const handleProceedCheckout = () => {
    if (!tableNumber) {
      toast.error('Please scan your table QR code to proceed with your order.');
      openScanner();
      return;
    }
    navigate(`/checkout${currentSearch}`);
  };

  if (items.length === 0) {
    return (
      <div className="min-h-[100dvh] bg-[#FBF6EF] flex flex-col">
        {/* Simple Top Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#EFE4D6] bg-[#FFFDF9] shadow-2xs">
          <button
            type="button"
            onClick={() => navigate(`/menu${currentSearch}`)}
            className="min-h-[44px] min-w-[44px] rounded-full border border-[#EFE4D6] flex items-center justify-center text-[#2B1810] hover:bg-[#F3E9DC]/40 transition active:scale-95"
            aria-label="Back to Menu"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="font-sora text-lg font-bold text-[#2B1810]">Your Cart</h1>
        </div>

        {/* Empty State Body */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-[#F3E9DC] border border-[#EFE4D6] flex items-center justify-center text-3xl mb-4 shadow-2xs">
            ☕
          </div>
          <h2 className="font-sora text-2xl font-extrabold text-[#2B1810]">Your cart is empty</h2>
          <p className="text-[#7B6B5F] text-sm mt-2 leading-relaxed">
            Discover our freshly brewed specialty coffees, artisanal bites, and gourmet food.
          </p>
          <Link
            to={`/menu${currentSearch}`}
            className="mt-6 btn-primary min-h-[46px] px-8 text-xs font-sora font-bold tracking-wider rounded-full shadow-xs"
          >
            Explore Menu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#FBF6EF] flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3.5 border-b border-[#EFE4D6] bg-[#FFFDF9]/95 backdrop-blur-md shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(`/menu${currentSearch}`)}
            className="min-h-[44px] min-w-[44px] rounded-full border border-[#EFE4D6] flex items-center justify-center text-[#2B1810] hover:bg-[#F3E9DC]/40 transition active:scale-95"
            aria-label="Back to Menu"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-sora text-lg font-bold text-[#2B1810] leading-none">
                Your Order
              </h1>
              <span className="flex h-5 items-center justify-center rounded-full bg-[#7A3316] text-white px-2 text-[11px] font-sora font-bold">
                {itemCount}
              </span>
            </div>
            <p className="text-[11px] text-[#7B6B5F] mt-0.5">{tenant.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <button
              type="button"
              onClick={clearCart}
              className="min-h-[44px] px-3.5 py-1 text-xs font-sora font-semibold text-[#7B6B5F] hover:text-red-600 hover:bg-red-50 border border-[#EFE4D6] rounded-full transition"
            >
              Clear All
            </button>
          )}

        </div>
      </header>

      {/* Main Content Layout (2-Column on Desktop) */}
      <main className="flex-1 mx-auto w-full p-4 pb-32">
        <div className="grid grid-cols-1 gap-4 items-start">
          {/* Left Column: Table Status & Cart Items */}
          <div className="space-y-4">
            {/* Table Identification Card */}
            <div className={`rounded-2xl p-4 border transition-all ${
              tableNumber
                ? 'bg-[#FFFDF9] border-[#EFE4D6] text-[#2B1810] shadow-2xs'
                : 'bg-amber-50/60 border-amber-300 text-amber-950 shadow-2xs'
            }`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold ${
                    tableNumber
                      ? 'bg-[#7A3316] text-white'
                      : 'bg-amber-500 text-white'
                  }`}>
                    {tableNumber ? (
                      <span className="font-sora text-sm font-bold">
                        {String(tableNumber).padStart(2, '0')}
                      </span>
                    ) : (
                      <QrCode size={18} />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#7B6B5F]">
                      {tableNumber ? 'Connected Table' : 'Table Required to Order'}
                    </p>
                    <p className="font-sora text-base font-bold text-[#2B1810]">
                      {tableNumber ? `Table ${String(tableNumber).padStart(2, '0')}` : 'Please scan your table QR'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={openScanner}
                  className={`min-h-[38px] px-4 py-1 rounded-full text-xs font-sora font-bold tracking-wider transition active:scale-95 shadow-2xs ${
                    tableNumber
                      ? 'bg-[#FFFDF9] hover:bg-[#F3E9DC]/40 text-[#2B1810] border border-[#EFE4D6]'
                      : 'bg-[#7A3316] hover:bg-[#7A3316] text-white border border-stone-900'
                  }`}
                >
                  {tableNumber ? 'Switch Table' : 'Scan Table QR'}
                </button>
              </div>
            </div>

            {/* Items Card List - Connected Full-Width Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1 text-xs font-bold uppercase tracking-wider text-[#7B6B5F]">
                <span>Selected Items ({items.length})</span>
                <Link to={`/menu${currentSearch}`} className="text-[#2B1810] hover:underline font-semibold transition">
                  + Add more items
                </Link>
              </div>

              <div className="bg-[#FFFDF9] border border-[#EFE4D6] divide-y divide-stone-200 rounded-2xl shadow-2xs overflow-hidden">
                <AnimatePresence initial={false}>
                  {items.map((item) => (
                    <motion.article
                      key={item.key}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="p-3.5 flex gap-3.5 items-center bg-[#FFFDF9] hover:bg-[#F3E9DC]/40/50 transition-colors"
                    >
                      {/* Item Thumbnail */}
                      <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-[#F3E9DC] border border-[#EFE4D6]">
                        <img
                          src={item.image || FALLBACK_IMAGE}
                          alt={item.name}
                          width="80"
                          height="80"
                          loading="lazy"
                          className="h-full w-full object-cover"
                          onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                        />
                      </div>

                      {/* Item Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h2 className="font-sora text-sm font-bold text-[#2B1810] leading-tight truncate">
                            {item.name}
                          </h2>
                          <button
                            type="button"
                            onClick={() => removeItem(item.key)}
                            aria-label={`Remove ${item.name} from cart`}
                            className="min-h-[32px] min-w-[32px] flex items-center justify-center text-stone-400 hover:text-red-600 transition rounded-full"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        {/* Variant and Add-ons */}
                        <div className="mt-1 flex flex-wrap gap-1 text-xs">
                          {item.variant && (
                            <span className="rounded-full bg-[#F3E9DC] border border-[#EFE4D6] px-2 py-0.5 text-[11px] font-semibold text-[#2B1810]">
                              Size: {item.variant.name}
                            </span>
                          )}
                          {item.addons?.length > 0 && (
                            <span className="text-[#7B6B5F] text-[11px]">
                              +{item.addons.map(a => a.name).join(', ')}
                            </span>
                          )}
                        </div>

                        {item.specialInstructions && (
                          <p className="mt-1 text-[11px] italic text-[#7B6B5F] truncate">
                            &ldquo;{item.specialInstructions}&rdquo;
                          </p>
                        )}

                        {/* Quantity Stepper & Price */}
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <div className="inline-flex items-center rounded-full bg-[#FFFDF9] border border-[#EFE4D6] p-0.5 shadow-2xs">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.key, item.quantity - 1)}
                              className="flex h-7 w-7 items-center justify-center rounded-full text-[#2B1810] hover:bg-[#F3E9DC] transition active:scale-95"
                              aria-label={`Decrease quantity of ${item.name}`}
                            >
                              <Minus size={12} strokeWidth={2.5} />
                            </button>
                            <span className="w-7 text-center font-sora text-xs font-bold text-[#2B1810]">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.key, item.quantity + 1)}
                              className="flex h-7 w-7 items-center justify-center rounded-full text-[#2B1810] hover:bg-[#F3E9DC] transition active:scale-95"
                              aria-label={`Increase quantity of ${item.name}`}
                            >
                              <Plus size={12} strokeWidth={2.5} />
                            </button>
                          </div>

                          <span className="font-sora text-base font-extrabold text-[#2B1810]">
                            {formatMoney(item.itemTotal, tenant.currency)}
                          </span>
                        </div>
                      </div>
                    </motion.article>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Right Column: Order Bill Summary & Checkout Action */}
          <div>
            <div className="p-5 space-y-5 bg-[#FFFDF9] border border-[#EFE4D6] rounded-2xl shadow-2xs">
              <h2 className="font-sora text-lg font-bold text-[#2B1810] border-b border-[#EFE4D6] pb-3">
                Order Summary
              </h2>

              {/* Cost Breakdown */}
              <div className="space-y-2.5 text-sm font-jakarta">
                <div className="flex justify-between text-[#7B6B5F]">
                  <span>Items Subtotal</span>
                  <span className="font-sora font-semibold text-[#2B1810]">{formatMoney(subtotal, tenant.currency)}</span>
                </div>
                <div className="flex justify-between text-[#7B6B5F]">
                  <span>Taxes &amp; GST ({tenant.taxRate}%)</span>
                  <span className="font-sora font-semibold text-[#2B1810]">{formatMoney(tax, tenant.currency)}</span>
                </div>
                <div className="flex justify-between border-t border-dashed border-[#EFE4D6] pt-3 text-base font-bold text-[#2B1810]">
                  <span>Total Payable</span>
                  <span className="font-sora text-xl font-extrabold text-[#2B1810]">{formatMoney(total, tenant.currency)}</span>
                </div>
              </div>

              {/* Trust Badge */}
              <div className="flex items-center gap-2 rounded-xl bg-[#F3E9DC]/40 border border-[#EFE4D6] p-3 text-xs text-[#2B1810]">
                <ShieldCheck size={16} className="text-[#2B1810] shrink-0" />
                <span>Orders are prepared fresh by {tenant.name} upon placement.</span>
              </div>

            </div>
          </div>
        </div>
      </main>

      {/* Floating Bottom Bar for Mobile Viewports (Single Mobile Checkout Button) */}
      <div className="bottom-safe fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] p-3.5 bg-[#FFFDF9] border-t border-[#EFE4D6] shadow-xl z-20">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] text-[#7B6B5F] uppercase tracking-wider font-semibold">Total Amount</p>
            <p className="font-sora text-lg font-extrabold text-[#2B1810]">{formatMoney(total, tenant.currency)}</p>
          </div>
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={handleProceedCheckout}
            className="flex-1 min-h-[46px] !bg-[#7A3316] hover:!bg-[#5E2610] !text-[#FFFDF9] flex items-center justify-center gap-2 text-xs font-sora font-bold uppercase tracking-wider rounded-full shadow-2xs transition active:scale-98"
          >
            <ShoppingBag size={17} className="text-white shrink-0" />
            <span className="text-white font-bold">Proceed to Checkout</span>
          </motion.button>
        </div>
      </div>

      {/* Table QR Scanner Modal */}
      <AnimatePresence>
        {isScannerOpen && (
          <QrScannerModal
            onClose={closeScanner}
            onTableFound={(num, token) => {
              closeScanner();
              if (token) {
                navigate(`/cart?tableToken=${encodeURIComponent(token)}`, { replace: true });
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
