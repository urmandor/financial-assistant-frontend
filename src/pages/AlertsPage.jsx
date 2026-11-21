import React, { useState, useCallback } from 'react';
import { CircleCheck, TriangleAlert, OctagonAlert, Info, X, Loader2 } from 'lucide-react';
import { useAlerts, useDismissAlert } from '../hooks/useQueries';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';

const ALERT_SEVERITY = {
  critical: {
    card: 'bg-danger-50 border-danger-100',
    bar: 'bg-danger-600',
    chip: 'bg-danger-100 text-danger-700',
    label: 'Critical',
    Icon: OctagonAlert,
  },
  warning: {
    card: 'bg-warning-50 border-warning-100',
    bar: 'bg-warning-500',
    chip: 'bg-warning-100 text-warning-800',
    label: 'Warning',
    Icon: TriangleAlert,
  },
  info: {
    card: 'bg-info-50 border-info-100',
    bar: 'bg-info-500',
    chip: 'bg-info-100 text-info-700',
    label: 'Info',
    Icon: Info,
  },
};

function AlertsList({ alerts, dismissing, onDismiss }) {
  if (alerts.length === 0) {
    return (
      <div className="card p-4 flex items-center gap-3 text-sm font-medium text-ink-soft">
        <span className="icon-chip bg-success-50 text-success-600">
          <CircleCheck size={20} />
        </span>
        Nothing needs attention
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {alerts.map((alert) => {
        const config = ALERT_SEVERITY[alert.severity] ?? ALERT_SEVERITY.warning;
        const { card, bar, chip, label, Icon } = config;

        return (
          <div
            key={alert.id}
            className={`relative overflow-hidden rounded-2xl border p-3 pl-5 flex items-start gap-3 shadow-card motion-safe:animate-fade-up ${card}`}
          >
            <span className={`absolute inset-y-0 left-0 w-1.5 ${bar}`} aria-hidden="true" />
            <span className={`icon-chip w-9 h-9 rounded-xl ${chip}`}>
              <Icon size={18} aria-hidden="true" />
              <span className="sr-only">{label}</span>
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ink">{alert.title}</p>
              {alert.detail && (
                <p className="text-xs text-ink-soft mt-0.5">{alert.detail}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(alert.id)}
              disabled={dismissing === alert.id}
              className="icon-btn -my-1 -mr-1 hover:bg-white/70"
              aria-label={`Dismiss alert: ${alert.title}`}
            >
              {dismissing === alert.id ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <X size={16} />
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function AlertsPage() {
  const alertsQuery = useAlerts();
  const dismissMutation = useDismissAlert();
  const [dismissError, setDismissError] = useState(null);
  const [dismissingId, setDismissingId] = useState(null);

  const queryError = alertsQuery.isError
    ? alertsQuery.error instanceof Error
      ? alertsQuery.error.message
      : 'Failed to load alerts'
    : null;

  const errorMessage = dismissError ?? queryError;

  const handleDismiss = useCallback(
    async (id) => {
      setDismissingId(id);
      setDismissError(null);
      try {
        await dismissMutation.mutateAsync(id);
      } catch (err) {
        setDismissError(err instanceof Error ? err.message : 'Failed to dismiss alert');
      } finally {
        setDismissingId(null);
      }
    },
    [dismissMutation]
  );

  return (
    <div className="space-y-4">
      {errorMessage && (
        <div className="alert-error flex items-center justify-between gap-3" role="alert">
          <span>{errorMessage}</span>
          {queryError && !dismissError && (
            <button
              type="button"
              onClick={() => alertsQuery.refetch()}
              disabled={alertsQuery.isFetching}
              className="btn-secondary shrink-0 px-3 text-xs"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {alertsQuery.isPending ? (
        <LoadingSkeleton label="Loading alerts" rows={3} />
      ) : (
        alertsQuery.isSuccess && (
          <AlertsList
            alerts={alertsQuery.data?.alerts ?? []}
            dismissing={dismissingId}
            onDismiss={handleDismiss}
          />
        )
      )}
    </div>
  );
}
