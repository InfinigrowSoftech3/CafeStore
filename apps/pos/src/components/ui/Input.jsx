import React from 'react';

export default function Input({
  label,
  icon: Icon = null,
  error = '',
  className = '',
  wrapperClassName = '',
  type = 'text',
  id,
  ...props
}) {
  const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div className={`flex flex-col gap-1.5 ${wrapperClassName}`}>
      {label && (
        <label htmlFor={inputId} className="text-xs font-bold uppercase tracking-wider text-pos-muted select-none">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3.5 pointer-events-none text-pos-muted">
            <Icon size={18} />
          </div>
        )}
        <input
          id={inputId}
          type={type}
          className={`w-full min-h-[48px] rounded-xl bg-pos-surface border border-pos-border px-3.5 py-3 text-base text-pos-text placeholder-pos-muted/60 transition duration-140 outline-none focus:border-pos-accent focus:ring-2 focus:ring-pos-accent/20 disabled:opacity-40 disabled:cursor-not-allowed ${
            Icon ? 'pl-11' : ''
          } ${error ? 'border-pos-danger focus:border-pos-danger focus:ring-pos-danger/20' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-pos-danger font-medium mt-0.5">{error}</p>}
    </div>
  );
}
