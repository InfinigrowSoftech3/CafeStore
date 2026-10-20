import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Button({
  children,
  variant = 'primary',
  size = 'default',
  className = '',
  loading = false,
  disabled = false,
  icon: Icon = null,
  iconRight: IconRight = null,
  type = 'button',
  onClick,
  ...props
}) {
  const baseClasses =
    'relative inline-flex items-center justify-center font-bold tracking-tight rounded-xl select-none transition-all duration-140 touch-press disabled:opacity-40 disabled:pointer-events-none disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pos-accent focus-visible:ring-offset-2 focus-visible:ring-offset-pos-bg';

  const sizeClasses = {
    sm: 'min-h-[40px] px-3 py-1.5 text-xs gap-1.5',
    default: 'min-h-[48px] px-4 py-2.5 text-sm gap-2',
    lg: 'min-h-[56px] px-6 py-3 text-base gap-2.5',
  }[size] || 'min-h-[48px] px-4 py-2.5 text-sm gap-2';

  const variantClasses = {
    primary:
      'bg-pos-accent text-white hover:bg-pos-accent-hover active:bg-[#9C600E] shadow-elevation1 border border-pos-accent/40',
    secondary:
      'bg-white text-pos-text hover:bg-pos-raised border border-pos-border active:border-pos-accent/50 shadow-soft',
    ghost:
      'bg-transparent text-pos-muted hover:text-pos-text hover:bg-pos-raised/70 active:bg-pos-raised',
    danger:
      'bg-pos-danger/10 text-pos-danger hover:bg-pos-danger/20 border border-pos-danger/30 active:bg-pos-danger/30',
    outline:
      'bg-transparent text-pos-accent border border-pos-accent/50 hover:bg-pos-accent/10 active:bg-pos-accent/20',
  }[variant] || 'bg-pos-accent text-white hover:bg-pos-accent-hover';

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 size={size === 'lg' ? 20 : 16} className="animate-spin" />
      ) : (
        <>
          {Icon && <Icon size={size === 'lg' ? 20 : 16} className="shrink-0" />}
          {children}
          {IconRight && <IconRight size={size === 'lg' ? 20 : 16} className="shrink-0" />}
        </>
      )}
    </button>
  );
}
