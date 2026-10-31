import React, { useState, useEffect } from 'react';
import { formatMoney } from '@cafe/shared';
import toast from 'react-hot-toast';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';

export default function SplitPaymentModal({
  isOpen,
  onClose,
  totalAmount = 0,
  currency = '₹',
  onConfirmSplit,
  processing = false,
}) {
  const [splitCash, setSplitCash] = useState('');
  const [splitUpi, setSplitUpi] = useState('');
  const [splitCard, setSplitCard] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSplitCash('');
      setSplitUpi('');
      setSplitCard('');
    }
  }, [isOpen]);

  const cash = Number(splitCash) || 0;
  const upi = Number(splitUpi) || 0;
  const card = Number(splitCard) || 0;
  const enteredSum = Number((cash + upi + card).toFixed(2));
  const remaining = Number((totalAmount - enteredSum).toFixed(2));
  const isValid = Math.abs(remaining) <= 0.01 && enteredSum > 0;

  const handleSubmit = () => {
    if (!isValid) {
      toast.error(`Split amounts (${currency}${enteredSum}) must equal total (${currency}${totalAmount})`);
      return;
    }
    const splits = [];
    if (cash > 0) splits.push({ method: 'cash', amount: cash });
    if (upi > 0) splits.push({ method: 'upi', amount: upi });
    if (card > 0) splits.push({ method: 'card', amount: card });

    onConfirmSplit(splits);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Split Payment"
      subtitle={`Total payable: ${formatMoney(totalAmount, currency)}`}
      maxWidth="max-w-md"
      footer={
        <div className="flex gap-2.5">
          <Button variant="secondary" size="lg" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            variant="primary"
            size="lg"
            disabled={!isValid || processing}
            onClick={handleSubmit}
            className="flex-1 font-bold text-sm tracking-wide"
          >
            {processing ? 'Processing...' : 'Confirm Split →'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold text-pos-muted block mb-1">
            Cash Portion ({currency})
          </label>
          <Input
            type="number"
            min="0"
            step="any"
            placeholder="0.00"
            value={splitCash}
            onChange={(e) => setSplitCash(e.target.value)}
          />
        </div>

        <div>
          <label className="text-xs font-bold text-pos-muted block mb-1">
            UPI Portion ({currency})
          </label>
          <Input
            type="number"
            min="0"
            step="any"
            placeholder="0.00"
            value={splitUpi}
            onChange={(e) => setSplitUpi(e.target.value)}
          />
        </div>

        <div>
          <label className="text-xs font-bold text-pos-muted block mb-1">
            Card Portion ({currency})
          </label>
          <Input
            type="number"
            min="0"
            step="any"
            placeholder="0.00"
            value={splitCard}
            onChange={(e) => setSplitCard(e.target.value)}
          />
        </div>

        <div className="p-3.5 rounded-xl bg-pos-raised border border-pos-border text-xs flex justify-between font-bold">
          <span>Entered: {formatMoney(enteredSum, currency)}</span>
          <span className={isValid ? 'text-[#059669]' : 'text-pos-accent font-extrabold'}>
            {isValid ? 'Ready to Pay ✓' : `Remaining: ${formatMoney(remaining, currency)}`}
          </span>
        </div>
      </div>
    </Modal>
  );
}
