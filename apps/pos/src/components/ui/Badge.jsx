import React from 'react';

export default function Badge({
  children,
  variant = 'default',
  size = 'default',
  icon: Icon = null,
  pulse = false,
  className = '',
}) {
  const variantClasses = {
    default: 'bg-pos-raised text-pos-muted border-pos-border',
    accent: 'bg-pos-accent/15 text-pos-accent border-pos-accent/30',
    success: 'bg-pos-success/15 text-pos-success border-pos-success/30',
    warning: 'bg-pos-warning/15 text-pos-warning border-pos-warning/30',
    danger: 'bg-pos-danger/15 text-pos-danger border-pos-danger/30',
    espresso: 'bg-pos-surface text-pos-text border-pos-border',
  }[variant] || 'bg-pos-raised text-pos-muted border-pos-border';

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    default: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2',
  }[size] || 'text-xs px-2.5 py-1 gap-1.5';

  return (
    <span
      className={`inline-flex items-center font-bold uppercase tracking-wider rounded-lg border ${variantClasses} ${sizeClasses} ${className}`}
    >
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-current" />
        </span>
      )}
      {Icon && <Icon size={size === 'sm' ? 12 : 14} className="shrink-0" />}
      {children}
    </span>
  );
}
