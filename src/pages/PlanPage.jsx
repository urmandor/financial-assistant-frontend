import React from 'react';
import {
  TrendingUp,
  PiggyBank,
  Target,
  ChartLine,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { Link } from '../hooks/useRouter';
import { useBudgets, useGoals, useBuckets, useAssumptions, useProjections } from '../hooks/useQueries';
import { formatCurrency } from '../utils/formatters';

function PlanNavCard({ to, icon: Icon, title, subtitle, status, tone = 'bg-primary-50 text-primary-600' }) {
  return (
    <Link
      to={to}
      className="card flex items-center justify-between gap-4 p-4 transition duration-150 hover:border-primary-300 hover:shadow-card motion-safe:active:scale-[0.99]"
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <span className={`icon-chip h-12 w-12 rounded-2xl ${tone}`}>
          <Icon size={24} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-bold text-ink">{title}</h3>
          <p className="text-xs text-ink-muted truncate">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {status && <span className="text-xs font-semibold text-ink-soft">{status}</span>}
        <ChevronRight size={18} className="text-ink-muted" aria-hidden="true" />
      </div>
    </Link>
  );
}

export function PlanPage() {
  const budgetsQuery = useBudgets();
  const goalsQuery = useGoals();
  const bucketsQuery = useBuckets();
  const assumptionsQuery = useAssumptions();
  const projectionsQuery = useProjections(12);

  const budgets = budgetsQuery.data?.budgets ?? [];
  const goals = goalsQuery.data?.goals ?? [];
  const buckets = bucketsQuery.data?.buckets ?? [];

  const totalMonthlyBudget = budgets.reduce(
    (acc, b) => acc + (Number(b.monthly_limit) || 0),
    0
  );

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <PlanNavCard
          to="/plan/projection"
          icon={ChartLine}
          title="Projection"
          subtitle="Your cash balance month-by-month for 1-2 years"
          status={projectionsQuery.data ? 'Ready' : undefined}
          tone="bg-violet-50 text-violet-600"
        />

        <PlanNavCard
          to="/plan/budgets"
          icon={TrendingUp}
          title="Budgets"
          subtitle="Monthly limits for categories & current pacing"
          status={budgets.length > 0 ? `${budgets.length} budgets` : undefined}
          tone="bg-primary-50 text-primary-600"
        />

        <PlanNavCard
          to="/plan/items"
          icon={Layers}
          title="Income & costs"
          subtitle="Fixed/recurring income items and baseline expenses"
          tone="bg-emerald-50 text-emerald-600"
        />

        <PlanNavCard
          to="/plan/goals"
          icon={Target}
          title="Goals"
          subtitle="Savings targets, target dates, and progress"
          status={goals.length > 0 ? `${goals.length} goals` : undefined}
          tone="bg-amber-50 text-amber-600"
        />

        <PlanNavCard
          to="/plan/funds"
          icon={PiggyBank}
          title="Funds"
          subtitle="Dedicated money reserve buckets"
          status={buckets.length > 0 ? `${buckets.length} funds` : undefined}
          tone="bg-rose-50 text-rose-600"
        />
      </div>
    </div>
  );
}
