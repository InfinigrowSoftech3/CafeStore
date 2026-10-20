import { useState, useEffect, useMemo } from 'react';
import {
  Search, ShoppingCart, Plus, Minus, Trash2, PauseCircle,
  Printer, CheckCircle2, AlertCircle, Wifi, WifiOff, X, CreditCard,
  Banknote, QrCode, Split, User, Phone, Tag, Clock, RefreshCw,
  UtensilsCrossed, Check, ArrowRight, Delete, RotateCcw
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { formatMoney } from '@cafe/shared';
import {
  saveOfflineOrder,
  getPendingOfflineOrders,
  removeOfflineOrder,
  cacheCatalog,
  getCachedCatalog,
} from '../utils/posOfflineStorage';
import {
  SAMPLE_CATEGORIES,
  SAMPLE_PRODUCTS,
  SAMPLE_TABLES,
} from '../data/sampleCatalog';
import {
  Button,
  Input,
  SearchInput,
  CategoryChip,
  ProductCard,
  QuantityStepper,
  Badge,
  Modal,
  ProductCardSkeleton,
  CategoryChipSkeleton,
  EmptyState,
  ErrorState,
} from '../components/ui';

const STATIONS = ['ALL', 'KITCHEN', 'BAR', 'BAKERY', 'DESSERT'];
const ORDER_TYPES = [
  { id: 'counter', label: 'Counter ⚡' },
  { id: 'dine_in', label: 'Dine-in 🍽️' },
  { id: 'takeaway', label: 'Takeaway 🛍️' },
  { id: 'delivery', label: 'Delivery 🛵' },
];

export default function POSPage() {
  const { user } = useAuth();
  const tenant = useTenant();
  const currency = tenant?.currency || '₹';

  // Catalog State
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStation, setSelectedStation] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState(null);

  // Cart / Current Order State
  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState('counter');
  const [tableNumber, setTableNumber] = useState('');
  const [tables, setTables] = useState([]);
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');
  const [manualDiscount, setManualDiscount] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  // Mobile Bottom Sheet
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // Modals & UI States
  const [activeProductForModifier, setActiveProductForModifier] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [modifierNote, setModifierNote] = useState('');
  const [modifierQty, setModifierQty] = useState(1);

  const [heldOrders, setHeldOrders] = useState([]);
  const [showHeldModal, setShowHeldModal] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitCashAmount, setSplitCashAmount] = useState('');
  const [splitUpiAmount, setSplitUpiAmount] = useState('');
  const [splitCardAmount, setSplitCardAmount] = useState('');

  // Cash Payment Keypad Modal
  const [showCashModal, setShowCashModal] = useState(false);
  const [cashTendered, setCashTendered] = useState('');

  const [lastReceipt, setLastReceipt] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [processingOrder, setProcessingOrder] = useState(false);

  // Connectivity
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [syncingOffline, setSyncingOffline] = useState(false);

  // Sync offline connectivity status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Internet restored. Syncing offline orders...');
      syncPendingOfflineOrders();
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.error('Offline mode: Orders will be queued and synced automatically.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    checkPendingOfflineQueue();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const checkPendingOfflineQueue = async () => {
    try {
      const pending = await getPendingOfflineOrders();
      setPendingSyncCount(pending.length);
    } catch (_err) {
      // Best-effort offline queue check
    }
  };

  const syncPendingOfflineOrders = async () => {
    if (!navigator.onLine || syncingOffline) return;
    setSyncingOffline(true);
    try {
      const pending = await getPendingOfflineOrders();
      if (pending.length === 0) {
        setPendingSyncCount(0);
        return;
      }

      const { data } = await api.post('/pos/sync', { orders: pending });
      if (data.synced && Array.isArray(data.synced)) {
        for (const item of data.synced) {
          await removeOfflineOrder(item.syncId);
        }
        toast.success(`Successfully synced ${data.synced.length} offline order(s)!`);
      }
      if (data.failed && data.failed.length > 0) {
        toast.error(`${data.failed.length} offline order(s) failed to sync.`);
      }
      await checkPendingOfflineQueue();
    } catch (err) {
      console.warn('[POS Sync Error]:', err.message);
      toast.error('Sync failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setSyncingOffline(false);
    }
  };

  // Fetch Menu, Tables, and Held orders
  const loadInitialData = async () => {
    setLoadingCatalog(true);
    setCatalogError(null);
    try {
      const [catsRes, prodsRes, tablesRes, heldRes] = await Promise.all([
        api.get('/categories/all?limit=100').catch(() => api.get('/categories?limit=100')).catch(() => ({ data: { categories: [] } })),
        api.get('/menu?limit=100').catch(() => ({ data: { products: [] } })),
        api.get('/tables/all?limit=100').catch(() => ({ data: { tables: [] } })),
        api.get('/pos/held-orders?limit=100').catch(() => ({ data: { orders: [] } })),
      ]);

      const catList = Array.isArray(catsRes.data?.categories)
        ? catsRes.data.categories
        : Array.isArray(catsRes.data)
        ? catsRes.data
        : [];
      const prodList = Array.isArray(prodsRes.data?.products)
        ? prodsRes.data.products
        : Array.isArray(prodsRes.data)
        ? prodsRes.data
        : [];
      const tableList = Array.isArray(tablesRes.data?.tables)
        ? tablesRes.data.tables
        : Array.isArray(tablesRes.data)
        ? tablesRes.data
        : [];

      const finalCats = catList.length > 0 ? catList : SAMPLE_CATEGORIES;
      const finalProds = prodList.length > 0 ? prodList : SAMPLE_PRODUCTS;
      const rawTables = tableList.length > 0 ? tableList : SAMPLE_TABLES;

      const finalTables = rawTables.map((t, idx) => ({
        _id: t._id || t.id || `table_${t.tableNumber || t.number || idx + 1}`,
        tableNumber: Number(t.tableNumber || t.number || idx + 1),
        label: t.label || t.name || `Table ${t.tableNumber || t.number || idx + 1}`,
        seats: Number(t.seats || t.capacity || 4),
        status: t.status || 'AVAILABLE',
      }));

      setCategories(finalCats);
      setProducts(finalProds);
      setTables(finalTables);
      setHeldOrders(Array.isArray(heldRes.data?.orders) ? heldRes.data.orders : []);

      await cacheCatalog(finalCats, finalProds);
    } catch (err) {
      const cached = await getCachedCatalog().catch(() => ({ products: [], categories: [] }));
      const normalizedSampleTables = SAMPLE_TABLES.map((t, idx) => ({
        _id: t._id || `table_${t.tableNumber || idx + 1}`,
        tableNumber: Number(t.tableNumber || idx + 1),
        label: `Table ${t.tableNumber || idx + 1}`,
        seats: Number(t.capacity || 4),
        status: t.status || 'AVAILABLE',
      }));

      if (cached?.products?.length > 0) {
        setCategories(cached.categories || SAMPLE_CATEGORIES);
        setProducts(cached.products || SAMPLE_PRODUCTS);
        setTables(normalizedSampleTables);
        toast('Loaded menu from offline cache', { icon: '📦' });
      } else {
        setCategories(SAMPLE_CATEGORIES);
        setProducts(SAMPLE_PRODUCTS);
        setTables(normalizedSampleTables);
      }
    } finally {
      setLoadingCatalog(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return (products || []).filter((prod) => {
      if (!prod) return false;
      const catId = String(prod.category?._id || prod.category || '');
      if (selectedCategory !== 'ALL' && catId !== selectedCategory) {
        return false;
      }
      if (selectedStation !== 'ALL' && prod.kitchenStation !== selectedStation) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = String(prod.name || '').toLowerCase().includes(q);
        const matchesSku = String(prod.sku || '').toLowerCase().includes(q);
        return matchesName || matchesSku;
      }
      return true;
    });
  }, [products, selectedCategory, selectedStation, searchQuery]);

  // Cart Management
  const cartQuantityByProduct = useMemo(() => {
    const map = {};
    for (const item of cart) {
      map[item.productId] = (map[item.productId] || 0) + item.quantity;
    }
    return map;
  }, [cart]);

  const handleProductClick = (prod) => {
    const hasVariants = prod.variants && prod.variants.length > 0;
    const hasAddons = prod.addons && prod.addons.length > 0;

    if (hasVariants || hasAddons) {
      setActiveProductForModifier(prod);
      setSelectedVariant(hasVariants ? prod.variants[0] : null);
      setSelectedAddons([]);
      setModifierNote('');
      setModifierQty(1);
    } else {
      addToCartDirect(prod);
    }
  };

  const addToCartDirect = (prod, qty = 1, variant = null, addons = [], notes = '') => {
    const variantPrice = variant ? variant.price : prod.price;
    const addonsPrice = addons.reduce((sum, a) => sum + (a.price || 0), 0);
    const unitPrice = variantPrice + addonsPrice;

    const cartKey = `${prod._id}_${variant?._id || 'novar'}_${addons.map(a => a._id).sort().join('-')}_${notes}`;

    setCart((prev) => {
      const existingIdx = prev.findIndex(item => item.cartKey === cartKey);
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx].quantity += qty;
        updated[existingIdx].itemTotal = Number((updated[existingIdx].quantity * unitPrice).toFixed(2));
        return updated;
      }
      return [
        ...prev,
        {
          cartKey,
          productId: prod._id,
          name: prod.name,
          image: prod.image,
          unitPrice,
          quantity: qty,
          variant,
          addons,
          specialInstructions: notes,
          itemTotal: Number((qty * unitPrice).toFixed(2)),
          kitchenStation: prod.kitchenStation || 'KITCHEN',
        },
      ];
    });
  };

  const handleConfirmModifier = () => {
    if (!activeProductForModifier) return;
    addToCartDirect(
      activeProductForModifier,
      modifierQty,
      selectedVariant,
      selectedAddons,
      modifierNote
    );
    setActiveProductForModifier(null);
  };

  const updateCartQty = (cartKey, delta) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.cartKey === cartKey) {
            const newQty = item.quantity + delta;
            return newQty > 0
              ? { ...item, quantity: newQty, itemTotal: Number((newQty * item.unitPrice).toFixed(2)) }
              : null;
          }
          return item;
        })
        .filter(Boolean);
    });
  };

  const removeCartItem = (cartKey) => {
    setCart(prev => prev.filter(item => item.cartKey !== cartKey));
  };

  const clearCart = () => {
    setCart([]);
    setTableNumber('');
    setCustomerPhone('');
    setCustomerName('');
    setCustomerGstin('');
    setManualDiscount('');
    setCouponCode('');
    setOrderNotes('');
    setIsMobileCartOpen(false);
  };

  // Pricing & Tax Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.itemTotal, 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    const manual = Number(manualDiscount) || 0;
    return Math.min(manual, subtotal);
  }, [manualDiscount, subtotal]);

  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxRate = Number(tenant?.settings?.taxRate ?? 5);
  const taxAmount = Number(((taxableAmount * taxRate) / 100).toFixed(2));
  const totalAmount = Number((taxableAmount + taxAmount).toFixed(2));

  // Customer phone lookup
  const handlePhoneChange = async (val) => {
    setCustomerPhone(val);
    const clean = val.replace(/\D/g, '');
    if (clean.length === 10 && isOnline) {
      try {
        const { data } = await api.get(`/customers/lookup?phone=${clean}`).catch(() => ({ data: null }));
        if (data?.customer?.name) {
          setCustomerName(data.customer.name);
          toast.success(`Customer found: ${data.customer.name}`);
        }
      } catch (_err) {
        // Customer lookup is best effort
      }
    }
  };

  // Hold Order
  const handleHoldOrder = async () => {
    if (cart.length === 0) {
      toast.error('Add items to hold this order');
      return;
    }

    try {
      const payload = {
        tableNumber: Number(tableNumber) || 0,
        orderType,
        customer: { name: customerName, phone: customerPhone },
        items: cart.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          variantId: item.variant?._id,
          addonIds: item.addons.map(a => a._id),
          specialInstructions: item.specialInstructions,
        })),
        notes: orderNotes,
      };

      const { data } = await api.post('/pos/orders/hold', payload);
      setHeldOrders(prev => [data.order, ...prev]);
      clearCart();
      toast.success('Order held on station');
    } catch (err) {
      toast.error(err.message || 'Failed to hold order');
    }
  };

  // Resume Held Order
  const handleResumeHeldOrder = (held) => {
    setOrderType(held.orderType || 'counter');
    setTableNumber(held.tableNumber ? String(held.tableNumber) : '');
    setCustomerName(held.customer?.name || '');
    setCustomerPhone(held.customer?.phone || '');
    setOrderNotes(held.notes || '');

    const restoredCart = (held.items || []).map(item => ({
      cartKey: `${item.product?._id || item.product}_${Date.now()}_${Math.random()}`,
      productId: item.product?._id || item.product,
      name: item.name,
      image: item.image,
      unitPrice: item.price,
      quantity: item.quantity,
      variant: item.variant,
      addons: item.addons || [],
      specialInstructions: item.specialInstructions || '',
      itemTotal: item.itemTotal || (item.price * item.quantity),
      kitchenStation: 'KITCHEN',
    }));

    setCart(restoredCart);
    setShowHeldModal(false);
    api.delete(`/pos/held-orders/${held._id}`).catch(() => {});
    setHeldOrders(prev => prev.filter(o => o._id !== held._id));
    toast.success('Held order resumed');
  };

  // Submit Order & Process Payment
  const handleCheckout = async (paymentMethod, splitPayments = []) => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    if (orderType === 'dine_in' && !tableNumber) {
      toast.error('Please select a Table for Dine-in');
      return;
    }

    setProcessingOrder(true);
    const syncId = `pos_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const orderPayload = {
      tableNumber: Number(tableNumber) || 0,
      orderType,
      customer: {
        name: customerName || 'Walk-in Customer',
        phone: customerPhone || '9999999999',
      },
      customerGstin: (customerGstin || '').trim().toUpperCase(),
      items: cart.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        variantId: item.variant?._id,
        addonIds: item.addons.map(a => a._id),
        specialInstructions: item.specialInstructions,
      })),
      paymentMethod,
      splitPayments,
      manualDiscount: discountAmount,
      couponCode,
      notes: orderNotes,
      autoComplete: true,
      isPaid: true,
      syncId,
    };

    if (!isOnline) {
      try {
        await saveOfflineOrder(orderPayload);
        await checkPendingOfflineQueue();
        toast.success('Order saved locally! Will sync when reconnected.', { icon: '💾' });
        clearCart();
      } catch (err) {
        toast.error('Failed to store offline order: ' + err.message);
      } finally {
        setProcessingOrder(false);
      }
      return;
    }

    try {
      const { data } = await api.post('/pos/orders', orderPayload);
      toast.success(`Order #${data.order.orderNumber} confirmed!`, { icon: '✅' });
      setLastReceipt(data.receipt || { order: data.order });
      setShowReceiptModal(true);
      setShowCashModal(false);
      clearCart();
    } catch (err) {
      if (user?._id?.startsWith('demo') || err.response?.status === 401 || err.response?.status === 404 || !err.response) {
        const demoOrderNumber = Math.floor(1000 + Math.random() * 9000);
        const demoOrder = {
          _id: `ord_local_${Date.now()}`,
          orderNumber: demoOrderNumber,
          orderType,
          tableNumber: Number(tableNumber) || null,
          items: cart.map(i => ({
            name: i.name,
            quantity: i.quantity,
            price: i.unitPrice,
            itemTotal: i.itemTotal,
            variant: i.variant,
            addons: i.addons,
          })),
          subtotal,
          taxAmount,
          totalAmount,
          discountAmount,
          paymentMethod,
          createdAt: new Date().toISOString(),
          customer: {
            name: customerName || 'Walk-in Customer',
            phone: customerPhone || '9999999999',
          },
        };
        toast.success(`Order #${demoOrderNumber} confirmed!`, { icon: '✅' });
        setLastReceipt({ order: demoOrder });
        setShowReceiptModal(true);
        setShowCashModal(false);
        clearCart();
      } else {
        const msg = (typeof err.response?.data?.error === 'string' ? err.response.data.error : err.response?.data?.error?.message) || err.message || 'Checkout failed';
        toast.error(msg);
      }
    } finally {
      setProcessingOrder(false);
    }
  };

  // Trigger Cash Modal
  const openCashKeypad = () => {
    if (cart.length === 0) {
      toast.error('Add items to order first');
      return;
    }
    setCashTendered(String(totalAmount));
    setShowCashModal(true);
  };

  const handleKeypadPress = (val) => {
    if (val === 'C') {
      setCashTendered('');
      return;
    }
    if (val === 'BACK') {
      setCashTendered(prev => prev.slice(0, -1));
      return;
    }
    if (val === '.' && cashTendered.includes('.')) return;
    setCashTendered(prev => prev + val);
  };

  const tenderedNum = Number(cashTendered) || 0;
  const changeDue = Math.max(0, tenderedNum - totalAmount);

  // Handle Split Payment Submit
  const handleConfirmSplitPayment = () => {
    const cash = Number(splitCashAmount) || 0;
    const upi = Number(splitUpiAmount) || 0;
    const card = Number(splitCardAmount) || 0;
    const splitSum = cash + upi + card;

    if (Math.abs(splitSum - totalAmount) > 0.01) {
      toast.error(`Split amounts (${currency}${splitSum}) must equal total (${currency}${totalAmount})`);
      return;
    }

    const splits = [];
    if (cash > 0) splits.push({ method: 'cash', amount: cash });
    if (upi > 0) splits.push({ method: 'upi', amount: upi });
    if (card > 0) splits.push({ method: 'card', amount: card });

    setShowSplitModal(false);
    handleCheckout('split', splits);
  };

  // Reusable Order Panel Contents (rendered persistent on tablet/desktop, in bottom sheet on mobile)
  const renderOrderPanel = () => (
    <div className="flex flex-col h-full overflow-hidden bg-pos-surface text-pos-text select-none">
      {/* ── Order Header & Mode Selector ──────────────────────── */}
      <div className="p-4 border-b border-pos-border bg-pos-raised/40 space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <span className="font-display font-bold text-sm tracking-tight text-pos-text">
            Current Ticket
          </span>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs font-semibold text-pos-danger hover:underline touch-press min-h-[32px] px-2 flex items-center gap-1"
            >
              <Trash2 size={13} /> Clear
            </button>
          )}
        </div>

        {/* Table & Customer Inputs */}
        <div className="grid grid-cols-2 gap-2">
          {orderType === 'dine_in' ? (
            <div>
              <label className="text-[10px] font-bold uppercase text-pos-muted block mb-1">
                Table *
              </label>
              <select
                value={tableNumber}
                onChange={e => setTableNumber(e.target.value)}
                className="w-full bg-pos-surface border border-pos-border rounded-xl py-2 px-2.5 text-xs font-bold text-pos-text focus:outline-none focus:border-pos-accent min-h-[44px]"
              >
                <option value="">Choose Table</option>
                {(tables || []).map((t, idx) => {
                  const num = t.tableNumber || t.number || (idx + 1);
                  return (
                    <option key={t._id || `tbl_${num}`} value={num} className="bg-pos-surface text-pos-text">
                      {t.label || `Table ${num}`} ({t.seats || 4} Seats)
                    </option>
                  );
                })}
              </select>
            </div>
          ) : (
            <div>
              <label className="text-[10px] font-bold uppercase text-pos-muted block mb-1">
                Mode
              </label>
              <div className="w-full bg-pos-raised border border-pos-border rounded-xl py-2 px-2.5 text-xs font-bold text-pos-text capitalize truncate min-h-[44px] flex items-center">
                {(orderType || 'counter').replace('_', ' ')}
              </div>
            </div>
          )}

          <div>
            <label className="text-[10px] font-bold uppercase text-pos-muted block mb-1">
              Customer Mobile
            </label>
            <div className="relative">
              <Phone size={13} className="absolute left-3 top-3 text-pos-muted pointer-events-none" />
              <input
                type="tel"
                maxLength={10}
                placeholder="Phone"
                value={customerPhone}
                onChange={e => handlePhoneChange(e.target.value)}
                className="w-full bg-pos-surface border border-pos-border rounded-xl py-2 pl-8 pr-2 text-xs font-semibold text-pos-text placeholder:text-pos-muted/60 focus:outline-none focus:border-pos-accent min-h-[44px]"
              />
            </div>
          </div>
        </div>

        {customerName && (
          <div className="flex items-center gap-1.5 text-xs text-pos-success font-semibold bg-pos-success/10 border border-pos-success/30 px-2.5 py-1.5 rounded-xl">
            <Check size={13} />
            <span className="truncate">Customer: {customerName}</span>
          </div>
        )}
      </div>

      {/* ── Cart Line Items List ──────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 pos-scrollbar">
        {cart.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="Ticket is empty"
            description="Tap items from the menu to build the order."
            className="my-auto py-10"
          />
        ) : (
          cart.map((item) => (
            <div
              key={item.cartKey}
              className="bg-pos-raised border border-pos-border rounded-2xl p-3 space-y-2 shadow-xs transition-colors hover:border-pos-accent/40"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-sm text-pos-text leading-tight truncate">
                    {item.name}
                  </div>
                  {item.variant && (
                    <div className="text-xs text-pos-accent font-medium mt-0.5">
                      Size: {item.variant.name}
                    </div>
                  )}
                  {item.addons && item.addons.length > 0 && (
                    <div className="text-[11px] text-pos-muted mt-0.5">
                      +{item.addons.map(a => a.name).join(', ')}
                    </div>
                  )}
                  {item.specialInstructions && (
                    <div className="text-[11px] text-pos-warning italic mt-0.5">
                      "{item.specialInstructions}"
                    </div>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <span className="font-bold text-sm text-pos-text tabular-nums">
                    {formatMoney(item.itemTotal, currency)}
                  </span>
                </div>
              </div>

              {/* Stepper & Line Delete */}
              <div className="flex items-center justify-between pt-1.5 border-t border-pos-border/60">
                <QuantityStepper
                  quantity={item.quantity}
                  onDecrease={() => updateCartQty(item.cartKey, -1)}
                  onIncrease={() => updateCartQty(item.cartKey, 1)}
                />
                <button
                  onClick={() => removeCartItem(item.cartKey)}
                  aria-label={`Remove ${item.name}`}
                  className="p-2 text-pos-muted hover:text-pos-danger rounded-xl hover:bg-pos-surface touch-press transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Pricing Breakdown & Sticky Charge CTA ─────────────── */}
      <div className="p-4 bg-pos-surface border-t border-pos-border space-y-3 shrink-0 shadow-elevation2">
        {/* Quick Discounts */}
        <div className="flex items-center gap-1.5 text-xs overflow-x-auto pb-0.5">
          <span className="text-pos-muted font-semibold text-[11px] shrink-0">Discount:</span>
          {[
            { label: '5%', val: Math.round(subtotal * 0.05) },
            { label: '10%', val: Math.round(subtotal * 0.10) },
            { label: `${currency}50`, val: 50 },
          ].map((d, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setManualDiscount(String(d.val))}
              className="px-2.5 py-1 rounded-lg bg-pos-raised text-pos-text hover:bg-pos-border border border-pos-border/80 font-bold text-[11px] touch-press min-h-[32px]"
            >
              {d.label}
            </button>
          ))}
          {discountAmount > 0 && (
            <button
              onClick={() => setManualDiscount('')}
              className="text-pos-danger font-bold text-[11px] ml-auto hover:underline"
            >
              Reset
            </button>
          )}
        </div>

        {/* Breakdown */}
        <div className="space-y-1.5 text-xs text-pos-muted">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="tabular-nums font-semibold text-pos-text">{formatMoney(subtotal, currency)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-pos-success font-semibold">
              <span>Discount</span>
              <span className="tabular-nums">-{formatMoney(discountAmount, currency)}</span>
            </div>
          )}
          <div className="flex justify-between text-[11px]">
            <span>GST / Tax ({taxRate}%)</span>
            <span className="tabular-nums">+{formatMoney(taxAmount, currency)}</span>
          </div>
          <div className="flex justify-between items-baseline pt-2 border-t border-pos-border">
            <span className="font-display font-bold text-base text-pos-text">Total Payable</span>
            <span className="font-display font-extrabold text-2xl text-pos-accent tabular-nums">
              {formatMoney(totalAmount, currency)}
            </span>
          </div>
        </div>

        {/* Master Sticky Charge Action (56px tall) */}
        <Button
          variant="primary"
          size="lg"
          onClick={openCashKeypad}
          disabled={cart.length === 0 || processingOrder}
          className="w-full flex items-center justify-between px-5 font-bold tracking-wide"
        >
          <span className="uppercase tracking-wider text-xs font-extrabold text-pos-bg/90">Pay Now</span>
          <span className="text-lg font-bold tabular-nums">Charge {formatMoney(totalAmount, currency)} →</span>
        </Button>

        {/* 4 Large Payment Method Buttons (min 48px) */}
        <div className="grid grid-cols-4 gap-2">
          <button
            type="button"
            onClick={openCashKeypad}
            disabled={cart.length === 0 || processingOrder}
            className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-pos-raised hover:bg-pos-raised/80 text-pos-success border border-pos-border hover:border-pos-success touch-press disabled:opacity-40 min-h-[50px]"
          >
            <Banknote size={18} />
            <span className="text-[11px] font-bold mt-1 text-pos-text">Cash</span>
          </button>
          <button
            type="button"
            onClick={() => handleCheckout('upi')}
            disabled={cart.length === 0 || processingOrder}
            className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-pos-raised hover:bg-pos-raised/80 text-purple-400 border border-pos-border hover:border-purple-400 touch-press disabled:opacity-40 min-h-[50px]"
          >
            <QrCode size={18} />
            <span className="text-[11px] font-bold mt-1 text-pos-text">UPI</span>
          </button>
          <button
            type="button"
            onClick={() => handleCheckout('card')}
            disabled={cart.length === 0 || processingOrder}
            className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-pos-raised hover:bg-pos-raised/80 text-blue-400 border border-pos-border hover:border-blue-400 touch-press disabled:opacity-40 min-h-[50px]"
          >
            <CreditCard size={18} />
            <span className="text-[11px] font-bold mt-1 text-pos-text">Card</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setSplitCashAmount('');
              setSplitUpiAmount('');
              setSplitCardAmount('');
              setShowSplitModal(true);
            }}
            disabled={cart.length === 0 || processingOrder}
            className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-pos-raised hover:bg-pos-raised/80 text-pos-warning border border-pos-border hover:border-pos-warning touch-press disabled:opacity-40 min-h-[50px]"
          >
            <Split size={18} />
            <span className="text-[11px] font-bold mt-1 text-pos-text">Split</span>
          </button>
        </div>

        {/* Hold Action */}
        <div className="pt-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleHoldOrder}
            disabled={cart.length === 0}
            className="w-full text-xs text-pos-muted hover:text-pos-text border border-pos-border hover:border-pos-accent"
          >
            Hold Order for Later
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full flex-1 overflow-hidden bg-pos-bg text-pos-text">
      {/* ── Station & Order Type Subheader ──────────────────────────── */}
      <div className="bg-pos-surface border-b border-pos-border px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 overflow-x-auto pos-scrollbar py-0.5">
          {/* Order Type Pills */}
          <div className="flex bg-pos-raised rounded-xl p-1 border border-pos-border shrink-0">
            {ORDER_TYPES.map(type => (
              <button
                key={type.id}
                type="button"
                onClick={() => setOrderType(type.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap min-h-[36px] touch-press ${
                  orderType === type.id
                    ? 'bg-pos-accent text-pos-bg shadow-sm'
                    : 'text-pos-muted hover:text-pos-text'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>

          {/* Held Orders Quick Launcher */}
          {heldOrders.length > 0 && (
            <button
              type="button"
              onClick={() => setShowHeldModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-pos-warning text-pos-bg shadow-sm hover:bg-pos-warning/90 transition min-h-[36px] touch-press shrink-0"
            >
              <PauseCircle size={15} />
              <span>{heldOrders.length} Held</span>
            </button>
          )}
        </div>

        {/* Connectivity Status */}
        <div className="flex items-center gap-2 text-xs shrink-0">
          {pendingSyncCount > 0 ? (
            <button
              type="button"
              onClick={syncPendingOfflineOrders}
              disabled={syncingOffline || !isOnline}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-pos-warning/20 text-pos-warning border border-pos-warning/40 hover:bg-pos-warning/30 transition min-h-[36px] touch-press"
            >
              <RefreshCw size={13} className={syncingOffline ? 'animate-spin' : ''} />
              <span>{pendingSyncCount} queued (Sync)</span>
            </button>
          ) : !isOnline ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-pos-danger/20 text-pos-danger border border-pos-danger/40 animate-pulse min-h-[36px]">
              <WifiOff size={13} />
              <span>OFFLINE</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-pos-success/20 text-pos-success border border-pos-success/40 min-h-[36px]">
              <Wifi size={13} />
              <span>ONLINE</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Main Two-Pane POS Shell ─────────────────────────────────── */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* LEFT PANE: Search + Category Chips + Product Grid ────────── */}
        <div className="flex-1 flex flex-col min-w-0 bg-pos-bg overflow-hidden">
          {/* Search & Station Selector Header */}
          <div className="p-3.5 bg-pos-surface border-b border-pos-border flex flex-col sm:flex-row gap-3 shrink-0">
            <div className="flex-1">
              <SearchInput
                placeholder="Search dish, ingredients or SKU (e.g. Latte, Croissant)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery('')}
              />
            </div>

            {/* Station Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pos-scrollbar py-0.5 shrink-0">
              {STATIONS.map(st => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setSelectedStation(st)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors touch-press min-h-[44px] ${
                    selectedStation === st
                      ? 'bg-pos-raised text-pos-accent border-pos-accent'
                      : 'bg-pos-surface text-pos-muted border-pos-border hover:border-pos-muted'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Horizontally Scrollable Category Chips */}
          <div className="px-3.5 py-2.5 bg-pos-surface/60 border-b border-pos-border flex items-center gap-2 overflow-x-auto pos-scrollbar shrink-0">
            <CategoryChip
              name="All Menu"
              count={products.length}
              isActive={selectedCategory === 'ALL'}
              onClick={() => setSelectedCategory('ALL')}
            />
            {loadingCatalog ? (
              <>
                <CategoryChipSkeleton />
                <CategoryChipSkeleton />
                <CategoryChipSkeleton />
              </>
            ) : (
              categories.map(cat => {
                const catId = String(cat._id || cat.id || cat);
                const count = products.filter(p => String(p?.category?._id || p?.category || '') === catId).length;
                return (
                  <CategoryChip
                    key={catId}
                    name={cat.name || String(cat)}
                    icon={cat.icon}
                    count={count}
                    isActive={selectedCategory === catId}
                    onClick={() => setSelectedCategory(catId)}
                  />
                );
              })
            )}
          </div>

          {/* Product Cards Responsive Grid (auto-fill, min 150px) */}
          <div className="flex-1 overflow-y-auto p-4 grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-3.5 auto-rows-max pos-scrollbar">
            {loadingCatalog ? (
              Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)
            ) : catalogError ? (
              <div className="col-span-full py-12">
                <ErrorState
                  title="Catalog could not be loaded"
                  message={catalogError}
                  onRetry={loadInitialData}
                />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="col-span-full py-16">
                <EmptyState
                  icon={UtensilsCrossed}
                  title="No items found"
                  description="Try adjusting your search query or station filter."
                  actionLabel="Clear Filters"
                  onAction={() => {
                    setSearchQuery('');
                    setSelectedCategory('ALL');
                    setSelectedStation('ALL');
                  }}
                />
              </div>
            ) : (
              filteredProducts.map(prod => (
                <ProductCard
                  key={prod._id}
                  product={prod}
                  currency={currency}
                  cartQuantity={cartQuantityByProduct[prod._id] || 0}
                  onClick={() => handleProductClick(prod)}
                />
              ))
            )}
          </div>

          {/* Mobile Bottom Summary Bar (< 768px) */}
          <div className="md:hidden p-3 bg-pos-surface border-t border-pos-border flex items-center justify-between gap-3 shrink-0 shadow-elevation2">
            <div>
              <span className="text-[11px] font-bold text-pos-muted uppercase block">
                {cart.length} Item{cart.length === 1 ? '' : 's'}
              </span>
              <span className="font-display font-extrabold text-xl text-pos-accent tabular-nums">
                {formatMoney(totalAmount, currency)}
              </span>
            </div>
            <Button
              variant="primary"
              size="lg"
              onClick={() => setIsMobileCartOpen(true)}
              disabled={cart.length === 0}
              className="flex-1 max-w-[200px]"
            >
              View Order →
            </Button>
          </div>
        </div>

        {/* RIGHT PANE: Persistent Order Panel (360-400px on desktop/tablet) */}
        <aside className="hidden md:flex w-96 shrink-0 border-l border-pos-border bg-pos-surface flex-col h-full shadow-elevation1">
          {renderOrderPanel()}
        </aside>
      </div>

      {/* ── Mobile Order Panel Bottom Sheet (< 768px) ─────────────── */}
      <Modal
        isOpen={isMobileCartOpen}
        onClose={() => setIsMobileCartOpen(false)}
        title="Current Ticket"
        maxWidth="max-w-md"
        className="h-[85vh]"
      >
        <div className="h-full flex flex-col -m-5">
          {renderOrderPanel()}
        </div>
      </Modal>

      {/* ── 1. Modifiers Bottom Sheet / Modal ──────────────────────── */}
      <Modal
        isOpen={Boolean(activeProductForModifier)}
        onClose={() => setActiveProductForModifier(null)}
        title={activeProductForModifier?.name}
        subtitle="Choose variant and optional add-ons"
        footer={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <QuantityStepper
                quantity={modifierQty}
                onDecrease={() => setModifierQty(q => Math.max(1, q - 1))}
                onIncrease={() => setModifierQty(q => q + 1)}
              />
            </div>
            <Button
              variant="primary"
              size="lg"
              onClick={handleConfirmModifier}
              className="flex-1"
            >
              Add to Ticket
            </Button>
          </div>
        }
      >
        {activeProductForModifier && (
          <div className="space-y-5">
            {/* Variants */}
            {activeProductForModifier.variants?.length > 0 && (
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-pos-muted block mb-2">
                  Select Size / Variant
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {activeProductForModifier.variants.map((v) => {
                    const isSelected = selectedVariant?._id === v._id;
                    return (
                      <button
                        key={v._id || v.name}
                        type="button"
                        onClick={() => setSelectedVariant(v)}
                        className={`p-3 rounded-xl border text-left transition-colors touch-press min-h-[50px] ${
                          isSelected
                            ? 'bg-pos-raised border-pos-accent text-pos-text shadow-xs'
                            : 'bg-pos-surface border-pos-border text-pos-muted hover:border-pos-muted'
                        }`}
                      >
                        <div className="font-bold text-sm text-pos-text">{v.name}</div>
                        <div className="text-xs font-semibold text-pos-accent tabular-nums">
                          {formatMoney(v.price, currency)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Addons */}
            {activeProductForModifier.addons?.length > 0 && (
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-pos-muted block mb-2">
                  Extra Add-ons
                </span>
                <div className="space-y-1.5">
                  {activeProductForModifier.addons.map((addon) => {
                    const isChecked = selectedAddons.some(a => a._id === addon._id);
                    return (
                      <button
                        key={addon._id || addon.name}
                        type="button"
                        onClick={() => {
                          setSelectedAddons(prev =>
                            isChecked ? prev.filter(a => a._id !== addon._id) : [...prev, addon]
                          );
                        }}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border transition-colors touch-press min-h-[48px] ${
                          isChecked
                            ? 'bg-pos-raised border-pos-accent text-pos-text'
                            : 'bg-pos-surface border-pos-border text-pos-muted hover:border-pos-muted'
                        }`}
                      >
                        <span className="font-semibold text-xs text-pos-text">{addon.name}</span>
                        <span className="text-xs font-bold text-pos-accent tabular-nums">
                          +{formatMoney(addon.price, currency)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Special Instructions Note */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-pos-muted block mb-1.5">
                Special Instructions
              </label>
              <Input
                placeholder="e.g. Extra hot, oat milk, less ice..."
                value={modifierNote}
                onChange={e => setModifierNote(e.target.value)}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* ── 2. Cash Payment Keypad Modal ───────────────────────────── */}
      <Modal
        isOpen={showCashModal}
        onClose={() => setShowCashModal(false)}
        title="Cash Payment Tender"
        subtitle="Quick cash amounts & change calculation"
        maxWidth="max-w-md"
        footer={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setShowCashModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="lg"
              disabled={tenderedNum < totalAmount || processingOrder}
              onClick={() => handleCheckout('cash')}
              className="flex-1 font-bold"
            >
              {processingOrder ? 'Processing...' : 'Complete Payment'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Due & Tendered Display */}
          <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-pos-raised border border-pos-border">
            <div>
              <span className="text-[10px] uppercase font-bold text-pos-muted block">Total Due</span>
              <span className="font-display font-extrabold text-2xl text-pos-accent tabular-nums">
                {formatMoney(totalAmount, currency)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-pos-muted block">Tendered</span>
              <span className="font-display font-extrabold text-2xl text-pos-text tabular-nums">
                {currency}{cashTendered || '0'}
              </span>
            </div>
          </div>

          {/* Change Calculation */}
          <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
            tenderedNum >= totalAmount
              ? 'bg-pos-success/10 border-pos-success/40 text-pos-success'
              : 'bg-pos-surface border-pos-border text-pos-muted'
          }`}>
            <span className="font-bold text-xs uppercase tracking-wider">
              {tenderedNum >= totalAmount ? 'Change Due to Customer' : 'Remaining Due'}
            </span>
            <span className="font-display font-extrabold text-xl tabular-nums">
              {formatMoney(tenderedNum >= totalAmount ? changeDue : totalAmount - tenderedNum, currency)}
            </span>
          </div>

          {/* Quick Amount Chips */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-pos-muted block mb-2">
              Quick Cash Presets
            </span>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setCashTendered(String(totalAmount))}
                className="py-2.5 px-2 rounded-xl bg-pos-surface hover:bg-pos-raised border border-pos-border hover:border-pos-accent text-pos-text font-bold text-xs touch-press min-h-[44px]"
              >
                Exact
              </button>
              {[100, 200, 500, 1000, 2000].map(amt => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setCashTendered(String(amt))}
                  className="py-2.5 px-2 rounded-xl bg-pos-surface hover:bg-pos-raised border border-pos-border hover:border-pos-accent text-pos-text font-bold text-xs touch-press min-h-[44px]"
                >
                  {currency}{amt}
                </button>
              ))}
            </div>
          </div>

          {/* On-Screen Numeric Keypad */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'BACK'].map(k => (
              <button
                key={k}
                type="button"
                onClick={() => handleKeypadPress(k)}
                className="py-3 rounded-xl bg-pos-surface hover:bg-pos-raised border border-pos-border text-pos-text font-bold text-lg touch-press min-h-[48px] flex items-center justify-center transition-colors"
              >
                {k === 'BACK' ? <Delete size={20} className="text-pos-muted" /> : k}
              </button>
            ))}
          </div>
        </div>
      </Modal>

      {/* ── 3. Split Payment Modal ─────────────────────────────────── */}
      <Modal
        isOpen={showSplitModal}
        onClose={() => setShowSplitModal(false)}
        title="Split Payment"
        subtitle={`Total to split: ${formatMoney(totalAmount, currency)}`}
        footer={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setShowSplitModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="lg"
              onClick={handleConfirmSplitPayment}
              className="flex-1 font-bold"
            >
              Confirm Split
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-pos-muted block mb-1">Cash Amount ({currency})</label>
            <Input
              type="number"
              placeholder="0.00"
              value={splitCashAmount}
              onChange={e => setSplitCashAmount(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-pos-muted block mb-1">UPI Amount ({currency})</label>
            <Input
              type="number"
              placeholder="0.00"
              value={splitUpiAmount}
              onChange={e => setSplitUpiAmount(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-pos-muted block mb-1">Card Amount ({currency})</label>
            <Input
              type="number"
              placeholder="0.00"
              value={splitCardAmount}
              onChange={e => setSplitCardAmount(e.target.value)}
            />
          </div>

          <div className="p-3 rounded-xl bg-pos-raised border border-pos-border text-xs flex justify-between font-bold">
            <span>Entered: {currency}{(Number(splitCashAmount) || 0) + (Number(splitUpiAmount) || 0) + (Number(splitCardAmount) || 0)}</span>
            <span className="text-pos-accent">Remaining: {currency}{Math.max(0, totalAmount - ((Number(splitCashAmount) || 0) + (Number(splitUpiAmount) || 0) + (Number(splitCardAmount) || 0)))}</span>
          </div>
        </div>
      </Modal>

      {/* ── 4. Held Orders Modal ───────────────────────────────────── */}
      <Modal
        isOpen={showHeldModal}
        onClose={() => setShowHeldModal(false)}
        title="Held Orders"
        subtitle={`${heldOrders.length} ticket(s) paused on station`}
      >
        <div className="space-y-2.5">
          {heldOrders.length === 0 ? (
            <EmptyState
              icon={PauseCircle}
              title="No held orders"
              description="Orders held during checkout will show up here."
            />
          ) : (
            heldOrders.map((held) => (
              <div
                key={held._id}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-pos-raised border border-pos-border"
              >
                <div>
                  <div className="font-bold text-sm text-pos-text">
                    Order #{held.orderNumber || held._id.slice(-4)}
                  </div>
                  <div className="text-xs text-pos-muted mt-0.5">
                    {held.items?.length || 0} items • {held.orderType || 'counter'}
                    {held.tableNumber ? ` • Table ${held.tableNumber}` : ''}
                  </div>
                  <div className="text-xs font-bold text-pos-accent tabular-nums mt-1">
                    {formatMoney(held.totalAmount || held.total || 0, currency)}
                  </div>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleResumeHeldOrder(held)}
                >
                  Resume Ticket
                </Button>
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* ── 5. Receipt Confirmation Modal ──────────────────────────── */}
      <Modal
        isOpen={showReceiptModal && Boolean(lastReceipt)}
        onClose={() => setShowReceiptModal(false)}
        title="Order Confirmed"
        subtitle="Receipt generated successfully"
        maxWidth="max-w-md"
        showClose={false}
        footer={
          <div className="flex flex-col gap-2.5">
            {/* One-Tap 56px "New Order" Button */}
            <Button
              variant="primary"
              size="lg"
              onClick={() => {
                setShowReceiptModal(false);
                setLastReceipt(null);
                clearCart();
              }}
              className="w-full text-base font-bold shadow-elevation1"
            >
              Start New Order →
            </Button>

            <Button
              variant="secondary"
              size="md"
              icon={Printer}
              onClick={() => window.print()}
              className="w-full"
            >
              Print Receipt
            </Button>
          </div>
        }
      >
        {lastReceipt && (
          <div className="text-center space-y-4 py-2">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-pos-success/10 text-pos-success mx-auto border border-pos-success/30">
              <CheckCircle2 size={36} />
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-pos-muted">Order Ticket</span>
              <h3 className="font-display font-extrabold text-3xl text-pos-text mt-1">
                #{lastReceipt.order?.orderNumber}
              </h3>
            </div>

            <div className="p-4 rounded-2xl bg-pos-raised border border-pos-border text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-pos-muted">Payment Method:</span>
                <span className="font-bold text-pos-text uppercase">{lastReceipt.order?.paymentMethod || 'Paid'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-pos-muted">Order Type:</span>
                <span className="font-bold text-pos-text capitalize">{lastReceipt.order?.orderType || 'Counter'}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-pos-border text-sm font-bold text-pos-text">
                <span>Total Paid:</span>
                <span className="text-pos-accent font-extrabold tabular-nums">
                  {formatMoney(lastReceipt.order?.total || lastReceipt.order?.totalAmount || 0, currency)}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
