import { Link } from 'react-router-dom';
import { ShoppingBag, ArrowRight, Plus, Minus, ScanLine, AlertCircle } from 'lucide-react';
import useCartStore, { cartSubtotal, cartItemCount } from '../../context/cartStore';
import { useTenant } from '../../context/TenantContext';
import { formatMoney } from '../../utils/money';
import VegMark from './VegMark';

export default function DesktopOrderSidebar({ onOpenScanner, isKitchenOpen = true }) {
  const tenant = useTenant();
  const { items, updateQuantity, tableNumber } = useCartStore();

  const count = useCartStore(cartItemCount);
  const subtotal = useCartStore(cartSubtotal);
  const taxRate = Number(tenant.taxRate || 5);
  const tax = Number(((subtotal * taxRate) / 100).toFixed(2));
  const total = (subtotal + tax).toFixed(2);

  return (
    <aside
      aria-label="Your Order"
      className="sticky top-6 w-full rounded-[28px] bg-white border border-[#0F3D2E]/10 p-5 shadow-[0_8px_30px_rgba(15,61,46,0.06)] flex flex-col"
    >
      {/* ─── Panel Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between pb-3.5 border-b border-[#0F3D2E]/8">
        <div className="flex items-center gap-2">
          <h2 className="font-sora font-extrabold text-xl text-[#0F3D2E] tracking-tight">
            Your Order
          </h2>
          {count > 0 && (
            <span className="inline-flex items-center justify-center h-6 min-w-[24px] px-2 rounded-full bg-[#0F3D2E] text-[#FFF1C9] text-xs font-sora font-bold">
              {count}
            </span>
          )}
        </div>

        {/* Table Badge / Action */}
        <button
          type="button"
          onClick={onOpenScanner}
          aria-label={tableNumber ? `Current Table ${tableNumber}, click to change` : 'Scan table QR code'}
          className="inline-flex min-h-[38px] items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF1C9]/70 hover:bg-[#FFF1C9] border border-[#0F3D2E]/15 text-[#0F3D2E] text-xs font-sora font-bold transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F3D2E]"
        >
          {tableNumber ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-[#1B7A3E]" aria-hidden="true" />
              <span>Table {tableNumber}</span>
            </>
          ) : (
            <>
              <ScanLine size={13} />
              <span>Set Table</span>
            </>
          )}
        </button>
      </div>

      {/* ─── Body: Empty State or Cart Items ────────────────────────── */}
      {items.length === 0 ? (
        <div className="py-12 px-4 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-[#FFF1C9]/80 flex items-center justify-center text-[#0F3D2E] mb-3.5 shadow-2xs">
            <ShoppingBag size={26} strokeWidth={2.2} />
          </div>
          <h3 className="font-sora font-bold text-base text-[#0F3D2E]">
            Your order is empty
          </h3>
          <p className="text-xs text-[#0F3D2E]/60 font-jakarta mt-1 max-w-[220px] leading-relaxed">
            Select items from the menu to start your café order.
          </p>
        </div>
      ) : (
        <>
          {/* Scrollable Items List */}
          <div className="py-3.5 max-h-[340px] overflow-y-auto space-y-3 pr-1 no-scrollbar divide-y divide-[#0F3D2E]/5">
            {items.map((item) => (
              <div key={item.key} className="pt-3 first:pt-0 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <VegMark isVeg={item.isVeg} size={13} />
                    <span className="font-sora font-bold text-xs sm:text-sm text-[#0F3D2E] truncate">
                      {item.name}
                    </span>
                  </div>

                  {/* Customizations / Variant details */}
                  {(item.selectedVariant || (item.selectedAddons && item.selectedAddons.length > 0)) && (
                    <p className="text-[11px] text-[#0F3D2E]/60 font-jakarta mt-0.5 truncate pl-5">
                      {[
                        item.selectedVariant?.name,
                        ...(item.selectedAddons || []).map((a) => `+${a.name}`),
                      ]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  )}

                  {/* Quantity Stepper */}
                  <div className="mt-2 pl-5 flex items-center gap-2">
                    <div className="inline-flex min-h-[36px] items-center rounded-full bg-[#0F3D2E]/8 text-[#0F3D2E] px-1">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.key, item.quantity - 1)}
                        aria-label={`Decrease ${item.name} quantity`}
                        className="w-7 h-7 min-h-[36px] min-w-[28px] flex items-center justify-center rounded-full hover:bg-black/10 active:scale-90 transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0F3D2E]"
                      >
                        <Minus size={12} strokeWidth={2.8} />
                      </button>
                      <span className="min-w-[20px] text-center font-sora text-xs font-bold text-[#0F3D2E]">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.key, item.quantity + 1)}
                        aria-label={`Increase ${item.name} quantity`}
                        className="w-7 h-7 min-h-[36px] min-w-[28px] flex items-center justify-center rounded-full hover:bg-black/10 active:scale-90 transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0F3D2E]"
                      >
                        <Plus size={12} strokeWidth={2.8} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Item Total */}
                <div className="text-right shrink-0 pt-0.5">
                  <span className="font-sora font-extrabold text-xs sm:text-sm text-[#0F3D2E]">
                    {formatMoney(item.itemTotal || item.price * item.quantity, tenant.currency)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* ─── Subtotal & Summary ─────────────────────────────────── */}
          <div className="pt-3.5 border-t border-[#0F3D2E]/8 space-y-1.5 text-xs font-jakarta">
            <div className="flex items-center justify-between text-[#0F3D2E]/75">
              <span>Subtotal</span>
              <span className="font-semibold text-[#0F3D2E]">
                {formatMoney(subtotal, tenant.currency)}
              </span>
            </div>
            {tax > 0 && (
              <div className="flex items-center justify-between text-[#0F3D2E]/75">
                <span>Taxes & charges ({tenant.taxRate || 5}%)</span>
                <span className="font-semibold text-[#0F3D2E]">
                  {formatMoney(tax, tenant.currency)}
                </span>
              </div>
            )}
            <div className="flex items-baseline justify-between pt-2 border-t border-[#0F3D2E]/8">
              <span className="font-sora font-bold text-sm text-[#0F3D2E]">Total</span>
              <span className="font-sora font-extrabold text-xl text-[#0F3D2E]">
                {formatMoney(total, tenant.currency)}
              </span>
            </div>
          </div>

          {/* ─── Place Order CTA ────────────────────────────────────── */}
          <div className="pt-4">
            {!isKitchenOpen ? (
              <div className="w-full min-h-[48px] rounded-full bg-[#0F3D2E]/10 text-[#0F3D2E]/50 font-sora font-bold text-xs flex items-center justify-center gap-1.5 cursor-not-allowed">
                <AlertCircle size={14} />
                <span>Kitchen currently closed</span>
              </div>
            ) : (
              <Link
                to="/cart"
                aria-label={`View order and checkout, total ${formatMoney(total, tenant.currency)}`}
                className="w-full min-h-[48px] rounded-full bg-[var(--menu-accent,#C93A1C)] text-white font-sora font-extrabold text-sm flex items-center justify-center gap-2 shadow-sm hover:brightness-105 active:scale-98 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F3D2E]"
              >
                <span>View order & checkout</span>
                <ArrowRight size={16} strokeWidth={2.4} />
              </Link>
            )}
          </div>
        </>
      )}
    </aside>
  );
}
