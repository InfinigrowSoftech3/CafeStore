import React from 'react';
import { Armchair, Users, Check } from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';

export default function TablesFloorModal({
  isOpen,
  onClose,
  tables = [],
  selectedTableNumber,
  onSelectTable,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tables & Floor Plan"
      subtitle="Select a table for dine-in service"
      maxWidth="max-w-2xl"
      footer={
        <Button variant="secondary" size="md" onClick={onClose} className="w-full">
          Done
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Status Legend */}
        <div className="flex items-center gap-4 text-xs font-semibold text-pos-muted pb-2 border-b border-pos-border">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            <span>Occupied</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
            <span>Reserved</span>
          </div>
        </div>

        {/* Tables Visual Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[60vh] overflow-y-auto pos-scrollbar p-1">
          {tables.map((table) => {
            const num = String(table.tableNumber);
            const isSelected = String(selectedTableNumber) === num;
            const status = (table.status || 'AVAILABLE').toUpperCase();
            const isOccupied = status === 'OCCUPIED';
            const isReserved = status === 'RESERVED';

            return (
              <button
                key={table._id || num}
                type="button"
                onClick={() => {
                  onSelectTable(num);
                  onClose();
                }}
                className={`p-4 rounded-2xl border text-center transition-all touch-press flex flex-col items-center justify-between min-h-[110px] ${
                  isSelected
                    ? 'bg-[#105B43]/15 border-[#105B43] shadow-md ring-2 ring-[#105B43]'
                    : isOccupied
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : isReserved
                    ? 'bg-blue-50 border-blue-200 text-blue-900'
                    : 'bg-white border-pos-border hover:border-pos-accent/50 hover:bg-pos-raised'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isOccupied
                        ? 'bg-amber-500'
                        : isReserved
                        ? 'bg-blue-500'
                        : 'bg-emerald-500'
                    }`}
                  />
                  {isSelected && <Check size={14} className="text-[#059669]" />}
                </div>

                <div className="my-1">
                  <div className="font-display font-extrabold text-lg text-pos-text">
                    Table {table.tableNumber}
                  </div>
                  <div className="flex items-center justify-center gap-1 text-[11px] text-pos-muted font-medium mt-0.5">
                    <Users size={12} />
                    <span>{table.seats || 4} Seats</span>
                  </div>
                </div>

                <span
                  className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    isSelected
                      ? 'bg-[#105B43] text-white'
                      : isOccupied
                      ? 'bg-amber-200 text-amber-900'
                      : isReserved
                      ? 'bg-blue-200 text-blue-900'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {isSelected ? 'Selected' : status}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
