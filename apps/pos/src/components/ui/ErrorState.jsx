import React from 'react';
import { AlertCircle, RotateCcw, WifiOff } from 'lucide-react';
import Button from './Button';

/**
 * Premium Café POS Error State
 * Supports offline/slow-network hints, clear error message, and a touch-friendly retry button
 */
export default function ErrorState({
  title = 'Something went wrong',
  message = 'Failed to load content. Please check connection and try again.',
  isOffline = false,
  onRetry,
  className = '',
}) {
  const Icon = isOffline ? WifiOff : AlertCircle;

  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-pos-danger/40 bg-pos-surface/80 ${className}`}
    >
      <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-pos-danger/10 text-pos-danger mb-4 border border-pos-danger/30">
        <Icon size={26} strokeWidth={1.75} />
      </div>
      <h4 className="font-display text-base md:text-lg font-bold text-pos-text tracking-tight">
        {title}
      </h4>
      <p className="text-sm text-pos-muted max-w-sm mt-1.5 leading-relaxed">
        {message}
      </p>
      {onRetry && (
        <div className="mt-5">
          <Button
            variant="secondary"
            size="md"
            icon={RotateCcw}
            onClick={onRetry}
            className="border-pos-border hover:border-pos-accent"
          >
            Retry Connection
          </Button>
        </div>
      )}
    </div>
  );
}
