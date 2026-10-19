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
      className={`group w-[180px] min-w-[180px] sm:w-[205px] sm:min-w-[205px] shrink-0 snap-start rounded-none bg-white border border-stone-200 overflow-hidden flex flex-col justify-between shadow-2xs hover:shadow-md transition-all select-none ${
        isAvailable ? 'cursor-pointer' : 'opacity-60 grayscale-[40%] cursor-default'
      }`}
    >
      {/* ─── Top Square Image Section ─── */}
      <div className="relative w-full aspect-square bg-stone-100 border-b border-stone-200 overflow-hidden">
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

        {/* Top-Left: Veg Mark */}
        <div className="absolute top-2 left-2 z-10">
          <VegMark isVeg={product.isVeg} size={14} />
        </div>

        {/* Top-Right: Prep Time Badge */}
        {product.prepTime && (
          <div className="absolute top-2 right-2 z-10 inline-flex items-center gap-1 bg-black/75 px-1.5 py-0.5 rounded-none text-[10px] font-jakarta font-semibold text-white">
            <Clock size={10} className="text-white/80" />
            <span>{product.prepTime}m</span>
          </div>
        )}

        {/* Sold Out Overlay */}
        {!isAvailable && (
          <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-[1px] flex items-center justify-center">
            <span className="bg-stone-900 text-white text-[10px] font-sora font-extrabold px-2 py-0.5 uppercase tracking-wider rounded-none border border-white/20">
              Sold out
            </span>
          </div>
        )}
      </div>

      {/* ─── Bottom Info on Pure White ─── */}
      <div className="p-3 bg-white flex flex-col justify-between flex-1">
        <div>
          <h4 className="font-sora font-bold text-xs sm:text-sm text-stone-900 leading-snug line-clamp-1 group-hover:text-[#0F3D2E] transition-colors">
            {product.name}
          </h4>
          {product.description && (
            <p className="text-[11px] text-stone-500 font-jakarta line-clamp-1 mt-0.5 leading-tight">
              {product.description}
            </p>
          )}
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-2 pt-2 border-t border-stone-100">
          <span className="font-sora font-extrabold text-xs sm:text-sm text-[#0F3D2E]">
            {formatMoney(product.price, tenant.currency)}
          </span>

          <div onClick={(e) => e.stopPropagation()}>
            {!isAvailable ? null : totalQtyInCart > 0 && !hasCustomizations ? (
              <div className="inline-flex items-center bg-[#0F3D2E] text-white rounded-none border border-[#0F3D2E]">
                <button
                  type="button"
                  onClick={handleDecrement}
                  aria-label={`Decrease ${product.name}`}
                  className="w-6 h-6 flex items-center justify-center hover:bg-white/20 active:scale-90"
                >
                  <Minus size={11} strokeWidth={2.6} />
                </button>
                <span className="font-sora font-extrabold text-[11px] px-1 min-w-[16px] text-center">
                  {totalQtyInCart}
                </span>
                <button
                  type="button"
                  onClick={handleIncrement}
                  aria-label={`Increase ${product.name}`}
                  className="w-6 h-6 flex items-center justify-center hover:bg-white/20 active:scale-90"
                >
                  <Plus size={11} strokeWidth={2.6} />
                </button>
              </div>
            ) : totalQtyInCart > 0 && hasCustomizations ? (
              <button
                type="button"
                onClick={() => onSelect(product)}
                aria-label={`Customize ${product.name}`}
                className="h-6 px-2 bg-[#0F3D2E] text-[#FFF1C9] font-sora font-extrabold text-[10px] uppercase rounded-none border border-[#0F3D2E]"
              >
                <span>{totalQtyInCart} IN</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleQuickAdd}
                aria-label={`Add ${product.name}`}
                className="h-6 px-2.5 bg-white text-[#0F3D2E] font-sora font-extrabold text-[10px] uppercase tracking-wider border border-[#0F3D2E] hover:bg-[#0F3D2E] hover:text-white rounded-none flex items-center gap-0.5"
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
