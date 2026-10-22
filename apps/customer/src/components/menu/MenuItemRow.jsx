import { useState } from 'react';
import { Plus, Minus, Clock, Coffee, Star, SlidersHorizontal, Heart } from 'lucide-react';
import toast from 'react-hot-toast';
import useCartStore from '../../context/cartStore';
import { useTenant } from '../../context/TenantContext';
import VegMark from './VegMark';

const CURRENCY_MAP = {
  '₹': 'INR',
  '$': 'USD',
  '€': 'EUR',
  '£': 'GBP',
};

function formatCardPrice(value, currency = 'INR') {
  const num = Number(value || 0);
  const normalized = CURRENCY_MAP[currency] || (currency && currency.length === 3 ? currency.toUpperCase() : 'INR');
  const fractionDigits = Number.isInteger(num) ? 0 : 2;

  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: normalized,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(num);
  } catch {
    return `₹${num.toLocaleString('en-IN', {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    })}`;
  }
}

export function MenuItemSkeleton() {
  return (
    <article
      aria-hidden="true"
      className="flex aspect-square h-full w-full flex-col overflow-hidden rounded-none border border-[#EFE4D6] bg-[#FFFDF9] shadow-[0_4px_16px_rgba(90,50,20,0.05)] sm:aspect-auto"
    >
      <div className="aspect-auto min-h-0 w-full flex-1 skeleton sm:aspect-[4/3] sm:flex-none" />
      <div className="flex flex-none flex-col p-3 sm:flex-1">
        <div className="mb-2 flex items-center gap-2">
          <span className="h-4 w-4 rounded-[4px] skeleton" />
          <span className="h-3 w-14 rounded-full skeleton" />
        </div>
        <span className="h-4 w-4/5 rounded skeleton" />
        <span className="mt-1 h-4 w-3/5 rounded skeleton" />
        <span className="mt-2 h-3 w-full rounded skeleton" />
        <span className="mt-1 h-3 w-4/5 rounded skeleton" />
        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <span className="h-5 w-12 rounded skeleton" />
          <span className="h-9 min-w-[68px] rounded-full skeleton" />
        </div>
      </div>
    </article>
  );
}

export default function MenuItemRow({
  product,
  onSelect,
  isFavorite = false,
  onToggleFavorite,
  isKitchenOpen = true,
}) {
  const tenant = useTenant();
  const { items, addItem, updateQuantity, tableNumber, openScanner } = useCartStore();
  const [imgError, setImgError] = useState(false);

  // Availability calculation
  const isAvailable =
    isKitchenOpen &&
    product.available !== false &&
    product.scheduledAvailable !== false &&
    product.inventoryAvailable !== false;

  const hasCustomizations =
    (product.addons && product.addons.length > 0) ||
    (product.variants && product.variants.length > 0);

  const cartItems = items.filter((i) => i.product === product._id);
  const totalQtyInCart = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  const handleQuickAdd = (e) => {
    e.stopPropagation();
    if (!isAvailable) return;

    if (!tableNumber) {
      toast.error('Please scan your table QR code to order!');
      openScanner();
      return;
    }

    if (hasCustomizations) {
      onSelect(product);
      return;
    }

    const added = addItem(product, 1, [], null, '');
    if (added) {
      toast.success(`${product.name} added!`);
    }
  };

  const handleIncrement = (e) => {
    e.stopPropagation();
    if (!isAvailable) return;
    if (hasCustomizations) {
      onSelect(product);
      return;
    }
    const added = addItem(product, 1, [], null, '');
    if (added) {
      toast.success(`Added another ${product.name}`);
    }
  };

  const handleDecrement = (e) => {
    e.stopPropagation();
    if (hasCustomizations) {
      if (cartItems.length === 1) {
        updateQuantity(cartItems[0].key, cartItems[0].quantity - 1);
      } else {
        onSelect(product);
      }
      return;
    }
    if (cartItems.length > 0) {
      updateQuantity(cartItems[0].key, cartItems[0].quantity - 1);
    }
  };

  const handleHeartClick = (e) => {
    e.stopPropagation();
    if (onToggleFavorite) {
      onToggleFavorite(product._id);
    }
  };

  const isVeg = product.isVeg !== undefined ? product.isVeg : product.isVegetarian !== false;

  return (
    <article
      onClick={isAvailable ? () => onSelect(product) : undefined}
      className={`group flex aspect-square h-full w-full flex-col overflow-hidden rounded-none border border-[#EFE4D6] bg-[#FFFDF9] shadow-[0_4px_16px_rgba(90,50,20,0.05)] select-none transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-[#7A3316]/30 hover:shadow-[0_10px_26px_rgba(90,50,20,0.12)] sm:aspect-auto ${
        isAvailable ? 'cursor-pointer' : 'cursor-default opacity-60 grayscale-[40%]'
      }`}
    >
      {/* Full-width food image */}
      <div className="relative aspect-auto min-h-0 w-full flex-1 overflow-hidden border-b border-[#EFE4D6] bg-[#F3E9DC] sm:aspect-[4/3] sm:flex-none">
        {product.image && !imgError ? (
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            decoding="async"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#F7EDDE] via-[#F3E9DC] to-[#E6D2B8]">
            <Coffee size={40} strokeWidth={1.5} className="text-[#9A7658]" aria-hidden="true" />
          </div>
        )}

        {/* Bestseller overlay — kept out of the meta row */}
        {product.popular && (
          <span className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-full border border-[#E8D3B9] bg-[#FFFDF9]/95 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-[#7A3316] shadow-sm backdrop-blur-sm">
            <Star size={9} fill="currentColor" />
            <span>Bestseller</span>
          </span>
        )}

        {/* 36px wishlist button */}
        {onToggleFavorite && (
          <button
            type="button"
            onClick={handleHeartClick}
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            className={`absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full shadow-sm backdrop-blur-md transition-all after:absolute after:-inset-1.5 after:content-[''] active:scale-90 ${
              isFavorite
                ? 'bg-[#E23B2E] text-white'
                : 'bg-white/90 text-[#2B1810] hover:bg-white'
            }`}
          >
            <Heart size={16} fill={isFavorite ? 'currentColor' : 'none'} strokeWidth={isFavorite ? 2.5 : 2} />
          </button>
        )}

        {/* Sold out overlay */}
        {!isAvailable && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#2B1810]/60 p-2 text-center backdrop-blur-[1px]">
            <span className="rounded-full border border-white/20 bg-[#2B1810] px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#FFFDF9] shadow-sm">
              Sold out
            </span>
          </div>
        )}
      </div>

      {/* Content: meta, full-width name/description, then pinned footer */}
      <div className="flex flex-none flex-col p-3 sm:flex-1">
        <div className="mb-1.5 flex items-center gap-2 whitespace-nowrap text-[11px] font-medium text-[#7B6B5F]">
          <VegMark isVeg={isVeg} size={15} />
          <span className="inline-flex items-center gap-1">
            <Clock size={12} className="text-[#7B6B5F]/70" />
            <span>{product.prepTime || 10} mins</span>
          </span>
        </div>

        <h3 className="line-clamp-2 min-h-0 w-full text-base font-semibold leading-[1.3] text-[#2B1810] transition-colors group-hover:text-[#7A3316] sm:min-h-[2.6em]">
          {product.name}
        </h3>

        {product.description && (
          <p className="mt-1 line-clamp-2 w-full text-[0.8125rem] leading-[1.45] text-[#7B6B5F]">
            {product.description}
          </p>
        )}

        {hasCustomizations && (
          <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-[#7A3316]">
            <SlidersHorizontal size={11} />
            <span>Customisable</span>
          </div>
        )}

        {/* Footer stays at the bottom of every card */}
        <div className="mt-auto flex items-center justify-between gap-2 pt-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex min-w-0 items-baseline gap-1.5">
            <span className="font-jakarta text-[17px] font-bold leading-none tracking-tight tabular-nums text-[#7A3316]">
              {formatCardPrice(product.price, tenant?.currency)}
            </span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="truncate text-[11px] text-[#7B6B5F] line-through tabular-nums">
                {formatCardPrice(product.originalPrice, tenant?.currency)}
              </span>
            )}
          </div>

          <div className="shrink-0">
            {!isAvailable ? null : totalQtyInCart > 0 && !hasCustomizations ? (
              <div className="inline-flex h-9 shrink-0 items-center rounded-full border border-[#7A3316] bg-[#FFFDF9] px-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={handleDecrement}
                  aria-label={`Decrease quantity of ${product.name}`}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[#7A3316] transition hover:bg-[#F3E9DC] active:scale-90"
                >
                  <Minus size={12} strokeWidth={2.5} />
                </button>
                <span className="min-w-[18px] px-0.5 text-center text-xs font-bold text-[#2B1810]">
                  {totalQtyInCart}
                </span>
                <button
                  type="button"
                  onClick={handleIncrement}
                  aria-label={`Increase quantity of ${product.name}`}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[#7A3316] transition hover:bg-[#F3E9DC] active:scale-90"
                >
                  <Plus size={12} strokeWidth={2.5} />
                </button>
              </div>
            ) : totalQtyInCart > 0 && hasCustomizations ? (
              <button
                type="button"
                onClick={() => onSelect(product)}
                aria-label={`Customize ${product.name}`}
                className="flex h-9 min-w-[68px] shrink-0 items-center justify-center gap-1 rounded-full border border-[#7A3316] bg-[#7A3316] px-2.5 text-[10px] font-bold uppercase tracking-wide text-[#FFFDF9] shadow-2xs transition hover:bg-[#5E2610] active:scale-95"
              >
                <span>{totalQtyInCart} IN CART</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleQuickAdd}
                aria-label={`Add ${product.name} to order`}
                className="flex h-9 min-w-[68px] shrink-0 items-center justify-center gap-1 rounded-full border border-[#7A3316] bg-[#FFFDF9] px-3 text-xs font-bold uppercase tracking-wider text-[#7A3316] shadow-2xs transition hover:bg-[#7A3316] hover:text-[#FFFDF9] active:scale-95 active:bg-[#5E2610] active:text-[#FFFDF9]"
              >
                <span>ADD</span>
                <Plus size={12} strokeWidth={2.8} />
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
