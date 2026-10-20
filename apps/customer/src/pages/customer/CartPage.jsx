import { Link, useNavigate } from 'react-router-dom';
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
  Menu,
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
  const {
    items,
    tableNumber,
    removeItem,
    updateQuantity,
    clearCart,
    isScannerOpen,
    openScanner,
    closeScanner,
    openNavDrawer,
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
    navigate('/checkout');
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        {/* Simple Top Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-stone-200 bg-white shadow-2xs">
          <button
            type="button"
            onClick={() => navigate('/menu')}
            className="min-h-[38px] min-w-[38px] rounded-full border border-stone-300 flex items-center justify-center text-stone-700 hover:bg-stone-50 transition active:scale-95"
            aria-label="Back to Menu"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="font-sora text-lg font-bold text-stone-900">Your Cart</h1>
        </div>

        {/* Empty State Body */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-stone-100 border border-stone-200 flex items-center justify-center text-3xl mb-4 shadow-2xs">
            ☕
          </div>
          <h2 className="font-sora text-2xl font-extrabold text-stone-900">Your cart is empty</h2>
          <p className="text-stone-500 text-sm mt-2 leading-relaxed">
            Discover our freshly brewed specialty coffees, artisanal bites, and gourmet food.
          </p>
          <Link
            to="/menu"
            className="mt-6 btn-primary min-h-[46px] px-8 text-xs font-sora font-bold tracking-wider rounded-full shadow-xs"
          >
            Explore Menu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3.5 border-b border-stone-200 bg-white/95 backdrop-blur-md shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/menu')}
            className="min-h-[38px] min-w-[38px] rounded-full border border-stone-300 flex items-center justify-center text-stone-700 hover:bg-stone-50 transition active:scale-95"
            aria-label="Back to Menu"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-sora text-lg sm:text-xl font-bold text-stone-900 leading-none">
                Your Order
              </h1>
              <span className="flex h-5 items-center justify-center rounded-full bg-stone-900 text-white px-2 text-[11px] font-sora font-bold">
                {itemCount}
              </span>
            </div>
            <p className="text-[11px] text-stone-500 mt-0.5">{tenant.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <button
              type="button"
              onClick={clearCart}
              className="min-h-[36px] px-3.5 py-1 text-xs font-sora font-semibold text-stone-600 hover:text-red-600 hover:bg-red-50 border border-stone-300 rounded-full transition"
            >
              Clear All
            </button>
          )}

          {/* Hamburger All Pages Button */}
          <button
            type="button"
            onClick={openNavDrawer}
            aria-label="Open navigation menu - show all pages"
            className="min-h-[38px] min-w-[38px] px-2.5 sm:px-3 flex items-center justify-center gap-1.5 rounded-full border border-stone-300 bg-white text-[#0F3D2E] shadow-2xs hover:bg-stone-50 active:scale-95 transition-all"
          >
            <Menu size={18} strokeWidth={2.4} />
            <span className="hidden sm:inline text-xs font-sora font-bold tracking-wide">All Pages</span>
          </button>
        </div>
      </header>

      {/* Main Content Layout (2-Column on Desktop) */}
      <main className="flex-1 mx-auto max-w-6xl w-full p-4 sm:p-6 lg:p-8 pb-36 lg:pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Table Status & Cart Items */}
          <div className="lg:col-span-7 space-y-4">
            {/* Table Identification Card */}
            <div className={`rounded-2xl p-4 border transition-all ${
              tableNumber
                ? 'bg-white border-stone-300 text-stone-900 shadow-2xs'
                : 'bg-amber-50/60 border-amber-300 text-amber-950 shadow-2xs'
            }`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold ${
                    tableNumber
                      ? 'bg-stone-900 text-white'
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
                    <p className="text-xs font-bold uppercase tracking-wider text-stone-500">
                      {tableNumber ? 'Connected Table' : 'Table Required to Order'}
                    </p>
                    <p className="font-sora text-base font-bold text-stone-900">
                      {tableNumber ? `Table ${String(tableNumber).padStart(2, '0')}` : 'Please scan your table QR'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={openScanner}
                  className={`min-h-[38px] px-4 py-1 rounded-full text-xs font-sora font-bold tracking-wider transition active:scale-95 shadow-2xs ${
                    tableNumber
                      ? 'bg-white hover:bg-stone-50 text-stone-800 border border-stone-300'
                      : 'bg-stone-900 hover:bg-stone-800 text-white border border-stone-900'
                  }`}
                >
                  {tableNumber ? 'Switch Table' : 'Scan Table QR'}
                </button>
              </div>
            </div>

            {/* Items Card List - Connected Full-Width Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1 text-xs font-bold uppercase tracking-wider text-stone-500">
                <span>Selected Items ({items.length})</span>
                <Link to="/menu" className="text-stone-900 hover:underline font-semibold transition">
                  + Add more items
                </Link>
              </div>

              <div className="bg-white border border-stone-200 divide-y divide-stone-200 rounded-2xl shadow-2xs overflow-hidden">
                <AnimatePresence initial={false}>
                  {items.map((item) => (
                    <motion.article
                      key={item.key}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="p-3.5 sm:p-4 flex gap-3.5 items-center bg-white hover:bg-stone-50/50 transition-colors"
                    >
                      {/* Item Thumbnail */}
                      <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-stone-100 border border-stone-200">
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
                          <h2 className="font-sora text-sm sm:text-base font-bold text-stone-900 leading-tight truncate">
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
                            <span className="rounded-full bg-stone-100 border border-stone-200 px-2 py-0.5 text-[11px] font-semibold text-stone-700">
                              Size: {item.variant.name}
                            </span>
                          )}
                          {item.addons?.length > 0 && (
                            <span className="text-stone-500 text-[11px]">
                              +{item.addons.map(a => a.name).join(', ')}
                            </span>
                          )}
                        </div>

                        {item.specialInstructions && (
                          <p className="mt-1 text-[11px] italic text-stone-600 truncate">
                            &ldquo;{item.specialInstructions}&rdquo;
                          </p>
                        )}

                        {/* Quantity Stepper & Price */}
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <div className="inline-flex items-center rounded-full bg-white border border-stone-300 p-0.5 shadow-2xs">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.key, item.quantity - 1)}
                              className="flex h-7 w-7 items-center justify-center rounded-full text-stone-700 hover:bg-stone-100 transition active:scale-95"
                              aria-label={`Decrease quantity of ${item.name}`}
                            >
                              <Minus size={12} strokeWidth={2.5} />
                            </button>
                            <span className="w-7 text-center font-sora text-xs font-bold text-stone-900">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.key, item.quantity + 1)}
                              className="flex h-7 w-7 items-center justify-center rounded-full text-stone-700 hover:bg-stone-100 transition active:scale-95"
                              aria-label={`Increase quantity of ${item.name}`}
                            >
                              <Plus size={12} strokeWidth={2.5} />
                            </button>
                          </div>

                          <span className="font-sora text-base font-extrabold text-stone-900">
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
          <div className="lg:col-span-5">
            <div className="p-5 sm:p-6 space-y-5 bg-white border border-stone-200 rounded-2xl shadow-2xs sticky top-24">
              <h2 className="font-sora text-lg font-bold text-stone-900 border-b border-stone-200 pb-3">
                Order Summary
              </h2>

              {/* Cost Breakdown */}
              <div className="space-y-2.5 text-sm font-jakarta">
                <div className="flex justify-between text-stone-600">
                  <span>Items Subtotal</span>
                  <span className="font-sora font-semibold text-stone-900">{formatMoney(subtotal, tenant.currency)}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Taxes &amp; GST ({tenant.taxRate}%)</span>
                  <span className="font-sora font-semibold text-stone-900">{formatMoney(tax, tenant.currency)}</span>
                </div>
                <div className="flex justify-between border-t border-dashed border-stone-200 pt-3 text-base font-bold text-stone-900">
                  <span>Total Payable</span>
                  <span className="font-sora text-xl font-extrabold text-stone-900">{formatMoney(total, tenant.currency)}</span>
                </div>
              </div>

              {/* Trust Badge */}
              <div className="flex items-center gap-2 rounded-xl bg-stone-50 border border-stone-200 p-3 text-xs text-stone-700">
                <ShieldCheck size={16} className="text-stone-900 shrink-0" />
                <span>Orders are prepared fresh by {tenant.name} upon placement.</span>
              </div>

              {/* Checkout Button (Desktop Only — Mobile uses the sticky bottom bar) */}
              <motion.button
                type="button"
                whileTap={{ scale: 0.985 }}
                onClick={handleProceedCheckout}
                className="hidden lg:flex w-full min-h-[46px] !bg-[#0F3D2E] hover:!bg-[#16503D] !text-white items-center justify-between px-6 py-3 text-sm font-sora font-bold rounded-full shadow-2xs transition active:scale-98"
              >
                <div className="flex items-center gap-2 text-white">
                  <ShoppingBag size={18} className="text-white" />
                  <span className="text-white">Proceed to Checkout</span>
                </div>
                <span className="font-sora text-base font-bold text-[#FFF1C9]">{formatMoney(total, tenant.currency)}</span>
              </motion.button>
            </div>
          </div>
        </div>
      </main>

      {/* Floating Bottom Bar for Mobile Viewports (Single Mobile Checkout Button) */}
      <div className="lg:hidden bottom-safe fixed bottom-0 left-0 right-0 p-3.5 bg-white border-t border-stone-200 shadow-xl z-20">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] text-stone-500 uppercase tracking-wider font-semibold">Total Amount</p>
            <p className="font-sora text-lg font-extrabold text-stone-900">{formatMoney(total, tenant.currency)}</p>
          </div>
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={handleProceedCheckout}
            className="flex-1 min-h-[46px] !bg-[#0F3D2E] hover:!bg-[#16503D] !text-white flex items-center justify-center gap-2 text-xs font-sora font-bold uppercase tracking-wider rounded-full shadow-2xs transition active:scale-98"
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
