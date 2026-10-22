import { useState } from 'react';
import { Plus, Minus, Heart } from 'lucide-react';
import toast from 'react-hot-toast';
import useCartStore from '../../context/cartStore';
import { useTenant } from '../../context/TenantContext';
import { formatMoney } from '../../utils/money';
import VegMark from './VegMark';

export default function CustomerItemRow({
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
      className="group flex items-center justify-between gap-3.5 py-3.5 border-b border-[#EFE4D6] last:border-b-0 cursor-pointer text-left transition-colors hover:bg-white/60 rounded-xl px-1"
    >
      {/* Left: 88x88 Rounded Thumbnail */}
      <div className="relative w-[88px] h-[88px] rounded-[16px] overflow-hidden bg-[#F6EBD5]/40 shrink-0">
        <img
          src={displayImage}
          alt={product.name}
          loading="lazy"
          onError={() => setImgError(true)}
          className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
            !isAvailable ? 'grayscale opacity-60' : ''
          }`}
        />

        {/* Small Veg Mark */}
        <div className="absolute top-1.5 left-1.5 z-10">
          <VegMark isVeg={product.isVegetarian !== false} size={14} />
        </div>

        {/* Mini Heart on thumbnail */}
        <button
          type="button"
          onClick={handleHeartClick}
          aria-label={isFavorite ? 'Remove favorite' : 'Save favorite'}
          className={`absolute top-1.5 right-1.5 z-10 w-6 h-6 rounded-full flex items-center justify-center backdrop-blur-md transition-all active:scale-90 ${
            isFavorite ? 'bg-[#E23B2E] text-white' : 'bg-white/80 text-[#2B1810]'
          }`}
        >
          <Heart size={11} fill={isFavorite ? 'currentColor' : 'none'} strokeWidth={isFavorite ? 2.5 : 2} />
        </button>

        {!isAvailable && (
          <div className="absolute inset-0 bg-[#2B1810]/40 flex items-center justify-center">
            <span className="text-[9px] font-bold text-white uppercase tracking-wider bg-black/60 px-1.5 py-0.5 rounded">
              Out
            </span>
          </div>
        )}
      </div>

      {/* Middle: Name, Description, Price */}
      <div className="flex-1 min-w-0 pr-1">
        <h3 className="font-bold text-sm text-[#2B1810] leading-snug truncate group-hover:text-[#7A3316] transition-colors">
          {product.name}
        </h3>
        <p className="text-xs text-[#7B6B5F] line-clamp-2 mt-0.5 leading-relaxed">
          {product.description || 'Crafted with ethically sourced ingredients.'}
        </p>
        <div className="mt-1.5">
          <span className="font-display font-bold text-sm text-[#2B1810]">
            {formatMoney(product.price, tenant.currency)}
          </span>
        </div>
      </div>

      {/* Right: 36px Round "+" or Stepper */}
      <div className="shrink-0 flex items-center">
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
  );
}
