import React from 'react';
import { Plus, Check } from 'lucide-react';
import { formatMoney, ImageWithFallback } from '@cafe/shared';

export default function ProductCard({
  product,
  currency = '₹',
  inCartQty = 0,
  cartQuantity = 0,
  onSelect,
  onClick,
  className = '',
}) {
  const isAvailable = product?.available !== false;
  const hasVariants = product?.variants && product.variants.length > 0;
  const price = product?.price || 0;
  const quantity = inCartQty || cartQuantity || 0;
  const handleAction = () => {
    if (!isAvailable) return;
    if (onClick) onClick(product);
    else if (onSelect) onSelect(product);
  };

  return (
    <button
      type="button"
      onClick={handleAction}
      disabled={!isAvailable}
      aria-label={`${product?.name || 'Product'}, ${formatMoney(price, currency)}${
        !isAvailable ? ' - Out of stock' : ''
      }${quantity > 0 ? `, ${quantity} in order` : ''}`}
      className={`touch-press group relative flex flex-col justify-between w-full min-h-[170px] min-w-[150px] rounded-2xl bg-pos-surface border text-left overflow-hidden transition-all duration-140 select-none shadow-soft ${
        isAvailable
          ? quantity > 0
            ? 'border-pos-accent ring-1 ring-pos-accent/30 hover:border-pos-accent-hover'
            : 'border-pos-border hover:border-pos-accent/60 hover:bg-pos-raised'
          : 'border-pos-border/40 opacity-50 cursor-not-allowed'
      } ${className}`}
    >
      {/* Food Image / Colored Fallback */}
      <div className="relative h-28 w-full bg-pos-raised overflow-hidden shrink-0">
        <ImageWithFallback
          src={product?.image}
          alt={product?.name || 'Dish'}
          fallbackText={product?.name || 'Dish'}
          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
        />

        {/* 100% Veg / Non-Veg Indicator */}
        <span
          className="absolute top-2.5 left-2.5 flex h-4 w-4 items-center justify-center rounded-[4px] border border-emerald-500 bg-pos-bg/80 backdrop-blur-xs p-[2px]"
          title="Vegetarian"
        >
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
        </span>

        {/* Variants / Modifiers indicator */}
        {hasVariants && (
          <span className="absolute top-2.5 right-2.5 rounded-md bg-pos-bg/85 backdrop-blur-xs px-2 py-0.5 text-[10px] font-bold text-pos-accent border border-pos-accent/30">
            {product.variants.length} Sizes
          </span>
        )}

        {/* In-Cart Quantity Indicator Badge */}
        {quantity > 0 && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-lg bg-pos-accent px-2 py-0.5 text-xs font-black text-white shadow-elevation1">
            <Check size={12} strokeWidth={3} />
            <span className="font-mono tabular-nums">{quantity}</span>
          </div>
        )}

        {/* Out-of-stock overlay */}
        {!isAvailable && (
          <div className="absolute inset-0 bg-pos-bg/85 backdrop-blur-xs flex items-center justify-center">
            <span className="px-2.5 py-1 rounded-md bg-pos-danger/20 text-pos-danger text-xs font-bold uppercase tracking-wider border border-pos-danger/40">
              Out of stock
            </span>
          </div>
        )}
      </div>

      {/* Product Information */}
      <div className="p-3 flex-1 flex flex-col justify-between gap-2">
        <div>
          <h4 className="font-bold text-sm text-pos-text line-clamp-1 leading-snug">
            {product?.name || 'Menu Item'}
          </h4>
          {product?.description && (
            <p className="text-[11px] text-pos-muted line-clamp-1 mt-0.5 font-normal">
              {product.description}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between pt-1.5 border-t border-pos-border/70">
          <span className="text-base font-extrabold text-pos-accent font-mono tabular-nums">
            {formatMoney(price, currency)}
          </span>

          <span
            className={`flex h-8 w-8 items-center justify-center rounded-xl transition ${
              quantity > 0
                ? 'bg-pos-accent text-white shadow-xs'
                : 'bg-pos-raised text-pos-muted group-hover:bg-pos-accent group-hover:text-white'
            }`}
          >
            <Plus size={16} strokeWidth={2.5} />
          </span>
        </div>
      </div>
    </button>
  );
}
