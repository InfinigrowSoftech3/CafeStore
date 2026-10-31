import React, { useState, useEffect } from 'react';
import { formatMoney } from '@cafe/shared';
import { Receipt, Printer, Clock, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import api from '../services/api';
import Modal from './ui/Modal';
import Button from './ui/Button';
import EmptyState from './ui/EmptyState';

export default function RecentOrdersModal({
  isOpen,
  onClose,
  onViewReceipt,
  currency = '₹',
}) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRecentOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/pos/recent?limit=25');
      const list = res.data?.orders || [];
      setOrders(list);
    } catch (err) {
      setError(err.message || 'Unable to load recent orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRecentOrders();
    }
  }, [isOpen]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'served':
      case 'completed':
      case 'ready':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">Ready</span>;
      case 'cooking':
      case 'preparing':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-300">Cooking</span>;
      case 'cancelled':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-100 text-rose-800 border border-rose-300">Cancelled</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-300">{status || 'Confirmed'}</span>;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Recent Station Orders"
      subtitle="Today's confirmed and completed tickets"
      maxWidth="max-w-2xl"
      footer={
        <div className="flex justify-between items-center w-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchRecentOrders}
            disabled={loading}
            icon={RefreshCw}
          >
            Refresh
          </Button>
          <Button variant="secondary" size="md" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <RefreshCw size={24} className="animate-spin text-pos-accent" />
            <span className="text-xs font-semibold text-pos-muted">Loading station orders...</span>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No orders yet today"
            description="Completed sales and active tickets will show up here."
          />
        ) : (
          <div className="divide-y divide-pos-border">
            {orders.map((ord) => (
              <div
                key={ord._id}
                className="py-3 flex items-center justify-between gap-3 hover:bg-pos-raised/40 px-2 rounded-xl transition"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-extrabold text-sm text-pos-text">
                      #{ord.orderNumber}
                    </span>
                    {getStatusBadge(ord.status)}
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-pos-raised text-pos-muted border border-pos-border/60">
                      {(ord.orderType || 'counter').replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-xs text-pos-muted mt-1 truncate">
                    {ord.items?.length || 0} item(s)
                    {ord.tableNumber ? ` • Table ${ord.tableNumber}` : ''}
                    {ord.customer?.name ? ` • ${ord.customer.name}` : ''}
                    {ord.paymentMethod ? ` • ${ord.paymentMethod.toUpperCase()}` : ''}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-extrabold text-sm text-pos-accent font-mono tabular-nums">
                    {formatMoney(ord.totalAmount || ord.total || 0, currency)}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (onViewReceipt) onViewReceipt(ord);
                    }}
                    className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-pos-muted hover:text-pos-text hover:underline"
                  >
                    <Printer size={12} />
                    <span>View Receipt</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
