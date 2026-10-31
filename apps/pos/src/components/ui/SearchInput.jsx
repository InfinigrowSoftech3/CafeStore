import React from 'react';
import { Search, X } from 'lucide-react';

export default function SearchInput({
  value,
  onChange,
  onClear,
  placeholder = 'Search dishes, drinks or SKU...',
  className = '',
  ...props
}) {
  return (
    <div className={`relative flex items-center w-full ${className}`}>
      <div className="absolute left-4 pointer-events-none text-pos-muted">
        <Search size={18} />
      </div>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full min-h-[48px] rounded-xl bg-pos-surface border border-pos-border pl-11 pr-11 py-2.5 text-base text-pos-text placeholder-pos-muted/60 transition duration-140 outline-none focus:border-pos-accent focus:ring-2 focus:ring-pos-accent/20"
        {...props}
      />
      {value ? (
        <button
          type="button"
          onClick={onClear || (() => onChange({ target: { value: '' } }))}
          className="absolute right-2.5 flex h-9 w-9 items-center justify-center rounded-lg text-pos-muted hover:text-pos-text hover:bg-pos-raised transition active:scale-95"
          aria-label="Clear search"
        >
          <X size={16} />
        </button>
      ) : (
        <div className="absolute right-3 hidden sm:flex items-center pointer-events-none">
          <kbd className="px-2 py-0.5 text-[10px] font-mono font-bold text-pos-muted bg-pos-raised border border-pos-border rounded-md shadow-xs">
            Ctrl + K
          </kbd>
        </div>
      )}
    </div>
  );
}
