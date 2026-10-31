import React, { useState, useEffect } from 'react';
import { formatMoney } from '@cafe/shared';
import { Delete, CheckCircle2 } from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';

export default function CashPaymentModal({
  isOpen,
  onClose,
  totalAmount = 0,
  currency = '₹',
  onConfirmPayment,
  processing = false,
}) {
  const [cashTendered, setCashTendered] = useState('');

  useEffect(() => {
    if (isOpen) {
      setCashTendered(String(totalAmount));
    }
  }, [isOpen, totalAmount]);

  const tenderedNum = Number(cashTendered) || 0;
  const changeDue = Math.max(0, tenderedNum - totalAmount);
  const isSufficient = tenderedNum >= totalAmount;

  const handleKeypadPress = (val) => {
    if (val === 'C') {
      setCashTendered('');
      return;
    }
    if (val === 'BACK') {
      setCashTendered((prev) => prev.slice(0, -1));
      return;
    }
    if (val === '.' && cashTendered.includes('.')) return;
    setCashTendered((prev) => prev + val);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cash Payment Tender"
      subtitle="Tendered amount and change calculation"
      maxWidth="max-w-md"
      footer={
        <div className="flex gap-2.5">
          <Button
            variant="secondary"
            size="lg"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="lg"
            disabled={!isSufficient || processing}
            onClick={() => onConfirmPayment('cash', tenderedNum)}
            className="flex-1 font-bold text-sm tracking-wide"
          >
            {processing ? 'Processing...' : `Confirm Payment →`}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Due & Tendered Amounts */}
        <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-pos-raised border border-pos-border">
          <div>
            <span className="text-[10px] uppercase font-bold text-pos-muted block">
              Total Due
            </span>
            <span className="font-display font-extrabold text-2xl text-pos-accent tabular-nums">
              {formatMoney(totalAmount, currency)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-pos-muted block">
              Tendered
            </span>
            <span className="font-display font-extrabold text-2xl text-pos-text tabular-nums">
              {currency}{cashTendered || '0'}
            </span>
          </div>
        </div>

        {/* Change Due / Shortfall Indicator */}
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between ${
            isSufficient
              ? 'bg-emerald-50 border-emerald-300 text-[#059669]'
              : 'bg-amber-50 border-amber-300 text-amber-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {isSufficient && <CheckCircle2 size={16} className="text-[#059669]" />}
            <span className="font-bold text-xs uppercase tracking-wider">
              {isSufficient ? 'Change to Return' : 'Shortfall Amount'}
            </span>
          </div>
          <span className="font-display font-extrabold text-xl tabular-nums">
            {formatMoney(isSufficient ? changeDue : totalAmount - tenderedNum, currency)}
          </span>
        </div>

        {/* Quick Amount Presets */}
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-pos-muted block mb-2">
            Quick Cash Presets
          </span>
          <div className="grid grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setCashTendered(String(totalAmount))}
              className="py-2.5 px-2 rounded-xl bg-white hover:bg-pos-raised border border-pos-border hover:border-pos-accent text-pos-text font-bold text-xs touch-press min-h-[44px]"
            >
              Exact
            </button>
            {[100, 200, 500, 1000, 2000].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setCashTendered(String(amt))}
                className="py-2.5 px-2 rounded-xl bg-white hover:bg-pos-raised border border-pos-border hover:border-pos-accent text-pos-text font-bold text-xs touch-press min-h-[44px]"
              >
                {currency}{amt}
              </button>
            ))}
          </div>
        </div>

        {/* On-Screen Touch Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'BACK'].map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => handleKeypadPress(key)}
              className="py-3.5 rounded-xl bg-white hover:bg-pos-raised border border-pos-border text-pos-text font-bold text-lg touch-press min-h-[48px] flex items-center justify-center transition-colors shadow-xs"
            >
              {key === 'BACK' ? <Delete size={20} className="text-pos-muted" /> : key}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
