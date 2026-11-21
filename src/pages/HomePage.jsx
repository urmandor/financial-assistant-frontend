import React, { useMemo } from 'react';
import { ArrowDownLeft, Scale, PieChart, Plus } from 'lucide-react';
import { useTransactionWindow, useProjections } from '../hooks/useQueries';
import { getCurrentMonth, getMonthDateRange, formatFullMonthYear } from '../utils/dates';
import { formatCurrency } from '../utils/formatters';
import { CategoryPieChart } from '../components/home/CategoryPieChart';
import { HomeBudgetsCard } from '../components/home/HomeBudgetsCard';
import { HomeAlertsCard } from '../components/home/HomeAlertsCard';
import { HomeDigestCard } from '../components/home/HomeDigestCard';
import { RecentTransactionsCard } from '../components/home/RecentTransactionsCard';
import { ErrorMessage, formatError } from '../components/common/ErrorMessage';
import { HeroCardSkeleton } from '../components/common/LoadingSkeleton';

export function HomePage({ onOpenAdd, onEditTransaction }) {
  const currentMonth = useMemo(() => getCurrentMonth(), []);
  const { from, to } = useMemo(() => getMonthDateRange(currentMonth), [currentMonth]);

  const monthWindowQuery = useTransactionWindow({
    from,
    to,
    limit: 1,
  });

  const projectionQuery = useProjections(1, currentMonth);

  const totalSpent = monthWindowQuery.data?.summary?.total_amount ?? 0;
  const receivedIncome = monthWindowQuery.data?.summary?.income_total ?? 0;
  const plannedIncome = projectionQuery.data?.projections?.[0]?.income ?? null;

  const effectiveIncome = plannedIncome ?? receivedIncome;
  const netRemaining = effectiveIncome - totalSpent;
  const spendingByCategory = monthWindowQuery.data?.summary?.by_category ?? {};
  const hasSpending = Object.keys(spendingByCategory).length > 0;

  return (
    <div className="space-y-6">
      {monthWindowQuery.isError && (
        <ErrorMessage
          message={formatError(monthWindowQuery.error, 'Failed to load this month')}
          onRetry={() => monthWindowQuery.refetch()}
          busy={monthWindowQuery.isFetching}
        />
      )}

      {monthWindowQuery.isPending ? (
        <HeroCardSkeleton />
      ) : (
        <section
          className="card-gradient p-5 md:p-7"
          aria-label={`${formatFullMonthYear(currentMonth)} summary`}
        >
          <p className="text-sm font-medium text-white/90">
            {formatFullMonthYear(currentMonth)}
          </p>
          <p className="mt-2 text-sm font-medium text-white/90">Spent</p>
          <p
            data-testid="hero-spent"
            className="num mt-1 break-words text-4xl font-extrabold tracking-tight md:text-5xl"
          >
            {formatCurrency(totalSpent)}
          </p>
          <p className="mt-1 text-xs text-white/85">
            Spent is what you logged (expenses only). Income is from your plan.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="min-w-0 rounded-2xl border border-white/20 bg-white/15 p-3 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <span className="icon-chip h-8 w-8 rounded-xl bg-white text-success-600">
                  <ArrowDownLeft size={16} aria-hidden="true" />
                </span>
                <p className="text-xs font-medium text-white/90">
                  {plannedIncome !== null ? 'Planned income' : 'Income'}
                </p>
              </div>
              <p
                data-testid="hero-income"
                className="num mt-2 break-words text-lg font-bold sm:text-xl"
              >
                {formatCurrency(effectiveIncome)}
              </p>
              {plannedIncome !== null && receivedIncome > 0 && (
                <p className="num mt-0.5 text-[11px] text-white/85">
                  Received {formatCurrency(receivedIncome)}
                </p>
              )}
            </div>

            <div className="min-w-0 rounded-2xl border border-white/20 bg-white/15 p-3 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <span className="icon-chip h-8 w-8 rounded-xl bg-white text-primary-600">
                  <Scale size={16} aria-hidden="true" />
                </span>
                <p className="text-xs font-medium text-white/90">
                  {plannedIncome !== null ? 'Left this month' : 'Net'}
                </p>
              </div>
              <p
                data-testid="hero-net"
                className="num mt-2 break-words text-lg font-bold sm:text-xl"
              >
                {netRemaining > 0 ? '+' : ''}
                {formatCurrency(netRemaining)}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Two-column grid: Budgets on left, Alerts & Digest on right */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <HomeBudgetsCard />
        <div className="min-w-0 space-y-6">
          <HomeAlertsCard />
          <HomeDigestCard />
        </div>
      </div>

      {/* Spending Breakdown Chart */}
      {monthWindowQuery.isPending ? (
        <div className="card h-64 p-5 animate-pulse bg-surface-muted rounded-2xl" />
      ) : (
        <section
          className="card min-w-0 p-4 sm:p-5"
          aria-label="Spending by category"
          data-testid="home-chart"
        >
          <h2 className="sr-only">Spending by category</h2>
          {hasSpending ? (
            <CategoryPieChart data={spendingByCategory} />
          ) : (
            <div className="flex flex-col items-center gap-3 py-8 text-center text-sm text-ink-muted">
              <span className="icon-chip bg-primary-50 text-primary-600">
                <PieChart size={20} aria-hidden="true" />
              </span>
              <p>No spending logged in {formatFullMonthYear(currentMonth)} yet.</p>
              <button
                type="button"
                className="btn-primary"
                onClick={onOpenAdd}
              >
                <Plus size={18} aria-hidden="true" />
                Add an expense
              </button>
            </div>
          )}
        </section>
      )}

      {/* Recent Activity */}
      <RecentTransactionsCard
        onAdd={onOpenAdd}
        onEdit={onEditTransaction}
      />
    </div>
  );
}
