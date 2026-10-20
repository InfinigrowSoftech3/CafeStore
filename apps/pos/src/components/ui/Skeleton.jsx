import React from 'react';

/**
 * Premium Café POS Skeleton Loading Components
 * Espresso-toned pulse shimmer for touch surfaces
 */
export function Skeleton({ className = '', rounded = 'rounded-xl' }) {
  return (
    <div
      className={`animate-pulse bg-pos-raised/80 border border-pos-border/40 ${rounded} ${className}`}
    />
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col bg-pos-surface border border-pos-border/60 rounded-2xl p-3.5 space-y-3 min-h-[175px]">
      <div className="flex items-start justify-between">
        <Skeleton className="w-12 h-12 rounded-xl" />
        <Skeleton className="w-10 h-5 rounded-full" />
      </div>
      <div className="space-y-2 flex-1 pt-2">
        <Skeleton className="w-4/5 h-4 rounded-md" />
        <Skeleton className="w-1/2 h-3 rounded-md" />
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-pos-border/40">
        <Skeleton className="w-16 h-5 rounded-md" />
        <Skeleton className="w-8 h-8 rounded-lg" />
      </div>
    </div>
  );
}

export function CategoryChipSkeleton() {
  return (
    <Skeleton className="h-11 w-24 rounded-xl shrink-0" />
  );
}

export function OrderLineSkeleton() {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-pos-raised/40 border border-pos-border/40 space-x-3">
      <div className="space-y-1.5 flex-1">
        <Skeleton className="w-3/4 h-4 rounded-md" />
        <Skeleton className="w-1/3 h-3 rounded-md" />
      </div>
      <Skeleton className="w-20 h-8 rounded-lg" />
      <Skeleton className="w-14 h-4 rounded-md" />
    </div>
  );
}

export default Skeleton;
