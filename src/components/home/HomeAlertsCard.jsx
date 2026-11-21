import React, { useMemo } from 'react';
import { CircleCheck, TriangleAlert, OctagonAlert, Info } from 'lucide-react';
import { useAlerts } from '../../hooks/useQueries';
import { SectionHeader } from '../common/SectionHeader';
import { ErrorMessage, formatError } from '../common/ErrorMessage';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

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

const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2 };

function HomeAlertItem({ alert }) {
  const config = ALERT_SEVERITY[alert.severity] ?? ALERT_SEVERITY.warning;
  const { card, chip, label, Icon } = config;

  return (
    <li className={`flex items-start gap-3 rounded-2xl border p-3 ${card}`}>
      <span className={`icon-chip h-9 w-9 rounded-xl ${chip}`}>
        <Icon size={18} aria-hidden="true" />
        <span className="sr-only">{label}</span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">{alert.title}</p>
        {alert.detail && (
          <p className="mt-0.5 line-clamp-2 text-xs text-ink-soft">{alert.detail}</p>
        )}
      </div>
    </li>
  );
}

export function HomeAlertsCard() {
  const alertsQuery = useAlerts();
  const alerts = alertsQuery.data?.alerts ?? [];
  const totalCount = alertsQuery.data?.counts?.total ?? 0;

  const topAlerts = useMemo(() => {
    return [...alerts]
      .sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 2) - (SEVERITY_ORDER[b.severity] ?? 2))
      .slice(0, 2);
  }, [alerts]);

  if (alertsQuery.isPending) {
    return <LoadingSkeleton label="Loading alerts" rows={2} />;
  }

  return (
    <section
      className="card space-y-3 p-4"
      aria-label="Alerts"
      data-testid="home-alerts"
    >
      <SectionHeader
        title="Alerts"
        to="/alerts"
        right={
          totalCount > 0 ? (
            <span className="badge badge-warning mr-auto">{totalCount} active</span>
          ) : undefined
        }
      />

      {alertsQuery.isError && (
        <ErrorMessage
          message={formatError(alertsQuery.error, 'Failed to load alerts')}
          onRetry={() => alertsQuery.refetch()}
          busy={alertsQuery.isFetching}
        />
      )}

      {alertsQuery.isSuccess && topAlerts.length === 0 && (
        <p className="flex items-center gap-2 text-sm font-medium text-ink-soft">
          <span className="icon-chip h-9 w-9 bg-success-50 text-success-600">
            <CircleCheck size={18} aria-hidden="true" />
          </span>
          Nothing needs attention
        </p>
      )}

      {topAlerts.length > 0 && (
        <ul className="space-y-2">
          {topAlerts.map((alert) => (
            <HomeAlertItem key={alert.id} alert={alert} />
          ))}
        </ul>
      )}
    </section>
  );
}
