import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export default function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select option',
  icon: Icon,
  className = '',
  dropdownClassName = '',
  align = 'left',
  title,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const selectedOption = options.find((opt) => String(opt.value) === String(value));
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  const handleSelect = (val) => {
    if (typeof onChange === 'function') {
      // Consumers normalize either the raw value or an event-shaped fallback.
      onChange(val);
    }
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative inline-block text-left" title={title}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`relative inline-flex items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700 shadow-2xs hover:border-stone-300 hover:bg-stone-50/50 focus:outline-none focus:ring-2 focus:ring-[#0F3D2E]/20 transition cursor-pointer select-none min-h-[36px] ${
          isOpen ? 'border-[#0F3D2E] ring-2 ring-[#0F3D2E]/15' : ''
        } ${className}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-1.5 min-w-0 truncate">
          {Icon && <Icon size={14} className="text-stone-500 shrink-0" />}
          <span className="truncate">{displayLabel}</span>
        </span>
        <ChevronDown
          size={14}
          className={`text-stone-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#0F3D2E]' : ''
          }`}
        />
      </button>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          className={`absolute top-full mt-1.5 z-50 min-w-full w-max max-w-[280px] max-h-64 overflow-y-auto rounded-2xl border border-stone-200 bg-white p-1.5 shadow-xl custom-scrollbar animate-in fade-in-0 zoom-in-95 duration-100 ${
            align === 'right' ? 'right-0' : 'left-0'
          } ${dropdownClassName}`}
          style={{ boxShadow: '0 12px 32px -4px rgba(15, 61, 46, 0.12), 0 4px 12px rgba(0, 0, 0, 0.06)' }}
        >
          {options.map((opt) => {
            const isSelected = String(opt.value) === String(value);
            return (
              <div
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(opt.value)}
                className={`flex items-center justify-between gap-2.5 rounded-xl px-3 py-2 text-xs font-medium cursor-pointer transition select-none ${
                  isSelected
                    ? 'bg-[#0F3D2E]/10 text-[#0F3D2E] font-bold'
                    : 'text-stone-700 hover:bg-stone-100/80 hover:text-stone-900'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {opt.dot && (
                    <span className={`h-2 w-2 rounded-full shrink-0 ${opt.dot}`} />
                  )}
                  <span className="truncate">{opt.label}</span>
                </div>
                {isSelected && (
                  <Check size={14} className="text-[#0F3D2E] shrink-0" strokeWidth={2.5} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
