import { useState } from 'react';
import { Plus, Minus, Clock, Utensils, Star, SlidersHorizontal } from 'lucide-react';
import toast from 'react-hot-toast';
import useCartStore from '../../context/cartStore';
import { useTenant } from '../../context/TenantContext';
import { formatMoney } from '../../utils/money';
import VegMark from './VegMark';

export default function MenuItemRow({ product, onSelect, isKitchenOpen = true }) {
  const tenant = useTenant();
  const { items, addItem, updateQuantity, tableNumber, openScanner } = useCartStore();
  const [imgError, setImgError] = useState(false);

  // Availability calculation
  const isAvailable =
    isKitchenOpen &&
    product.available &&
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

  return (
    <article
      onClick={isAvailable ? () => onSelect(product) : undefined}
      className={`group relative w-full bg-white p-4 sm:p-5 flex flex-row items-start justify-between gap-3 sm:gap-4 select-none transition-colors border-b border-stone-200 last:border-b-0 ${
        isAvailable
          ? 'cursor-pointer hover:bg-stone-50/70'
          : 'opacity-60 grayscale-[40%] cursor-default'
      }`}
    >
      {/* ─── Left: Food Information (Title, Badges, Price, Description) ─── */}
      <div className="flex-1 min-w-0 pr-1 sm:pr-2">
        {/* Top Badges Row: Veg Mark + Popular Tag + Prep Time */}
        <div className="flex flex-wrap items-center gap-2 mb-1.5">
          <VegMark isVeg={product.isVeg} size={15} />

          {product.popular && (
            <span className="inline-flex items-center gap-1 rounded-none bg-[#FFF1C9] border border-amber-300 px-2 py-0.5 text-[10px] font-sora font-extrabold text-[#0F3D2E] tracking-wider uppercase">
              <Star size={9} fill="currentColor" />
              <span>Bestseller</span>
            </span>
          )}

          {product.prepTime && (
            <span className="inline-flex items-center gap-1 text-[11px] font-jakarta font-medium text-stone-500">
              <Clock size={11} className="text-stone-400" />
              <span>{product.prepTime} mins</span>
            </span>
          )}
        </div>

        {/* Product Title */}
        <h3 className="font-sora font-bold text-base sm:text-lg text-stone-900 leading-snug group-hover:text-[#0F3D2E] transition-colors">
          {product.name}
        </h3>

        {/* Product Price */}
        <div className="flex items-baseline gap-2 mt-1">
          <span className="font-sora font-extrabold text-sm sm:text-base text-[#0F3D2E]">
            {formatMoney(product.price, tenant.currency)}
          </span>
          {product.originalPrice && product.originalPrice > product.price && (
            <span className="text-xs text-stone-400 line-through tabular-nums font-jakarta">
              {formatMoney(product.originalPrice, tenant.currency)}
            </span>
          )}
        </div>

        {/* Product Description */}
        {product.description && (
          <p className="mt-2 text-xs sm:text-sm text-stone-500 font-jakarta leading-relaxed line-clamp-2 sm:line-clamp-3">
            {product.description}
          </p>
        )}

        {/* Customisable Indicator */}
        {hasCustomizations && (
          <div className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-sora font-semibold text-[#0F3D2E]">
            <SlidersHorizontal size={11} />
            <span>Customisable</span>
          </div>
        )}
      </div>

      {/* ─── Right: Square Food Image & Square Action Button ─── */}
      <div className="shrink-0 flex flex-col items-center">
        <div className="relative w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 aspect-square overflow-hidden bg-stone-100 border border-stone-200 rounded-none">
          {product.image && !imgError ? (
            <img
              src={product.image}
              alt={product.name}
              loading="lazy"
              decoding="async"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-stone-100 text-stone-400">
              <Utensils size={28} strokeWidth={1.5} />
            </div>
          )}

          {/* Sold Out Overlay */}
          {!isAvailable && (
            <div className="absolute inset-0 bg-stone-900/65 backdrop-blur-[1px] flex items-center justify-center p-2 text-center">
              <span className="bg-stone-900 text-white text-[10px] sm:text-xs font-sora font-extrabold px-2.5 py-1 uppercase tracking-wider rounded-none border border-white/20 shadow-xs">
                Sold out
              </span>
            </div>
          )}
        </div>

        {/* Square ADD Button or Quantity Stepper */}
        <div className="-mt-4 relative z-10" onClick={(e) => e.stopPropagation()}>
          {!isAvailable ? null : totalQtyInCart > 0 && !hasCustomizations ? (
            /* Square Quantity Stepper */
            <div className="inline-flex items-center bg-[#0F3D2E] text-white shadow-md border border-[#0F3D2E] rounded-none">
              <button
                type="button"
                onClick={handleDecrement}
                aria-label={`Decrease quantity of ${product.name}`}
                className="w-8 h-8 flex items-center justify-center hover:bg-white/20 active:scale-95 transition"
              >
                <Minus size={14} strokeWidth={2.5} />
              </button>
              <span className="font-sora font-extrabold text-xs px-2 min-w-[22px] text-center text-white">
                {totalQtyInCart}
              </span>
              <button
                type="button"
                onClick={handleIncrement}
                aria-label={`Increase quantity of ${product.name}`}
                className="w-8 h-8 flex items-center justify-center hover:bg-white/20 active:scale-95 transition"
              >
                <Plus size={14} strokeWidth={2.5} />
              </button>
            </div>
          ) : totalQtyInCart > 0 && hasCustomizations ? (
            /* Customizable item in cart */
            <button
              type="button"
              onClick={() => onSelect(product)}
              aria-label={`Customize ${product.name}`}
              className="h-8 px-3.5 bg-[#0F3D2E] text-[#FFF1C9] font-sora font-extrabold text-xs uppercase tracking-wider shadow-md hover:bg-[#16503D] active:scale-95 transition rounded-none border border-[#0F3D2E] flex items-center gap-1"
            >
              <span>{totalQtyInCart} IN CART</span>
            </button>
          ) : (
            /* Square ADD Button */
            <button
              type="button"
              onClick={handleQuickAdd}
              aria-label={`Add ${product.name} to order`}
              className="h-8 px-4 sm:px-5 bg-white text-[#0F3D2E] font-sora font-extrabold text-xs uppercase tracking-wider shadow-md border-2 border-[#0F3D2E] hover:bg-[#0F3D2E] hover:text-white active:scale-95 transition rounded-none flex items-center gap-1"
            >
              <span>ADD</span>
              <Plus size={14} strokeWidth={3} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
