import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  CreditCard,
  Banknote,
  Loader2,
  AlertCircle,
  ShieldCheck,
  User,
  Phone,
  Mail,
  CheckCircle2,
  Tag,
  QrCode,
  Lock,
  Menu,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import useCartStore from '../../context/cartStore';
import { useTenant } from '../../context/TenantContext';
import { formatMoney } from '../../utils/money';
import usePageMeta from '../../hooks/usePageMeta';

const loadRazorpay = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function CheckoutPage() {
  const tenant = useTenant();
  const navigate = useNavigate();
  usePageMeta(
    `Checkout — ${tenant.name || 'Café'}`,
    'Complete your table order securely with instant UPI, Cards, or Counter payment.'
  );

  const {
    items,
    tableNumber,
    tableToken,
    clearCart,
    diningSessionToken,
    addRecentOrder,
    openNavDrawer,
  } = useCartStore();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('razorpay');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [idempotencyKey] = useState(() => (
    sessionStorage.getItem('brewhaus_checkout_idempotency') || (() => {
      const key = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `chk_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      sessionStorage.setItem('brewhaus_checkout_idempotency', key);
      return key;
    })()
  ));

  const subtotal = items.reduce((s, i) => s + i.itemTotal, 0);
  const discount = appliedCoupon?.discount || 0;
  const tax = appliedCoupon?.tax ?? Number(((subtotal - discount) * Number(tenant.taxRate || 0) / 100).toFixed(2));
  const total = appliedCoupon?.total ?? Number((subtotal - discount + tax).toFixed(2));

  const secureItems = () => items.map(item => ({
    productId: item.product,
    quantity: item.quantity,
    ...(item.variant && { variantId: item.variant._id }),
    ...(item.addons.length > 0 && { addonIds: item.addons.map(a => a._id) }),
    ...(item.specialInstructions && { specialInstructions: item.specialInstructions }),
  }));

  const applyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    try {
      const { data } = await api.post('/coupons/validate', { code: couponInput, items: secureItems() });
      setAppliedCoupon(data);
      setCouponInput(data.code);
      setError('');
      toast.success(`Coupon ${data.code} applied!`);
    } catch (e) {
      setAppliedCoupon(null);
      setError(e.message || 'Coupon could not be applied.');
    } finally { setCouponLoading(false); }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center flex-col gap-4 p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-stone-100 border border-stone-200 flex items-center justify-center text-3xl mb-2 shadow-2xs">
          🛒
        </div>
        <h1 className="font-sora text-2xl font-extrabold text-stone-900">Your cart is empty</h1>
        <p className="text-stone-500 text-sm max-w-sm">
          Please add items to your cart before proceeding to checkout.
        </p>
        <Link to="/menu" className="btn-primary min-h-[46px] px-8 text-xs font-sora font-bold tracking-wider mt-2 rounded-full shadow-xs">
          Browse Menu
        </Link>
      </div>
    );
  }

  const validate = () => {
    if (!name.trim()) return 'Please enter your name.';
    if (!phone.trim() || !/^\d{10}$/.test(phone)) return 'Please enter a valid 10-digit phone number.';
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Please enter a valid email address.';
    return null;
  };

  const handleCashOrder = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true);
    setError('');
    try {
      const effectiveTableToken =
        tableToken ||
        sessionStorage.getItem('active_table_token') ||
        localStorage.getItem('active_table_token') ||
        '';
      const cafeSlug =
        tenant?.slug ||
        sessionStorage.getItem('active_cafe_slug') ||
        localStorage.getItem('active_cafe_slug') ||
        '';
      const activeTenantId =
        tenant?.id ||
        tenant?._id ||
        sessionStorage.getItem('active_tenant_id') ||
        localStorage.getItem('active_tenant_id') ||
        '';

      const orderData = {
        tableNumber,
        tableToken: effectiveTableToken,
        cafeSlug,
        customer: {
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          marketingConsent,
        },
        items: secureItems(),
        ...(appliedCoupon && { couponCode: appliedCoupon.code }),
        paymentMethod: 'cash',
        idempotencyKey,
        ...(diningSessionToken && { diningSessionToken }),
      };
      const res = await api.post('/orders', orderData, {
        headers: {
          ...(cafeSlug && { 'X-Tenant-Slug': cafeSlug }),
          ...(activeTenantId && { 'X-Tenant-Id': String(activeTenantId) }),
          ...(effectiveTableToken && { 'X-Table-Token': effectiveTableToken }),
        },
      });
      const { accessToken, order } = res.data;
      if (order?.customerId) {
        localStorage.setItem('brewhaus_customer_id', order.customerId);
      }
      localStorage.setItem('brewhaus_customer_phone', phone.trim());
      sessionStorage.removeItem('brewhaus_checkout_idempotency');
      if (addRecentOrder && order?._id) {
        addRecentOrder({
          orderId: order._id,
          orderNumber: order.orderNumber,
          accessToken,
          tableNumber,
          createdAt: order.createdAt || new Date().toISOString(),
          total: order.total,
          paymentMethod: 'cash',
        });
      }
      clearCart();
      navigate(`/order-confirm/${res.data.order._id}?token=${accessToken}`);
    } catch (e) {
      setError(e.message || 'Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRazorpayOrder = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true);
    setError('');

    try {
      const effectiveTableToken =
        tableToken ||
        sessionStorage.getItem('active_table_token') ||
        localStorage.getItem('active_table_token') ||
        '';
      const cafeSlug =
        tenant?.slug ||
        sessionStorage.getItem('active_cafe_slug') ||
        localStorage.getItem('active_cafe_slug') ||
        '';
      const activeTenantId =
        tenant?.id ||
        tenant?._id ||
        sessionStorage.getItem('active_tenant_id') ||
        localStorage.getItem('active_tenant_id') ||
        '';

      const orderData = {
        tableNumber,
        tableToken: effectiveTableToken,
        cafeSlug,
        customer: {
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          marketingConsent,
        },
        items: secureItems(),
        ...(appliedCoupon && { couponCode: appliedCoupon.code }),
        paymentMethod: 'razorpay',
        idempotencyKey,
        ...(diningSessionToken && { diningSessionToken }),
      };
      const orderRes = await api.post('/orders', orderData, {
        headers: {
          ...(cafeSlug && { 'X-Tenant-Slug': cafeSlug }),
          ...(activeTenantId && { 'X-Tenant-Id': String(activeTenantId) }),
          ...(effectiveTableToken && { 'X-Table-Token': effectiveTableToken }),
        },
      });
      const order = orderRes.data.order;
      const { accessToken } = orderRes.data;

      if (order?.customerId) {
        localStorage.setItem('brewhaus_customer_id', order.customerId);
      }
      localStorage.setItem('brewhaus_customer_phone', phone.trim());

      if (addRecentOrder && order?._id) {
        addRecentOrder({
          orderId: order._id,
          orderNumber: order.orderNumber,
          accessToken,
          tableNumber,
          createdAt: order.createdAt || new Date().toISOString(),
          total: order.total,
          paymentMethod: 'razorpay',
        });
      }

      const rzpRes = await api.post(
        '/payment/create-order',
        { orderId: order._id, accessToken, cafeSlug },
        {
          headers: {
            ...(cafeSlug && { 'X-Tenant-Slug': cafeSlug }),
            ...(activeTenantId && { 'X-Tenant-Id': String(activeTenantId) }),
            ...(effectiveTableToken && { 'X-Table-Token': effectiveTableToken }),
          },
        }
      );
      const { razorpayOrderId, amount, keyId, currency } = rzpRes.data;

      const loaded = await loadRazorpay();
      if (!loaded) throw new Error('Payment gateway failed to load. Check your internet connection.');

      const rzp = new window.Razorpay({
        key: keyId,
        amount,
        currency: currency || tenant.currency || 'INR',
        name: tenant.name,
        description: `Order ${order.orderNumber} · Table ${tableNumber}`,
        order_id: razorpayOrderId,
        prefill: { name: name.trim(), contact: phone.trim(), email: email.trim() },
        theme: { color: tenant.primaryColor || '#C8963E' },
        modal: {
          ondismiss: () => {
            setLoading(false);
            api.post(
              '/payment/cancel',
              { orderId: order._id, accessToken, cafeSlug },
              {
                headers: {
                  ...(cafeSlug && { 'X-Tenant-Slug': cafeSlug }),
                  ...(activeTenantId && { 'X-Tenant-Id': String(activeTenantId) }),
                },
              }
            ).catch(() => {});
            toast.error('Payment cancelled.');
          }
        },
        handler: () => {
          clearCart();
          sessionStorage.removeItem('brewhaus_checkout_idempotency');
          toast.success('Payment submitted. We are confirming it with the payment provider.');
          navigate(`/order-confirm/${order._id}?token=${accessToken}`);
        },
      });

      rzp.open();
    } catch (e) {
      const errorMsg =
        e.response?.data?.error ||
        e.response?.data?.message ||
        e.message ||
        'Failed to process payment. Please try again.';
      setError(errorMsg);
      toast.error(errorMsg);
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (paymentMethod === 'cash') handleCashOrder();
    else handleRazorpayOrder();
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3.5 border-b border-stone-200 bg-white/95 backdrop-blur-md shadow-2xs">
        <div className="flex items-center gap-3">
          <Link
            to="/cart"
            aria-label="Back to Cart"
            className="min-h-[38px] min-w-[38px] rounded-full border border-stone-300 flex items-center justify-center text-stone-700 hover:bg-stone-50 transition active:scale-95"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="font-sora text-lg sm:text-xl font-bold text-stone-900 leading-none">
              Checkout
            </h1>
            <p className="text-[11px] text-stone-500 mt-0.5">{tenant.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden min-[380px]:flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-300">
            <ShieldCheck size={14} className="text-[#16A34A]" />
            <span className="font-semibold">Secure Checkout</span>
          </div>

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

      {/* Main Checkout Grid (2-Column on Desktop) */}
      <main className="flex-1 mx-auto max-w-6xl w-full p-4 sm:p-6 lg:p-8 pb-36 lg:pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Table Details + Customer Details + Payment Method */}
          <div className="lg:col-span-7 space-y-4">
            {/* Table Badge Card */}
            <div className="p-4 bg-white border border-stone-200 flex items-center justify-between gap-3 shadow-2xs rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-stone-900 text-white font-sora font-bold text-sm shadow-2xs">
                  {String(tableNumber || '—').padStart(2, '0')}
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-stone-500">Dine-In Table</p>
                  <p className="font-sora text-base font-bold text-stone-900">
                    {tableNumber ? `Table ${String(tableNumber).padStart(2, '0')}` : 'Table not selected'}
                  </p>
                </div>
              </div>

              {tableNumber ? (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-300">
                  <CheckCircle2 size={13} className="text-[#16A34A]" />
                  <span>Verified</span>
                </div>
              ) : (
                <Link to="/menu" className="text-xs font-bold text-[var(--menu-accent,#C93A1C)] underline">
                  Scan Table QR
                </Link>
              )}
            </div>

            {/* Customer Details Card */}
            <div className="p-5 bg-white border border-stone-200 space-y-4 shadow-2xs rounded-2xl">
              <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                <div className="flex items-center gap-2">
                  <User size={18} className="text-stone-900" />
                  <h2 className="font-sora text-base font-bold text-stone-900">
                    Customer Information
                  </h2>
                </div>
              </div>

              {/* Name Input */}
              <div>
                <label className="text-xs font-bold text-stone-700 mb-1.5 block">
                  Your Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full h-11 pl-10 pr-4 rounded-full border border-stone-300 bg-white text-sm font-jakarta text-stone-900 focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 transition"
                    autoComplete="name"
                  />
                </div>
              </div>

              {/* Mobile Phone Input */}
              <div>
                <label className="text-xs font-bold text-stone-700 mb-1.5 block">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-500">
                    +91
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10-digit mobile number"
                    className="w-full h-11 pl-12 pr-4 rounded-full border border-stone-300 bg-white text-sm font-jakarta text-stone-900 focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 transition"
                    autoComplete="tel"
                    inputMode="numeric"
                  />
                </div>
                <p className="text-[11px] text-stone-500 mt-1">
                  We will send order confirmation and kitchen updates via SMS/WhatsApp.
                </p>
              </div>

              {/* Email (Optional) */}
              <div>
                <label className="text-xs font-bold text-stone-700 mb-1.5 block">
                  Email Address <span className="text-stone-400 font-normal">(Optional for invoice)</span>
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@domain.com"
                    className="w-full h-11 pl-10 pr-4 rounded-full border border-stone-300 bg-white text-sm font-jakarta text-stone-900 focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 transition"
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Marketing Consent */}
              <div className="pt-2 border-t border-stone-200">
                <label className="flex items-start gap-2.5 cursor-pointer text-stone-700 select-none group">
                  <input
                    type="checkbox"
                    checked={marketingConsent}
                    onChange={e => setMarketingConsent(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded-md border-stone-300 text-stone-900 focus:ring-stone-900 cursor-pointer transition accent-stone-900"
                  />
                  <span className="text-xs leading-relaxed text-stone-600 group-hover:text-stone-900 transition">
                    Keep me updated with chef specials, seasonal brews, and promotions from {tenant.name}.
                  </span>
                </label>
              </div>
            </div>

            {/* Payment Method Card */}
            <div className="p-5 bg-white border border-stone-200 space-y-4 shadow-2xs rounded-2xl">
              <div className="flex items-center gap-2 border-b border-stone-200 pb-3">
                <CreditCard size={18} className="text-stone-900" />
                <h2 className="font-sora text-base font-bold text-stone-900">
                  Select Payment Method
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Razorpay Option */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('razorpay')}
                  className={`p-4 rounded-2xl border transition-all text-left flex flex-col justify-between min-h-[92px] ${
                    paymentMethod === 'razorpay'
                      ? 'border-stone-900 bg-stone-50 ring-1 ring-stone-900 shadow-2xs'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-xl ${paymentMethod === 'razorpay' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-700'}`}>
                        <CreditCard size={18} />
                      </div>
                      <span className="font-sora font-bold text-sm text-stone-900">
                        Online Payment
                      </span>
                    </div>
                    <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      paymentMethod === 'razorpay' ? 'border-stone-900 bg-stone-900' : 'border-stone-300'
                    }`}>
                      {paymentMethod === 'razorpay' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                  <p className="text-[11px] text-stone-500 mt-2">
                    Instant UPI (GPay, PhonePe), Cards & Net Banking
                  </p>
                </button>

                {/* Cash Option */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`p-4 rounded-2xl border transition-all text-left flex flex-col justify-between min-h-[92px] ${
                    paymentMethod === 'cash'
                      ? 'border-stone-900 bg-stone-50 ring-1 ring-stone-900 shadow-2xs'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-xl ${paymentMethod === 'cash' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-700'}`}>
                        <Banknote size={18} />
                      </div>
                      <span className="font-sora font-bold text-sm text-stone-900">
                        Cash at Counter
                      </span>
                    </div>
                    <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      paymentMethod === 'cash' ? 'border-stone-900 bg-stone-900' : 'border-stone-300'
                    }`}>
                      {paymentMethod === 'cash' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                  <p className="text-[11px] text-stone-500 mt-2">
                    Pay at the billing counter when leaving
                  </p>
                </button>
              </div>
            </div>

            {/* Error Message Alert */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                role="alert"
                aria-live="polite"
                className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-2xl p-3.5 shadow-2xs"
              >
                <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-red-800 text-xs sm:text-sm font-medium">{error}</p>
              </motion.div>
            )}
          </div>

          {/* Right Column: Order Summary & Coupon Code & Pay Button */}
          <div className="lg:col-span-5">
            <div className="p-5 sm:p-6 bg-white border border-stone-200 space-y-5 shadow-2xs rounded-2xl sticky top-24">
              <h2 className="font-sora text-lg font-bold text-stone-900 border-b border-stone-200 pb-3">
                Order Summary ({items.length} items)
              </h2>

              {/* Items List Snapshot */}
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1 divide-y divide-stone-100">
                {items.map(item => (
                  <div key={item.key} className="pt-2 first:pt-0 flex justify-between items-baseline text-xs font-jakarta">
                    <div className="pr-2 min-w-0">
                      <p className="font-semibold text-stone-900 truncate">
                        {item.name} × {item.quantity}
                      </p>
                      {item.variant && (
                        <p className="text-[10px] text-stone-500">{item.variant.name}</p>
                      )}
                      {item.addons?.length > 0 && (
                        <p className="text-[10px] text-stone-400">+{item.addons.map(a => a.name).join(', ')}</p>
                      )}
                    </div>
                    <span className="font-sora text-xs font-bold text-stone-900 flex-shrink-0">
                      {formatMoney(item.itemTotal, tenant.currency)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Coupon Code Input */}
              <div className="border-t border-stone-200 pt-3">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5 block">
                  Have a Coupon?
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                    <input
                      value={couponInput}
                      onChange={(e) => {
                        setCouponInput(e.target.value.toUpperCase());
                        setAppliedCoupon(null);
                      }}
                      className="w-full h-10 pl-9 pr-3 rounded-full border border-stone-300 bg-white text-xs uppercase font-mono tracking-wider text-stone-900 focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900"
                      placeholder="ENTER CODE"
                      maxLength={32}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={applyCoupon}
                    disabled={couponLoading || !couponInput.trim()}
                    className={`px-5 py-2 text-xs font-sora font-bold shrink-0 rounded-full transition active:scale-95 ${
                      appliedCoupon
                        ? 'bg-emerald-600 text-white'
                        : couponInput.trim()
                          ? 'bg-stone-900 text-white hover:bg-stone-800'
                          : 'bg-stone-100 text-stone-400 border border-stone-300 cursor-not-allowed'
                    }`}
                  >
                    {couponLoading ? 'Checking...' : appliedCoupon ? 'Applied ✓' : 'Apply'}
                  </button>
                </div>
                {appliedCoupon && (
                  <p className="mt-2 text-xs font-semibold text-emerald-800 flex items-center gap-1">
                    <CheckCircle2 size={13} className="text-[#16A34A]" />
                    <span>{appliedCoupon.code} applied — saving {formatMoney(discount, tenant.currency)}</span>
                  </p>
                )}
              </div>

              {/* Bill Details */}
              <div className="border-t border-stone-200 pt-3 space-y-2 text-xs font-jakarta">
                <div className="flex justify-between text-stone-600">
                  <span>Subtotal</span>
                  <span className="font-sora font-semibold text-stone-900">{formatMoney(subtotal, tenant.currency)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-800 font-semibold">
                    <span>Coupon Savings</span>
                    <span>−{formatMoney(discount, tenant.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between text-stone-600">
                  <span>GST &amp; Taxes ({tenant.taxRate}%)</span>
                  <span className="font-sora font-semibold text-stone-900">{formatMoney(tax, tenant.currency)}</span>
                </div>
                <div className="flex justify-between border-t border-dashed border-stone-200 pt-2.5 text-base font-bold text-stone-900">
                  <span>Final Total</span>
                  <span className="font-sora text-xl font-extrabold text-stone-900">{formatMoney(total, tenant.currency)}</span>
                </div>
              </div>

              {/* Submit Button (Desktop) */}
              <motion.button
                whileTap={{ scale: 0.985 }}
                onClick={handleSubmit}
                disabled={loading}
                className="hidden lg:flex w-full !bg-[#0F3D2E] hover:!bg-[#16503D] !text-white items-center justify-center gap-2 py-3.5 text-sm font-sora font-bold shadow-2xs rounded-full transition active:scale-98 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin text-white" />
                    <span className="text-white">{paymentMethod === 'razorpay' ? 'Opening Payment...' : 'Submitting Order...'}</span>
                  </>
                ) : (
                  <>
                    {paymentMethod === 'razorpay' ? <CreditCard size={18} className="text-white" /> : <Banknote size={18} className="text-white" />}
                    <span className="text-white">{paymentMethod === 'razorpay' ? `Pay ${formatMoney(total, tenant.currency)}` : `Place Order · ${formatMoney(total, tenant.currency)}`}</span>
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </div>
      </main>

      {/* Floating Bottom Pay Bar for Mobile */}
      <div className="lg:hidden bottom-safe fixed bottom-0 left-0 right-0 p-3.5 bg-white border-t border-stone-200 shadow-xl z-20">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] text-stone-500 uppercase tracking-wider font-semibold">Amount to Pay</p>
            <p className="font-sora text-lg font-extrabold text-stone-900">{formatMoney(total, tenant.currency)}</p>
          </div>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 min-h-[46px] !bg-[#0F3D2E] hover:!bg-[#16503D] !text-white flex items-center justify-center gap-2 text-xs font-sora font-bold uppercase tracking-wider rounded-full shadow-2xs transition active:scale-98 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin text-white" />
                <span className="text-white font-bold">Processing...</span>
              </>
            ) : (
              <>
                {paymentMethod === 'razorpay' ? <CreditCard size={16} className="text-white" /> : <Banknote size={16} className="text-white" />}
                <span className="text-white font-bold">{paymentMethod === 'razorpay' ? 'Proceed to Pay' : 'Confirm Order'}</span>
              </>
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
}