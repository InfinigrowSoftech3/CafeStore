import React from 'react';

export default function CategoryChip({
  id,
  name,
  count,
  icon,
  active = false,
  onClick,
  className = '',
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`touch-press shrink-0 flex items-center gap-2.5 min-h-[48px] px-4 py-2.5 rounded-xl text-sm font-bold border transition duration-140 select-none ${
        active
          ? 'bg-pos-accent text-[#14110F] border-pos-accent shadow-elevation1'
          : 'bg-pos-raised text-pos-text border-pos-border hover:border-pos-accent/40 hover:bg-[#322921]'
      } ${className}`}
    >
      {icon && <span className="text-base shrink-0 leading-none">{icon}</span>}
      <span className="truncate whitespace-nowrap">{name}</span>
      {typeof count === 'number' && (
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-mono tabular-nums ${
            active ? 'bg-[#14110F]/20 text-[#14110F] font-extrabold' : 'bg-pos-surface text-pos-muted'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}
