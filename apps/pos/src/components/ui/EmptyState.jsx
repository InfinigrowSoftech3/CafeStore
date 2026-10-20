import React from 'react';
import Button from './Button';

/**
 * Premium Café POS Empty State
 * Clean, warm café iconography with clear copy and optional action
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-dashed border-pos-border/80 bg-pos-surface/50 ${className}`}
    >
      {Icon && (
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-pos-raised text-pos-accent mb-4 border border-pos-border">
          <Icon size={26} strokeWidth={1.75} />
        </div>
      )}
      <h4 className="font-display text-base md:text-lg font-bold text-pos-text tracking-tight">
        {title}
      </h4>
      {description && (
        <p className="text-sm text-pos-muted max-w-xs mt-1.5 leading-relaxed">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <div className="mt-5">
          <Button variant="secondary" size="md" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
