import { useState, useEffect, useRef, lazy, Suspense, useMemo } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  SlidersHorizontal,
  X,
  ScanLine,
  ShoppingBag,
  ArrowRight,
  Coffee,
  CupSoda,
  Sandwich,
  Pizza,
  CakeSlice,
  Sparkles,
  Utensils,
  AlertCircle,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Menu as MenuIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import useCartStore, { cartItemCount } from '../../context/cartStore';
import { getCached, setCached, CATEGORIES_TTL_MS, DEFAULT_TTL_MS, clearClientCache } from '../../utils/menuCache';
import { subscribeToLiveStream } from '../../utils/liveStream';
import TableServiceActions from '../../components/table/TableServiceActions';
import { useTenant } from '../../context/TenantContext';
import {
  getResolvedTenantSlug,
  getCustomerSessionItem,
  setCustomerSessionItem,
  removeCustomerSessionItem,
} from '../../utils/tenantHelper';
import usePageMeta from '../../hooks/usePageMeta';
import { formatMoney } from '../../utils/money';
import VegMark from '../../components/menu/VegMark';
import PopularCard from '../../components/menu/PopularCard';
import MenuItemRow from '../../components/menu/MenuItemRow';
import { PopularSkeleton, RowSkeleton } from '../../components/menu/MenuSkeletons';
import DesktopOrderSidebar from '../../components/menu/DesktopOrderSidebar';

const ProductModal = lazy(() => import('../../components/menu/ProductModal'));
const QrScannerModal = lazy(() => import('../../components/ui/QrScannerModal'));

const SORT_OPTIONS = [
  { value: '', label: 'Featured' },
  { value: 'popular', label: 'Popular First' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
];

/**
 * Returns an appropriate Lucide icon component based on category name.
 * Strictly avoids emoji icons per design requirement.
 */
function getCategoryIcon(name, isSelected) {
  const n = String(name || '').toLowerCase();
  const colorClass = isSelected ? 'text-[#FFF1C9]' : 'text-[#0F3D2E]';
  if (n.includes('hot') || n.includes('brew') || n.includes('coffee') || n.includes('tea')) {
    return <Coffee size={14} className={colorClass} strokeWidth={2.2} />;
  }
  if (n.includes('cold') || n.includes('beverage') || n.includes('drink') || n.includes('shake') || n.includes('smoothie')) {
    return <CupSoda size={14} className={colorClass} strokeWidth={2.2} />;
  }
  if (n.includes('burger') || n.includes('bite') || n.includes('sandwich')) {
    return <Sandwich size={14} className={colorClass} strokeWidth={2.2} />;
  }
  if (n.includes('pizza')) {
    return <Pizza size={14} className={colorClass} strokeWidth={2.2} />;
  }
  if (n.includes('dessert') || n.includes('bakery') || n.includes('cake') || n.includes('sweet') || n.includes('pastry')) {
    return <CakeSlice size={14} className={colorClass} strokeWidth={2.2} />;
  }
  if (n.includes('special') || n.includes('chef')) {
    return <Sparkles size={14} className={colorClass} strokeWidth={2.2} />;
  }
  return <Utensils size={14} className={colorClass} strokeWidth={2.2} />;
}

/**
 * Parses operating hours from tenant settings to produce real-time status.
 */
function getOperatingStatus(tenant) {
  const rawCity = (tenant.address || 'Surat').split(',')[0].trim();
  const city = rawCity ? rawCity.charAt(0).toUpperCase() + rawCity.slice(1).toLowerCase() : 'Surat';

  const openingHours = tenant.openingHours || tenant.settings?.openingHours || {};
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const todayKey = days[new Date().getDay()];
  const todaySchedule = openingHours[todayKey];

  const formatTime12h = (tStr) => {
    if (!tStr) return '';
    const [h, m] = tStr.split(':').map(Number);
    const ampm = (h || 0) >= 12 ? 'PM' : 'AM';
    const h12 = (h || 0) % 12 || 12;
    return m > 0 ? `${h12}:${String(m).padStart(2, '0')} ${ampm}` : `${h12} ${ampm}`;
  };

  const parseMinutes = (tStr) => {
    if (!tStr) return 0;
    const [h, m] = tStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  // If no hours are configured in DB, use default café hours (open till 11 PM)
  if (!todaySchedule || !todaySchedule.close) {
    return {
      isOpen: true,
      text: `Kitchen open · till 11 PM · ${city}`,
    };
  }

  if (todaySchedule.isClosed) {
    return {
      isOpen: false,
      text: `Kitchen closed today · ${city}`,
    };
  }

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const openMinutes = parseMinutes(todaySchedule.open || '08:00');
  const closeMinutes = parseMinutes(todaySchedule.close || '23:00');

  const isOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes;
  if (isOpen) {
    return {
      isOpen: true,
      text: `Kitchen open · till ${formatTime12h(todaySchedule.close) || '11 PM'} · ${city}`,
    };
  }

  return {
    isOpen: false,
    text: `Kitchen closed · Opens ${formatTime12h(todaySchedule.open) || '8 AM'} · ${city}`,
  };
}

export default function MenuPage() {
  const tenant = useTenant();
  usePageMeta(
    `${tenant.name || 'Café'} — Menu & Ordering`,
    `Explore menu and order directly from your table at ${tenant.name || 'Café'}.`
  );

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tableTokenParam = searchParams.get('token') || searchParams.get('tableToken');
  const queryTable = searchParams.get('table') || searchParams.get('tableNumber');

  const {
    items,
    tableNumber,
    tableToken,
    setTable,
    setDiningSessionToken,
    isScannerOpen,
    openScanner,
    closeScanner,
    openNavDrawer,
  } = useCartStore();

  const itemCount = useCartStore(cartItemCount);
  const subtotal = items.reduce((s, i) => s + (i.itemTotal || 0), 0);
  const tax = Number(((subtotal * Number(tenant.taxRate || 0)) / 100).toFixed(2));
  const grandTotal = (subtotal + tax).toFixed(2);

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuError, setMenuError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [vegOnly, setVegOnly] = useState(false);
  const [sort, setSort] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const searchRef = useRef(null);
  const debounceRef = useRef(null);
  const popularRef = useRef(null);

  const scrollPopular = (direction) => {
    if (popularRef.current) {
      const scrollAmount = direction === 'left' ? -380 : 380;
      popularRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Fallback table detection from URL param or namespaced sessionStorage if not yet in store
  useEffect(() => {
    const slug = tenant?.slug || getResolvedTenantSlug();
    if (!tableNumber && slug) {
      const sessionTable = getCustomerSessionItem(slug, 'table_number');
      const sessionToken = getCustomerSessionItem(slug, 'table_token');
      if (sessionTable) {
        setTable(Number(sessionTable), sessionToken || null);
      } else if (queryTable) {
        setTable(Number(queryTable), null);
      }
    }
  }, [tableNumber, queryTable, setTable, tenant?.slug]);

  // Authoritative server resolution of the table QR token
  useEffect(() => {
    if (!tableTokenParam) return;
    let active = true;
    const slug = tenant?.slug || getResolvedTenantSlug();
    api.get('/public/cafes/resolve', { params: { token: tableTokenParam } })
      .then(({ data }) => {
        if (!active || !data.data?.table) return;
        const resolvedTable = data.data.table;
        const currentStore = useCartStore.getState();
        const isNewTableScan =
          (currentStore.tableNumber != null && currentStore.tableNumber !== Number(resolvedTable.number)) ||
          (currentStore.tableToken != null && currentStore.tableToken !== tableTokenParam);

        if (isNewTableScan) {
          currentStore.clearCart();
          currentStore.setDiningSessionToken(null);
        }

        setTable(resolvedTable.number, tableTokenParam);
        if (slug) {
          setCustomerSessionItem(slug, 'table_token', tableTokenParam);
          setCustomerSessionItem(slug, 'table_number', resolvedTable.number);
          setCustomerSessionItem(slug, 'table_id', resolvedTable.id);
        }
      })
      .catch(() => {
        api.get('/tables/qr/validate', { params: { token: tableTokenParam } })
          .then(({ data }) => {
            if (!active || !data.valid) return;
            const currentStore = useCartStore.getState();
            const isNewTableScan =
              (currentStore.tableNumber != null && currentStore.tableNumber !== Number(data.table.tableNumber)) ||
              (currentStore.tableToken != null && currentStore.tableToken !== tableTokenParam);

            if (isNewTableScan) {
              currentStore.clearCart();
              currentStore.setDiningSessionToken(null);
            }

            setTable(data.table.tableNumber, tableTokenParam);
            if (slug) {
              setCustomerSessionItem(slug, 'table_token', tableTokenParam);
              setCustomerSessionItem(slug, 'table_number', data.table.tableNumber);
            }
          })
          .catch(() => {
            if (slug) {
              removeCustomerSessionItem(slug, 'table_token');
              removeCustomerSessionItem(slug, 'table_number');
              removeCustomerSessionItem(slug, 'table_id');
            }
            if (active) toast.error('This table QR code is invalid or expired. Ask staff for a new code.');
          });
      });
    return () => { active = false; };
  }, [tableTokenParam, setTable, tenant?.slug]);

  // Session initialization when table is verified
  useEffect(() => {
    if (!tableToken || !tableNumber) return undefined;
    let active = true;
    api.post('/session', {
      tableNumber,
      tableToken,
      ...(useCartStore.getState().diningSessionToken && { diningSessionToken: useCartStore.getState().diningSessionToken }),
    }).then((res) => {
      const data = res?.data;
      if (!active || !data) return;

      const prevSessionToken = useCartStore.getState().diningSessionToken;
      if (res.status === 201 || (prevSessionToken && data.diningSessionToken && prevSessionToken !== data.diningSessionToken)) {
        useCartStore.getState().clearCart();
      }

      if (data.diningSessionToken) {
        setDiningSessionToken(data.diningSessionToken);
      }
    }).catch((error) => {
      if (active) toast.error(error.message || 'Unable to start your table session.');
    });
    return () => { active = false; };
  }, [tableNumber, tableToken, setDiningSessionToken]);

  // Real-time live stream events for product availability
  useEffect(() => {
    const slug = tenant?.slug || getResolvedTenantSlug();
    if (!slug && !tenant?.id) return;
    return subscribeToLiveStream('/menu/events', {
      onEvent: (type, payload) => {
        if (type === 'connected') {
          setReloadKey((current) => current + 1);
        } else if (type === 'availability') {
          clearClientCache();
          setProducts((current) => current.map((product) => String(product._id) === payload.productId
            ? { ...product, available: payload.available }
            : product));
        } else if (type === 'removed') {
          clearClientCache();
          setProducts((current) => current.filter((product) => String(product._id) !== payload.productId));
        }
      },
    });
  }, [tenant?.slug, tenant?.id]);

  // Periodic scheduled availability check
  useEffect(() => {
    const refreshScheduledAvailability = () => {
      const now = Date.now();
      setProducts((current) => current.map((product) => {
        const startsAt = product.availableFrom ? new Date(product.availableFrom).getTime() : null;
        const endsAt = product.availableUntil ? new Date(product.availableUntil).getTime() : null;
        const scheduledAvailable = (!startsAt || now >= startsAt) && (!endsAt || now < endsAt);
        return product.scheduledAvailable === scheduledAvailable ? product : { ...product, scheduledAvailable };
      }));
    };
    const timer = window.setInterval(refreshScheduledAvailability, 30000);
    return () => window.clearInterval(timer);
  }, []);

  // Fetch categories with client cache
  useEffect(() => {
    const slug = tenant?.slug || getResolvedTenantSlug();
    if (!slug && !tenant?.id) return;

    const cacheKey = `categories_${slug || 'default'}`;
    const cachedCats = getCached(cacheKey);
    if (cachedCats && cachedCats.length > 0) {
      setCategories(cachedCats);
    }
    const params = slug ? { cafe: slug } : {};
    api.get('/categories', { params })
      .then((res) => {
        const cats = Array.isArray(res.data?.categories) ? res.data.categories : [];
        setCategories(cats);
        setCached(cacheKey, cats, CATEGORIES_TTL_MS);
      })
      .catch(() => {});
  }, [tenant?.slug, tenant?.id]);

  // Debounce search query
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  // Fetch menu products with client cache
  useEffect(() => {
    const slug = tenant?.slug || getResolvedTenantSlug();
    if (!slug && !tenant?.id) return;

    const params = new URLSearchParams();
    params.append('limit', '100');
    if (selectedCategory !== 'all') params.append('category', selectedCategory);
    if (debouncedSearch) params.append('search', debouncedSearch);
    if (vegOnly) params.append('veg', 'true');
    if (sort) params.append('sort', sort);
    if (slug) params.append('cafe', slug);

    const cacheKey = `menu_${slug || 'default'}_${params.toString()}`;
    const cachedProducts = getCached(cacheKey);

    if (cachedProducts && cachedProducts.length > 0) {
      setProducts(cachedProducts);
      setLoading(false);
      setMenuError('');
    } else {
      setLoading(true);
      setMenuError('');
    }

    api.get(`/menu?${params}`)
      .then((res) => {
        const prods = Array.isArray(res.data?.products) ? res.data.products : [];
        setProducts(prods);
        setCached(cacheKey, prods, DEFAULT_TTL_MS);
      })
      .catch((error) => {
        if (!cachedProducts || cachedProducts.length === 0) {
          setProducts([]);
          setMenuError(error.message || 'Unable to connect to the menu service.');
          toast.error('Failed to load menu');
        }
      })
      .finally(() => setLoading(false));
  }, [selectedCategory, debouncedSearch, vegOnly, sort, reloadKey, tenant?.slug, tenant?.id]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts = { all: products.length };
    categories.forEach((cat) => {
      counts[cat._id] = products.filter(
        (p) => p.category === cat._id || p.category?._id === cat._id
      ).length;
    });
    return counts;
  }, [categories, products]);

  // Popular items
  const popularItems = useMemo(() => {
    return products.filter((p) => p.popular === true);
  }, [products]);

  // Products grouped by category for sections
  const groupedSections = useMemo(() => {
    if (selectedCategory !== 'all') {
      const activeCat = categories.find((c) => c._id === selectedCategory);
      const catName = activeCat ? activeCat.name : 'Selected Items';
      return [{ id: selectedCategory, name: catName, items: products }];
    }

    // Group all products by their category
    const map = new Map();
    categories.forEach((cat) => {
      map.set(cat._id, { id: cat._id, name: cat.name, items: [] });
    });

    const uncategorized = [];
    products.forEach((prod) => {
      const catId = typeof prod.category === 'object' ? prod.category?._id : prod.category;
      if (catId && map.has(catId)) {
        map.get(catId).items.push(prod);
      } else {
        uncategorized.push(prod);
      }
    });

    const sections = Array.from(map.values()).filter((sec) => sec.items.length > 0);
    if (uncategorized.length > 0) {
      sections.push({ id: 'other', name: 'More Dishes', items: uncategorized });
    }
    return sections;
  }, [categories, products, selectedCategory]);

  const operatingStatus = useMemo(() => getOperatingStatus(tenant), [tenant]);

  // Accent color from tenant branding or default tomato #C93A1C
  const accentColor = tenant.branding?.accentColor || tenant.settings?.accentColor || '#C93A1C';

  const handleCategoryClick = (catId) => {
    setSelectedCategory(catId);
    if (catId !== 'all') {
      const targetElement = document.getElementById(`category-section-${catId}`);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  return (
    <div
      className="min-h-[100dvh] bg-[#FAFAF8] text-[#111827] font-jakarta selection:bg-[#0F3D2E] selection:text-[#FFF1C9]"
      style={{
        '--menu-bg': '#FAFAF8',
        '--menu-ink': '#0F3D2E',
        '--menu-accent': accentColor,
        '--menu-accent-text': '#FFFFFF',
        '--menu-card': '#FFFFFF',
        '--menu-veg': '#16A34A',
        '--menu-nonveg': '#DC2626',
        '--menu-butter': '#FFF1C9',
      }}
    >
      {/* 
        Responsive Container:
        - Base (320-639px): Full width, 16px side padding (20px from 390px up)
        - Tablet (640-1023px): Centered container max-width 720px
        - Desktop (1024px+): Centered container max-width 1200px (1320px at 1440px+) with 32px side padding
        - Bottom padding matches floating order bar + safe-area inset on mobile, relaxes on desktop
      */}
      <div className="mx-auto w-full sm:max-w-[720px] lg:max-w-[1200px] 2xl:max-w-[1320px] min-h-[100dvh] flex flex-col px-4 min-[390px]:px-5 lg:px-8 pt-3 pb-28 sm:pb-32 lg:pb-12">
        {/* ─── 1. Header ──────────────────────────────────────────────────────── */}
        <header className="flex items-center justify-between gap-3 py-2">
          {/* Café Name with small accent dot on left */}
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="w-2.5 h-2.5 rounded-full bg-[var(--menu-accent,#C93A1C)] shrink-0"
              aria-hidden="true"
            />
            <span className="font-sora font-extrabold text-xl sm:text-2xl lg:text-3xl text-[#0F3D2E] tracking-tight truncate">
              {tenant.name || 'APNA DOST'}
            </span>
          </div>

          {/* Right: Dark Table Pill + Round White Cart Button (cart button hidden on desktop since sidebar is visible) */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Dark pill showing the table ("Table 7", from QR/session) */}
            <button
              type="button"
              onClick={openScanner}
              aria-label={tableNumber ? `Current Table ${tableNumber}, tap to change table` : 'Scan table QR code'}
              className="inline-flex min-h-[44px] items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#0F3D2E] text-white text-xs font-sora font-bold shadow-xs hover:bg-[#16503D] active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F3D2E]"
            >
              {tableNumber ? (
                <span>Table {tableNumber}</span>
              ) : (
                <>
                  <ScanLine size={14} />
                  <span>Scan Table</span>
                </>
              )}
            </button>

            {/* Round white cart button with item count - only on mobile/tablet */}
            <Link
              to="/cart"
              aria-label={`View Cart with ${itemCount} items`}
              className="relative lg:hidden w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-white border border-[#0F3D2E]/15 flex items-center justify-center text-[#0F3D2E] shadow-sm hover:shadow-md active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F3D2E]"
            >
              <ShoppingBag size={18} strokeWidth={2.4} />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] px-1 items-center justify-center rounded-full bg-[var(--menu-accent,#C93A1C)] text-white text-[11px] font-sora font-extrabold shadow-xs">
                  {itemCount}
                </span>
              )}
            </Link>

            {/* Hamburger Button to Show All Pages */}
            <button
              type="button"
              onClick={openNavDrawer}
              aria-label="Open navigation menu - show all pages"
              className="min-h-[44px] min-w-[44px] px-3 sm:px-3.5 flex items-center justify-center gap-1.5 rounded-full border border-stone-200 bg-white text-[#0F3D2E] shadow-2xs hover:bg-stone-50 hover:border-[#0F3D2E]/30 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F3D2E]"
            >
              <MenuIcon size={19} strokeWidth={2.4} />
              <span className="hidden sm:inline text-xs font-sora font-bold tracking-wide">All Pages</span>
            </button>
          </div>
        </header>

        {/* ─── 2-Column Desktop Grid Wrapper (1024px+) ─────────────────────────── */}
        <div className="lg:grid lg:grid-cols-12 lg:gap-8 lg:items-start pt-1">
          {/* Main Left Column (Full width on mobile/tablet, 8 cols on desktop) */}
          <div className="lg:col-span-8 min-w-0 flex flex-col space-y-4">
            {/* Status Line */}
            <div className="flex items-center gap-2 pt-0.5 pb-1">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  operatingStatus.isOpen ? 'bg-[#1B7A3E] animate-pulse' : 'bg-[#C93A1C]'
                }`}
                aria-hidden="true"
              />
              <span className="text-xs font-jakarta font-semibold text-[#0F3D2E]/80">
                {operatingStatus.text}
              </span>
            </div>

            {/* Kitchen Closed Banner if applicable */}
            {!operatingStatus.isOpen && (
              <div className="rounded-[20px] bg-[#C93A1C]/10 border border-[#C93A1C]/25 p-3 text-[#C93A1C] text-xs font-jakarta font-semibold flex items-center gap-2.5">
                <AlertCircle size={18} className="shrink-0" />
                <span>The kitchen is currently closed. You can browse the menu, but ordering is paused.</span>
              </div>
            )}

            {/* Optional Table Service actions when sitting at a table session */}
            {tableNumber && <TableServiceActions />}

            {/* ─── 3. Greeting Heading & Search Row ─────────────────────────────── */}
            <div className="pt-1 pb-1 flex flex-col md:flex-row md:items-end md:justify-between gap-3 sm:gap-4">
              <h1 className="font-sora font-extrabold text-[clamp(26px,5.5vw,38px)] leading-[1.12] tracking-tight text-[#0F3D2E] text-balance max-w-md">
                Hey dost, what are we eating?
              </h1>

              {/* ─── 4. Search Row ──────────────────────────────────────────────── */}
              <div className="w-full md:w-auto md:min-w-[340px] lg:min-w-[360px] space-y-2">
                <div className="flex items-center gap-2">
                  {/* Full-pill search input with 2px green border */}
                  <div className="relative flex-1">
                    <Search
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-[#0F3D2E] pointer-events-none"
                    />
                    <input
                      ref={searchRef}
                      type="text"
                      placeholder="Search food, coffee & beverages..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full h-11 min-h-[44px] pl-11 pr-10 rounded-full border-2 border-[#0F3D2E] bg-white text-sm font-jakarta text-[#0F3D2E] placeholder:text-[#0F3D2E]/45 focus:outline-none focus:ring-2 focus:ring-[#0F3D2E]/30 transition"
                    />
                    {search && (
                      <button
                        type="button"
                        onClick={() => setSearch('')}
                        aria-label="Clear search query"
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 min-h-[36px] min-w-[36px] flex items-center justify-center text-[#0F3D2E]/60 hover:text-[#0F3D2E] rounded-full transition"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>

                  {/* "Veg" toggle pill with aria-pressed */}
                  <button
                    type="button"
                    onClick={() => setVegOnly(!vegOnly)}
                    aria-pressed={vegOnly}
                    className={`min-h-[44px] px-3.5 flex items-center gap-1.5 rounded-full text-xs font-sora font-bold border transition-all active:scale-95 shadow-2xs shrink-0 ${
                      vegOnly
                        ? 'bg-[#0F3D2E] text-white border-[#0F3D2E]'
                        : 'bg-white text-[#0F3D2E] border-[#0F3D2E]/20 hover:border-[#0F3D2E]/50'
                    }`}
                  >
                    <VegMark isVeg={true} size={13} />
                    <span>Veg</span>
                  </button>

                  {/* Sort Filter Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowFilters(!showFilters)}
                    aria-expanded={showFilters}
                    aria-label="Toggle sort options"
                    className={`min-h-[44px] px-3 flex items-center gap-1 rounded-full text-xs font-sora font-bold border transition-all active:scale-95 shadow-2xs shrink-0 ${
                      showFilters || sort
                        ? 'bg-[#0F3D2E] text-white border-[#0F3D2E]'
                        : 'bg-white text-[#0F3D2E] border-[#0F3D2E]/20 hover:border-[#0F3D2E]/50'
                    }`}
                  >
                    <SlidersHorizontal size={14} className={showFilters || sort ? 'text-[#FFF1C9]' : 'text-[#0F3D2E]'} />
                  </button>
                </div>

                {/* Expandable Sort selector */}
                <AnimatePresence>
                  {showFilters && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden"
                    >
                      <div className="flex flex-wrap items-center gap-2 p-2 rounded-[20px] bg-white border border-[#0F3D2E]/15 shadow-xs">
                        <span className="text-xs font-sora font-bold text-[#0F3D2E]/70 px-2">Sort:</span>
                        <div className="flex-1 min-w-[140px]">
                          <select
                            value={sort}
                            onChange={(e) => setSort(e.target.value)}
                            aria-label="Sort dishes"
                            className="w-full min-h-[40px] text-xs font-jakarta font-semibold rounded-xl px-3 py-2 bg-[#FFF1C9]/50 text-[#0F3D2E] border border-[#0F3D2E]/15 focus:outline-none focus:ring-2 focus:ring-[#0F3D2E]"
                          >
                            {SORT_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        </div>
                        {(vegOnly || sort || search) && (
                          <button
                            type="button"
                            onClick={() => { setVegOnly(false); setSort(''); setSearch(''); }}
                            className="text-xs font-sora font-bold text-[var(--menu-accent,#C93A1C)] hover:underline px-2 py-1"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* ─── 5. Category Chips ──────────────────────────────────────────────── */}
            <section
              aria-label="Category Selection"
              className="py-1.5 sticky top-0 z-20 bg-[#FAFAF8]/95 backdrop-blur-md transition-all"
            >
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-fade-right -mx-4 px-4 min-[390px]:-mx-5 min-[390px]:px-5 sm:mx-0 sm:px-0 sm:overflow-visible sm:flex-wrap sm:mask-none py-1 snap-x snap-mandatory">
                {/* "All" chip */}
                <button
                  type="button"
                  onClick={() => handleCategoryClick('all')}
                  className={`snap-start shrink-0 min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-sora font-bold border transition-all active:scale-95 ${
                    selectedCategory === 'all'
                      ? 'bg-[#0F3D2E] text-white border-[#0F3D2E] shadow-sm'
                      : 'bg-white text-stone-700 border-stone-200 hover:border-[#0F3D2E]/40 hover:text-[#0F3D2E] shadow-2xs'
                  }`}
                >
                  <span>All</span>
                  <span
                    className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                      selectedCategory === 'all'
                        ? 'bg-white/20 text-[#FFF1C9]'
                        : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    {categoryCounts.all || 0}
                  </span>
                </button>

                {/* Individual category chips */}
                {categories.map((cat) => {
                  const count = categoryCounts[cat._id] || 0;
                  const isSelected = selectedCategory === cat._id;
                  return (
                    <button
                      key={cat._id}
                      type="button"
                      onClick={() => handleCategoryClick(cat._id)}
                      className={`snap-start shrink-0 min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-sora font-bold border whitespace-nowrap transition-all active:scale-95 ${
                        isSelected
                          ? 'bg-[#0F3D2E] text-white border-[#0F3D2E] shadow-sm'
                          : 'bg-white text-stone-700 border-stone-200 hover:border-[#0F3D2E]/40 hover:text-[#0F3D2E] shadow-2xs'
                      }`}
                    >
                      {/* Clean SVG Lucide icon, strictly no emojis */}
                      {getCategoryIcon(cat.name, isSelected)}
                      <span>{cat.name}</span>
                      {count > 0 && (
                        <span
                          className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                            isSelected
                              ? 'bg-white/20 text-[#FFF1C9]'
                              : 'bg-stone-100 text-stone-600'
                          }`}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* ─── 6. Popular Right Now ─────────────────────────────────── */}
            {loading ? (
              <div className="pt-2 pb-2">
                <h2 className="font-sora font-extrabold text-xl sm:text-2xl text-[#0F3D2E] mb-3">
                  Popular right now
                </h2>
                <PopularSkeleton />
              </div>
            ) : popularItems.length > 0 && selectedCategory === 'all' && !debouncedSearch ? (
              <section aria-label="Popular Dishes" className="pt-2 pb-2">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-sora font-extrabold text-xl sm:text-2xl text-[#0F3D2E]">
                    Popular right now
                  </h2>
                  {/* Prev / Next arrow buttons on tablet and desktop */}
                  <div className="hidden sm:flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => scrollPopular('left')}
                      aria-label="Previous popular dishes"
                      className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full bg-white border border-[#0F3D2E]/15 flex items-center justify-center text-[#0F3D2E] shadow-2xs hover:bg-[#0F3D2E] hover:text-[#FFF1C9] active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F3D2E]"
                    >
                      <ChevronLeft size={18} strokeWidth={2.4} />
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollPopular('right')}
                      aria-label="Next popular dishes"
                      className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full bg-white border border-[#0F3D2E]/15 flex items-center justify-center text-[#0F3D2E] shadow-2xs hover:bg-[#0F3D2E] hover:text-[#FFF1C9] active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F3D2E]"
                    >
                      <ChevronRight size={18} strokeWidth={2.4} />
                    </button>
                  </div>
                </div>

                <div
                  ref={popularRef}
                  className="flex gap-3 overflow-x-auto snap-x snap-mandatory no-scrollbar scroll-fade-right -mx-4 px-4 min-[390px]:-mx-5 min-[390px]:px-5 sm:mx-0 sm:px-0 sm:mask-none pb-2 pt-0.5 scroll-smooth"
                >
                  {popularItems.map((prod) => (
                    <PopularCard
                      key={prod._id}
                      product={prod}
                      onSelect={(p) => setSelectedProduct(p)}
                      isKitchenOpen={operatingStatus.isOpen}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {/* ─── 7. Menu Sections by Category ───────────────────────────────────── */}
            <main id="menu-sections" className="pt-2 space-y-6">
              {loading ? (
                <RowSkeleton />
              ) : menuError ? (
                /* Error State */
                <div className="text-center py-16 px-4 bg-white rounded-[26px] p-6 border border-[#0F3D2E]/10">
                  <div className="w-14 h-14 mx-auto rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-3 border border-red-100">
                    <AlertCircle size={28} />
                  </div>
                  <h2 className="font-sora text-xl font-bold text-[#0F3D2E]">Unable to load menu</h2>
                  <p className="text-xs text-[#0F3D2E]/70 mt-1 max-w-sm mx-auto">{menuError}</p>
                  <button
                    type="button"
                    onClick={() => {
                      clearClientCache();
                      setLoading(true);
                      setMenuError('');
                      setReloadKey((k) => k + 1);
                    }}
                    className="mt-5 inline-flex min-h-[44px] items-center gap-2 px-5 py-2.5 bg-[#0F3D2E] text-white rounded-full text-xs font-sora font-bold shadow-md hover:bg-[#16503D] active:scale-95 transition"
                  >
                    <RotateCcw size={14} />
                    <span>Try Again</span>
                  </button>
                </div>
              ) : products.length === 0 ? (
                /* Empty Filter / Search State */
                <div className="text-center py-16 px-4 bg-white rounded-[26px] p-6 border border-[#0F3D2E]/10">
                  <div className="w-14 h-14 mx-auto rounded-full bg-[#FFF1C9] flex items-center justify-center text-[#0F3D2E] mb-3">
                    <Search size={24} />
                  </div>
                  <h2 className="font-sora text-xl font-bold text-[#0F3D2E]">No matches found</h2>
                  <p className="text-xs text-[#0F3D2E]/70 mt-1 max-w-sm mx-auto font-jakarta">
                    We couldn&apos;t find any items matching &ldquo;{debouncedSearch || 'current filter'}&rdquo;.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      setVegOnly(false);
                      setSort('');
                      setSelectedCategory('all');
                    }}
                    className="mt-5 inline-flex min-h-[44px] items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#0F3D2E] text-[#FFF1C9] text-xs font-sora font-bold shadow-xs hover:bg-[#16503D] active:scale-95 transition"
                  >
                    Clear all filters
                  </button>
                </div>
              ) : (
                /* Grouped Category Sections */
                groupedSections.map((section) => (
                  <section
                    key={section.id}
                    id={`category-section-${section.id}`}
                    className="space-y-3 scroll-mt-20 sm:scroll-mt-24"
                  >
                    <h2 className="font-sora font-extrabold text-xl sm:text-2xl text-[#0F3D2E] tracking-tight pt-1">
                      {section.name}
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 min-[390px]:gap-3.5 sm:gap-4">
                      {section.items.map((prod) => (
                        <MenuItemRow
                          key={prod._id}
                          product={prod}
                          onSelect={(p) => setSelectedProduct(p)}
                          isKitchenOpen={operatingStatus.isOpen}
                        />
                      ))}
                    </div>
                  </section>
                ))
              )}
            </main>
          </div>

          {/* Right Column: Sticky "Your Order" Sidebar for Desktop (1024px+) */}
          <div className="hidden lg:block lg:col-span-4 min-w-0">
            <DesktopOrderSidebar
              onOpenScanner={openScanner}
              isKitchenOpen={operatingStatus.isOpen}
            />
          </div>
        </div>
      </div>

      {/* ─── 8. Floating Order Bar Fixed at Bottom (Mobile & Tablet only) ───────────────────────────── */}
      <AnimatePresence>
        {itemCount > 0 && (
          <motion.div
            initial={{ y: 90, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 90, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-3 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:w-[480px] z-40 pb-[env(safe-area-inset-bottom,0px)] pointer-events-auto lg:hidden"
          >
            <div className="flex items-center justify-between gap-3 bg-[#0F3D2E] text-white rounded-[26px] pl-5 pr-3 py-3 shadow-[0_16px_40px_rgba(15,61,46,0.35)] border border-[#0F3D2E]/20">
              {/* Left: N items + Total in large text */}
              <div className="flex flex-col">
                <span className="text-xs font-jakarta font-medium text-[#FFF1C9]/80 leading-none">
                  {itemCount} {itemCount === 1 ? 'item' : 'items'}
                </span>
                <span className="font-sora font-extrabold text-xl sm:text-2xl text-[#FFF1C9] leading-tight mt-0.5">
                  {formatMoney(grandTotal, tenant.currency)}
                </span>
              </div>

              {/* Right: Tomato "View order" button */}
              <Link
                to="/cart"
                aria-label="View order"
                className="inline-flex min-h-[44px] items-center gap-1.5 bg-[var(--menu-accent,#C93A1C)] text-white font-sora font-extrabold text-sm px-5 py-2.5 rounded-full shadow-sm hover:brightness-105 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <span>View order</span>
                <ArrowRight size={16} strokeWidth={2.5} />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product Details Customization Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <Suspense fallback={null}>
            <ProductModal
              product={selectedProduct}
              onClose={() => setSelectedProduct(null)}
            />
          </Suspense>
        )}
      </AnimatePresence>

      {/* QR Scanner Modal */}
      <AnimatePresence>
        {(showScanner || isScannerOpen) && (
          <Suspense fallback={null}>
            <QrScannerModal
              onClose={() => {
                setShowScanner(false);
                closeScanner();
              }}
              onTableFound={(tableNum, token) => {
                setShowScanner(false);
                closeScanner();
                setTable(tableNum, token);
                navigate(`/menu?tableToken=${encodeURIComponent(token)}`, { replace: true });
              }}
            />
          </Suspense>
        )}
      </AnimatePresence>
    </div>
  );
}
