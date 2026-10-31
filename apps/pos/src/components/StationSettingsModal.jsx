import React, { useState } from 'react';
import { Settings, Volume2, Printer, Percent, ShieldCheck, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from './ui/Modal';
import Button from './ui/Button';

export default function StationSettingsModal({
  isOpen,
  onClose,
  tenant,
  user,
}) {
  const [soundEnabled, setSoundEnabled] = useState(
    () => localStorage.getItem('pos:soundEnabled') !== 'false'
  );
  const [autoPrint, setAutoPrint] = useState(
    () => localStorage.getItem('pos:autoPrint') === 'true'
  );

  const handleSave = () => {
    localStorage.setItem('pos:soundEnabled', soundEnabled ? 'true' : 'false');
    localStorage.setItem('pos:autoPrint', autoPrint ? 'true' : 'false');
    toast.success('Station preferences saved');
    onClose();
  };

  const taxRate = tenant?.settings?.taxRate ?? 5;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Station Preferences"
      subtitle="POS hardware and billing configuration"
      maxWidth="max-w-md"
      footer={
        <div className="flex gap-2.5 w-full">
          <Button variant="secondary" size="md" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button variant="primary" size="md" onClick={handleSave} className="flex-1 font-bold">
            Save Preferences
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Audio Toggle */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-pos-raised border border-pos-border">
          <div className="flex items-center gap-2.5">
            <Volume2 size={18} className="text-pos-accent" />
            <div>
              <span className="font-bold text-sm text-pos-text block">Audio Feedback</span>
              <span className="text-xs text-pos-muted">Play chimes on successful order checkout</span>
            </div>
          </div>
          <input
            type="checkbox"
            checked={soundEnabled}
            onChange={(e) => setSoundEnabled(e.target.checked)}
            className="h-5 w-5 accent-pos-accent rounded cursor-pointer"
          />
        </div>

        {/* Auto Print Toggle */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-pos-raised border border-pos-border">
          <div className="flex items-center gap-2.5">
            <Printer size={18} className="text-pos-accent" />
            <div>
              <span className="font-bold text-sm text-pos-text block">Auto-Print Receipts</span>
              <span className="text-xs text-pos-muted">Automatically open print dialog after payment</span>
            </div>
          </div>
          <input
            type="checkbox"
            checked={autoPrint}
            onChange={(e) => setAutoPrint(e.target.checked)}
            className="h-5 w-5 accent-pos-accent rounded cursor-pointer"
          />
        </div>

        {/* Tax Information */}
        <div className="p-3.5 rounded-xl bg-pos-raised border border-pos-border space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-pos-text">
              <Percent size={15} className="text-pos-accent" />
              <span>Configured GST / Tax Rate</span>
            </div>
            <span className="font-mono font-bold text-sm text-pos-accent">{taxRate}%</span>
          </div>
          <p className="text-[11px] text-pos-muted">
            Configured in Café Back-Office. Calculated dynamically per transaction.
          </p>
        </div>

        {/* Station Info */}
        <div className="p-3.5 rounded-xl bg-pos-raised border border-pos-border text-xs space-y-1.5 text-pos-muted">
          <div className="flex justify-between">
            <span>Café Tenant:</span>
            <span className="font-bold text-pos-text">{tenant?.name || 'VelvetRosiee'}</span>
          </div>
          <div className="flex justify-between">
            <span>Logged Staff:</span>
            <span className="font-bold text-pos-text">{user?.name || user?.email} ({user?.role})</span>
          </div>
          <div className="flex justify-between">
            <span>Terminal Mode:</span>
            <span className="font-bold text-[#059669]">High-Speed Counter POS</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
