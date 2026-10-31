import React from 'react';
import { formatMoney } from '@cafe/shared';
import { PauseCircle, Trash2, ArrowRight } from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import EmptyState from './ui/EmptyState';

export default function HeldOrdersModal({
  isOpen,
  onClose,
  heldOrders = [],
  onResume,
  onDiscard,
  currency = '₹',
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Held Orders"
      subtitle={`${heldOrders.length} ticket(s) paused on station`}
      maxWidth="max-w-lg"
    >
      <div className="space-y-2.5">
        {heldOrders.length === 0 ? (
          <EmptyState
            icon={PauseCircle}
            title="No held orders"
            description="Orders paused during checkout will be preserved here."
          />
        ) : (
          heldOrders.map((held) => (
            <div
              key={held._id}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-pos-raised border border-pos-border hover:border-pos-accent/40 transition"
            >
              <div className="min-w-0 flex-1 pr-3">
                <div className="font-bold text-sm text-pos-text truncate">
                  Ticket #{held.orderNumber || held._id.slice(-4)}
                </div>
                <div className="text-xs text-pos-muted mt-0.5 capitalize">
                  {held.items?.length || 0} item(s) • {(held.orderType || 'counter').replace('_', ' ')}
                  {held.tableNumber ? ` • Table ${held.tableNumber}` : ''}
                  {held.customer?.name ? ` • ${held.customer.name}` : ''}
                </div>
                <div className="text-xs font-extrabold text-pos-accent font-mono tabular-nums mt-1">
                  {formatMoney(held.totalAmount || held.total || 0, currency)}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {onDiscard && (
                  <button
                    type="button"
                    onClick={() => onDiscard(held._id)}
                    className="p-2 text-pos-muted hover:text-pos-danger rounded-xl hover:bg-white touch-press"
                    title="Discard held order"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onResume(held)}
                  className="font-bold text-xs"
                >
                  Resume <ArrowRight size={13} />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}
