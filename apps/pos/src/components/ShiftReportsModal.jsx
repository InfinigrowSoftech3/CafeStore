import React, { useState, useEffect } from 'react';
import { formatMoney } from '@cafe/shared';
import { BarChart3, Banknote, QrCode, CreditCard, Receipt, Printer, RefreshCw } from 'lucide-react';
import api from '../services/api';
import Modal from './ui/Modal';
import Button from './ui/Button';

export default function ShiftReportsModal({
  isOpen,
  onClose,
  tenant,
  currency = '₹',
}) {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalSales: 0,
    cashSales: 0,
    upiSales: 0,
    cardSales: 0,
    splitSales: 0,
  });

  const fetchShiftStats = async () => {
    setLoading(true);
    try {
      const res = await api.get('/pos/recent?limit=100').catch(() => ({ data: { orders: [] } }));
      const orders = res.data?.orders || [];

      let cash = 0, upi = 0, card = 0, split = 0, total = 0;
      for (const ord of orders) {
        const amt = Number(ord.totalAmount || ord.total || 0);
        total += amt;
        const method = (ord.paymentMethod || '').toLowerCase();
        if (method === 'cash') cash += amt;
        else if (method === 'upi') upi += amt;
        else if (method === 'card') card += amt;
        else if (method === 'split') split += amt;
        else cash += amt;
      }

      setStats({
        totalOrders: orders.length,
        totalSales: total,
        cashSales: cash,
        upiSales: upi,
        cardSales: card,
        splitSales: split,
      });
    } catch (_err) {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchShiftStats();
    }
  }, [isOpen]);

  const avgOrderValue = stats.totalOrders > 0 ? (stats.totalSales / stats.totalOrders).toFixed(2) : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Daily Register Summary"
      subtitle={`${tenant?.name || 'VelvetRosiee'} • Today's Station Performance`}
      maxWidth="max-w-md"
      footer={
        <div className="flex gap-2.5 w-full">
          <Button
            variant="secondary"
            size="md"
            icon={Printer}
            onClick={() => window.print()}
            className="flex-1"
          >
            Print Shift Z-Report
          </Button>
          <Button variant="primary" size="md" onClick={onClose} className="flex-1 font-bold">
            Done
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Gross Sales Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-[#105B43] to-[#062F25] text-white shadow-md">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#A9C7B8] block">
            Today's Gross Sales
          </span>
          <div className="font-display font-extrabold text-3xl text-white mt-1 font-mono tabular-nums">
            {formatMoney(stats.totalSales, currency)}
          </div>
          <div className="flex items-center justify-between text-xs text-[#EAE3D9] mt-2 pt-2 border-t border-[#174B3C]">
            <span>{stats.totalOrders} Completed Orders</span>
            <span>Avg {currency}{avgOrderValue} / order</span>
          </div>
        </div>

        {/* Payment Methods Breakdown */}
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-pos-muted block">
            Payment Breakdown
          </span>

          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-xl bg-pos-raised border border-pos-border">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                <Banknote size={15} /> <span>Cash Sales</span>
              </div>
              <div className="text-base font-extrabold text-pos-text font-mono tabular-nums mt-1">
                {formatMoney(stats.cashSales, currency)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-pos-raised border border-pos-border">
              <div className="flex items-center gap-1.5 text-xs font-bold text-purple-700">
                <QrCode size={15} /> <span>UPI Sales</span>
              </div>
              <div className="text-base font-extrabold text-pos-text font-mono tabular-nums mt-1">
                {formatMoney(stats.upiSales, currency)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-pos-raised border border-pos-border">
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700">
                <CreditCard size={15} /> <span>Card Sales</span>
              </div>
              <div className="text-base font-extrabold text-pos-text font-mono tabular-nums mt-1">
                {formatMoney(stats.cardSales, currency)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-pos-raised border border-pos-border">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700">
                <Receipt size={15} /> <span>Split / Other</span>
              </div>
              <div className="text-base font-extrabold text-pos-text font-mono tabular-nums mt-1">
                {formatMoney(stats.splitSales, currency)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
