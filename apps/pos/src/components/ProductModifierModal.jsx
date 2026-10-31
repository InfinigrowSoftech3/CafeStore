import React, { useState, useEffect } from 'react';
import { formatMoney, ImageWithFallback } from '@cafe/shared';
import { Plus, Minus, X, Check } from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import QuantityStepper from './ui/QuantityStepper';

export default function ProductModifierModal({
  product,
  isOpen,
  onClose,
  onAddToCart,
  currency = '₹',
}) {
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [milkOption, setMilkOption] = useState('');
  const [sugarOption, setSugarOption] = useState('');

  // Reset or initialize when product changes
  useEffect(() => {
    if (product) {
      setSelectedVariant(product.variants && product.variants.length > 0 ? product.variants[0] : null);
      setSelectedAddons([]);
      setSpecialInstructions('');
      setQuantity(1);
      setMilkOption('');
      setSugarOption('');
    }
  }, [product]);

  if (!product) return null;

  const basePrice = selectedVariant ? selectedVariant.price : (product.price || 0);
  const addonsTotal = selectedAddons.reduce((sum, a) => sum + (Number(a.price) || 0), 0);
  const unitPrice = basePrice + addonsTotal;
  const totalPrice = unitPrice * quantity;

  const toggleAddon = (addon) => {
    const isChecked = selectedAddons.some((a) => a._id === addon._id);
    if (isChecked) {
      setSelectedAddons((prev) => prev.filter((a) => a._id !== addon._id));
    } else {
      setSelectedAddons((prev) => [...prev, addon]);
    }
  };

  const handleConfirm = () => {
    // Combine milk, sugar and special instructions into final notes
    const notesParts = [];
    if (milkOption) notesParts.push(`Milk: ${milkOption}`);
    if (sugarOption) notesParts.push(`Sugar: ${sugarOption}`);
    if (specialInstructions.trim()) notesParts.push(specialInstructions.trim());
    const finalNotes = notesParts.join(' • ');

    onAddToCart(product, quantity, selectedVariant, selectedAddons, finalNotes);
    onClose();
  };

  const isBeverage = ['BAR', 'COFFEE'].includes(product.kitchenStation) ||
    /latte|coffee|tea|brew|matcha|sparkler|cappuccino|mocha/i.test(product.name || '');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={product.name}
      subtitle={product.category?.name || 'Customise item'}
      maxWidth="max-w-lg"
      footer={
        <div className="flex items-center gap-3">
          <QuantityStepper
            quantity={quantity}
            onDecrease={() => setQuantity((q) => Math.max(1, q - 1))}
            onIncrease={() => setQuantity((q) => q + 1)}
          />
          <Button
            variant="primary"
            size="lg"
            onClick={handleConfirm}
            className="flex-1 font-bold text-sm tracking-wide"
          >
            Add to Ticket • {formatMoney(totalPrice, currency)}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Product Card Image & Info Banner */}
        <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-pos-raised border border-pos-border">
          <div className="h-16 w-16 rounded-xl bg-white border border-pos-border overflow-hidden shrink-0">
            <ImageWithFallback
              src={product.image}
              alt={product.name}
              fallbackText={product.name}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-sm text-pos-text truncate">{product.name}</h4>
            <div className="text-xs font-semibold text-pos-accent mt-0.5 font-mono tabular-nums">
              Base: {formatMoney(basePrice, currency)}
            </div>
            {product.description && (
              <p className="text-[11px] text-pos-muted line-clamp-1 mt-0.5">{product.description}</p>
            )}
          </div>
        </div>

        {/* 1. Size / Variant Selector */}
        {product.variants && product.variants.length > 0 && (
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-pos-muted block mb-2">
              Select Size / Variant <span className="text-pos-danger">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {product.variants.map((variant) => {
                const isSelected = selectedVariant?._id === variant._id;
                return (
                  <button
                    key={variant._id || variant.name}
                    type="button"
                    onClick={() => setSelectedVariant(variant)}
                    className={`p-3 rounded-xl border text-left transition-all touch-press min-h-[50px] ${
                      isSelected
                        ? 'bg-[#105B43]/10 border-[#105B43] text-pos-text shadow-xs ring-1 ring-[#105B43]'
                        : 'bg-white border-pos-border text-pos-muted hover:border-pos-accent/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs sm:text-sm text-pos-text">{variant.name}</span>
                      {isSelected && <Check size={14} className="text-[#059669]" />}
                    </div>
                    <div className="text-xs font-bold text-pos-accent font-mono tabular-nums mt-0.5">
                      {formatMoney(variant.price, currency)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. Beverage Preferences (Milk & Sugar) if applicable */}
        {isBeverage && (
          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-pos-raised/60 border border-pos-border">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-pos-muted block mb-1.5">
                Milk Choice
              </span>
              <div className="flex flex-wrap gap-1.5">
                {['Regular', 'Oat', 'Almond', 'Skim'].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setMilkOption((prev) => (prev === opt ? '' : opt))}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition ${
                      milkOption === opt
                        ? 'bg-[#105B43] text-white border-[#105B43]'
                        : 'bg-white text-pos-text border-pos-border hover:bg-pos-raised'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-pos-muted block mb-1.5">
                Sugar Level
              </span>
              <div className="flex flex-wrap gap-1.5">
                {['Normal', 'Less', 'None'].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setSugarOption((prev) => (prev === opt ? '' : opt))}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition ${
                      sugarOption === opt
                        ? 'bg-[#105B43] text-white border-[#105B43]'
                        : 'bg-white text-pos-text border-pos-border hover:bg-pos-raised'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 3. Add-ons Checklist */}
        {product.addons && product.addons.length > 0 && (
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-pos-muted block mb-2">
              Extra Add-ons / Toppings
            </label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pos-scrollbar pr-1">
              {product.addons.map((addon) => {
                const isChecked = selectedAddons.some((a) => a._id === addon._id);
                return (
                  <button
                    key={addon._id || addon.name}
                    type="button"
                    onClick={() => toggleAddon(addon)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-colors touch-press min-h-[46px] ${
                      isChecked
                        ? 'bg-[#105B43]/10 border-[#105B43] text-pos-text ring-1 ring-[#105B43]'
                        : 'bg-white border-pos-border text-pos-muted hover:border-pos-accent/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`h-4 w-4 rounded border flex items-center justify-center ${
                          isChecked ? 'bg-[#105B43] border-[#105B43] text-white' : 'border-pos-border bg-white'
                        }`}
                      >
                        {isChecked && <Check size={12} strokeWidth={3} />}
                      </div>
                      <span className="font-semibold text-xs sm:text-sm text-pos-text">{addon.name}</span>
                    </div>
                    <span className="text-xs font-bold text-pos-accent font-mono tabular-nums">
                      +{formatMoney(addon.price, currency)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. Special Instructions */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-pos-muted block mb-1.5">
            Special Preparation Notes
          </label>
          <input
            type="text"
            placeholder="e.g. Extra hot, no whipped cream, dressing on side..."
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            className="w-full bg-white border border-pos-border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-pos-text placeholder:text-pos-muted/60 focus:outline-none focus:border-pos-accent"
          />
        </div>
      </div>
    </Modal>
  );
}
