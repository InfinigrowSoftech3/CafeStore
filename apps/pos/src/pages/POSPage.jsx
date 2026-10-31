import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  ShoppingCart,
  Trash2,
  PauseCircle,
  Receipt,
  UtensilsCrossed,
  Plus,
  Minus,
  Check,
  Zap,
  ShoppingBag,
  Bike,
  Users,
  LayoutGrid,
  RefreshCw,
  AlertCircle,
  Wifi,
  WifiOff,
  Clock,
  Sparkles,
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
  updateOfflineOrderStatus,
  cacheCatalog,
  getCachedCatalog,
} from '../utils/posOfflineStorage';
import {
  SAMPLE_CATEGORIES,
  SAMPLE_PRODUCTS,
  SAMPLE_TABLES,
} from '../data/sampleCatalog';

// UI & Modular POS Components
import POSHeader from '../components/POSHeader';
import POSSidebar from '../components/POSSidebar';
import CheckoutPanel from '../components/CheckoutPanel';
import ProductModifierModal from '../components/ProductModifierModal';
import CashPaymentModal from '../components/CashPaymentModal';
import SplitPaymentModal from '../components/SplitPaymentModal';
import HeldOrdersModal from '../components/HeldOrdersModal';
import RecentOrdersModal from '../components/RecentOrdersModal';
import TablesFloorModal from '../components/TablesFloorModal';
import CustomersModal from '../components/CustomersModal';
import ShiftReportsModal from '../components/ShiftReportsModal';
import StationSettingsModal from '../components/StationSettingsModal';
import ScanQrModal from '../components/ScanQrModal';
import ReceiptModal from '../components/ReceiptModal';

import {
  CategoryChip,
  ProductCard,
  SearchInput,
  Button,
  ProductCardSkeleton,
  CategoryChipSkeleton,
  EmptyState,
  ErrorState,
  Modal,
} from '../components/ui';

const STATIONS = ['ALL', 'KITCHEN', 'BAR', 'BAKERY', 'DESSERT'];
const ORDER_MODES = [
  { id: 'counter', label: 'Counter', icon: Zap },
  { id: 'dine_in', label: 'Dine-in', icon: UtensilsCrossed },
  { id: 'takeaway', label: 'Takeaway', icon: ShoppingBag },
  { id: 'delivery', label: 'Delivery', icon: Bike },
];

// Synthesized audio feedback (No external asset dependency)
function playCashRegisterChime() {
  try {
    const soundEnabled = localStorage.getItem('pos:soundEnabled') !== 'false';
    if (!soundEnabled) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now); // A5
    osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.2); // D6

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.45);
    osc2.stop(now + 0.45);
  } catch (_e) {
    // Best-effort audio chime
  }
}

export default function POSPage({ onLogout, user: propUser }) {
  const { user: authUser, logout } = useAuth();
  const user = propUser || authUser;
  const tenant = useTenant();
  const currency = tenant?.currency || '₹';

  const searchInputRef = useRef(null);

  // ── Layout & Responsive States ──────────────────────────────────
  const [activeNav, setActiveNav] = useState('counter');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // ── Catalog State ───────────────────────────────────────────────
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStation, setSelectedStation] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState(null);

  // ── Current Ticket / Cart State ─────────────────────────────────
  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState('counter');
  const [tableNumber, setTableNumber] = useState('');
  const [tables, setTables] = useState([]);
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [manualDiscount, setManualDiscount] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  // ── Modals State ────────────────────────────────────────────────
  const [activeProductForModifier, setActiveProductForModifier] = useState(null);
  const [showCashModal, setShowCashModal] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [showHeldModal, setShowHeldModal] = useState(false);
  const [showRecentOrdersModal, setShowRecentOrdersModal] = useState(false);
  const [showTablesModal, setShowTablesModal] = useState(false);
  const [showCustomersModal, setShowCustomersModal] = useState(false);
  const [showShiftReportsModal, setShowShiftReportsModal] = useState(false);
  const [showStationSettingsModal, setShowStationSettingsModal] = useState(false);
  const [showScanQrModal, setShowScanQrModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastReceipt, setLastReceipt] = useState(null);

  // ── Held Orders & Sync ──────────────────────────────────────────
  const [heldOrders, setHeldOrders] = useState([]);
  const [processingOrder, setProcessingOrder] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);
  const [activeCheckoutSyncId, setActiveCheckoutSyncId] = useState(null);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [syncingOffline, setSyncingOffline] = useState(false);

  // ── Online / Offline Synchronization Listener ────────────────────
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Internet connection restored. Synchronizing station queue...');
      syncPendingOfflineOrders();
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.error('Station in Offline Mode. Sales are saved locally and will auto-sync.');
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
      // Best-effort
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
        toast.success(`Successfully synced ${data.synced.length} offline orders!`);
      }
      if (data.failed && data.failed.length > 0) {
        for (const failItem of data.failed) {
          if (failItem.syncId) {
            await updateOfflineOrderStatus(failItem.syncId, {
              status: 'sync_failed',
              lastError: failItem.error || 'Sync validation error',
              errorCode: failItem.code || 'SYNC_ERROR',
            });
          }
        }
      }
      await checkPendingOfflineQueue();
    } catch (err) {
      console.warn('[POS Offline Sync]:', err.message);
    } finally {
      setSyncingOffline(false);
    }
  };

  // ── Load Menu, Tables & Held Orders ─────────────────────────────
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

  // ── Keyboard Shortcuts (Section 18) ─────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl + K or Cmd + K: Focus product search
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchEl = document.querySelector('input[placeholder*="Search"]');
        if (searchEl) searchEl.focus();
      }

      // Escape: Close any open modal or clear search
      if (e.key === 'Escape') {
        if (activeProductForModifier) setActiveProductForModifier(null);
        else if (showCashModal) setShowCashModal(false);
        else if (showSplitModal) setShowSplitModal(false);
        else if (showHeldModal) setShowHeldModal(false);
        else if (showRecentOrdersModal) setShowRecentOrdersModal(false);
        else if (showTablesModal) setShowTablesModal(false);
        else if (showCustomersModal) setShowCustomersModal(false);
        else if (showShiftReportsModal) setShowShiftReportsModal(false);
        else if (showStationSettingsModal) setShowStationSettingsModal(false);
        else if (showScanQrModal) setShowScanQrModal(false);
        else if (showReceiptModal) setShowReceiptModal(false);
        else if (searchQuery) setSearchQuery('');
      }

      // Ctrl + Enter: Quick checkout with cash keypad if cart is valid
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (cart.length > 0 && !processingOrder) {
          setShowCashModal(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeProductForModifier,
    showCashModal,
    showSplitModal,
    showHeldModal,
    showRecentOrdersModal,
    showTablesModal,
    showCustomersModal,
    showShiftReportsModal,
    showStationSettingsModal,
    showScanQrModal,
    showReceiptModal,
    searchQuery,
    cart.length,
    processingOrder,
  ]);

  // ── Filter Products ─────────────────────────────────────────────
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
        const matchesDesc = String(prod.description || '').toLowerCase().includes(q);
        return matchesName || matchesSku || matchesDesc;
      }
      return true;
    });
  }, [products, selectedCategory, selectedStation, searchQuery]);

  // ── Cart Quantity Map ───────────────────────────────────────────
  const cartQuantityByProduct = useMemo(() => {
    const map = {};
    for (const item of cart) {
      map[item.productId] = (map[item.productId] || 0) + item.quantity;
    }
    return map;
  }, [cart]);

  // ── Cart Operations ─────────────────────────────────────────────
  const handleProductCardClick = (prod) => {
    const hasVariants = prod.variants && prod.variants.length > 0;
    const hasAddons = prod.addons && prod.addons.length > 0;

    if (hasVariants || hasAddons) {
      setActiveProductForModifier(prod);
    } else {
      addToCartDirect(prod);
    }
  };

  const addToCartDirect = (prod, qty = 1, variant = null, addons = [], notes = '') => {
    const variantPrice = variant ? variant.price : prod.price;
    const addonsPrice = addons.reduce((sum, a) => sum + (Number(a.price) || 0), 0);
    const unitPrice = variantPrice + addonsPrice;

    const cartKey = `${prod._id}_${variant?._id || 'novar'}_${addons.map((a) => a._id).sort().join('-')}_${notes}`;

    setCart((prev) => {
      const existingIdx = prev.findIndex((item) => item.cartKey === cartKey);
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
    setCart((prev) => prev.filter((item) => item.cartKey !== cartKey));
  };

  const clearCart = () => {
    setCart([]);
    setTableNumber('');
    setCustomerPhone('');
    setCustomerName('');
    setCustomerGstin('');
    setDeliveryAddress('');
    setManualDiscount('');
    setCouponCode('');
    setOrderNotes('');
    setIsMobileCartOpen(false);
    setActiveCheckoutSyncId(null);
    setCheckoutError(null);
  };

  // ── Pricing & Tax Calculations (Section 11) ─────────────────────
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

  // ── Customer Phone Lookup (Section 17) ──────────────────────────
  const handlePhoneChange = async (val) => {
    setCustomerPhone(val);
    const clean = val.replace(/\D/g, '');
    if (clean.length === 10 && isOnline) {
      try {
        const { data } = await api.get(`/customers/lookup?phone=${clean}`).catch(() => ({ data: null }));
        if (data?.customer?.name) {
          setCustomerName(data.customer.name);
          toast.success(`Patron found: ${data.customer.name}`);
        }
      } catch (_err) {
        // Best-effort lookup
      }
    }
  };

  // ── Navigation Switching ────────────────────────────────────────
  const handleSelectNav = (navId) => {
    setActiveNav(navId);
    if (['counter', 'dine_in', 'takeaway', 'delivery'].includes(navId)) {
      setOrderType(navId);
      setIsMobileSidebarOpen(false);
      if (navId === 'dine_in' && !tableNumber) {
        setShowTablesModal(true);
      }
    } else if (navId === 'orders') {
      setShowRecentOrdersModal(true);
      setIsMobileSidebarOpen(false);
    } else if (navId === 'customers') {
      setShowCustomersModal(true);
      setIsMobileSidebarOpen(false);
    } else if (navId === 'tables') {
      setShowTablesModal(true);
      setIsMobileSidebarOpen(false);
    } else if (navId === 'reports') {
      setShowShiftReportsModal(true);
      setIsMobileSidebarOpen(false);
    } else if (navId === 'settings') {
      setShowStationSettingsModal(true);
      setIsMobileSidebarOpen(false);
    }
  };

  const handleSelectOrderMode = (modeId) => {
    setOrderType(modeId);
    setActiveNav(modeId);
    if (modeId === 'dine_in' && !tableNumber) {
      setShowTablesModal(true);
    }
  };

  // ── Hold & Resume Orders (Section 14) ───────────────────────────
  const handleHoldOrder = async () => {
    if (cart.length === 0) {
      toast.error('Add items to order before holding');
      return;
    }

    try {
      const payload = {
        tableNumber: Number(tableNumber) || 0,
        orderType,
        customer: { name: customerName, phone: customerPhone },
        deliveryAddress: orderType === 'delivery' ? deliveryAddress : undefined,
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          variantId: item.variant?._id,
          addonIds: item.addons.map((a) => a._id),
          specialInstructions: item.specialInstructions,
        })),
        notes: orderNotes,
      };

      const { data } = await api.post('/pos/orders/hold', payload);
      setHeldOrders((prev) => [data.order, ...prev]);
      clearCart();
      toast.success('Ticket paused on station');
    } catch (err) {
      toast.error(err.message || 'Failed to hold order');
    }
  };

  const handleResumeHeldOrder = (held) => {
    setOrderType(held.orderType || 'counter');
    setActiveNav(held.orderType || 'counter');
    setTableNumber(held.tableNumber ? String(held.tableNumber) : '');
    setCustomerName(held.customer?.name || '');
    setCustomerPhone(held.customer?.phone || '');
    setDeliveryAddress(held.deliveryAddress || '');
    setOrderNotes(held.notes || '');

    const restoredCart = (held.items || []).map((item) => ({
      cartKey: `${item.product?._id || item.product}_${Date.now()}_${Math.random()}`,
      productId: item.product?._id || item.product,
      name: item.name,
      image: item.image,
      unitPrice: item.price,
      quantity: item.quantity,
      variant: item.variant,
      addons: item.addons || [],
      specialInstructions: item.specialInstructions || '',
      itemTotal: item.itemTotal || item.price * item.quantity,
      kitchenStation: 'KITCHEN',
    }));

    setCart(restoredCart);
    setShowHeldModal(false);
    api.delete(`/pos/held-orders/${held._id}`).catch(() => {});
    setHeldOrders((prev) => prev.filter((o) => o._id !== held._id));
    toast.success('Resumed held ticket');
  };

  const handleDiscardHeldOrder = async (heldId) => {
    try {
      await api.delete(`/pos/held-orders/${heldId}`);
      setHeldOrders((prev) => prev.filter((o) => o._id !== heldId));
      toast.success('Held order discarded');
    } catch (_err) {
      setHeldOrders((prev) => prev.filter((o) => o._id !== heldId));
    }
  };

  // ── Checkout & Payment (Sections 12, 15, 16) ───────────────────
  const handleCheckout = async (paymentMethod, splitPayments = [], tendered = null) => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    if (orderType === 'dine_in' && !tableNumber) {
      toast.error('Please assign a Table for Dine-in');
      setShowTablesModal(true);
      return;
    }

    setProcessingOrder(true);
    setCheckoutError(null);

    // DEMO SIMULATION (Safely isolated, never touches live database/inventory)
    if (user?.isDemo || user?._id?.startsWith('demo')) {
      const demoOrderNumber = `DEMO-${Math.floor(1000 + Math.random() * 9000)}`;
      const demoOrder = {
        _id: `sim_${Date.now()}`,
        isDemo: true,
        orderNumber: demoOrderNumber,
        orderType,
        tableNumber: Number(tableNumber) || null,
        items: cart.map((i) => ({
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
          name: customerName || 'Walk-in Guest',
          phone: customerPhone || '9999999999',
        },
      };

      playCashRegisterChime();
      toast.success(`Demo Ticket #${demoOrderNumber} completed!`, { icon: '🧪' });
      setLastReceipt({ isDemo: true, order: demoOrder });
      setShowReceiptModal(true);
      setShowCashModal(false);
      clearCart();
      setProcessingOrder(false);
      return;
    }

    // Stable Idempotency / Sync ID to prevent duplicate kitchen tickets or charges
    const syncId = activeCheckoutSyncId || `pos_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    setActiveCheckoutSyncId(syncId);

    const orderPayload = {
      tableNumber: Number(tableNumber) || 0,
      orderType,
      customer: {
        name: customerName || 'Walk-in Guest',
        phone: customerPhone || '9999999999',
      },
      customerGstin: (customerGstin || '').trim().toUpperCase(),
      deliveryAddress: orderType === 'delivery' ? deliveryAddress : undefined,
      items: cart.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        variantId: item.variant?._id,
        addonIds: item.addons.map((a) => a._id),
        specialInstructions: item.specialInstructions,
      })),
      paymentMethod,
      splitPayments,
      manualDiscount: discountAmount,
      couponCode,
      notes: orderNotes,
      tenderedAmount: paymentMethod === 'cash' ? (tendered || totalAmount) : undefined,
      externalPaymentReference: ['upi', 'card'].includes(paymentMethod)
        ? `POS-${paymentMethod.toUpperCase()}-${Date.now()}`
        : undefined,
      syncId,
    };

    // Offline Save
    if (!isOnline) {
      try {
        await saveOfflineOrder(orderPayload);
        await checkPendingOfflineQueue();
        playCashRegisterChime();
        toast.success('Order stored in local offline queue! Will auto-sync on reconnect.', { icon: '💾' });
        clearCart();
        setActiveCheckoutSyncId(null);
      } catch (err) {
        toast.error('Failed to store offline order: ' + err.message);
      } finally {
        setProcessingOrder(false);
      }
      return;
    }

    // Live Server Submission (triggers inventory deduction & KDS broadcast)
    try {
      const { data } = await api.post('/pos/orders', orderPayload);
      playCashRegisterChime();
      toast.success(`Order #${data.order.orderNumber} confirmed!`, { icon: '✅' });
      setLastReceipt({ isDemo: false, order: data.order, receipt: data.receipt });
      setShowReceiptModal(true);
      setShowCashModal(false);
      clearCart();
      setActiveCheckoutSyncId(null);
      setCheckoutError(null);
    } catch (err) {
      // Preserve cart state on checkout error!
      const rawError = err.response?.data?.error;
      const safeMsg =
        (typeof rawError === 'string' ? rawError : rawError?.message) ||
        (err.status === 401 ? 'Session expired. Please sign in again.' : null) ||
        (err.status === 403 ? 'You are not authorized for this transaction.' : null) ||
        err.message ||
        'Checkout interrupted. Cart preserved for retry.';

      setCheckoutError({
        message: safeMsg,
        code: err.code || err.status || err.response?.status,
        canRetry: true,
      });
      toast.error(safeMsg);
    } finally {
      setProcessingOrder(false);
    }
  };

  // Helper to get category icon
  const getCategoryIcon = (catName) => {
    const n = String(catName || '').toLowerCase();
    if (n.includes('coffee') || n.includes('brew')) return '☕';
    if (n.includes('cold') || n.includes('tonic') || n.includes('drink') || n.includes('beverage')) return '🧊';
    if (n.includes('bakery') || n.includes('toast') || n.includes('croissant')) return '🥐';
    if (n.includes('meal') || n.includes('pizza') || n.includes('burger') || n.includes('bites')) return '🍕';
    if (n.includes('dessert') || n.includes('cake') || n.includes('sweet')) return '🍰';
    return '🍽️';
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-[#FAF8F3] text-[#18251F] font-sans select-none">
      {/* ── Top Header ────────────────────────────────────────────── */}
      <POSHeader
        tenant={tenant}
        user={user}
        onLogout={onLogout || logout}
        onOpenScanQr={() => setShowScanQrModal(true)}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
      />

      {/* ── Persistent Demo Mode Watermark ─────────────────────────── */}
      {(user?.isDemo || user?._id?.startsWith('demo')) && (
        <div className="bg-amber-500/20 border-b border-amber-500/40 px-4 py-1.5 text-center text-xs font-bold text-amber-900 flex items-center justify-center gap-2 shrink-0 select-none z-20">
          <AlertCircle size={15} className="text-amber-700 shrink-0" />
          <span>DEMO WORKSTATION — TRAINING SIMULATION ONLY (NO LIVE BILLING)</span>
          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/30 text-amber-950 font-black">
            SIMULATION
          </span>
        </div>
      )}

      {/* ── Three-Part Layout Body ─────────────────────────────────── */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* PART 1: Left Navigation Sidebar (Desktop & Tablet) ──────── */}
        <div className="hidden lg:flex shrink-0 h-full">
          <POSSidebar
            activeNav={activeNav}
            onSelectNav={handleSelectNav}
            heldOrdersCount={heldOrders.length}
            isOnline={isOnline}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
          />
        </div>

        {/* Mobile Navigation Sidebar Drawer (< 1024px) ─────────────── */}
        {isMobileSidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex"
            onClick={() => setIsMobileSidebarOpen(false)}
          >
            <div
              className="w-[240px] h-full shadow-2xl animate-in slide-in-from-left duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <POSSidebar
                activeNav={activeNav}
                onSelectNav={handleSelectNav}
                heldOrdersCount={heldOrders.length}
                isOnline={isOnline}
                isCollapsed={false}
                onToggleCollapse={() => setIsMobileSidebarOpen(false)}
              />
            </div>
          </div>
        )}

        {/* PART 2: Main Menu & Product Browsing Workspace ──────────── */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#FAF8F3] overflow-hidden">
          {/* Top Subheader: Order Mode Selector & Sync Badge ────────── */}
          <div className="bg-white border-b border-[#EAE3D9] px-3.5 py-2.5 flex items-center justify-between gap-3 shrink-0 shadow-xs">
            {/* 4 Order Mode Buttons (Section 5) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pos-scrollbar py-0.5">
              {ORDER_MODES.map((mode) => {
                const Icon = mode.icon;
                const isActive = orderType === mode.id;

                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => handleSelectOrderMode(mode.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all touch-press min-h-[38px] ${
                      isActive
                        ? 'bg-[#105B43] text-white shadow-xs border border-[#20D99A]/40'
                        : 'bg-[#FAF8F3] text-[#718078] hover:text-[#18251F] hover:bg-[#F4EFE6] border border-[#EAE3D9]'
                    }`}
                  >
                    <Icon size={15} className={isActive ? 'text-[#20D99A]' : 'text-[#718078]'} />
                    <span>{mode.label}</span>
                  </button>
                );
              })}

              {/* Table assignment badge if dine-in */}
              {orderType === 'dine_in' && (
                <button
                  type="button"
                  onClick={() => setShowTablesModal(true)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition min-h-[38px] touch-press ${
                    tableNumber
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-50 text-amber-800 border border-amber-300 animate-pulse'
                  }`}
                >
                  <UtensilsCrossed size={14} />
                  <span>{tableNumber ? `Table ${tableNumber}` : 'Assign Table *'}</span>
                </button>
              )}
            </div>

            {/* Offline sync queue quick button if items are pending */}
            <div className="flex items-center gap-2 text-xs shrink-0">
              {pendingSyncCount > 0 ? (
                <button
                  type="button"
                  onClick={syncPendingOfflineOrders}
                  disabled={syncingOffline || !isOnline}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200 transition min-h-[36px] touch-press"
                >
                  <RefreshCw size={13} className={syncingOffline ? 'animate-spin' : ''} />
                  <span>{pendingSyncCount} queued (Sync)</span>
                </button>
              ) : !isOnline ? (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                  <WifiOff size={13} />
                  <span>Offline</span>
                </div>
              ) : (
                <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <Wifi size={13} />
                  <span>Live</span>
                </div>
              )}
            </div>
          </div>

          {/* Search Bar & Station Filters (Section 6) ───────────────── */}
          <div className="p-3.5 bg-white border-b border-[#EAE3D9] flex flex-col sm:flex-row gap-3 shrink-0">
            <div className="flex-1">
              <SearchInput
                ref={searchInputRef}
                placeholder="Search dishes, ingredients or SKU... (Ctrl + K)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery('')}
              />
            </div>

            {/* Station Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pos-scrollbar py-0.5 shrink-0">
              {STATIONS.map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setSelectedStation(st)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors touch-press min-h-[44px] ${
                    selectedStation === st
                      ? 'bg-[#105B43] text-white border-[#105B43] shadow-xs'
                      : 'bg-white text-[#718078] border-[#EAE3D9] hover:border-[#718078]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Horizontally Scrollable Categories (Section 7) ─────────── */}
          <div className="px-3.5 py-2.5 bg-white/70 border-b border-[#EAE3D9] flex items-center gap-2 overflow-x-auto pos-scrollbar shrink-0">
            <CategoryChip
              name="All Menu"
              icon="✨"
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
              categories.map((cat) => {
                const catId = String(cat._id || cat.id || cat);
                const count = products.filter(
                  (p) => String(p?.category?._id || p?.category || '') === catId
                ).length;
                return (
                  <CategoryChip
                    key={catId}
                    name={cat.name || String(cat)}
                    icon={cat.icon || getCategoryIcon(cat.name)}
                    count={count}
                    isActive={selectedCategory === catId}
                    onClick={() => setSelectedCategory(catId)}
                  />
                );
              })
            )}
          </div>

          {/* Product Cards Grid (Section 8) ─────────────────────────── */}
          <div className="flex-1 overflow-y-auto p-4 grid grid-cols-[repeat(auto-fill,minmax(155px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(175px,1fr))] gap-3.5 auto-rows-max pos-scrollbar">
            {loadingCatalog ? (
              Array.from({ length: 10 }).map((_, i) => <ProductCardSkeleton key={i} />)
            ) : catalogError ? (
              <div className="col-span-full py-12">
                <ErrorState
                  title="Menu catalog could not be loaded"
                  message={catalogError}
                  onRetry={loadInitialData}
                />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="col-span-full py-16">
                <EmptyState
                  icon={UtensilsCrossed}
                  title="No dishes found"
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
              filteredProducts.map((prod) => (
                <ProductCard
                  key={prod._id}
                  product={prod}
                  currency={currency}
                  cartQuantity={cartQuantityByProduct[prod._id] || 0}
                  onClick={() => handleProductCardClick(prod)}
                />
              ))
            )}
          </div>

          {/* Mobile Bottom Order Bar (< 1024px) ─────────────────────── */}
          <div className="lg:hidden p-3 bg-white border-t border-[#EAE3D9] flex items-center justify-between gap-3 shrink-0 shadow-elevation2">
            <div>
              <span className="text-[11px] font-bold text-[#718078] uppercase block">
                {cart.length} Item{cart.length === 1 ? '' : 's'} in Ticket
              </span>
              <span className="font-display font-black text-xl text-pos-accent tabular-nums font-mono">
                {formatMoney(totalAmount, currency)}
              </span>
            </div>
            <Button
              variant="primary"
              size="lg"
              onClick={() => setIsMobileCartOpen(true)}
              disabled={cart.length === 0}
              className="flex-1 max-w-[200px] font-bold"
            >
              View Ticket →
            </Button>
          </div>
        </div>

        {/* PART 3: Right Current Ticket / Checkout Panel (Desktop) ─── */}
        <aside className="hidden lg:flex w-96 shrink-0 border-l border-[#EAE3D9] bg-white flex-col h-full shadow-elevation1">
          <CheckoutPanel
            cart={cart}
            orderType={orderType}
            tableNumber={tableNumber}
            tables={tables}
            customerPhone={customerPhone}
            customerName={customerName}
            deliveryAddress={deliveryAddress}
            orderNotes={orderNotes}
            manualDiscount={manualDiscount}
            subtotal={subtotal}
            discountAmount={discountAmount}
            taxRate={taxRate}
            taxAmount={taxAmount}
            totalAmount={totalAmount}
            currency={currency}
            processing={processingOrder}
            checkoutError={checkoutError}
            onClearCart={clearCart}
            onUpdateCartQty={updateCartQty}
            onRemoveCartItem={removeCartItem}
            onSelectTable={setTableNumber}
            onChangeCustomerPhone={handlePhoneChange}
            onChangeDeliveryAddress={setDeliveryAddress}
            onSetDiscount={setManualDiscount}
            onHoldOrder={handleHoldOrder}
            onPayCash={() => setShowCashModal(true)}
            onPayUpi={() => handleCheckout('upi')}
            onPayCard={() => handleCheckout('card')}
            onPaySplit={() => setShowSplitModal(true)}
            onRetryCheckout={() => handleCheckout('cash')}
          />
        </aside>
      </div>

      {/* ── Mobile Ticket Panel Bottom Sheet (< 1024px) ────────────── */}
      <Modal
        isOpen={isMobileCartOpen}
        onClose={() => setIsMobileCartOpen(false)}
        title="Current Ticket"
        maxWidth="max-w-md"
        className="h-[88vh]"
      >
        <div className="h-full flex flex-col -m-5">
          <CheckoutPanel
            cart={cart}
            orderType={orderType}
            tableNumber={tableNumber}
            tables={tables}
            customerPhone={customerPhone}
            customerName={customerName}
            deliveryAddress={deliveryAddress}
            orderNotes={orderNotes}
            manualDiscount={manualDiscount}
            subtotal={subtotal}
            discountAmount={discountAmount}
            taxRate={taxRate}
            taxAmount={taxAmount}
            totalAmount={totalAmount}
            currency={currency}
            processing={processingOrder}
            checkoutError={checkoutError}
            onClearCart={clearCart}
            onUpdateCartQty={updateCartQty}
            onRemoveCartItem={removeCartItem}
            onSelectTable={setTableNumber}
            onChangeCustomerPhone={handlePhoneChange}
            onChangeDeliveryAddress={setDeliveryAddress}
            onSetDiscount={setManualDiscount}
            onHoldOrder={handleHoldOrder}
            onPayCash={() => {
              setIsMobileCartOpen(false);
              setShowCashModal(true);
            }}
            onPayUpi={() => handleCheckout('upi')}
            onPayCard={() => handleCheckout('card')}
            onPaySplit={() => {
              setIsMobileCartOpen(false);
              setShowSplitModal(true);
            }}
            onRetryCheckout={() => handleCheckout('cash')}
          />
        </div>
      </Modal>

      {/* ── Modals & Dialogs ───────────────────────────────────────── */}

      {/* 1. Product Customization & Modifiers Modal (Section 9) */}
      <ProductModifierModal
        product={activeProductForModifier}
        isOpen={Boolean(activeProductForModifier)}
        onClose={() => setActiveProductForModifier(null)}
        onAddToCart={addToCartDirect}
        currency={currency}
      />

      {/* 2. Cash Payment Keypad Modal (Section 12) */}
      <CashPaymentModal
        isOpen={showCashModal}
        onClose={() => setShowCashModal(false)}
        totalAmount={totalAmount}
        currency={currency}
        processing={processingOrder}
        onConfirmPayment={(method, tendered) => handleCheckout(method, [], tendered)}
      />

      {/* 3. Split Payment Modal (Section 12) */}
      <SplitPaymentModal
        isOpen={showSplitModal}
        onClose={() => setShowSplitModal(false)}
        totalAmount={totalAmount}
        currency={currency}
        processing={processingOrder}
        onConfirmSplit={(splits) => handleCheckout('split', splits)}
      />

      {/* 4. Held Orders Modal (Section 14) */}
      <HeldOrdersModal
        isOpen={showHeldModal}
        onClose={() => setShowHeldModal(false)}
        heldOrders={heldOrders}
        onResume={handleResumeHeldOrder}
        onDiscard={handleDiscardHeldOrder}
        currency={currency}
      />

      {/* 5. Recent Station Orders Modal */}
      <RecentOrdersModal
        isOpen={showRecentOrdersModal}
        onClose={() => setShowRecentOrdersModal(false)}
        currency={currency}
        onViewReceipt={(ord) => {
          setLastReceipt({ isDemo: ord.isDemo, order: ord });
          setShowReceiptModal(true);
        }}
      />

      {/* 6. Tables & Floor Plan Modal */}
      <TablesFloorModal
        isOpen={showTablesModal}
        onClose={() => setShowTablesModal(false)}
        tables={tables}
        selectedTableNumber={tableNumber}
        onSelectTable={setTableNumber}
      />

      {/* 7. Customers Modal (Section 17) */}
      <CustomersModal
        isOpen={showCustomersModal}
        onClose={() => setShowCustomersModal(false)}
        onSelectCustomer={(name, phone) => {
          setCustomerName(name);
          setCustomerPhone(phone);
        }}
      />

      {/* 8. Shift Reports Modal */}
      <ShiftReportsModal
        isOpen={showShiftReportsModal}
        onClose={() => setShowShiftReportsModal(false)}
        tenant={tenant}
        currency={currency}
      />

      {/* 9. Station Preferences / Settings Modal */}
      <StationSettingsModal
        isOpen={showStationSettingsModal}
        onClose={() => setShowStationSettingsModal(false)}
        tenant={tenant}
        user={user}
      />

      {/* 10. Scan QR Modal (Section 3) */}
      <ScanQrModal
        isOpen={showScanQrModal}
        onClose={() => setShowScanQrModal(false)}
        onApplyTable={(tbl) => {
          setTableNumber(tbl);
          setOrderType('dine_in');
          setActiveNav('dine_in');
        }}
        onApplyCustomer={handlePhoneChange}
      />

      {/* 11. Customer Receipt Modal (Section 13) */}
      <ReceiptModal
        isOpen={showReceiptModal && Boolean(lastReceipt)}
        onClose={() => setShowReceiptModal(false)}
        lastReceipt={lastReceipt}
        tenant={tenant}
        currency={currency}
        onNewOrder={() => {
          setShowReceiptModal(false);
          setLastReceipt(null);
          clearCart();
        }}
      />
    </div>
  );
}
