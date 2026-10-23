import { useState, useEffect, useRef, lazy, Suspense, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Search, UtensilsCrossed, Coffee, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import useCartStore from '../../context/cartStore';
import { getCached, setCached, CATEGORIES_TTL_MS, DEFAULT_TTL_MS } from '../../utils/menuCache';
import { subscribeToLiveStream } from '../../utils/liveStream';
import TableServiceActions from '../../components/table/TableServiceActions';
import { useTenant } from '../../context/TenantContext';
import {
  getResolvedTenantSlug,
  getCustomerSessionItem,
  setCustomerSessionItem,
} from '../../utils/tenantHelper';
import usePageMeta from '../../hooks/usePageMeta';
import { getFavorites, toggleFavorite } from '../../utils/favorites';
import { getCategoryVisual } from '../../utils/categoryIcons';

import CustomerHero from '../../components/menu/CustomerHero';
import CustomerCategoryCircles from '../../components/menu/CustomerCategoryCircles';
import MenuItemRow, { MenuItemSkeleton } from '../../components/menu/MenuItemRow';
import CustomerCategoryBanner from '../../components/menu/CustomerCategoryBanner';
import CustomerSubcategoryTabs from '../../components/menu/CustomerSubcategoryTabs';

const ProductModal = lazy(() => import('../../components/menu/ProductModal'));
const QrScannerModal = lazy(() => import('../../components/ui/QrScannerModal'));

const PRODUCT_GRID_CLASS = 'grid grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] sm:gap-4';
const SKELETON_CARDS = Array.from({ length: 6 }, (_, index) => index);

function getOperatingStatus(tenant) {
  const openingHours = tenant?.openingHours || tenant?.settings?.openingHours || {};
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const todayKey = days[new Date().getDay()];
  const todaySchedule = openingHours[todayKey];

  if (!todaySchedule || !todaySchedule.close) {
    return { isOpen: true, text: 'Kitchen open' };
  }
  if (todaySchedule.isClosed) {
    return { isOpen: false, text: 'Kitchen closed today' };
  }

  const parseMinutes = (tStr) => {
    if (!tStr) return 0;
    const [h, m] = tStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const openMinutes = parseMinutes(todaySchedule.open || '08:00');
  const closeMinutes = parseMinutes(todaySchedule.close || '23:00');

  const isOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes;
  return { isOpen, text: isOpen ? 'Kitchen open' : 'Kitchen closed' };
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
  const urlCategory = searchParams.get('category');

  const {
    items,
    tableNumber,
    tableToken,
    setTable,
    setDiningSessionToken,
    isScannerOpen,
    openScanner,
    closeScanner,
  } = useCartStore();

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(urlCategory || 'all');
  const [selectedSubcategory, setSelectedSubcategory] = useState('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showFullMenu, setShowFullMenu] = useState(false);
  const [favorites, setFavorites] = useState(() => getFavorites(tenant?.slug));

  const isHomeView = selectedCategory === 'all' && !debouncedSearch && !showFullMenu;

  const debounceRef = useRef(null);

  // Broadcast active view changes to bottom nav
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('menu:viewchange', {
        detail: { view: isHomeView ? 'home' : 'category' },
      })
    );
  }, [isHomeView]);

  // Handle bottom navigation events
  useEffect(() => {
    const handleNavHome = () => {
      setShowFullMenu(false);
      setSelectedCategory('all');
      setSelectedSubcategory('all');
      setSearch('');
      setDebouncedSearch('');
      setIsSearchOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    const handleNavMenu = () => {
      setShowFullMenu(true);
      setSelectedCategory('all');
      setSelectedSubcategory('all');
      setSearch('');
      setDebouncedSearch('');
      setIsSearchOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('nav:home', handleNavHome);
    window.addEventListener('nav:menu', handleNavMenu);
    return () => {
      window.removeEventListener('nav:home', handleNavHome);
      window.removeEventListener('nav:menu', handleNavMenu);
    };
  }, []);

  const handleToggleFavorite = (productId) => {
    toggleFavorite(tenant?.slug, productId);
    setFavorites(getFavorites(tenant?.slug));
  };

  // Debounced search handling
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  // Fallback table detection from URL param or namespaced sessionStorage
  useEffect(() => {
    const slug = tenant?.slug || getResolvedTenantSlug();
    if (!tableNumber && slug) {
      const storedTable = getCustomerSessionItem(slug, 'table_number');
      const storedToken = getCustomerSessionItem(slug, 'table_token');
      if (storedTable && !isNaN(Number(storedTable))) {
        setTable(Number(storedTable));
        if (storedToken) setDiningSessionToken(storedToken);
      }
    }
  }, [tableNumber, tenant?.slug, setTable, setDiningSessionToken]);

  // Table QR token verification
  useEffect(() => {
    const effectiveToken = tableTokenParam || tableToken;
    const slug = tenant?.slug || getResolvedTenantSlug();
    if (effectiveToken && slug) {
      setDiningSessionToken(effectiveToken);
      setCustomerSessionItem(slug, 'table_token', effectiveToken);

      api.get(`/tables/verify?token=${effectiveToken}`)
        .then((res) => {
          if (res.data?.tableNumber) {
            setTable(res.data.tableNumber);
            setCustomerSessionItem(slug, 'table_number', res.data.tableNumber);
          }
        })
        .catch(() => {
          if (queryTable && !isNaN(Number(queryTable))) {
            setTable(Number(queryTable));
            setCustomerSessionItem(slug, 'table_number', queryTable);
          }
        });
    } else if (queryTable && !isNaN(Number(queryTable)) && slug) {
      setTable(Number(queryTable));
      setCustomerSessionItem(slug, 'table_number', queryTable);
    }
  }, [tableTokenParam, queryTable, tableToken, tenant?.slug, setTable, setDiningSessionToken]);

  // Load menu categories and products
  useEffect(() => {
    let isMounted = true;
    const slug = tenant?.slug || getResolvedTenantSlug();

    const fetchMenu = async () => {
      const catCacheKey = `categories_${slug}`;
      const prodCacheKey = `products_${slug}`;

      const cachedCats = getCached(catCacheKey);
      const cachedProds = getCached(prodCacheKey);

      if (cachedCats && cachedProds) {
        setCategories(cachedCats);
        setProducts(cachedProds);
        setLoading(false);
      } else {
        setLoading(true);
      }

      try {
        const [catsRes, prodsRes] = await Promise.all([
          api.get('/categories'),
          api.get('/menu?limit=100'),
        ]);

        if (isMounted) {
          const rawCats = Array.isArray(catsRes.data?.categories)
            ? catsRes.data.categories
            : Array.isArray(catsRes.data)
              ? catsRes.data
              : [];
          const rawProds = Array.isArray(prodsRes.data?.products)
            ? prodsRes.data.products
            : Array.isArray(prodsRes.data)
              ? prodsRes.data
              : [];

          const activeCategories = rawCats.filter((c) => c.active !== false);
          setCategories(activeCategories);
          setProducts(rawProds);
          setCached(catCacheKey, activeCategories, CATEGORIES_TTL_MS);
          setCached(prodCacheKey, rawProds, DEFAULT_TTL_MS);
        }
      } catch (err) {
        console.error('Failed to load menu data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchMenu();

    // Subscribe to live menu stream
    const unsubscribe = subscribeToLiveStream('/menu/events', {
      onCategoryChange: (cat) => {
        setCategories((prev) => {
          const exists = prev.find((c) => c._id === cat._id);
          if (exists) {
            return cat.active === false ? prev.filter((c) => c._id !== cat._id) : prev.map((c) => (c._id === cat._id ? cat : c));
          }
          return cat.active === false ? prev : [...prev, cat];
        });
      },
      onProductChange: (prod) => {
        setProducts((prev) => {
          const exists = prev.find((p) => p._id === prod._id);
          if (exists) {
            return prod.available === false ? prev.map((p) => (p._id === prod._id ? prod : p)) : prev.map((p) => (p._id === prod._id ? prod : p));
          }
          return [...prev, prod];
        });
      },
    });

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [tenant?.slug]);

  // First real product photo per category, used for the category circles.
  const categoryImages = useMemo(() => {
    const imagesByCategoryId = {};
    products.forEach((product) => {
      const categoryId = String(
        typeof product.category === 'object' ? product.category?._id : product.category || ''
      );
      const image = product.image || product.imageUrl;
      if (categoryId && image && !imagesByCategoryId[categoryId]) {
        imagesByCategoryId[categoryId] = image;
      }
    });
    return imagesByCategoryId;
  }, [products]);

  // Popular items (flags or top items)
  const popularItems = useMemo(() => {
    const flagged = products.filter((p) => p.popular === true);
    if (flagged.length >= 2) return flagged;
    return products.slice(0, 4);
  }, [products]);

  // Recommended items
  const recommendedItems = useMemo(() => {
    const popIds = new Set(popularItems.map((p) => p._id));
    const others = products.filter((p) => !popIds.has(p._id));
    if (others.length >= 2) return others.slice(0, 4);
    if (products.length >= 4) return products.slice(2, 6);
    return [];
  }, [products, popularItems]);

  // Active category object
  const currentCategory = useMemo(() => {
    if (selectedCategory === 'all') return null;
    return categories.find((c) => c._id === selectedCategory) || null;
  }, [categories, selectedCategory]);

  // Subcategories on active category if available in data model
  const subcategories = useMemo(() => {
    if (!currentCategory) return [];
    if (Array.isArray(currentCategory.subcategories) && currentCategory.subcategories.length > 0) {
      return currentCategory.subcategories;
    }
    if (Array.isArray(currentCategory.subCategories) && currentCategory.subCategories.length > 0) {
      return currentCategory.subCategories;
    }
    return [];
  }, [currentCategory]);

  // Filtered products for active category view or search view
  const categoryProducts = useMemo(() => {
    let list = products;
    if (selectedCategory !== 'all') {
      list = list.filter((p) => {
        const catId = typeof p.category === 'object' ? p.category?._id : p.category;
        return catId === selectedCategory;
      });
    }
    if (selectedSubcategory !== 'all') {
      list = list.filter((p) => {
        return (
          p.subCategory === selectedSubcategory ||
          p.subcategory === selectedSubcategory ||
          p.kitchenStation === selectedSubcategory
        );
      });
    }
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q))
      );
    }
    return list;
  }, [products, selectedCategory, selectedSubcategory, debouncedSearch]);

  const fullMenuSections = useMemo(() => {
    const byCategory = new Map();
    categoryProducts.forEach((product) => {
      const categoryId = String(
        typeof product.category === 'object' ? product.category?._id : product.category || ''
      );
      if (!byCategory.has(categoryId)) byCategory.set(categoryId, []);
      byCategory.get(categoryId).push(product);
    });

    const sections = categories
      .map((category) => ({
        category,
        items: byCategory.get(String(category._id)) || [],
      }))
      .filter((section) => section.items.length > 0);

    const knownCategoryIds = new Set(categories.map((category) => String(category._id)));
    const ungroupedItems = categoryProducts.filter((product) => {
      const categoryId = String(
        typeof product.category === 'object' ? product.category?._id : product.category || ''
      );
      return !knownCategoryIds.has(categoryId);
    });

    if (ungroupedItems.length > 0) {
      sections.push({
        category: { _id: 'more-items', name: 'More Items', icon: '🍽️' },
        items: ungroupedItems,
      });
    }

    return sections;
  }, [categories, categoryProducts]);

  const operatingStatus = useMemo(() => getOperatingStatus(tenant), [tenant]);

  const handleOpenFullMenu = () => {
    setShowFullMenu(true);
    setSelectedCategory('all');
    setSelectedSubcategory('all');
    setSearch('');
    setDebouncedSearch('');
    setIsSearchOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setShowFullMenu(false);
    setSelectedCategory('all');
    setSelectedSubcategory('all');
    setSearch('');
    setDebouncedSearch('');
    setIsSearchOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOrderNow = () => {
    setShowFullMenu(false);
    if (categories.length > 0) {
      setSelectedCategory(categories[0]._id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const el = document.getElementById('content-sheet');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-[100dvh] w-full overflow-x-hidden bg-[#FBF6EF] text-[#2B1810] font-sans antialiased selection:bg-[#7A3316] selection:text-[#FFFDF9]">
      {/* ── Shared fluid content container ── */}
      <div className="customer-container flex flex-col pb-[calc(120px+env(safe-area-inset-bottom,0px))] pt-2">
        {/* ── Menu toolbar: category context + search ── */}
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {!isHomeView && (
              <button
                type="button"
                onClick={handleBack}
                aria-label={showFullMenu ? 'Back to menu home' : 'Back to all categories'}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#EFE4D6] bg-[#FFFDF9] text-[#2B1810] shadow-[0_4px_12px_rgba(90,50,20,0.06)] transition active:scale-95"
              >
                <ArrowLeft size={18} strokeWidth={2.4} />
              </button>
            )}
            <div className="min-w-0">
              <h1 className="truncate font-display text-lg font-bold leading-tight text-[#2B1810]">
                {isHomeView
                  ? 'Our Menu'
                  : showFullMenu
                    ? (debouncedSearch ? `Search: "${debouncedSearch}"` : 'Full Menu')
                    : currentCategory?.name || (debouncedSearch ? `Search: "${debouncedSearch}"` : 'All Menu')}
              </h1>
              <p className="truncate text-[11px] text-[#7B6B5F]">
                {isHomeView
                  ? 'Freshly brewed happiness'
                  : showFullMenu
                    ? (debouncedSearch
                      ? `${categoryProducts.length} items found`
                      : `${products.length} items across ${categories.length} categories`)
                    : currentCategory?.description || (debouncedSearch ? `${categoryProducts.length} items found` : 'Browse every dish and drink')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsSearchOpen((open) => !open)}
            aria-label={isSearchOpen ? 'Close menu search' : 'Search menu items'}
            aria-expanded={isSearchOpen}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#EFE4D6] bg-[#FFFDF9] text-[#2B1810] shadow-[0_4px_12px_rgba(90,50,20,0.06)] transition hover:border-[#7A3316]/30 active:scale-95"
          >
            {isSearchOpen ? <X size={18} strokeWidth={2.2} /> : <Search size={18} strokeWidth={2.2} />}
          </button>
        </div>

        {isSearchOpen && (
          <div className="mb-3 flex w-full items-center gap-2.5 rounded-full border border-[#EFE4D6] bg-[#FFFDF9] px-4 py-2 shadow-[0_4px_16px_rgba(90,50,20,0.06)]">
            <Search size={18} className="shrink-0 text-[#7B6B5F]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search menu items..."
              autoFocus
              className="w-full bg-transparent text-sm text-[#2B1810] placeholder-[#7B6B5F] focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="p-1 text-[#7B6B5F] hover:text-[#2B1810]"
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}

        {/* ── Table Service Quick Actions (when seated) ── */}
        {tableNumber && (
          <div className="mb-3">
            <TableServiceActions />
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            SCREEN 1: HOME SCREEN VIEW (Landing / All Categories)
           ═══════════════════════════════════════════════════════════ */}
        {isHomeView ? (
          <div className="flex flex-col gap-5 animate-in fade-in-50 duration-200">
            {/* 1. Hero Section */}
            <CustomerHero onOrderNow={handleOrderNow} />

            {/* 2. Overlapping Content Sheet */}
            <div
              id="content-sheet"
              className="relative -mt-4 rounded-t-[28px] bg-[#FBF6EF] pt-4 flex flex-col gap-6"
            >
              {/* Category Row (All + café categories) */}
              <CustomerCategoryCircles
                categories={categories}
                selectedCategory={selectedCategory}
                imagesByCategoryId={categoryImages}
                onSelectCategory={(catId) => {
                  setShowFullMenu(false);
                  setSelectedCategory(catId);
                  setSelectedSubcategory('all');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />

              {/* Popular Items Section */}
              {loading && products.length === 0 ? (
                <section aria-label="Loading popular items" className="flex flex-col gap-3">
                  <div className="h-6 w-32 rounded skeleton" />
                  <div className={PRODUCT_GRID_CLASS}>
                    {SKELETON_CARDS.map((card) => (
                      <MenuItemSkeleton key={card} />
                    ))}
                  </div>
                </section>
              ) : popularItems.length >= 2 ? (
                <section aria-labelledby="popular-heading" className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h2
                      id="popular-heading"
                      className="font-display font-bold text-xl text-[#2B1810] tracking-tight"
                    >
                      Popular Items
                    </h2>
                    <button
                      type="button"
                      onClick={handleOpenFullMenu}
                      aria-label="View full menu"
                      className="inline-flex min-h-[44px] items-center gap-1 text-xs font-bold text-[#7A3316] hover:text-[#5E2610] transition-colors"
                    >
                      <span>View All</span>
                      <ArrowRight size={14} strokeWidth={2.4} />
                    </button>
                  </div>

                  {/* Same card on every device; only the column count changes */}
                  <div className={PRODUCT_GRID_CLASS}>
                    {popularItems.map((prod) => (
                      <MenuItemRow
                        key={prod._id}
                        product={prod}
                        onSelect={setSelectedProduct}
                        isFavorite={favorites.includes(String(prod._id))}
                        onToggleFavorite={handleToggleFavorite}
                        isKitchenOpen={operatingStatus.isOpen}
                      />
                    ))}
                  </div>
                </section>
              ) : null}

              {/* Recommended for You Section */}
              {recommendedItems.length >= 2 && (
                <section aria-labelledby="recommended-heading" className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h2
                      id="recommended-heading"
                      className="font-display font-bold text-xl text-[#2B1810] tracking-tight"
                    >
                      Recommended for You
                    </h2>
                    <button
                      type="button"
                      onClick={handleOpenFullMenu}
                      aria-label="View full menu"
                      className="inline-flex min-h-[44px] items-center gap-1 text-xs font-bold text-[#7A3316] hover:text-[#5E2610] transition-colors"
                    >
                      <span>View All</span>
                      <ArrowRight size={14} strokeWidth={2.4} />
                    </button>
                  </div>

                  {/* Same card on every device; only the column count changes */}
                  <div className={PRODUCT_GRID_CLASS}>
                    {recommendedItems.map((prod) => (
                      <MenuItemRow
                        key={prod._id}
                        product={prod}
                        onSelect={setSelectedProduct}
                        isFavorite={favorites.includes(String(prod._id))}
                        onToggleFavorite={handleToggleFavorite}
                        isKitchenOpen={operatingStatus.isOpen}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Full Menu entry point */}
              {products.length > 0 && (
                <section aria-labelledby="full-menu-cta-heading" className="flex flex-col gap-3">
                  <div className="flex items-end justify-between gap-3">
                    <h2
                      id="full-menu-cta-heading"
                      className="font-display font-bold text-xl text-[#2B1810] tracking-tight"
                    >
                      Full Menu
                    </h2>
                    <span className="text-[11px] font-semibold text-[#7B6B5F]">
                      {products.length} items
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleOpenFullMenu}
                    className="group flex w-full items-center justify-between gap-4 rounded-[20px] border border-[#EFE4D6] bg-[#FFFDF9] p-4 text-left shadow-[0_4px_16px_rgba(90,50,20,0.05)] transition hover:border-[#7A3316]/30 hover:shadow-[0_8px_24px_rgba(90,50,20,0.08)] active:scale-[0.99]"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#F3E9DC] text-[#7A3316]">
                        <UtensilsCrossed size={22} strokeWidth={1.8} />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-display text-base font-bold leading-tight text-[#2B1810]">
                          Every dish &amp; drink
                        </span>
                        <span className="mt-0.5 block text-xs leading-relaxed text-[#7B6B5F]">
                          Browse all {products.length} items across {categories.length} categories
                        </span>
                      </span>
                    </span>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#7A3316] text-[#FFFDF9] transition group-hover:bg-[#5E2610]">
                      <ArrowRight size={17} strokeWidth={2.4} />
                    </span>
                  </button>
                </section>
              )}

              {/* Friendly empty state for a menu with no available products */}
              {!loading && products.length === 0 && (
                <section className="flex flex-col items-center justify-center rounded-[20px] border border-[#EFE4D6] bg-[#FFFDF9] px-6 py-12 text-center shadow-[0_4px_16px_rgba(90,50,20,0.05)]">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#F3E9DC] text-[#7A3316]">
                    <Coffee size={26} strokeWidth={1.8} />
                  </div>
                  <h2 className="font-display text-lg font-bold text-[#2B1810]">
                    The menu is being refreshed
                  </h2>
                  <p className="mt-1 max-w-xs text-xs leading-relaxed text-[#7B6B5F]">
                    No items are available right now. Please check back in a little while.
                  </p>
                </section>
              )}
            </div>
          </div>
        ) : showFullMenu ? (
          /* ═══════════════════════════════════════════════════════════
              SCREEN 2: FULL MENU VIEW
             ═══════════════════════════════════════════════════════════ */
          <div className="flex flex-col gap-5 animate-in fade-in-50 duration-200">
            {loading && products.length === 0 ? (
              <div className={PRODUCT_GRID_CLASS}>
                {SKELETON_CARDS.map((card) => (
                  <MenuItemSkeleton key={card} />
                ))}
              </div>
            ) : debouncedSearch ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-end justify-between gap-3">
                  <h2 className="font-display font-bold text-xl text-[#2B1810] tracking-tight">
                    Search Results
                  </h2>
                  <span className="text-[11px] font-semibold text-[#7B6B5F]">
                    {categoryProducts.length} found
                  </span>
                </div>

                {categoryProducts.length > 0 ? (
                  <div className={PRODUCT_GRID_CLASS}>
                    {categoryProducts.map((prod) => (
                      <MenuItemRow
                        key={prod._id}
                        product={prod}
                        onSelect={setSelectedProduct}
                        isFavorite={favorites.includes(String(prod._id))}
                        onToggleFavorite={handleToggleFavorite}
                        isKitchenOpen={operatingStatus.isOpen}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-[20px] border border-[#EFE4D6] bg-[#FFFDF9] px-6 py-12 text-center shadow-[0_4px_16px_rgba(90,50,20,0.05)]">
                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#F3E9DC] text-[#7A3316]">
                      <Search size={22} />
                    </div>
                    <h3 className="font-display text-lg font-bold text-[#2B1810]">
                      No matches found
                    </h3>
                    <p className="mt-1 max-w-xs text-xs text-[#7B6B5F]">
                      No dishes matched &ldquo;{debouncedSearch}&rdquo;. Try another term.
                    </p>
                  </div>
                )}
              </div>
            ) : fullMenuSections.length > 0 ? (
              <>
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {fullMenuSections.map(({ category, items }) => (
                    <button
                      key={category._id}
                      type="button"
                      onClick={() => {
                        document
                          .getElementById(`full-menu-${category._id}`)
                          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#EFE4D6] bg-[#FFFDF9] px-3 py-2 text-[11px] font-semibold text-[#2B1810] shadow-[0_2px_8px_rgba(90,50,20,0.04)] transition hover:border-[#7A3316]/30 active:scale-95"
                    >
                      <span>{getCategoryVisual(category)}</span>
                      <span>{category.name}</span>
                      <span className="rounded-full bg-[#F3E9DC] px-1.5 py-0.5 text-[10px] font-bold text-[#7A3316]">
                        {items.length}
                      </span>
                    </button>
                  ))}
                </div>

                {fullMenuSections.map(({ category, items }) => (
                  <section
                    key={category._id}
                    id={`full-menu-${category._id}`}
                    aria-labelledby={`full-menu-heading-${category._id}`}
                    className="flex scroll-mt-24 flex-col gap-3"
                  >
                    <div className="flex items-end justify-between gap-3 border-b border-[#EFE4D6] pb-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="text-xl leading-none">{getCategoryVisual(category)}</span>
                        <h2
                          id={`full-menu-heading-${category._id}`}
                          className="truncate font-display text-lg font-bold leading-tight text-[#2B1810]"
                        >
                          {category.name}
                        </h2>
                      </div>
                      <span className="shrink-0 text-[11px] font-semibold text-[#7B6B5F]">
                        {items.length} {items.length === 1 ? 'item' : 'items'}
                      </span>
                    </div>

                    <div className={PRODUCT_GRID_CLASS}>
                      {items.map((prod) => (
                        <MenuItemRow
                          key={prod._id}
                          product={prod}
                          onSelect={setSelectedProduct}
                          isFavorite={favorites.includes(String(prod._id))}
                          onToggleFavorite={handleToggleFavorite}
                          isKitchenOpen={operatingStatus.isOpen}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-[20px] border border-[#EFE4D6] bg-[#FFFDF9] px-6 py-12 text-center shadow-[0_4px_16px_rgba(90,50,20,0.05)]">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#F3E9DC] text-[#7A3316]">
                  <UtensilsCrossed size={24} />
                </div>
                <h3 className="font-display text-lg font-bold text-[#2B1810]">
                  Full menu is being refreshed
                </h3>
                <p className="mt-1 max-w-xs text-xs leading-relaxed text-[#7B6B5F]">
                  No items are available right now. Please check back in a little while.
                </p>
              </div>
            )}
          </div>
        ) : (
          /* ═══════════════════════════════════════════════════════════
              SCREEN 3: CATEGORY / MENU ITEMS VIEW
             ═══════════════════════════════════════════════════════════ */
          <div className="flex flex-col gap-4 animate-in fade-in-50 duration-200">
            {/* Category Banner Card */}
            {currentCategory && <CustomerCategoryBanner category={currentCategory} />}

            {/* Products share the page container; no nested card-in-card padding */}
            <div className="flex flex-col gap-3">
              {/* Optional Subcategories pill row if present in data model */}
              {subcategories.length > 0 && (
                <CustomerSubcategoryTabs
                  subcategories={subcategories}
                  selectedSubcategory={selectedSubcategory}
                  onSelectSubcategory={setSelectedSubcategory}
                />
              )}

              {/* Items List in the same card layout */}
              {loading && products.length === 0 ? (
                <div className={PRODUCT_GRID_CLASS}>
                  {SKELETON_CARDS.map((card) => (
                    <MenuItemSkeleton key={card} />
                  ))}
                </div>
              ) : categoryProducts.length > 0 ? (
                <div className={PRODUCT_GRID_CLASS}>
                  {categoryProducts.map((prod) => (
                    <MenuItemRow
                      key={prod._id}
                      product={prod}
                      onSelect={setSelectedProduct}
                      isFavorite={favorites.includes(String(prod._id))}
                      onToggleFavorite={handleToggleFavorite}
                      isKitchenOpen={operatingStatus.isOpen}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-[20px] border border-[#EFE4D6] bg-[#FFFDF9] px-6 py-16 text-center shadow-[0_4px_16px_rgba(90,50,20,0.05)]">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#F3E9DC] text-[#7A3316]">
                    <UtensilsCrossed size={24} />
                  </div>
                  <h3 className="font-display text-lg font-bold text-[#2B1810]">
                    No items found
                  </h3>
                  <p className="mt-1 max-w-xs text-xs text-[#7B6B5F]">
                    {debouncedSearch
                      ? `No dishes matched "${debouncedSearch}". Try another term.`
                      : 'This category does not have available items at the moment.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory('all');
                      setSearch('');
                      setDebouncedSearch('');
                    }}
                    className="mt-4 rounded-full bg-[#7A3316] px-5 py-2 text-xs font-bold text-[#FFFDF9] shadow-xs transition hover:bg-[#5E2610]"
                  >
                    Browse All Items
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Product Customization Modal ── */}
      <Suspense fallback={null}>
        {selectedProduct && (
          <ProductModal
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
          />
        )}
      </Suspense>

      {/* ── QR Scanner Modal ── */}
      <Suspense fallback={null}>
        {(isScannerOpen || showScanner) && (
          <QrScannerModal
            isOpen={isScannerOpen || showScanner}
            onClose={() => {
              closeScanner();
              setShowScanner(false);
            }}
          />
        )}
      </Suspense>
    </div>
  );
}
