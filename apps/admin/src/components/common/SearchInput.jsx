import { Search, X } from 'lucide-react';

export default function SearchInput({
  value,
  onChange,
  onClear,
  placeholder = 'Search...',
  className = '',
  inputClassName = '',
  size = 'md',
  ...props
}) {
  const isSmall = size === 'sm';

  const handleClear = () => {
    if (onClear) {
      onClear();
    } else if (onChange) {
      onChange({ target: { value: '' } });
    }
  };

  return (
    <div className={`relative flex items-center group ${className}`}>
      <Search
        size={isSmall ? 14 : 16}
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-[#0F3D2E] pointer-events-none transition-colors shrink-0"
      />
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full rounded-xl border border-stone-200 bg-stone-50/70 hover:bg-white text-stone-900 placeholder:text-stone-400 focus:border-[#0F3D2E] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F3D2E]/15 transition shadow-2xs ${
          isSmall
            ? 'py-1.5 pl-9 pr-8 text-xs'
            : 'py-2.5 pl-10 pr-9 text-xs sm:text-sm'
        } ${inputClassName}`}
        {...props}
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 h-6 w-6 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
        >
          <X size={isSmall ? 13 : 14} />
        </button>
      )}
    </div>
  );
}
