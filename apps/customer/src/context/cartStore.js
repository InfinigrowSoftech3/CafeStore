import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getTenantSlug, getCustomerStorageKey } from '../utils/tenantHelper';

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      tableNumber: null,
      tableToken: null,
      diningSessionToken: null,
      recentOrders: [],
      isQuickCartOpen: false,
      lastAddedItemKey: null,
      currentSlug: null,

      setTable: (num, token = null) => {
        const current = get();
        const nextNum = num != null ? Number(num) : null;
        const isTableChanged =
          (current.tableNumber != null && nextNum != null && current.tableNumber !== nextNum) ||
          (current.tableToken != null && token != null && current.tableToken !== token);

        if (isTableChanged) {
          set({
            tableNumber: nextNum,
            tableToken: token,
            diningSessionToken: null,
            items: [],
            isQuickCartOpen: false,
            lastAddedItemKey: null,
          });
        } else {
          set({
            tableNumber: nextNum,
            tableToken: token,
          });
        }
      },
      setDiningSessionToken: (token) => set({ diningSessionToken: token }),

      addRecentOrder: (orderInfo) =>
        set((state) => ({
          recentOrders: [
            orderInfo,
            ...state.recentOrders.filter((o) => o.orderId !== orderInfo.orderId),
          ].slice(0, 15),
        })),

      isScannerOpen: false,
      openScanner: () => set({ isScannerOpen: true }),
      closeScanner: () => set({ isScannerOpen: false }),

      openQuickCart: () => set({ isQuickCartOpen: true }),
      closeQuickCart: () => set({ isQuickCartOpen: false }),
      toggleQuickCart: () => set((state) => ({ isQuickCartOpen: !state.isQuickCartOpen })),

      addItem: (product, quantity = 1, addons = [], variant = null, specialInstructions = '') => {
        const { items, tableNumber } = get();

        // Require scanning table QR before adding any item to cart
        if (!tableNumber) {
          get().openScanner();
          return false;
        }

        const key = `${product._id}-${JSON.stringify(addons)}-${variant?.name || ''}-${specialInstructions.trim()}`;

        const basePrice = variant ? variant.price : product.price;
        const addonTotal = addons.reduce((s, a) => s + a.price, 0);
        const unitPrice = basePrice + addonTotal;

        const existing = items.find(i => i.key === key);
        if (existing) {
          set({
            isQuickCartOpen: true,
            lastAddedItemKey: key,
            items: items.map(i =>
              i.key === key
                ? { ...i, quantity: i.quantity + quantity, itemTotal: (i.quantity + quantity) * unitPrice }
                : i
            )
          });
        } else {
          set({
            isQuickCartOpen: true,
            lastAddedItemKey: key,
            items: [...items, {
              key,
              product: product._id,
              name: product.name,
              price: unitPrice,
              image: product.image,
              quantity,
              addons,
              variant,
              specialInstructions,
              itemTotal: unitPrice * quantity,
            }]
          });
        }
        return true;
      },

      removeItem: (key) =>
        set({ items: get().items.filter(i => i.key !== key) }),

      updateQuantity: (key, qty) => {
        if (qty <= 0) {
          set({ items: get().items.filter(i => i.key !== key) });
          return;
        }
        set({
          items: get().items.map(i =>
            i.key === key ? { ...i, quantity: qty, itemTotal: qty * i.price } : i
          )
        });
      },

      clearCart: () => set({ items: [], isQuickCartOpen: false, lastAddedItemKey: null }),
      resetTable: () => set({
        tableNumber: null,
        tableToken: null,
        diningSessionToken: null,
        items: [],
        isQuickCartOpen: false,
        lastAddedItemKey: null,
      }),
    }),
    {
      name: 'customer-cart',
      storage: {
        getItem: (_name) => {
          try {
            const slug = getTenantSlug();
            if (!slug) return null;
            const tenantKey = getCustomerStorageKey(slug, 'cart');
            const raw = localStorage.getItem(tenantKey);
            return raw ? JSON.parse(raw) : null;
          } catch {
            return null;
          }
        },
        setItem: (_name, value) => {
          try {
            const slug = getTenantSlug();
            if (!slug) return;
            const tenantKey = getCustomerStorageKey(slug, 'cart');
            localStorage.setItem(tenantKey, JSON.stringify(value));
          } catch { /* Storage unavailable */ }
        },
        removeItem: (_name) => {
          try {
            const slug = getTenantSlug();
            if (!slug) return;
            const tenantKey = getCustomerStorageKey(slug, 'cart');
            localStorage.removeItem(tenantKey);
          } catch { /* Storage unavailable */ }
        },
      },
      partialize: (state) => ({
        items: state.items,
        tableNumber: state.tableNumber,
        tableToken: state.tableToken,
        recentOrders: state.recentOrders,
        diningSessionToken: state.diningSessionToken,
        currentSlug: getTenantSlug(),
      }),
      merge: (persistedState, currentState) => {
        const slug = getTenantSlug();
        // If persisted cart belongs to a DIFFERENT café slug, do NOT carry items over!
        if (persistedState?.currentSlug && slug && persistedState.currentSlug !== slug) {
          return {
            ...currentState,
            items: [],
            tableNumber: null,
            tableToken: null,
            diningSessionToken: null,
            recentOrders: [],
            currentSlug: slug,
          };
        }
        return {
          ...currentState,
          items: Array.isArray(persistedState?.items) ? persistedState.items : [],
          recentOrders: Array.isArray(persistedState?.recentOrders) ? persistedState.recentOrders : [],
          diningSessionToken: typeof persistedState?.diningSessionToken === 'string' ? persistedState.diningSessionToken : null,
          tableNumber: Number.isInteger(persistedState?.tableNumber) ? persistedState.tableNumber : null,
          tableToken: typeof persistedState?.tableToken === 'string' ? persistedState.tableToken : null,
          currentSlug: slug || persistedState?.currentSlug || null,
        };
      },
    }
  )
);

/**
 * Reactive item count selector — use this in components for always-correct count.
 * Usage: const count = useCartStore(cartItemCount);
 */
export const cartItemCount = (state) =>
  state.items.reduce((s, i) => s + i.quantity, 0);

/**
 * Reactive subtotal selector
 * Usage: const sub = useCartStore(cartSubtotal);
 */
export const cartSubtotal = (state) =>
  state.items.reduce((s, i) => s + i.itemTotal, 0);

export default useCartStore;
