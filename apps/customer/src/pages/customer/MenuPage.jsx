import { useState, useEffect, useRef, lazy, Suspense, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowRight, UtensilsCrossed, Sparkles } from 'lucide-react';
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

import CustomerScreenHeader from '../../components/menu/CustomerScreenHeader';
import CustomerHero from '../../components/menu/CustomerHero';
import CustomerCategoryCircles from '../../components/menu/CustomerCategoryCircles';
import MenuItemRow from '../../components/menu/MenuItemRow';
import CustomerCategoryBanner from '../../components/menu/CustomerCategoryBanner';
import CustomerSubcategoryTabs from '../../components/menu/CustomerSubcategoryTabs';
import CustomerBottomNav from '../../components/ui/CustomerBottomNav';

const ProductModal = lazy(() => import('../../components/menu/ProductModal'));
const QrScannerModal = lazy(() => import('../../components/ui/QrScannerModal'));

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
  const [favorites, setFavorites] = useState(() => getFavorites(tenant?.slug));

  const isHomeView = selectedCategory === 'all' && !debouncedSearch;

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
      setSelectedCategory('all');
      setSearch('');
      setDebouncedSearch('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    const handleNavMenu = () => {
      if (categories.length > 0) {
        setSelectedCategory(categories[0]._id);
      }
    };
    window.addEventListener('nav:home', handleNavHome);
    window.addEventListener('nav:menu', handleNavMenu);
    return () => {
      window.removeEventListener('nav:home', handleNavHome);
      window.removeEventListener('nav:menu', handleNavMenu);
    };
  }, [categories]);

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
          api.get('/menu'),
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

  const operatingStatus = useMemo(() => getOperatingStatus(tenant), [tenant]);

  const handleOrderNow = () => {
    if (categories.length > 0) {
      setSelectedCategory(categories[0]._id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const el = document.getElementById('content-sheet');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleViewAllPopular = () => {
    if (categories.length > 0) {
      setSelectedCategory(categories[0]._id);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FBF6EF] text-[#2B1810] font-sans antialiased selection:bg-[#7A3316] selection:text-[#FFFDF9]">
      {/* ── Main Container (Centered, max 1200px) ── */}
      <div className="mx-auto w-full max-w-[1200px] px-4 min-[390px]:px-5 sm:px-6 lg:px-8 pt-2 pb-32 md:pb-16 flex flex-col">
        {/* ── Responsive Screen Header ── */}
        <CustomerScreenHeader
          mode={isHomeView ? 'home' : 'category'}
          categoryName={currentCategory?.name || (debouncedSearch ? `Search: "${debouncedSearch}"` : 'All Menu')}
          categorySubtitle={currentCategory?.description || (debouncedSearch ? `${categoryProducts.length} items found` : 'Freshly brewed happiness')}
          onBack={() => {
            setSelectedCategory('all');
            setSearch('');
            setDebouncedSearch('');
          }}
          onOpenSearch={() => setIsSearchOpen(!isSearchOpen)}
          isSearchOpen={isSearchOpen}
          searchValue={search}
          onSearchChange={setSearch}
          onClearSearch={() => setSearch('')}
          activeTab={isHomeView ? 'home' : 'menu'}
          onSelectHome={() => {
            setSelectedCategory('all');
            setSearch('');
            setDebouncedSearch('');
          }}
          onSelectMenu={() => {
            if (categories.length > 0) setSelectedCategory(categories[0]._id);
          }}
        />

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
          <div className="flex flex-col gap-5 sm:gap-7 animate-in fade-in-50 duration-200">
            {/* 1. Hero Section */}
            <CustomerHero onOrderNow={handleOrderNow} />

            {/* 2. Overlapping Content Sheet */}
            <div
              id="content-sheet"
              className="relative -mt-4 sm:-mt-6 rounded-t-[28px] sm:rounded-t-[32px] bg-[#FBF6EF] pt-4 sm:pt-6 flex flex-col gap-6 sm:gap-8"
            >
              {/* Category Row (5 Circular Icon Buttons) */}
              <CustomerCategoryCircles
                categories={categories}
                selectedCategory={selectedCategory}
                onSelectCategory={(catId) => {
                  setSelectedCategory(catId);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />

              {/* Popular Items Section */}
              {popularItems.length >= 2 && (
                <section aria-labelledby="popular-heading" className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h2
                      id="popular-heading"
                      className="font-display font-bold text-xl sm:text-2xl text-[#2B1810] tracking-tight"
                    >
                      Popular Items
                    </h2>
                    <button
                      type="button"
                      onClick={handleViewAllPopular}
                      aria-label="View all popular items"
                      className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-[#7A3316] hover:text-[#5E2610] transition-colors"
                    >
                      <span>View All</span>
                      <ArrowRight size={14} strokeWidth={2.4} />
                    </button>
                  </div>

                  {/* Responsive Grid of Food Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
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
              )}

              {/* Recommended for You Section */}
              {recommendedItems.length >= 2 && (
                <section aria-labelledby="recommended-heading" className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h2
                      id="recommended-heading"
                      className="font-display font-bold text-xl sm:text-2xl text-[#2B1810] tracking-tight"
                    >
                      Recommended for You
                    </h2>
                    <button
                      type="button"
                      onClick={handleViewAllPopular}
                      aria-label="View all recommendations"
                      className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-[#7A3316] hover:text-[#5E2610] transition-colors"
                    >
                      <span>View All</span>
                      <ArrowRight size={14} strokeWidth={2.4} />
                    </button>
                  </div>

                  {/* Responsive Grid of Food Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
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
            </div>
          </div>
        ) : (
          /* ═══════════════════════════════════════════════════════════
              SCREEN 2: CATEGORY / MENU ITEMS VIEW
             ═══════════════════════════════════════════════════════════ */
          <div className="flex flex-col gap-4 sm:gap-6 animate-in fade-in-50 duration-200">
            {/* Category Banner Card */}
            {currentCategory && <CustomerCategoryBanner category={currentCategory} />}

            {/* Category White Content Sheet */}
            <div className="rounded-[24px] sm:rounded-[28px] bg-[#FFFDF9] border border-[#EFE4D6] p-4 sm:p-6 shadow-[0_4px_20px_rgba(90,50,20,0.05)] flex flex-col">
              {/* Optional Subcategories pill row if present in data model */}
              {subcategories.length > 0 && (
                <CustomerSubcategoryTabs
                  subcategories={subcategories}
                  selectedSubcategory={selectedSubcategory}
                  onSelectSubcategory={setSelectedSubcategory}
                />
              )}

              {/* Items List (Single-column on mobile, 2-column grid at 768px+) */}
              {categoryProducts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
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
                <div className="py-16 text-center flex flex-col items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-[#F3E9DC] text-[#7A3316] flex items-center justify-center mb-3">
                    <UtensilsCrossed size={24} />
                  </div>
                  <h3 className="font-display font-bold text-lg text-[#2B1810]">
                    No items found
                  </h3>
                  <p className="text-xs text-[#7B6B5F] mt-1 max-w-xs">
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
                    className="mt-4 px-5 py-2 rounded-full bg-[#7A3316] text-[#FFFDF9] text-xs font-bold shadow-xs hover:bg-[#5E2610] transition"
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
