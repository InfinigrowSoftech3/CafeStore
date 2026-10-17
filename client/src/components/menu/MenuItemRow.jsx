import { useState } from 'react';
import { Plus, Minus, Clock, Utensils } from 'lucide-react';
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
      className={`bg-white rounded-[24px] sm:rounded-[26px] p-2.5 min-[390px]:p-3 sm:p-3.5 flex items-center gap-2.5 min-[390px]:gap-3 sm:gap-4 shadow-[0_2px_12px_rgba(15,61,46,0.04)] border border-[#0F3D2E]/8 transition-all duration-150 ${
        isAvailable
          ? 'cursor-pointer hover:border-[#0F3D2E]/25 hover:shadow-md'
          : 'opacity-60 grayscale-[40%] cursor-default'
      }`}
    >
      {/* Responsive Thumbnail (84px on small phone, 92px on phone, 100px on desktop) */}
      <div className="relative w-[84px] h-[84px] min-w-[84px] min-h-[84px] min-[390px]:w-[92px] min-[390px]:h-[92px] min-[390px]:min-w-[92px] min-[390px]:min-h-[92px] lg:w-[98px] lg:h-[98px] lg:min-w-[98px] lg:min-h-[98px] rounded-[18px] min-[390px]:rounded-[22px] overflow-hidden bg-[#0F3D2E]/5 shrink-0">
        {product.image && !imgError ? (
          <img
            src={product.image}
            alt={product.name}
            width="98"
            height="98"
            loading="lazy"
            decoding="async"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          /* Tinted block fallback */
          <div className="w-full h-full flex flex-col items-center justify-center bg-[#0F3D2E]/5 text-[#0F3D2E]/30">
            <Utensils size={24} strokeWidth={1.5} />
          </div>
        )}

        {/* Prep-time badge */}
        {product.prepTime && (
          <span className="absolute bottom-1.5 right-1.5 inline-flex items-center gap-0.5 bg-black/65 backdrop-blur-md px-1.5 py-0.5 rounded-full text-[9px] font-jakarta font-semibold text-white shadow-xs">
            <Clock size={9} className="text-[#FFF1C9]" />
            <span>{product.prepTime}m</span>
          </span>
        )}

        {/* Sold out overlay */}
        {!isAvailable && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center">
            <span className="rounded-full bg-[#0F3D2E] text-white text-[10px] font-sora font-bold px-2 py-0.5 shadow-xs">
              Sold out
            </span>
          </div>
        )}
      </div>

      {/* Item info & Actions */}
      <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch py-0.5">
        <div>
          {/* Top line: Veg mark + Name */}
          <div className="flex items-center gap-1.5 min-w-0">
            <VegMark isVeg={product.isVeg} size={13} />
            <h3 className="font-sora font-bold text-sm min-[390px]:text-[15px] sm:text-base text-[#0F3D2E] leading-snug truncate">
              {product.name}
            </h3>
          </div>

          {/* One-line description */}
          {product.description && (
            <p className="text-xs text-[#0F3D2E]/70 line-clamp-1 font-jakarta mt-0.5">
              {product.description}
            </p>
          )}
        </div>

        {/* Bottom row: Price on left, Action on right */}
        <div className="flex items-center justify-between gap-2 mt-2 pt-1 border-t border-[#0F3D2E]/6">
          <div className="flex items-baseline gap-1.5 shrink-0">
            <span className="font-sora font-extrabold text-sm min-[390px]:text-base sm:text-lg text-[#0F3D2E]">
              {formatMoney(product.price, tenant.currency)}
            </span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-xs text-[#0F3D2E]/40 line-through tabular-nums font-jakarta">
                {formatMoney(product.originalPrice, tenant.currency)}
              </span>
            )}
          </div>

          {/* Action: Add pill or Stepper */}
          <div onClick={(e) => e.stopPropagation()}>
            {!isAvailable ? (
              <button
                type="button"
                disabled
                className="min-h-[44px] px-3.5 py-1.5 rounded-full bg-[#0F3D2E]/10 text-[#0F3D2E]/40 text-xs font-sora font-bold cursor-not-allowed"
              >
                Sold out
              </button>
            ) : totalQtyInCart > 0 && !hasCustomizations ? (
              /* Inline "− qty +" Stepper */
              <div className="inline-flex min-h-[44px] items-center rounded-full bg-[var(--menu-accent,#C93A1C)] text-white px-1 shadow-xs">
                <button
                  type="button"
                  onClick={handleDecrement}
                  aria-label={`Decrease quantity of ${product.name}`}
                  className="w-8 h-8 min-h-[44px] min-w-[36px] flex items-center justify-center rounded-full hover:bg-black/15 transition active:scale-90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white"
                >
                  <Minus size={14} strokeWidth={2.8} />
                </button>
                <span className="min-w-[20px] text-center font-sora text-xs font-extrabold text-white">
                  {totalQtyInCart}
                </span>
                <button
                  type="button"
                  onClick={handleIncrement}
                  aria-label={`Increase quantity of ${product.name}`}
                  className="w-8 h-8 min-h-[44px] min-w-[36px] flex items-center justify-center rounded-full hover:bg-black/15 transition active:scale-90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white"
                >
                  <Plus size={14} strokeWidth={2.8} />
                </button>
              </div>
            ) : totalQtyInCart > 0 && hasCustomizations ? (
              /* Customizable item already in cart */
              <button
                type="button"
                onClick={() => onSelect(product)}
                aria-label={`Item in cart, customize ${product.name}`}
                className="min-h-[44px] min-w-[76px] px-3.5 py-1.5 rounded-full bg-[var(--menu-accent,#C93A1C)] text-white font-sora font-extrabold text-xs shadow-xs hover:brightness-105 active:scale-95 transition-all flex items-center justify-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F3D2E]"
              >
                <span>{totalQtyInCart} in cart</span>
                <Plus size={12} strokeWidth={3} />
              </button>
            ) : (
              /* "Add" pill */
              <button
                type="button"
                onClick={handleQuickAdd}
                aria-label={`Add ${product.name} to cart`}
                className="min-h-[44px] min-w-[68px] px-4 py-2 rounded-full bg-[var(--menu-accent,#C93A1C)] text-white font-sora font-extrabold text-xs shadow-xs hover:brightness-105 active:scale-95 transition-all flex items-center justify-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F3D2E]"
              >
                <span>Add</span>
                {hasCustomizations && <span className="text-[10px] font-bold opacity-80">+</span>}
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
