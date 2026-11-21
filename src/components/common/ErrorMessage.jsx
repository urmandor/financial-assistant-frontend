import React from 'react';

export function ErrorMessage({ message, onRetry, busy = false }) {
  return (
    <div
      className="alert-error flex items-center justify-between gap-3"
      role="alert"
    >
      <span>{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={busy}
          className="btn-secondary shrink-0 px-3 text-xs"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export function formatError(err, fallback = 'Something went wrong') {
  return err instanceof Error ? err.message : fallback;
}
