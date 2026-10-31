import React, { useState } from 'react';
import { QrCode, ArrowRight, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';

export default function ScanQrModal({
  isOpen,
  onClose,
  onApplyTable,
  onApplyCustomer,
}) {
  const [code, setCode] = useState('');

  const handleProcessCode = (e) => {
    e.preventDefault();
    const raw = code.trim();
    if (!raw) return;

    // Check if it's a table URL e.g. table=4 or table/4
    const tableMatch = raw.match(/table[=/](\d+)/i) || raw.match(/^table\s*(\d+)$/i) || raw.match(/^T-?(\d+)$/i);
    if (tableMatch && tableMatch[1]) {
      const tableNum = tableMatch[1];
      onApplyTable(tableNum);
      toast.success(`Selected Table ${tableNum} from QR`);
      setCode('');
      onClose();
      return;
    }

    // Check if it's a 10 digit phone number
    const cleanPhone = raw.replace(/\D/g, '');
    if (cleanPhone.length === 10) {
      onApplyCustomer(cleanPhone);
      toast.success(`Linked customer phone ${cleanPhone}`);
      setCode('');
      onClose();
      return;
    }

    // If pure number < 100, treat as table
    const num = Number(raw);
    if (!isNaN(num) && num > 0 && num < 200) {
      onApplyTable(String(num));
      toast.success(`Selected Table ${num}`);
      setCode('');
      onClose();
      return;
    }

    toast.error('Unrecognized QR data. Enter table number or 10-digit phone number.');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Scan Table / Customer QR"
      subtitle="Point hardware scanner or enter scanned payload"
      maxWidth="max-w-md"
      footer={
        <div className="flex gap-2.5 w-full">
          <Button variant="secondary" size="md" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleProcessCode}
            disabled={!code.trim()}
            className="flex-1 font-bold"
          >
            Apply Scanned Code →
          </Button>
        </div>
      }
    >
      <form onSubmit={handleProcessCode} className="space-y-4">
        <div className="p-6 rounded-2xl bg-pos-raised border-2 border-dashed border-pos-border flex flex-col items-center justify-center text-center">
          <QrCode size={48} className="text-pos-accent animate-pulse" />
          <span className="font-bold text-sm text-pos-text mt-3">Ready for Hardware Scanner</span>
          <p className="text-xs text-pos-muted mt-1 max-w-xs">
            Scan physical Table QR stands or customer digital loyalty cards directly with your USB/Bluetooth barcode scanner.
          </p>
        </div>

        <div>
          <label className="text-xs font-bold uppercase text-pos-muted block mb-1">
            Manual Scanner Input Payload
          </label>
          <Input
            autoFocus
            placeholder="e.g. Table 4 or customer mobile..."
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>
      </form>
    </Modal>
  );
}
