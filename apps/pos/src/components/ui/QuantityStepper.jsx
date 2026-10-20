import React from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';

export default function QuantityStepper({
  quantity,
  onIncrease,
  onDecrease,
  min = 1,
  showTrashOnMin = false,
  className = '',
}) {
  const isMin = quantity <= min;

  return (
    <div className={`inline-flex items-center gap-1.5 select-none ${className}`}>
      <button
        type="button"
        onClick={onDecrease}
        aria-label={isMin && showTrashOnMin ? 'Remove item' : 'Decrease quantity'}
        className={`touch-press flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl border transition ${
          isMin && showTrashOnMin
            ? 'border-pos-danger/40 bg-pos-danger/10 text-pos-danger hover:bg-pos-danger/20'
            : 'border-pos-border bg-pos-raised text-pos-text hover:bg-pos-border active:border-pos-accent'
        }`}
      >
        {isMin && showTrashOnMin ? <Trash2 size={16} /> : <Minus size={16} />}
      </button>

      <span className="w-9 text-center font-bold text-base font-mono tabular-nums text-pos-text">
        {quantity}
      </span>

      <button
        type="button"
        onClick={onIncrease}
        aria-label="Increase quantity"
        className="touch-press flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl border border-pos-border bg-pos-raised text-pos-text hover:bg-pos-border active:border-pos-accent transition"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}
