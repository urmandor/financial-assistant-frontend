import React from 'react';

export function AlertBadge({ counts, className = '' }) {
  if (!counts) return null;
  const isCritical = counts.critical > 0;
  const displayCount = isCritical ? counts.critical : counts.total;

  if (displayCount <= 0) return null;

  return (
    <span
      data-testid="alert-badge"
      className={`${className} h-[1.125rem] min-w-[1.125rem] rounded-full px-1 text-center text-[10px] font-bold leading-[1.125rem] ring-2 ring-white ${
        isCritical ? 'bg-danger-600 text-white' : 'bg-warning-400 text-ink'
      }`}
    >
      <span className="sr-only">
        {isCritical ? 'Critical alerts: ' : 'Alerts: '}
      </span>
      {displayCount}
    </span>
  );
}
