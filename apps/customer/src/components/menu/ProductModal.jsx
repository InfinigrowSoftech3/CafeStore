import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Minus, ShoppingBag, Clock, Lock, Check, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import useCartStore from '../../context/cartStore';
import { useTenant } from '../../context/TenantContext';
import { formatMoney } from '../../utils/money';
import VegMark from './VegMark';

const PLACEHOLDER = '/images/coffee-placeholder.svg';

const INSTRUCTION_PRESETS = [
  'Extra hot',
  'Less ice',
  'No sugar',
  'Mild spicy',
  'Keep sauce separate',
];

export default function ProductModal({ product, onClose }) {
  const tenant = useTenant();
  const { addItem, tableNumber, openScanner } = useCartStore();
  const [quantity, setQuantity] = useState(1);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [instructions, setInstructions] = useState('');

  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const addons = Array.isArray(product?.addons) ? product.addons : [];
  const milkAddons = addons.filter((addon) => /milk/i.test(addon.name));
  const regularAddons = addons.filter((addon) => !/milk/i.test(addon.name));

  // Inventory-based availability
  const isAvailable = product.available && product.scheduledAvailable !== false && product.inventoryAvailable !== false;
  const maxQty = product.maxOrderableQty ?? 99;

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    if (variants.length) setSelectedVariant(variants[0]);
    return () => { document.body.style.overflow = ''; };
  }, [variants]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const toggleAddon = (addon) => {
    setSelectedAddons((previous) => {
      const selected = previous.some((item) => item.name === addon.name);
      if (/milk/i.test(addon.name)) {
        return [...previous.filter((item) => !/milk/i.test(item.name)), ...(selected ? [] : [addon])];
      }
      return selected
        ? previous.filter((item) => item.name !== addon.name)
        : [...previous, addon];
    });
  };

  const changeQty = (delta) => {
    setQuantity(prev => Math.min(maxQty, Math.max(1, prev + delta)));
  };

  const handlePresetInstruction = (text) => {
    setInstructions(prev => {
      if (!prev) return text;
      if (prev.toLowerCase().includes(text.toLowerCase())) return prev;
      return `${prev}, ${text}`;
    });
  };

  const basePrice = selectedVariant ? selectedVariant.price : product.price;
  const addonTotal = selectedAddons.reduce((s, a) => s + a.price, 0);
  const unitPrice = basePrice + addonTotal;
  const total = unitPrice * quantity;

  const handleAdd = () => {
    if (!isAvailable) return;
    if (!tableNumber) {
      toast.error('Please scan your table QR code to unlock ordering!');
      openScanner();
      return;
    }
    if (quantity > maxQty) {
      toast.error(`Only ${maxQty} available. Please reduce your quantity.`);
      return;
    }
    const added = addItem(product, quantity, selectedAddons, selectedVariant, instructions);
    if (added) {
      toast.success(`${product.name} added to cart!`);
      onClose();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 bg-[#0F3D2E]/60 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 360 }}
        onClick={e => e.stopPropagation()}
        className="bg-white w-full sm:max-w-lg rounded-none overflow-hidden max-h-[92vh] sm:max-h-[88vh] flex flex-col shadow-2xl border border-stone-200"
      >
        {/* Mobile Swipe / Drag Handle */}
        <div className="sm:hidden flex items-center justify-center pt-2.5 pb-1 bg-white">
          <div className="w-10 h-1 rounded-none bg-stone-300" />
        </div>

        {/* Hero Image Section */}
        <div className="relative h-60 sm:h-64 flex-shrink-0 bg-stone-100 overflow-hidden">
          <img
            src={product.image || PLACEHOLDER}
            alt={product.name}
            className={`w-full h-full object-cover transition-opacity duration-300 ${!isAvailable ? 'opacity-50 grayscale' : ''}`}
            onError={e => { e.currentTarget.src = PLACEHOLDER; }}
          />
          {/* Subtle Contrast Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close product modal"
            className="absolute top-3.5 right-3.5 min-h-[36px] min-w-[36px] w-9 h-9 bg-white hover:bg-stone-100 text-stone-900 rounded-full flex items-center justify-center shadow-sm border border-stone-300 transition-all active:scale-95 focus:outline-none focus:ring-1 focus:ring-stone-900"
          >
            <X size={18} strokeWidth={2.4} aria-hidden="true" />
          </button>

          {/* Badges on Hero */}
          <div className="absolute top-3.5 left-4 flex flex-wrap items-center gap-1.5">
            {/* Veg / Non-Veg Badge */}
            <span className="inline-flex items-center gap-1.5 rounded-none bg-white px-2.5 py-1 text-[11px] font-sora font-bold text-stone-900 shadow-2xs border border-stone-200">
              <VegMark isVeg={product.isVeg} size={13} />
              <span>{product.isVeg !== false ? 'VEG' : 'NON-VEG'}</span>
            </span>

            {/* Popular Badge */}
            {product.popular && isAvailable && (
              <span className="inline-flex items-center gap-1.5 rounded-none bg-[#0F3D2E] text-white border border-[#0F3D2E] px-2.5 py-1 text-[11px] font-sora font-bold shadow-2xs">
                <Sparkles size={11} className="text-[#FFF1C9]" />
                <span>POPULAR</span>
              </span>
            )}
          </div>

          {/* Bottom title & price overlay */}
          <div className="absolute bottom-3.5 left-4 right-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="font-sora text-xl sm:text-2xl font-extrabold text-white drop-shadow-sm leading-tight tracking-tight">
                {product.name}
              </h2>
              {product.prepTime && (
                <span className="inline-flex items-center gap-1 text-xs text-white/90 font-jakarta font-semibold mt-1">
                  <Clock size={12} className="text-white" /> Prep time: ~{product.prepTime} mins
                </span>
              )}
            </div>
            <div className="text-right shrink-0">
              <span className="font-sora text-xl sm:text-2xl font-extrabold text-white drop-shadow-sm">
                {formatMoney(basePrice, tenant.currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 flex-1 overflow-y-auto space-y-5 bg-white no-scrollbar">
          {/* Description */}
          {product.description && (
            <div className="rounded-none bg-stone-50 p-4 border border-stone-200 shadow-2xs">
              <p className="text-stone-700 text-sm font-jakarta font-medium leading-relaxed">
                {product.description}
              </p>
            </div>
          )}

          {/* Variants / Sizes */}
          {variants.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-xs font-sora font-extrabold uppercase tracking-wider text-stone-900">
                  Select Size / Option <span className="text-[var(--menu-accent,#C93A1C)]">*</span>
                </p>
                <span className="text-[11px] font-sora font-semibold text-stone-500">Required</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {variants.map(v => {
                  const isSelected = selectedVariant?.name === v.name;
                  return (
                    <button
                      key={v.name}
                      type="button"
                      onClick={() => setSelectedVariant(v)}
                      className={`min-h-[48px] flex items-center justify-between p-3 rounded-none border transition-all text-left ${
                        isSelected
                          ? 'border-stone-900 bg-stone-50 text-stone-900 font-sora font-bold ring-1 ring-stone-900'
                          : 'border-stone-200 bg-white text-stone-700 hover:border-stone-400 font-jakarta font-semibold'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-3.5 h-3.5 rounded-none border flex items-center justify-center ${
                          isSelected ? 'border-stone-900 bg-stone-900' : 'border-stone-400 bg-white'
                        }`}>
                          {isSelected && <span className="w-1.5 h-1.5 bg-white" />}
                        </div>
                        <span className="text-xs font-sora font-bold">{v.name}</span>
                      </div>
                      <span className="text-xs font-sora font-extrabold text-stone-900">
                        {v.price > 0 ? `+${formatMoney(v.price, tenant.currency)}` : 'Standard'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Milk Options */}
          {milkAddons.length > 0 && (
            <div>
              <p className="text-xs font-sora font-extrabold uppercase tracking-wider text-stone-900 mb-2.5">
                Choice of Milk
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                {milkAddons.map((milk) => {
                  const selected = selectedAddons.some((addon) => addon.name === milk.name);
                  return (
                    <button
                      key={milk.name}
                      type="button"
                      onClick={() => toggleAddon(milk)}
                      aria-pressed={selected}
                      className={`min-h-[44px] flex items-center justify-between p-3 rounded-none border text-xs transition-all ${
                        selected
                          ? 'border-stone-900 bg-stone-50 text-stone-900 ring-1 ring-stone-900 font-sora font-bold'
                          : 'border-stone-200 bg-white text-stone-700 hover:border-stone-400 font-jakarta font-semibold'
                      }`}
                    >
                      <span className="font-sora font-bold">{milk.name}</span>
                      <span className="text-stone-900 font-sora font-extrabold">
                        +{formatMoney(milk.price, tenant.currency)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add-ons & Extras */}
          {regularAddons.length > 0 && (
            <div>
              <p className="text-xs font-sora font-extrabold uppercase tracking-wider text-stone-900 mb-2.5">
                Add-ons &amp; Extras
              </p>
              <div className="space-y-2">
                {regularAddons.map(addon => {
                  const selected = selectedAddons.some(a => a.name === addon.name);
                  return (
                    <button
                      key={addon.name}
                      type="button"
                      onClick={() => toggleAddon(addon)}
                      className={`min-h-[48px] w-full flex items-center justify-between p-3 rounded-none border transition-all ${
                        selected
                          ? 'border-stone-900 bg-stone-50 text-stone-900 ring-1 ring-stone-900 font-sora font-bold'
                          : 'border-stone-200 bg-white text-stone-700 hover:border-stone-400 font-jakarta font-semibold'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-4 h-4 rounded-none border flex items-center justify-center transition-colors ${
                          selected ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-400 bg-white'
                        }`}>
                          {selected && <Check size={12} strokeWidth={3} />}
                        </div>
                        <span className="font-sora font-bold text-xs sm:text-sm">{addon.name}</span>
                      </div>
                      <span className="text-xs font-sora font-extrabold text-stone-900">
                        +{formatMoney(addon.price, tenant.currency)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Special Instructions & Presets */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-sora font-extrabold uppercase tracking-wider text-stone-900">
                Special Instructions
              </p>
              <span className="text-[11px] font-sora font-bold text-stone-500">{instructions.length}/120</span>
            </div>

            {/* Quick preset chips */}
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {INSTRUCTION_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePresetInstruction(preset)}
                  className="rounded-none border border-stone-300 bg-stone-50 hover:bg-stone-100 hover:border-stone-400 px-3 py-1.5 text-xs font-sora font-bold text-stone-800 transition active:scale-95"
                >
                  + {preset}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="e.g. Extra hot, no sugar, separate sauce..."
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              maxLength={120}
              className="w-full min-h-[44px] rounded-none bg-white border border-stone-300 px-4 py-2.5 text-sm font-jakarta font-medium text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-900 focus:border-stone-900 transition"
            />
          </div>
        </div>

        {/* Modal Sticky Footer Action */}
        <div className="p-4 sm:p-5 border-t border-stone-200 bg-white flex items-center gap-3 flex-shrink-0">
          {/* Quantity Stepper */}
          <div className="flex items-center gap-1 border border-stone-300 bg-white rounded-none p-1">
            <button
              type="button"
              onClick={() => changeQty(-1)}
              disabled={!isAvailable || quantity <= 1}
              aria-label="Decrease quantity"
              className="flex h-10 w-10 items-center justify-center rounded-none bg-stone-50 text-stone-900 hover:bg-stone-200 transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 border border-stone-200"
            >
              <Minus size={15} strokeWidth={2.5} aria-hidden="true" />
            </button>
            <span className="w-8 text-center font-sora font-extrabold text-base text-stone-900">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => changeQty(1)}
              disabled={!isAvailable || quantity >= maxQty}
              aria-label="Increase quantity"
              className="flex h-10 w-10 items-center justify-center rounded-none bg-stone-50 text-stone-900 hover:bg-stone-200 transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 border border-stone-200"
            >
              <Plus size={15} strokeWidth={2.5} aria-hidden="true" />
            </button>
          </div>

          {/* Add to Cart CTA */}
          <motion.button
            type="button"
            whileTap={isAvailable ? { scale: 0.98 } : {}}
            onClick={handleAdd}
            disabled={!isAvailable}
            className={`flex-1 min-h-[48px] flex items-center justify-between py-3 px-5 rounded-none font-sora font-extrabold text-sm transition-all shadow-2xs focus:outline-none focus:ring-2 focus:ring-stone-900
              ${!isAvailable
                ? 'bg-stone-100 text-stone-400 border border-stone-300 cursor-not-allowed'
                : 'bg-[var(--menu-accent,#C93A1C)] text-white hover:brightness-105 active:scale-98'
              }`}
          >
            <div className="flex items-center gap-2">
              {!isAvailable ? (
                <span>Out of Stock</span>
              ) : !tableNumber ? (
                <>
                  <Lock size={17} strokeWidth={2.4} aria-hidden="true" />
                  <span>Scan Table to Order</span>
                </>
              ) : (
                <>
                  <ShoppingBag size={17} strokeWidth={2.4} aria-hidden="true" />
                  <span>Add to Order</span>
                </>
              )}
            </div>
            {isAvailable && (
              <span className="font-sora font-extrabold text-base text-white">
                {formatMoney(total, tenant.currency)}
              </span>
            )}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
