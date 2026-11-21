import React, { createContext, useContext, useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const ToastContext = createContext(null);
const DEFAULT_DURATION_MS = 8000;

function ToastItem({ toast, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, toast.durationMs ?? DEFAULT_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast.id, toast.durationMs, onDismiss]);

  return (
    <div className="toast-item pointer-events-auto flex items-center gap-1 rounded-2xl bg-ink py-1 pl-4 pr-1 text-sm text-white shadow-nav">
      <span className="min-w-0 flex-1 break-words py-2">{toast.message}</span>
      {toast.actionLabel && (
        <button
          type="button"
          onClick={() => {
            toast.onAction?.();
            onDismiss(toast.id);
          }}
          className="inline-flex min-h-[44px] shrink-0 items-center rounded-full px-3 font-bold text-primary-300 hover:bg-white/10"
        >
          {toast.actionLabel}
        </button>
      )}
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
      >
        <X size={16} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextIdRef = useRef(1);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((opts) => {
    const id = nextIdRef.current++;
    setToasts((prev) => [...prev, { ...opts, id }].slice(-3));
    return id;
  }, []);

  const value = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {typeof document !== 'undefined' &&
        createPortal(
          <div
            role="status"
            aria-live="polite"
            className="pointer-events-none fixed inset-x-0 z-[60] flex flex-col items-center gap-2 px-4"
            style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 5.75rem)' }}
          >
            {toasts.map((toast) => (
              <div key={toast.id} className="w-full max-w-md">
                <ToastItem toast={toast} onDismiss={dismiss} />
              </div>
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used inside <ToastProvider>');
  }
  return context;
}
