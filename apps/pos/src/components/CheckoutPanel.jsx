import React from 'react';
import { formatMoney } from '@cafe/shared';
import {
  Trash2,
  Phone,
  Check,
  ShoppingCart,
  Banknote,
  QrCode,
  CreditCard,
  Split,
  MapPin,
  AlertCircle,
  PauseCircle,
} from 'lucide-react';
import QuantityStepper from './ui/QuantityStepper';
import Button from './ui/Button';
import EmptyState from './ui/EmptyState';

export default function CheckoutPanel({
  cart = [],
  orderType = 'counter',
  tableNumber = '',
  tables = [],
  customerPhone = '',
  customerName = '',
  deliveryAddress = '',
  orderNotes = '',
  manualDiscount = '',
  subtotal = 0,
  discountAmount = 0,
  taxRate = 5,
  taxAmount = 0,
  totalAmount = 0,
  currency = '₹',
  processing = false,
  checkoutError = null,
  onClearCart,
  onUpdateCartQty,
  onRemoveCartItem,
  onSelectTable,
  onChangeCustomerPhone,
  onChangeDeliveryAddress,
  onSetDiscount,
  onHoldOrder,
  onPayCash,
  onPayUpi,
  onPayCard,
  onPaySplit,
  onRetryCheckout,
}) {
  return (
    <div className="flex flex-col h-full overflow-hidden bg-white text-pos-text select-none">
      {/* ── Order Header & Mode Details ──────────────────────────── */}
      <div className="p-4 border-b border-pos-border bg-pos-raised/40 space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-display font-extrabold text-base tracking-tight text-pos-text">
              Current Ticket
            </span>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#105B43]/10 text-[#059669] border border-[#105B43]/20">
              {orderType.replace('_', ' ')}
            </span>
          </div>

          {cart.length > 0 && (
            <button
              type="button"
              onClick={onClearCart}
              className="text-xs font-semibold text-pos-danger hover:underline touch-press min-h-[32px] px-2 flex items-center gap-1 transition-colors"
            >
              <Trash2 size={13} />
              <span>Clear</span>
            </button>
          )}
        </div>

        {/* Dynamic Inputs: Table if Dine-In, Phone, Address if Delivery */}
        <div className="grid grid-cols-2 gap-2">
          {orderType === 'dine_in' ? (
            <div>
              <label className="text-[10px] font-bold uppercase text-pos-muted block mb-1">
                Table <span className="text-pos-danger">*</span>
              </label>
              <select
                value={tableNumber}
                onChange={(e) => onSelectTable(e.target.value)}
                className="w-full bg-white border border-pos-border rounded-xl py-2 px-2.5 text-xs font-bold text-pos-text focus:outline-none focus:border-pos-accent min-h-[44px]"
              >
                <option value="">Select Table</option>
                {tables.map((t) => {
                  const num = String(t.tableNumber);
                  return (
                    <option key={t._id || num} value={num}>
                      Table {num} ({t.seats || 4} Seats)
                    </option>
                  );
                })}
              </select>
            </div>
          ) : (
            <div>
              <label className="text-[10px] font-bold uppercase text-pos-muted block mb-1">
                Service Mode
              </label>
              <div className="w-full bg-pos-raised border border-pos-border rounded-xl py-2 px-2.5 text-xs font-bold text-pos-text capitalize truncate min-h-[44px] flex items-center">
                {orderType.replace('_', ' ')}
              </div>
            </div>
          )}

          <div>
            <label className="text-[10px] font-bold uppercase text-pos-muted block mb-1">
              Customer Mobile
            </label>
            <div className="relative">
              <Phone size={13} className="absolute left-3 top-3.5 text-pos-muted pointer-events-none" />
              <input
                type="tel"
                maxLength={10}
                placeholder="10-digit phone"
                value={customerPhone}
                onChange={(e) => onChangeCustomerPhone(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-white border border-pos-border rounded-xl py-2 pl-8 pr-2 text-xs font-semibold text-pos-text placeholder:text-pos-muted/60 focus:outline-none focus:border-pos-accent min-h-[44px]"
              />
            </div>
          </div>
        </div>

        {/* Customer Name autofill notification if found */}
        {customerName && (
          <div className="flex items-center gap-1.5 text-xs text-[#059669] font-bold bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
            <Check size={14} className="text-[#059669] shrink-0" />
            <span className="truncate">Guest: {customerName}</span>
          </div>
        )}

        {/* Delivery Address Field if Delivery Mode */}
        {orderType === 'delivery' && (
          <div>
            <label className="text-[10px] font-bold uppercase text-pos-muted block mb-1">
              Delivery Destination Address
            </label>
            <div className="relative">
              <MapPin size={13} className="absolute left-3 top-3.5 text-pos-muted pointer-events-none" />
              <input
                type="text"
                placeholder="Flat / Building, Street, Landmark..."
                value={deliveryAddress}
                onChange={(e) => onChangeDeliveryAddress(e.target.value)}
                className="w-full bg-white border border-pos-border rounded-xl py-2 pl-8 pr-2 text-xs font-semibold text-pos-text placeholder:text-pos-muted/60 focus:outline-none focus:border-pos-accent min-h-[44px]"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Cart Line Items List ──────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 pos-scrollbar">
        {cart.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="Ticket is empty"
            description="Tap dishes from the menu to build the order."
            className="my-auto py-12"
          />
        ) : (
          cart.map((item) => (
            <div
              key={item.cartKey}
              className="bg-pos-raised border border-pos-border rounded-2xl p-3 space-y-2 shadow-xs transition-colors hover:border-pos-accent/40"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-sm text-pos-text leading-tight truncate">
                    {item.name}
                  </div>
                  {item.variant && (
                    <div className="text-xs text-pos-accent font-semibold mt-0.5">
                      Size: {item.variant.name}
                    </div>
                  )}
                  {item.addons && item.addons.length > 0 && (
                    <div className="text-[11px] text-pos-muted mt-0.5">
                      +{item.addons.map((a) => a.name).join(', ')}
                    </div>
                  )}
                  {item.specialInstructions && (
                    <div className="text-[11px] text-amber-700 italic mt-0.5">
                      "{item.specialInstructions}"
                    </div>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <span className="font-bold text-sm text-pos-text font-mono tabular-nums">
                    {formatMoney(item.itemTotal, currency)}
                  </span>
                </div>
              </div>

              {/* Quantity Stepper & Remove */}
              <div className="flex items-center justify-between pt-1.5 border-t border-pos-border/60">
                <QuantityStepper
                  quantity={item.quantity}
                  onDecrease={() => onUpdateCartQty(item.cartKey, -1)}
                  onIncrease={() => onUpdateCartQty(item.cartKey, 1)}
                />
                <button
                  type="button"
                  onClick={() => onRemoveCartItem(item.cartKey)}
                  aria-label={`Remove ${item.name}`}
                  className="p-2 text-pos-muted hover:text-pos-danger rounded-xl hover:bg-white touch-press transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Billing Breakdown & Payment Actions ────────────────────── */}
      <div className="p-4 bg-white border-t border-pos-border space-y-3 shrink-0 shadow-elevation2">
        {/* Quick Discounts Chips */}
        <div className="flex items-center gap-1.5 text-xs overflow-x-auto pos-scrollbar pb-0.5">
          <span className="text-pos-muted font-bold text-[11px] shrink-0">Discount:</span>
          {[
            { label: '5%', val: Math.round(subtotal * 0.05) },
            { label: '10%', val: Math.round(subtotal * 0.10) },
            { label: `${currency}50`, val: 50 },
          ].map((d, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSetDiscount(String(d.val))}
              className="px-2.5 py-1 rounded-lg bg-pos-raised text-pos-text hover:bg-pos-border border border-pos-border/80 font-bold text-[11px] touch-press min-h-[32px]"
            >
              {d.label}
            </button>
          ))}
          {discountAmount > 0 && (
            <button
              type="button"
              onClick={() => onSetDiscount('')}
              className="text-pos-danger font-bold text-[11px] ml-auto hover:underline"
            >
              Reset
            </button>
          )}
        </div>

        {/* Breakdown Summary */}
        <div className="space-y-1.5 text-xs text-pos-muted">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="tabular-nums font-semibold text-pos-text font-mono">
              {formatMoney(subtotal, currency)}
            </span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-[#059669] font-semibold">
              <span>Discount</span>
              <span className="tabular-nums font-mono">
                -{formatMoney(discountAmount, currency)}
              </span>
            </div>
          )}
          <div className="flex justify-between text-[11px]">
            <span>GST / Tax ({taxRate}%)</span>
            <span className="tabular-nums font-mono">
              +{formatMoney(taxAmount, currency)}
            </span>
          </div>
          <div className="flex justify-between items-baseline pt-2 border-t border-pos-border">
            <span className="font-display font-extrabold text-base text-pos-text">Total Payable</span>
            <span className="font-display font-black text-2xl text-pos-accent tabular-nums font-mono">
              {formatMoney(totalAmount, currency)}
            </span>
          </div>
        </div>

        {/* Checkout Failure Notification */}
        {checkoutError && (
          <div className="p-3 rounded-2xl border border-rose-400/50 bg-rose-500/10 text-rose-900 text-xs flex items-start gap-2">
            <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="font-bold">Checkout Interrupted (Cart Safe)</div>
              <div className="mt-0.5 text-[11px] opacity-90 truncate">{checkoutError.message}</div>
            </div>
            {checkoutError.canRetry && (
              <button
                type="button"
                onClick={onRetryCheckout}
                disabled={processing}
                className="px-2.5 py-1 rounded-lg bg-pos-accent text-white text-[11px] font-bold hover:opacity-90 transition shrink-0 cursor-pointer disabled:opacity-50"
              >
                {processing ? '...' : 'Retry'}
              </button>
            )}
          </div>
        )}

        {/* Master Sticky Pay Now Action */}
        <Button
          variant="primary"
          size="lg"
          onClick={onPayCash}
          disabled={cart.length === 0 || processing}
          className="w-full flex items-center justify-between px-5 font-bold tracking-wide"
        >
          <span className="uppercase tracking-wider text-xs font-black text-white/95">
            {processing ? 'Processing...' : 'Pay Now'}
          </span>
          <span className="text-lg font-black tabular-nums font-mono">
            Charge {formatMoney(totalAmount, currency)} →
          </span>
        </Button>

        {/* 4 Large Payment Method Buttons */}
        <div className="grid grid-cols-4 gap-2">
          <button
            type="button"
            onClick={onPayCash}
            disabled={cart.length === 0 || processing}
            className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-pos-raised hover:bg-pos-raised/80 text-[#059669] border border-pos-border hover:border-[#059669] touch-press disabled:opacity-40 min-h-[52px]"
          >
            <Banknote size={18} />
            <span className="text-[11px] font-bold mt-1 text-pos-text">Cash</span>
          </button>
          <button
            type="button"
            onClick={onPayUpi}
            disabled={cart.length === 0 || processing}
            className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-pos-raised hover:bg-pos-raised/80 text-purple-600 border border-pos-border hover:border-purple-500 touch-press disabled:opacity-40 min-h-[52px]"
          >
            <QrCode size={18} />
            <span className="text-[11px] font-bold mt-1 text-pos-text">UPI</span>
          </button>
          <button
            type="button"
            onClick={onPayCard}
            disabled={cart.length === 0 || processing}
            className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-pos-raised hover:bg-pos-raised/80 text-blue-600 border border-pos-border hover:border-blue-500 touch-press disabled:opacity-40 min-h-[52px]"
          >
            <CreditCard size={18} />
            <span className="text-[11px] font-bold mt-1 text-pos-text">Card</span>
          </button>
          <button
            type="button"
            onClick={onPaySplit}
            disabled={cart.length === 0 || processing}
            className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-pos-raised hover:bg-pos-raised/80 text-amber-600 border border-pos-border hover:border-amber-500 touch-press disabled:opacity-40 min-h-[52px]"
          >
            <Split size={18} />
            <span className="text-[11px] font-bold mt-1 text-pos-text">Split</span>
          </button>
        </div>

        {/* Hold Order Action */}
        <div className="pt-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onHoldOrder}
            disabled={cart.length === 0}
            className="w-full text-xs text-pos-muted hover:text-pos-text border border-pos-border hover:border-pos-accent flex items-center justify-center gap-1.5"
          >
            <PauseCircle size={14} />
            <span>Hold Order for Later</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
