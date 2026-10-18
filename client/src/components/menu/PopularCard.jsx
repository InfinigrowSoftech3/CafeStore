import { useState } from 'react';
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
      className={`group relative aspect-square w-[170px] min-w-[170px] min-[390px]:w-[185px] min-[390px]:min-w-[185px] sm:w-[205px] sm:min-w-[205px] shrink-0 snap-start rounded-[20px] sm:rounded-[24px] overflow-hidden bg-[#0F3D2E]/5 shadow-[0_4px_16px_rgba(15,61,46,0.06)] border border-[#0F3D2E]/10 select-none transition-all duration-200 ${
        isAvailable
          ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02]'
          : 'opacity-60 grayscale-[40%] cursor-default'
      }`}
    >
      {/* Background Image filling full square card */}
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
        <div className="w-full h-full flex flex-col items-center justify-center bg-[#0F3D2E]/10 text-[#0F3D2E]/40">
          <Utensils size={32} strokeWidth={1.5} />
        </div>
      )}

      {/* Top-Left: Veg Mark Badge */}
      <div className="absolute top-2.5 left-2.5 z-10">
        <VegMark isVeg={product.isVeg} size={16} />
      </div>

      {/* Top-Right: Prep Time Badge */}
      {product.prepTime && (
        <div className="absolute top-2.5 right-2.5 z-10 inline-flex items-center gap-1 bg-black/65 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] min-[390px]:text-[11px] font-jakarta font-semibold text-white shadow-xs">
          <Clock size={11} className="text-white/80" />
          <span>{product.prepTime}m</span>
        </div>
      )}

      {/* Sold Out Overlay */}
      {!isAvailable && (
        <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
          <span className="rounded-full bg-[#E53935] text-white text-xs font-sora font-extrabold px-3 py-1 shadow-md">
            Sold out
          </span>
        </div>
      )}

      {/* Bottom Gradient Overlay with Title, Price, and Action Button */}
      <div className="absolute inset-x-0 bottom-0 pt-16 pb-2.5 min-[390px]:pb-3 px-2.5 min-[390px]:px-3.5 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex items-end justify-between gap-2 z-10">
        {/* Title and Price */}
        <div className="min-w-0 flex-1 pr-1">
          <h4 className="font-sora font-bold text-xs min-[390px]:text-sm sm:text-base text-white leading-tight line-clamp-1 drop-shadow-sm group-hover:text-[#FFF1C9] transition-colors">
            {product.name}
          </h4>
          <div className="flex items-baseline gap-1 mt-0.5 min-[390px]:mt-1">
            <span className="font-sora font-extrabold text-xs min-[390px]:text-sm sm:text-base text-white drop-shadow-sm">
              {formatMoney(product.price, tenant.currency)}
            </span>
          </div>
        </div>

        {/* Action Button: Red/Orange Circle with White Plus or Stepper */}
        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
          {!isAvailable ? null : totalQtyInCart > 0 && !hasCustomizations ? (
            /* Compact Stepper */
            <div className="inline-flex items-center gap-1 rounded-full bg-[#E53935] text-white p-1 shadow-md">
              <button
                type="button"
                onClick={handleDecrement}
                aria-label={`Decrease quantity of ${product.name}`}
                className="w-6 h-6 min-[390px]:w-7 min-[390px]:h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center active:scale-90 transition"
              >
                <Minus size={13} strokeWidth={2.6} />
              </button>
              <span className="font-sora font-extrabold text-xs px-1 min-w-[16px] text-center text-white">
                {totalQtyInCart}
              </span>
              <button
                type="button"
                onClick={handleIncrement}
                aria-label={`Increase quantity of ${product.name}`}
                className="w-6 h-6 min-[390px]:w-7 min-[390px]:h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center active:scale-90 transition"
              >
                <Plus size={13} strokeWidth={2.6} />
              </button>
            </div>
          ) : totalQtyInCart > 0 && hasCustomizations ? (
            <button
              type="button"
              onClick={() => onSelect(product)}
              aria-label={`Customize ${product.name}`}
              className="w-8 h-8 min-[390px]:w-9 min-[390px]:h-9 sm:w-10 sm:h-10 rounded-full bg-[#E53935] hover:bg-[#D32F2F] text-white flex items-center justify-center font-sora font-extrabold text-xs shadow-md active:scale-90 transition-transform"
            >
              <span>{totalQtyInCart}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleQuickAdd}
              aria-label={`Add ${product.name} to order`}
              className="w-8 h-8 min-[390px]:w-9 min-[390px]:h-9 sm:w-10 sm:h-10 rounded-full bg-[#E53935] hover:bg-[#D32F2F] text-white flex items-center justify-center shadow-md active:scale-90 transition-transform"
            >
              <Plus size={18} strokeWidth={2.8} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
