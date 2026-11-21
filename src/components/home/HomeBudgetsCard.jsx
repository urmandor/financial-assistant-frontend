import React, { useMemo } from 'react';
import { useActuals } from '../../hooks/useQueries';
import { SectionHeader } from '../common/SectionHeader';
import { ErrorMessage, formatError } from '../common/ErrorMessage';
import { LoadingSkeleton } from '../common/LoadingSkeleton';
import { formatCurrency } from '../../utils/formatters';
import { Link } from '../../hooks/useRouter';

const MAX_ITEMS = 5;

const STATUS_BADGES = {
  ok: { text: 'On track', className: 'badge-success' },
  warning: { text: 'Near limit', className: 'badge-warning' },
  over: { text: 'Over budget', className: 'badge-danger' },
  exceeded: { text: 'Over budget', className: 'badge-danger' },
};

const STATUS_TRACK_FILLS = {
  ok: 'progress-fill-success',
  warning: 'progress-fill-warning',
  over: 'progress-fill-danger',
  exceeded: 'progress-fill-danger',
};

function getBudgetStatus(budget) {
  if (budget.status && STATUS_BADGES[budget.status]) {
    return budget.status === 'exceeded' ? 'over' : budget.status;
  }
  if ((budget.limit > 0 && budget.spent > budget.limit) || budget.pct >= 100) {
    return 'over';
  }
  if (budget.pct >= 80) {
    return 'warning';
  }
  return 'ok';
}

function GlanceBudgetItem({ budget }) {
  const statusKey = getBudgetStatus(budget);
  const badge = STATUS_BADGES[statusKey];
  const fillClass = STATUS_TRACK_FILLS[statusKey];

  return (
    <li data-testid="glance-budget">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-semibold text-ink">{budget.category}</p>
        <span className={`badge shrink-0 ${badge.className}`}>{badge.text}</span>
      </div>
      <div
        className="progress-track mt-2"
        role="progressbar"
        aria-label={`${budget.category} budget used`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(budget.pct, 100)}
      >
        <div
          className={`progress-fill ${fillClass}`}
          style={{ width: `${Math.min(budget.pct, 100)}%` }}
        />
      </div>
      <p className="num mt-1.5 text-xs text-ink-muted">
        <span className="font-semibold text-ink">{formatCurrency(budget.spent)}</span>
        {' of '}
        {formatCurrency(budget.limit)} ({budget.pct}%)
      </p>
    </li>
  );
}

export function HomeBudgetsCard() {
  const actualsQuery = useActuals(null);

  const topBudgets = useMemo(() => {
    const list = actualsQuery.data?.budgets ?? [];
    return list
      .filter((b) => b.tracked)
      .sort((a, b) => b.pct - a.pct)
      .slice(0, MAX_ITEMS);
  }, [actualsQuery.data]);

  const totalBudgetsCount = actualsQuery.data?.budgets?.length ?? 0;

  if (actualsQuery.isPending) {
    return <LoadingSkeleton label="Loading budgets" rows={2} />;
  }

  return (
    <section
      className="card space-y-3 p-4"
      aria-label="Budgets at a glance"
      data-testid="home-budgets"
    >
      <SectionHeader title="Budgets at a glance" to="/plan/budgets" />

      {actualsQuery.isError && (
        <ErrorMessage
          message={formatError(actualsQuery.error, 'Failed to load budgets')}
          onRetry={() => actualsQuery.refetch()}
          busy={actualsQuery.isFetching}
        />
      )}

      {actualsQuery.isSuccess && totalBudgetsCount === 0 && (
        <div className="space-y-2 text-sm text-ink-muted">
          <p>
            No budgets yet. Set a monthly limit for a category to see how you are pacing.
          </p>
          <Link to="/plan/budgets" className="btn-secondary">
            Set up budgets
          </Link>
        </div>
      )}

      {actualsQuery.isSuccess && totalBudgetsCount > 0 && topBudgets.length === 0 && (
        <p className="text-sm text-ink-muted">
          No spending tracked against your budgets this month yet.
        </p>
      )}

      {topBudgets.length > 0 && (
        <ul className="space-y-3">
          {topBudgets.map((b) => (
            <GlanceBudgetItem key={b.category} budget={b} />
          ))}
        </ul>
      )}
    </section>
  );
}
