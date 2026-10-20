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
      className={`touch-press shrink-0 flex items-center gap-2.5 min-h-[48px] px-4 py-2.5 rounded-xl text-sm font-bold border transition duration-140 select-none shadow-soft ${
        isSelected
          ? 'bg-pos-accent text-white border-pos-accent shadow-elevation1'
          : 'bg-white text-pos-text border-pos-border hover:border-pos-accent/50 hover:bg-pos-raised'
      } ${className}`}
    >
      {icon && <span className="text-base shrink-0 leading-none">{icon}</span>}
      <span className="truncate whitespace-nowrap">{name}</span>
      {typeof count === 'number' && (
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-mono tabular-nums ${
            isSelected
              ? 'bg-white/25 text-white font-extrabold'
              : 'bg-pos-raised text-pos-muted'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}
