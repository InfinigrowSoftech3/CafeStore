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
      className={`group relative w-full bg-white border border-stone-200 rounded-2xl overflow-hidden select-none transition-all shadow-2xs hover:shadow-md hover:border-stone-300 ${
        isAvailable
          ? 'cursor-pointer'
          : 'opacity-60 grayscale-[40%] cursor-default'
      }`}
    >
      {/* ─── Top: Full-Width Food Image ─── */}
      <div className="relative w-full h-44 sm:h-52 md:h-64 bg-stone-100 border-b border-stone-100 overflow-hidden rounded-t-2xl">
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
          <div className="w-full h-full flex flex-col items-center justify-center bg-stone-100 text-stone-400">
            <Utensils size={36} strokeWidth={1.5} />
          </div>
        )}

        {/* Sold Out Overlay */}
        {!isAvailable && (
          <div className="absolute inset-0 bg-stone-900/65 backdrop-blur-[1px] flex items-center justify-center p-2 text-center">
            <span className="bg-stone-900 text-white text-xs font-sora font-extrabold px-3 py-1.5 uppercase tracking-wider rounded-full border border-white/20 shadow-xs">
              Sold out
            </span>
          </div>
        )}
      </div>

      {/* ─── Bottom: Content Area (Badges, Title, Price, Description, ADD + button) ─── */}
      <div className="p-3.5 sm:p-4 bg-white">
        {/* Top Badges Row: Veg Mark + BESTSELLER Badge + Prep Time */}
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <VegMark isVeg={product.isVeg} size={15} />

          {product.popular && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF1C9] border border-amber-300 px-2.5 py-0.5 text-[10px] font-sora font-extrabold text-[#0F3D2E] tracking-wider uppercase">
              <Star size={9} fill="currentColor" />
              <span>BESTSELLER</span>
            </span>
          )}

          {product.prepTime && (
            <span className="inline-flex items-center gap-1 text-[11px] font-jakarta font-medium text-stone-500">
              <Clock size={12} className="text-stone-400" />
              <span>{product.prepTime} mins</span>
            </span>
          )}
        </div>

        {/* Main Content: Details on Left, ADD + Button on Right */}
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          {/* Left: Product Information */}
          <div className="flex-1 min-w-0">
            <h3 className="font-sora font-bold text-base sm:text-lg text-stone-900 leading-snug group-hover:text-[#0F3D2E] transition-colors">
              {product.name}
            </h3>

            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="font-sora font-extrabold text-sm sm:text-base text-[#0F3D2E]">
                {formatMoney(product.price, tenant.currency)}
              </span>
              {product.originalPrice && product.originalPrice > product.price && (
                <span className="text-xs text-stone-400 line-through tabular-nums font-jakarta">
                  {formatMoney(product.originalPrice, tenant.currency)}
                </span>
              )}
            </div>

            {product.description && (
              <p className="mt-1 text-xs sm:text-sm text-stone-500 font-jakarta leading-relaxed line-clamp-2 sm:line-clamp-3">
                {product.description}
              </p>
            )}

            {hasCustomizations && (
              <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-sora font-semibold text-[#0F3D2E]">
                <SlidersHorizontal size={11} />
                <span>Customisable</span>
              </div>
            )}
          </div>

          {/* Right: Rounded Action Button */}
          <div className="shrink-0 pt-0.5" onClick={(e) => e.stopPropagation()}>
            {!isAvailable ? null : totalQtyInCart > 0 && !hasCustomizations ? (
              /* Rounded Quantity Stepper */
              <div className="inline-flex items-center bg-white border border-[#0F3D2E] rounded-full shadow-2xs px-1">
                <button
                  type="button"
                  onClick={handleDecrement}
                  aria-label={`Decrease quantity of ${product.name}`}
                  className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full text-[#0F3D2E] hover:bg-stone-100 active:scale-90 transition"
                >
                  <Minus size={13} strokeWidth={2.5} />
                </button>
                <span className="font-sora font-extrabold text-xs px-2 min-w-[22px] text-center text-[#0F3D2E]">
                  {totalQtyInCart}
                </span>
                <button
                  type="button"
                  onClick={handleIncrement}
                  aria-label={`Increase quantity of ${product.name}`}
                  className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full text-[#0F3D2E] hover:bg-stone-100 active:scale-90 transition"
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
                className="h-8 sm:h-9 px-4 bg-[#0F3D2E] text-white font-sora font-bold text-xs uppercase tracking-wider shadow-2xs hover:bg-[#16503D] active:scale-95 transition rounded-full border border-[#0F3D2E] flex items-center gap-1"
              >
                <span>{totalQtyInCart} IN CART</span>
              </button>
            ) : (
              /* Crisp Rounded ADD + Button */
              <button
                type="button"
                onClick={handleQuickAdd}
                aria-label={`Add ${product.name} to order`}
                className="h-8 sm:h-9 px-5 sm:px-6 bg-white text-[#0F3D2E] font-sora font-bold text-xs uppercase tracking-wider shadow-2xs border border-[#0F3D2E] hover:bg-[#0F3D2E] hover:text-white active:scale-95 transition rounded-full flex items-center justify-center gap-1.5"
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
