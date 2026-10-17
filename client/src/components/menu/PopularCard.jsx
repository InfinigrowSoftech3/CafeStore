import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Minus, Clock, Utensils } from 'lucide-react';
import toast from 'react-hot-toast';
import useCartStore from '../../context/cartStore';
import { useTenant } from '../../context/TenantContext';
import { formatMoney } from '../../utils/money';
import VegMark from './VegMark';

export default function PopularCard({ product, onSelect, isKitchenOpen = true }) {
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
    <div
      onClick={isAvailable ? () => onSelect(product) : undefined}
      className={`w-[185px] min-w-[185px] min-[390px]:w-[200px] min-[390px]:min-w-[200px] sm:w-[215px] sm:min-w-[215px] shrink-0 snap-start rounded-[24px] bg-white p-2.5 min-[390px]:p-3 flex flex-col justify-between shadow-[0_2px_12px_rgba(15,61,46,0.06)] border border-[#0F3D2E]/8 transition-all duration-150 ${
        isAvailable
          ? 'cursor-pointer hover:border-[#0F3D2E]/25 hover:shadow-md'
          : 'opacity-60 grayscale-[40%] cursor-default'
      }`}
    >
      <div>
        {/* Rounded Image with fixed aspect ratio */}
        <div className="relative w-full h-[116px] min-[390px]:h-[126px] rounded-[18px] overflow-hidden bg-[#0F3D2E]/5 mb-2.5">
          {product.image && !imgError ? (
            <img
              src={product.image}
              alt={product.name}
              width="215"
              height="126"
              loading="lazy"
              decoding="async"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            />
          ) : (
            /* Tinted fallback block */
            <div className="w-full h-full flex flex-col items-center justify-center bg-[#0F3D2E]/5 text-[#0F3D2E]/30">
              <Utensils size={28} strokeWidth={1.5} />
            </div>
          )}

          {/* Top-left: Veg Mark */}
          <div className="absolute top-2 left-2">
            <VegMark isVeg={product.isVeg} size={15} />
          </div>

          {/* Bottom-right: Prep Time Badge */}
          {product.prepTime && (
            <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 bg-black/65 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] font-jakarta font-semibold text-white shadow-xs">
              <Clock size={10} className="text-[#FFF1C9]" />
              <span>{product.prepTime}m</span>
            </span>
          )}

          {/* Sold out overlay */}
          {!isAvailable && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center">
              <span className="rounded-full bg-[#0F3D2E] text-white text-[11px] font-sora font-bold px-2.5 py-1 shadow-xs">
                Sold out
              </span>
            </div>
          )}
        </div>

        {/* Item Name */}
        <h4 className="font-sora font-bold text-sm text-[#0F3D2E] leading-snug line-clamp-1">
          {product.name}
        </h4>
      </div>

      {/* Price & Action Row */}
      <div className="flex items-center justify-between pt-2.5 border-t border-[#0F3D2E]/8 mt-2.5">
        <span className="font-sora font-extrabold text-base text-[#0F3D2E]">
          {formatMoney(product.price, tenant.currency)}
        </span>

        {/* Action Button */}
        {!isAvailable ? (
          <button
            type="button"
            disabled
            aria-label="Unavailable"
            className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center bg-[#0F3D2E]/10 text-[#0F3D2E]/30 cursor-not-allowed"
          >
            <Plus size={16} />
          </button>
        ) : totalQtyInCart > 0 && !hasCustomizations ? (
          <div
            onClick={(e) => e.stopPropagation()}
            className="inline-flex min-h-[44px] items-center rounded-full bg-[var(--menu-accent,#C93A1C)] text-white px-1 shadow-xs"
          >
            <button
              type="button"
              onClick={handleDecrement}
              aria-label={`Decrease quantity of ${product.name}`}
              className="w-8 h-8 min-h-[44px] min-w-[36px] flex items-center justify-center rounded-full hover:bg-black/15 transition active:scale-90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white"
            >
              <Minus size={13} strokeWidth={2.8} />
            </button>
            <span className="min-w-[18px] text-center font-sora text-xs font-extrabold text-white">
              {totalQtyInCart}
            </span>
            <button
              type="button"
              onClick={handleIncrement}
              aria-label={`Increase quantity of ${product.name}`}
              className="w-8 h-8 min-h-[44px] min-w-[36px] flex items-center justify-center rounded-full hover:bg-black/15 transition active:scale-90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white"
            >
              <Plus size={13} strokeWidth={2.8} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleQuickAdd}
            aria-label={`Add ${product.name} to cart`}
            className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center bg-[var(--menu-accent,#C93A1C)] text-white shadow-xs hover:brightness-105 active:scale-90 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F3D2E]"
          >
            <Plus size={18} strokeWidth={2.8} />
          </button>
        )}
      </div>
    </div>
  );
}
