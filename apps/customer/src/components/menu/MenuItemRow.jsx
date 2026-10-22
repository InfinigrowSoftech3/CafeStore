import { useState } from 'react';
import { Plus, Minus, Clock, Utensils, Star, SlidersHorizontal, Heart } from 'lucide-react';
import toast from 'react-hot-toast';
import useCartStore from '../../context/cartStore';
import { useTenant } from '../../context/TenantContext';
import { formatMoney } from '../../utils/money';
import VegMark from './VegMark';

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
      className={`group relative w-full bg-[#FFFDF9] border border-[#EFE4D6] rounded-2xl overflow-hidden select-none transition-all shadow-[0_4px_16px_rgba(90,50,20,0.05)] hover:shadow-[0_8px_24px_rgba(90,50,20,0.1)] hover:border-[#7A3316]/30 ${
        isAvailable ? 'cursor-pointer' : 'opacity-60 grayscale-[40%] cursor-default'
      }`}
    >
      {/* ─── Top: Full-Width Food Image ─── */}
      <div className="relative w-full h-44 bg-[#F3E9DC] border-b border-[#EFE4D6] overflow-hidden rounded-t-2xl">
        {product.image && !imgError ? (
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            decoding="async"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-[#F3E9DC] text-[#7B6B5F]">
            <Utensils size={36} strokeWidth={1.5} />
          </div>
        )}

        {/* Top-Right: Translucent Heart Favorite Button */}
        {onToggleFavorite && (
          <button
            type="button"
            onClick={handleHeartClick}
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            className={`absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all active:scale-90 after:absolute after:-inset-1.5 after:content-[''] ${
              isFavorite
                ? 'bg-[#E23B2E] text-white shadow-xs'
                : 'bg-white/80 text-[#2B1810] hover:bg-white shadow-xs'
            }`}
          >
            <Heart size={15} fill={isFavorite ? 'currentColor' : 'none'} strokeWidth={isFavorite ? 2.5 : 2} />
          </button>
        )}

        {/* Sold Out Overlay */}
        {!isAvailable && (
          <div className="absolute inset-0 bg-[#2B1810]/60 backdrop-blur-[1px] flex items-center justify-center p-2 text-center">
            <span className="bg-[#2B1810] text-[#FFFDF9] text-xs font-bold px-3 py-1.5 uppercase tracking-wider rounded-full border border-white/20 shadow-xs">
              Sold out
            </span>
          </div>
        )}
      </div>

      {/* ─── Bottom: Content Area (Badges, Title, Price, Description, ADD + button) ─── */}
      <div className="p-3.5 bg-[#FFFDF9]">
        {/* Top Badges Row: Veg Mark + BESTSELLER Badge + Prep Time */}
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <VegMark isVeg={isVeg} size={15} />

          {product.popular && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#F3E9DC] border border-[#EFE4D6] px-2.5 py-0.5 text-[10px] font-bold text-[#7A3316] tracking-wider uppercase">
              <Star size={9} fill="currentColor" />
              <span>BESTSELLER</span>
            </span>
          )}

          {product.prepTime && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#7B6B5F]">
              <Clock size={12} className="text-[#7B6B5F]/70" />
              <span>{product.prepTime} mins</span>
            </span>
          )}
        </div>

        {/* Main Content: Details on Left, ADD + Button on Right */}
        <div className="flex items-start justify-between gap-3">
          {/* Left: Product Information */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base text-[#2B1810] leading-snug group-hover:text-[#7A3316] transition-colors">
              {product.name}
            </h3>

            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="font-display font-bold text-base text-[#7A3316]">
                {formatMoney(product.price, tenant.currency)}
              </span>
              {product.originalPrice && product.originalPrice > product.price && (
                <span className="text-xs text-[#7B6B5F] line-through tabular-nums">
                  {formatMoney(product.originalPrice, tenant.currency)}
                </span>
              )}
            </div>

            {product.description && (
              <p className="mt-1 text-xs text-[#7B6B5F] leading-relaxed line-clamp-2">
                {product.description}
              </p>
            )}

            {hasCustomizations && (
              <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[#7A3316]">
                <SlidersHorizontal size={11} />
                <span>Customisable</span>
              </div>
            )}
          </div>

          {/* Right: Rounded Action Button */}
          <div className="shrink-0 pt-0.5" onClick={(e) => e.stopPropagation()}>
            {!isAvailable ? null : totalQtyInCart > 0 && !hasCustomizations ? (
              /* Rounded Quantity Stepper */
              <div className="inline-flex items-center bg-[#FFFDF9] border border-[#7A3316] rounded-full shadow-2xs px-1">
                <button
                  type="button"
                  onClick={handleDecrement}
                  aria-label={`Decrease quantity of ${product.name}`}
                  className="w-11 h-11 flex items-center justify-center rounded-full text-[#7A3316] hover:bg-[#F3E9DC] active:scale-90 transition"
                >
                  <Minus size={13} strokeWidth={2.5} />
                </button>
                <span className="font-bold text-xs px-2 min-w-[22px] text-center text-[#2B1810]">
                  {totalQtyInCart}
                </span>
                <button
                  type="button"
                  onClick={handleIncrement}
                  aria-label={`Increase quantity of ${product.name}`}
                  className="w-11 h-11 flex items-center justify-center rounded-full text-[#7A3316] hover:bg-[#F3E9DC] active:scale-90 transition"
                >
                  <Plus size={13} strokeWidth={2.5} />
                </button>
              </div>
            ) : totalQtyInCart > 0 && hasCustomizations ? (
              /* Customizable item in cart */
              <button
                type="button"
                onClick={() => onSelect(product)}
                aria-label={`Customize ${product.name}`}
                className="min-h-[44px] px-4 bg-[#7A3316] text-[#FFFDF9] font-bold text-xs uppercase tracking-wider shadow-2xs hover:bg-[#5E2610] active:scale-95 transition rounded-full border border-[#7A3316] flex items-center gap-1"
              >
                <span>{totalQtyInCart} IN CART</span>
              </button>
            ) : (
              /* Crisp Rounded ADD + Button */
              <button
                type="button"
                onClick={handleQuickAdd}
                aria-label={`Add ${product.name} to order`}
                className="min-h-[44px] px-5 bg-[#FFFDF9] text-[#7A3316] font-bold text-xs uppercase tracking-wider shadow-2xs border border-[#7A3316] hover:bg-[#7A3316] hover:text-[#FFFDF9] active:scale-95 transition rounded-full flex items-center justify-center gap-1.5"
              >
                <span>ADD</span>
                <Plus size={13} strokeWidth={2.8} />
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
