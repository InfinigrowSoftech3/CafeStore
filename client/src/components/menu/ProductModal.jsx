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
        className="bg-[#FFFDF7] w-full sm:max-w-lg sm:rounded-[32px] rounded-t-[32px] overflow-hidden
                   max-h-[92vh] sm:max-h-[88vh] flex flex-col shadow-[0_20px_50px_rgba(15,61,46,0.25)] border border-[#0F3D2E]/12"
      >
        {/* Mobile Swipe / Drag Handle */}
        <div className="sm:hidden flex items-center justify-center pt-2.5 pb-1 bg-[#FFFDF7]">
          <div className="w-10 h-1.5 rounded-full bg-[#0F3D2E]/20" />
        </div>

        {/* Hero Image Section */}
        <div className="relative h-60 sm:h-64 flex-shrink-0 bg-[#0F3D2E]/5 overflow-hidden">
          <img
            src={product.image || PLACEHOLDER}
            alt={product.name}
            className={`w-full h-full object-cover transition-opacity duration-300 ${!isAvailable ? 'opacity-50 grayscale' : ''}`}
            onError={e => { e.currentTarget.src = PLACEHOLDER; }}
          />
          {/* Deep Forest Green Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0F3D2E] via-[#0F3D2E]/45 to-black/25" />

          {/* Close button - Butter & Green Theme */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close product modal"
            className="absolute top-3.5 right-3.5 min-h-[38px] min-w-[38px] w-9.5 h-9.5 bg-[#FFF1C9] hover:bg-white text-[#0F3D2E]
                       rounded-full flex items-center justify-center shadow-md border border-[#0F3D2E]/10
                       transition-all active:scale-90 focus:outline-none focus:ring-2 focus:ring-[#0F3D2E]"
          >
            <X size={18} strokeWidth={2.4} aria-hidden="true" />
          </button>

          {/* Badges on Hero */}
          <div className="absolute top-3.5 left-4 flex flex-wrap items-center gap-1.5">
            {/* Veg / Non-Veg Badge */}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 backdrop-blur-md px-2.5 py-1 text-[11px] font-sora font-bold text-[#0F3D2E] shadow-xs border border-[#0F3D2E]/10">
              <VegMark isVeg={product.isVeg} size={13} />
              <span>{product.isVeg !== false ? 'VEG' : 'NON-VEG'}</span>
            </span>

            {/* Popular Badge */}
            {product.popular && isAvailable && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0F3D2E] text-[#FFF1C9] border border-[#FFF1C9]/30 px-2.5 py-1 text-[11px] font-sora font-bold shadow-xs">
                <Sparkles size={11} className="text-[#FFF1C9]" />
                <span>POPULAR</span>
              </span>
            )}
          </div>

          {/* Bottom title & price overlay */}
          <div className="absolute bottom-3.5 left-4 right-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="font-sora text-xl sm:text-2xl font-extrabold text-[#FFF1C9] drop-shadow-sm leading-tight tracking-tight">
                {product.name}
              </h2>
              {product.prepTime && (
                <span className="inline-flex items-center gap-1 text-xs text-[#FFF1C9]/90 font-jakarta font-semibold mt-1">
                  <Clock size={12} className="text-[#FFF1C9]" /> Prep time: ~{product.prepTime} mins
                </span>
              )}
            </div>
            <div className="text-right shrink-0">
              <span className="font-sora text-xl sm:text-2xl font-extrabold text-[#FFF1C9] drop-shadow-sm">
                {formatMoney(basePrice, tenant.currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 flex-1 overflow-y-auto space-y-5 bg-[#FFFDF7] no-scrollbar">
          {/* Description */}
          {product.description && (
            <div className="rounded-[20px] bg-[#FFF1C9]/45 p-4 border border-[#0F3D2E]/10 shadow-2xs">
              <p className="text-[#0F3D2E]/85 text-sm font-jakarta font-medium leading-relaxed">
                {product.description}
              </p>
            </div>
          )}

          {/* Variants / Sizes */}
          {variants.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-xs font-sora font-extrabold uppercase tracking-wider text-[#0F3D2E]">
                  Select Size / Option <span className="text-[var(--menu-accent,#C93A1C)]">*</span>
                </p>
                <span className="text-[11px] font-sora font-semibold text-[#0F3D2E]/50">Required</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {variants.map(v => {
                  const isSelected = selectedVariant?.name === v.name;
                  return (
                    <button
                      key={v.name}
                      type="button"
                      onClick={() => setSelectedVariant(v)}
                      className={`min-h-[50px] flex items-center justify-between p-3.5 rounded-2xl border transition-all text-left ${
                        isSelected
                          ? 'border-[#0F3D2E] bg-[#FFF1C9]/70 text-[#0F3D2E] font-sora font-bold ring-2 ring-[#0F3D2E] shadow-2xs'
                          : 'border-[#0F3D2E]/12 bg-white text-[#0F3D2E]/80 hover:border-[#0F3D2E]/35 font-jakarta font-semibold shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected ? 'border-[#0F3D2E] bg-[#0F3D2E]' : 'border-[#0F3D2E]/30 bg-white'
                        }`}>
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#FFF1C9]" />}
                        </div>
                        <span className="text-xs font-sora font-bold">{v.name}</span>
                      </div>
                      <span className="text-xs font-sora font-extrabold text-[#0F3D2E]">
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
              <p className="text-xs font-sora font-extrabold uppercase tracking-wider text-[#0F3D2E] mb-2.5">
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
                      className={`min-h-[46px] flex items-center justify-between p-3.5 rounded-2xl border text-xs transition-all ${
                        selected
                          ? 'border-[#0F3D2E] bg-[#FFF1C9]/70 text-[#0F3D2E] ring-2 ring-[#0F3D2E] font-sora font-bold shadow-2xs'
                          : 'border-[#0F3D2E]/12 bg-white text-[#0F3D2E]/80 hover:border-[#0F3D2E]/35 font-jakarta font-semibold shadow-2xs'
                      }`}
                    >
                      <span className="font-sora font-bold">{milk.name}</span>
                      <span className="text-[#0F3D2E] font-sora font-extrabold">
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
              <p className="text-xs font-sora font-extrabold uppercase tracking-wider text-[#0F3D2E] mb-2.5">
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
                      className={`min-h-[50px] w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                        selected
                          ? 'border-[#0F3D2E] bg-[#FFF1C9]/70 text-[#0F3D2E] ring-2 ring-[#0F3D2E] shadow-2xs font-sora font-bold'
                          : 'border-[#0F3D2E]/12 bg-white text-[#0F3D2E]/80 hover:border-[#0F3D2E]/35 font-jakarta font-semibold shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center transition-colors ${
                          selected ? 'border-[#0F3D2E] bg-[#0F3D2E] text-[#FFF1C9]' : 'border-[#0F3D2E]/30 bg-white'
                        }`}>
                          {selected && <Check size={12} strokeWidth={3} />}
                        </div>
                        <span className="font-sora font-bold text-xs sm:text-sm">{addon.name}</span>
                      </div>
                      <span className="text-xs font-sora font-extrabold text-[#0F3D2E]">
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
              <p className="text-xs font-sora font-extrabold uppercase tracking-wider text-[#0F3D2E]">
                Special Instructions
              </p>
              <span className="text-[11px] font-sora font-bold text-[#0F3D2E]/50">{instructions.length}/120</span>
            </div>

            {/* Quick preset chips */}
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {INSTRUCTION_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePresetInstruction(preset)}
                  className="rounded-full border border-[#0F3D2E]/15 bg-[#FFF1C9]/50 hover:bg-[#FFF1C9] hover:border-[#0F3D2E]/40 px-3.5 py-1.5 text-xs font-sora font-bold text-[#0F3D2E] transition active:scale-95 shadow-2xs"
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
              className="w-full min-h-[46px] rounded-2xl bg-white border border-[#0F3D2E]/20 px-4 py-2.5 text-sm font-jakarta font-medium text-[#0F3D2E] placeholder:text-[#0F3D2E]/40 focus:outline-none focus:ring-2 focus:ring-[#0F3D2E] focus:border-transparent transition shadow-2xs"
            />
          </div>
        </div>

        {/* Modal Sticky Footer Action */}
        <div className="p-4 sm:p-5 border-t border-[#0F3D2E]/10 bg-[#FFF1C9]/85 backdrop-blur-md flex items-center gap-3 flex-shrink-0">
          {/* Quantity Stepper */}
          <div className="flex items-center gap-1 border border-[#0F3D2E]/15 bg-white rounded-2xl p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => changeQty(-1)}
              disabled={!isAvailable || quantity <= 1}
              aria-label="Decrease quantity"
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFF1C9]/70 text-[#0F3D2E] hover:bg-[#0F3D2E] hover:text-[#FFF1C9] transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-[#FFF1C9]/70 disabled:hover:text-[#0F3D2E] active:scale-95"
            >
              <Minus size={15} strokeWidth={2.5} aria-hidden="true" />
            </button>
            <span className="w-8 text-center font-sora font-extrabold text-base text-[#0F3D2E]">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => changeQty(1)}
              disabled={!isAvailable || quantity >= maxQty}
              aria-label="Increase quantity"
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFF1C9]/70 text-[#0F3D2E] hover:bg-[#0F3D2E] hover:text-[#FFF1C9] transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-[#FFF1C9]/70 disabled:hover:text-[#0F3D2E] active:scale-95"
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
            className={`flex-1 min-h-[52px] flex items-center justify-between py-3.5 px-5 rounded-2xl font-sora font-extrabold text-sm transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-[#0F3D2E]
              ${!isAvailable
                ? 'bg-[#0F3D2E]/10 text-[#0F3D2E]/40 cursor-not-allowed'
                : 'bg-[#0F3D2E] text-[#FFF1C9] hover:bg-[#14533C] active:scale-98'
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
              <span className="font-sora font-extrabold text-base text-[#FFF1C9]">
                {formatMoney(total, tenant.currency)}
              </span>
            )}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
