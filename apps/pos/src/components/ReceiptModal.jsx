import React from 'react';
import { formatMoney } from '@cafe/shared';
import { Printer, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';

export default function ReceiptModal({
  isOpen,
  onClose,
  lastReceipt,
  tenant,
  currency = '₹',
  onNewOrder,
}) {
  if (!lastReceipt) return null;

  const order = lastReceipt.order || lastReceipt;
  const isDemo = lastReceipt.isDemo || order?.isDemo;
  const items = order.items || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isDemo ? 'Demo Simulation Ticket' : 'Order Confirmed'}
      subtitle={isDemo ? 'DEMO — NOT A REAL SALE' : 'Receipt generated successfully'}
      maxWidth="max-w-md"
      showClose={false}
      footer={
        <div className="flex flex-col gap-2.5 w-full">
          <Button
            variant="primary"
            size="lg"
            onClick={onNewOrder || onClose}
            className="w-full text-base font-bold shadow-elevation1"
          >
            Start New Order →
          </Button>

          <Button
            variant="secondary"
            size="md"
            icon={Printer}
            onClick={() => window.print()}
            className="w-full font-semibold"
          >
            Print Customer Receipt
          </Button>
        </div>
      }
    >
      <div className="text-center space-y-4 py-1">
        {/* Demo transaction banner if applicable */}
        {isDemo && (
          <div className="p-3 rounded-2xl bg-amber-500/15 border-2 border-dashed border-amber-500 text-amber-900 text-center space-y-1">
            <div className="flex items-center justify-center gap-1.5 font-black text-xs uppercase tracking-wider text-amber-800">
              <AlertCircle size={15} className="text-amber-700 shrink-0" />
              <span>SIMULATION MODE — NOT A REAL SALE</span>
            </div>
            <div className="text-[11px] font-semibold text-amber-900/80">
              Training transaction only. No real payment or live stock deducted.
            </div>
          </div>
        )}

        {/* Success checkmark */}
        <div
          className={`flex items-center justify-center w-14 h-14 rounded-full mx-auto border ${
            isDemo
              ? 'bg-amber-500/10 text-amber-700 border-amber-500/30'
              : 'bg-emerald-500/10 text-[#059669] border-emerald-500/30'
          }`}
        >
          <CheckCircle2 size={32} />
        </div>

        {/* Cafe Name & Order Number */}
        <div>
          <span className="font-display font-extrabold text-lg text-pos-text block">
            {tenant?.name || 'VelvetRosiee'}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-pos-muted">
            CAFE & BISTRO • TAX INVOICE
          </span>
          <h3 className="font-display font-black text-2xl sm:text-3xl text-pos-accent mt-1 tracking-tight">
            #{order.orderNumber}
          </h3>
          <span className="text-[11px] text-pos-muted block mt-0.5">
            {new Date(order.createdAt || Date.now()).toLocaleString([], {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </span>
        </div>

        {/* Order Details Card */}
        <div className="p-4 rounded-2xl bg-pos-raised border border-pos-border text-left space-y-3 text-xs">
          {/* Metadata */}
          <div className="grid grid-cols-2 gap-2 pb-2.5 border-b border-pos-border text-[11px]">
            <div>
              <span className="text-pos-muted block">Order Mode:</span>
              <span className="font-bold text-pos-text capitalize">
                {(order.orderType || 'counter').replace('_', ' ')}
              </span>
            </div>
            {order.tableNumber && (
              <div className="text-right">
                <span className="text-pos-muted block">Table:</span>
                <span className="font-bold text-pos-text font-mono">
                  Table {order.tableNumber}
                </span>
              </div>
            )}
            {order.customer?.name && (
              <div>
                <span className="text-pos-muted block">Customer:</span>
                <span className="font-bold text-pos-text truncate block">
                  {order.customer.name}
                </span>
              </div>
            )}
            <div>
              <span className="text-pos-muted block">Payment Method:</span>
              <span className="font-bold text-pos-text uppercase">
                {order.paymentMethod || 'Paid'}
              </span>
            </div>
          </div>

          {/* Itemized list */}
          <div className="space-y-1.5 py-1 max-h-48 overflow-y-auto pos-scrollbar">
            {items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start text-xs">
                <div className="flex-1 pr-2">
                  <span className="font-bold text-pos-text">
                    {item.quantity}x {item.name}
                  </span>
                  {item.variant && (
                    <span className="text-[10px] text-pos-muted block">
                      Size: {item.variant.name}
                    </span>
                  )}
                  {item.addons && item.addons.length > 0 && (
                    <span className="text-[10px] text-pos-muted block">
                      +{item.addons.map((a) => a.name).join(', ')}
                    </span>
                  )}
                </div>
                <span className="font-bold text-pos-text font-mono tabular-nums">
                  {formatMoney(item.itemTotal || (item.price * item.quantity), currency)}
                </span>
              </div>
            ))}
          </div>

          {/* Financial Breakdown */}
          <div className="pt-2 border-t border-pos-border space-y-1 text-xs">
            <div className="flex justify-between text-pos-muted">
              <span>Subtotal:</span>
              <span className="font-mono tabular-nums font-semibold text-pos-text">
                {formatMoney(order.subtotal || 0, currency)}
              </span>
            </div>
            {Number(order.discountAmount || order.discount || 0) > 0 && (
              <div className="flex justify-between text-[#059669] font-semibold">
                <span>Discount:</span>
                <span className="font-mono tabular-nums">
                  -{formatMoney(order.discountAmount || order.discount || 0, currency)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-pos-muted text-[11px]">
              <span>Tax / GST:</span>
              <span className="font-mono tabular-nums">
                +{formatMoney(order.taxAmount || order.tax || 0, currency)}
              </span>
            </div>
            <div className="flex justify-between items-baseline pt-2 border-t border-pos-border text-sm font-bold text-pos-text">
              <span>Total Paid:</span>
              <span className="text-pos-accent font-extrabold text-xl font-mono tabular-nums">
                {formatMoney(order.totalAmount || order.total || 0, currency)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
