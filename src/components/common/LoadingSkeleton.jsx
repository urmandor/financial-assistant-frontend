import React from 'react';

export function LoadingSkeleton({ label = 'Loading', rows = 3 }) {
  return (
    <div
      role="status"
      aria-label={label}
      aria-busy="true"
      className="card space-y-3 p-4 animate-pulse"
    >
      <div className="h-5 w-1/3 rounded-lg bg-surface-muted" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 w-full rounded-md bg-surface-muted" />
          <div className="h-3 w-2/3 rounded-md bg-surface-muted" />
        </div>
      ))}
    </div>
  );
}

export function HeroCardSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading summary"
      aria-busy="true"
      className="card-gradient p-5 md:p-7 animate-pulse"
    >
      <div className="h-4 w-28 rounded-md bg-white/20" />
      <div className="mt-4 h-12 w-48 rounded-lg bg-white/20" />
      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="h-20 rounded-2xl bg-white/10" />
        <div className="h-20 rounded-2xl bg-white/10" />
      </div>
    </div>
  );
}
