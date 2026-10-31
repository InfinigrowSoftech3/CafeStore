import React from 'react';

export default function CategoryChip({
  id,
  name,
  count,
  icon,
  active = false,
  isActive = false,
  onClick,
  className = '',
}) {
  const isSelected = active || isActive;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`touch-press shrink-0 flex items-center gap-2 min-h-[44px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all duration-140 select-none ${
        isSelected
          ? 'bg-[#105B43] text-white border-[#20D99A] shadow-elevation1'
          : 'bg-white text-pos-text border-pos-border hover:border-pos-accent/40 hover:bg-pos-raised/80'
      } ${className}`}
    >
      {icon && <span className="text-sm shrink-0 leading-none">{icon}</span>}
      <span className="truncate whitespace-nowrap">{name}</span>
      {typeof count === 'number' && (
        <span
          className={`text-[11px] px-2 py-0.5 rounded-full font-mono tabular-nums ${
            isSelected
              ? 'bg-[#20D99A]/20 text-[#20D99A] border border-[#20D99A]/40 font-extrabold'
              : 'bg-pos-raised text-pos-muted border border-pos-border/60'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}
