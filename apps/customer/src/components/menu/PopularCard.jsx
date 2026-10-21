import { useState } from 'react';
import { Plus, Minus, Clock, Utensils, Star } from 'lucide-react';
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
      className={`group w-[185px] min-w-[185px] sm:w-[210px] sm:min-w-[210px] shrink-0 snap-start rounded-2xl bg-[#FFFDF9] border border-[#EFE4D6] overflow-hidden flex flex-col justify-between shadow-2xs hover:shadow-md transition-all select-none ${
        isAvailable ? 'cursor-pointer' : 'opacity-60 grayscale-[40%] cursor-default'
      }`}
    >
      {/* ─── Top Square Image Section ─── */}
      <div className="relative w-full aspect-square bg-[#F3E9DC] border-b border-[#EFE4D6] overflow-hidden rounded-t-2xl">
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
          <div className="w-full h-full flex flex-col items-center justify-center bg-[#F3E9DC] text-stone-400">
            <Utensils size={28} strokeWidth={1.5} />
          </div>
        )}

        {/* Top-Left: Veg Mark */}
        <div className="absolute top-2.5 left-2.5 z-10">
          <VegMark isVeg={product.isVeg} size={14} />
        </div>

        {/* Top-Right: Prep Time Badge */}
        {product.prepTime && (
          <div className="absolute top-2.5 right-2.5 z-10 inline-flex items-center gap-1 bg-black/75 px-2 py-0.5 rounded-full text-[10px] font-jakarta font-semibold text-white backdrop-blur-xs">
            <Clock size={10} className="text-white/80" />
            <span>{product.prepTime}m</span>
          </div>
        )}

        {/* Sold Out Overlay */}
        {!isAvailable && (
          <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-[1px] flex items-center justify-center">
            <span className="bg-[#7A3316] text-white text-[10px] font-sora font-extrabold px-2.5 py-1 uppercase tracking-wider rounded-full border border-white/20">
              Sold out
            </span>
          </div>
        )}
      </div>

      {/* ─── Bottom Info on Pure White ─── */}
      <div className="p-3 bg-white flex flex-col justify-between flex-1">
        <div>
          <h4 className="font-sora font-bold text-xs sm:text-sm text-[#2B1810] leading-snug line-clamp-1 group-hover:text-[#7A3316] transition-colors">
            {product.name}
          </h4>
          {product.description && (
            <p className="text-[11px] text-stone-500 font-jakarta line-clamp-1 mt-0.5 leading-tight">
              {product.description}
            </p>
          )}
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-2 pt-2 border-t border-[#EFE4D6]">
          <span className="font-sora font-extrabold text-xs sm:text-sm text-[#7A3316]">
            {formatMoney(product.price, tenant.currency)}
          </span>

          <div onClick={(e) => e.stopPropagation()}>
            {!isAvailable ? null : totalQtyInCart > 0 && !hasCustomizations ? (
              <div className="inline-flex items-center bg-[#7A3316] text-white rounded-full border border-[#7A3316] px-1 shadow-2xs">
                <button
                  type="button"
                  onClick={handleDecrement}
                  aria-label={`Decrease ${product.name}`}
                  className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/20 active:scale-90"
                >
                  <Minus size={11} strokeWidth={2.6} />
                </button>
                <span className="font-sora font-extrabold text-[11px] px-1.5 min-w-[16px] text-center">
                  {totalQtyInCart}
                </span>
                <button
                  type="button"
                  onClick={handleIncrement}
                  aria-label={`Increase ${product.name}`}
                  className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/20 active:scale-90"
                >
                  <Plus size={11} strokeWidth={2.6} />
                </button>
              </div>
            ) : totalQtyInCart > 0 && hasCustomizations ? (
              <button
                type="button"
                onClick={() => onSelect(product)}
                aria-label={`Customize ${product.name}`}
                className="h-7 px-3 bg-[#7A3316] text-[#F3E9DC] font-sora font-extrabold text-[10px] uppercase rounded-full border border-[#7A3316] shadow-2xs hover:bg-[#5E2610] active:scale-95 transition"
              >
                <span>{totalQtyInCart} IN</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleQuickAdd}
                aria-label={`Add ${product.name}`}
                className="h-7 px-3 bg-[#FFFDF9] text-[#7A3316] font-sora font-extrabold text-[10px] uppercase tracking-wider border border-[#7A3316] hover:bg-[#7A3316] hover:text-white rounded-full flex items-center gap-1 shadow-2xs active:scale-95 transition"
              >
                <span>ADD</span>
                <Plus size={11} strokeWidth={3} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
