import { useState } from 'react';
import { Plus, Minus, Heart } from 'lucide-react';
import toast from 'react-hot-toast';
import useCartStore from '../../context/cartStore';
import { useTenant } from '../../context/TenantContext';
import { formatMoney } from '../../utils/money';
import VegMark from './VegMark';

export default function CustomerProductCard({
  product,
  onSelect,
  isFavorite = false,
  onToggleFavorite,
  isKitchenOpen = true,
}) {
  const tenant = useTenant();
  const { items, addItem, updateQuantity, tableNumber, openScanner } = useCartStore();
  const [imgError, setImgError] = useState(false);

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
    if (cartItems.length === 1) {
      updateQuantity(cartItems[0]._id, cartItems[0].quantity - 1);
    } else if (cartItems.length > 1) {
      // Multiple variant configurations in cart, open customize modal
      onSelect(product);
    }
  };

  const handleHeartClick = (e) => {
    e.stopPropagation();
    if (onToggleFavorite) {
      onToggleFavorite(product._id);
    }
  };

  const displayImage =
    !imgError && (product.image || product.imageUrl)
      ? product.image || product.imageUrl
      : '/images/coffee-placeholder.svg';

  return (
    <div
      onClick={() => onSelect && onSelect(product)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect && onSelect(product)}
      className="group relative flex flex-col justify-between bg-[#FFFDF9] border border-[#EFE4D6] rounded-[20px] p-2.5 sm:p-3 shadow-[0_4px_16px_rgba(90,50,20,0.06)] hover:shadow-[0_8px_24px_rgba(90,50,20,0.1)] transition-all cursor-pointer select-none text-left"
    >
      {/* Top Media Container */}
      <div className="relative w-full aspect-square rounded-[16px] overflow-hidden bg-[#F6EBD5]/40 shrink-0">
        <img
          src={displayImage}
          alt={product.name}
          loading="lazy"
          onError={() => setImgError(true)}
          className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
            !isAvailable ? 'grayscale opacity-60' : ''
          }`}
        />

        {/* Veg / Non-Veg Indicator */}
        <div className="absolute top-2 left-2 z-10">
          <VegMark isVeg={product.isVegetarian !== false} size={15} />
        </div>

        {/* Translucent Heart Button */}
        <button
          type="button"
          onClick={handleHeartClick}
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          className={`absolute top-2 right-2 z-10 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all active:scale-90 ${
            isFavorite
              ? 'bg-[#E23B2E] text-white shadow-xs'
              : 'bg-white/80 text-[#2B1810] hover:bg-white shadow-xs'
          }`}
        >
          <Heart size={15} fill={isFavorite ? 'currentColor' : 'none'} strokeWidth={isFavorite ? 2.5 : 2} />
        </button>

        {/* Sold out overlay */}
        {!isAvailable && (
          <div className="absolute inset-0 bg-[#2B1810]/40 backdrop-blur-[1px] flex items-center justify-center">
            <span className="px-2.5 py-1 rounded-full bg-stone-900/80 text-white text-[10px] font-bold uppercase tracking-wider">
              Unavailable
            </span>
          </div>
        )}
      </div>

      {/* Info Body */}
      <div className="flex flex-col flex-1 justify-between pt-2.5">
        <div>
          <h3 className="font-bold text-sm sm:text-base text-[#2B1810] leading-snug line-clamp-1 group-hover:text-[#7A3316] transition-colors">
            {product.name}
          </h3>
          <p className="text-xs text-[#7B6B5F] line-clamp-2 mt-0.5 leading-relaxed min-h-[32px]">
            {product.description || 'Freshly handcrafted with artisanal ingredients.'}
          </p>
        </div>

        {/* Price & Action Row */}
        <div className="flex items-center justify-between mt-2 pt-1 border-t border-[#EFE4D6]/60">
          <span className="font-display font-bold text-sm sm:text-base text-[#2B1810]">
            {formatMoney(product.price, tenant.currency)}
          </span>

          {/* Add / Stepper Button */}
          {totalQtyInCart > 0 && isAvailable ? (
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 bg-[#F3E9DC] rounded-full p-1 border border-[#EFE4D6]"
            >
              <button
                type="button"
                onClick={handleDecrement}
                aria-label={`Decrease ${product.name} quantity`}
                className="w-7 h-7 rounded-full bg-white text-[#7A3316] flex items-center justify-center active:scale-90 shadow-2xs"
              >
                <Minus size={14} strokeWidth={2.5} />
              </button>
              <span className="font-bold text-xs text-[#2B1810] min-w-[16px] text-center">
                {totalQtyInCart}
              </span>
              <button
                type="button"
                onClick={handleIncrement}
                aria-label={`Increase ${product.name} quantity`}
                className="w-7 h-7 rounded-full bg-[#7A3316] text-[#FFFDF9] flex items-center justify-center active:scale-90 shadow-2xs"
              >
                <Plus size={14} strokeWidth={2.5} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={!isAvailable}
              onClick={handleQuickAdd}
              aria-label={`Add ${product.name} to order`}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                isAvailable
                  ? 'bg-[#7A3316] text-[#FFFDF9] shadow-[0_4px_12px_rgba(122,51,22,0.25)] hover:bg-[#5E2610] active:scale-90'
                  : 'bg-[#F3E9DC] text-stone-400 cursor-not-allowed'
              }`}
            >
              <Plus size={18} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
