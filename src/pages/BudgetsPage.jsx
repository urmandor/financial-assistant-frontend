import React, { useState, useMemo, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Check,
  Pencil,
  Trash2,
  Wallet,
  Loader2,
} from 'lucide-react';
import {
  useActuals,
  useBudgets,
  useAssumptions,
  useSaveBudget,
  useDeleteBudget,
  useSavePlanItem,
  useCategories,
} from '../hooks/useQueries';
import { formatCurrency } from '../utils/formatters';
import { formatFullMonthYear } from '../utils/dates';
import { Link } from '../hooks/useRouter';
import { useToast } from '../hooks/useToast';
import { Modal } from '../components/layout/Modal';
import { PlanItemModal } from '../components/modals/PlanItemModal';
import { ErrorMessage, formatError } from '../components/common/ErrorMessage';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';

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

function offsetMonth(monthStr, delta) {
  const [y, m] = monthStr.split('-').map(Number);
  const totalMonths = m - 1 + delta;
  const newYear = y + Math.floor(totalMonths / 12);
  const newMonth = (((totalMonths % 12) + 12) % 12) + 1;
  return `${newYear}-${String(newMonth).padStart(2, '0')}`;
}

function SearchInput({ value, onChange, placeholder, label }) {
  return (
    <div className="relative">
      <Search
        size={16}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
        aria-hidden="true"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="input w-full pl-10 pr-11 text-sm"
      />
      {value && (
        <button
          type="button"
          className="icon-btn absolute right-0.5 top-1/2 -translate-y-1/2"
          aria-label="Clear search"
          onClick={() => onChange('')}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

function BudgetCoveredItems({ budget, onEdit }) {
  if (budget.source !== 'plan' || !budget.items || budget.items.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 space-y-1">
      {budget.categories && budget.categories.length > 0 && (
        <p className="break-words text-xs text-ink-muted" data-testid="budget-covers">
          Covers: {budget.categories.join(', ')}
        </p>
      )}
      {budget.items.map((n) => (
        <div
          key={n.key}
          className="flex items-center justify-between gap-2 text-xs text-ink-muted"
        >
          <span className="min-w-0 break-words">From plan: {n.label}</span>
          <button
            type="button"
            className="btn-secondary min-h-[44px] shrink-0 px-3 text-xs"
            onClick={() => onEdit(n.key)}
            aria-label={`Edit plan item ${n.label}`}
          >
            Edit
          </button>
        </div>
      ))}
    </div>
  );
}

function BudgetCard({ budget, onEdit }) {
  if (!budget.tracked) {
    return (
      <div className="card rounded-2xl p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-ink">{budget.category}</p>
          <span className="num text-xs text-ink-muted">
            {formatCurrency(budget.limit)} limit
          </span>
        </div>
        <p className="text-xs text-ink-muted mt-1">No transactions tracked</p>
        <BudgetCoveredItems budget={budget} onEdit={onEdit} />
      </div>
    );
  }

  const statusKey = getBudgetStatus(budget);
  const badge = STATUS_BADGES[statusKey];
  const fillClass = STATUS_TRACK_FILLS[statusKey];
  const pace = budget.pace;
  const isProjectedOver = pace?.pace_status === 'projected_over';

  return (
    <div className="card rounded-2xl p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-ink">{budget.category}</p>
        <span className={`badge ${badge.className}`}>{badge.text}</span>
      </div>

      <div className="progress-track mt-3 !overflow-visible relative">
        <div
          className={`progress-fill ${fillClass}`}
          style={{ width: `${Math.min(budget.pct, 100)}%` }}
        />
        {pace && (
          <div
            className="absolute -top-1 -bottom-1 w-[3px] rounded-full bg-ink ring-2 ring-white"
            style={{ left: `${Math.min(pace.elapsed_fraction * 100, 100)}%` }}
            title="Where spending would be if even across the month"
          />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 mt-2 text-xs text-ink-muted">
        <span className="num">
          <span className="text-ink font-semibold">{formatCurrency(budget.spent)}</span>
          {' / '}
          {formatCurrency(budget.limit)} ({budget.pct}%)
        </span>
        {pace?.projected_month_end != null && (
          <span className={`num ${isProjectedOver ? 'font-semibold text-warning-700' : ''}`}>
            Projected {formatCurrency(Math.round(pace.projected_month_end))} by month end
          </span>
        )}
      </div>

      <BudgetCoveredItems budget={budget} onEdit={onEdit} />
    </div>
  );
}

function LinkPlanCostModal({ category, costs, onClose }) {
  const savePlanItemMutation = useSavePlanItem();
  const [selectedKey, setSelectedKey] = useState('');
  const [error, setError] = useState(null);

  const handleLink = async () => {
    if (!category || !selectedKey) return;
    setError(null);
    try {
      const costItem = costs.find((c) => c.key === selectedKey);
      const existing =
        costItem && costItem.spend_categories && costItem.spend_categories.length > 0
          ? costItem.spend_categories
          : costItem && costItem.category && costItem.category.trim().toLowerCase() !== 'general'
          ? [costItem.category]
          : [];

      const updated = existing.some((c) => c.toLowerCase() === category.toLowerCase())
        ? existing
        : [...existing, category];

      await savePlanItemMutation.mutateAsync({
        key: selectedKey,
        input: { spend_categories: updated },
        raise: { kind: 'keep' },
      });
      setSelectedKey('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link');
    }
  };

  if (!category) return null;

  return (
    <Modal
      open={Boolean(category)}
      onClose={onClose}
      title={`Budget for ${category}`}
      dismissible={!savePlanItemMutation.isPending}
    >
      <div className="space-y-3">
        <p className="text-sm text-ink-muted">
          Pick the plan cost whose amount is your monthly budget for {category}.{' '}
          {category} is added to the categories that cost already covers, and their
          spending is tracked together against it.
        </p>
        <select
          className="input text-sm"
          value={selectedKey}
          onChange={(e) => setSelectedKey(e.target.value)}
          aria-label="Plan cost"
        >
          <option value="">Choose a plan cost…</option>
          {costs.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label || c.name} · {formatCurrency(c.value || c.amount)}
              {c.spend_categories && c.spend_categories.length > 0
                ? ` (covers ${c.spend_categories.join(', ')})`
                : c.category && c.category !== 'General'
                ? ` (now: ${c.category})`
                : ''}
            </option>
          ))}
        </select>
        {error && (
          <div className="alert-error" role="alert">
            {error}
          </div>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-primary"
            onClick={handleLink}
            disabled={!selectedKey || savePlanItemMutation.isPending}
          >
            Link
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={savePlanItemMutation.isPending}
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}


function LegacyBudgetCard({ budget }) {
  const saveBudgetMutation = useSaveBudget();
  const deleteBudgetMutation = useDeleteBudget();
  const toast = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [limitStr, setLimitStr] = useState(String(budget.monthly_limit));
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);

  const isBusy = saveBudgetMutation.isPending || deleteBudgetMutation.isPending;

  const handleSave = async (e) => {
    e?.preventDefault();
    const val = Number(limitStr);
    if (!limitStr.trim() || !Number.isFinite(val) || val <= 0) {
      setError('Enter an amount greater than 0');
      return;
    }
    setError(null);
    try {
      await saveBudgetMutation.mutateAsync({
        category: budget.category,
        monthlyLimit: val,
      });
      setIsEditing(false);
      toast.show({ message: `Updated limit for ${budget.category}` });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save the limit');
    }
  };

  const handleDelete = async () => {
    setError(null);
    try {
      await deleteBudgetMutation.mutateAsync(budget.category);
      toast.show({
        message: `Removed the ${budget.category} limit (${formatCurrency(
          budget.monthly_limit
        )}/mo)`,
        durationMs: 5000,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove the limit');
    }
  };

  return (
    <div
      className="card rounded-2xl p-3 space-y-2"
      data-testid="budget-row"
      data-category={budget.category}
    >
      <div className="flex items-center gap-3">
        <div className="icon-chip bg-primary-50 text-primary-600">
          <Wallet size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-semibold text-ink">
            {budget.category}
          </p>
          {isEditing ? (
            <form className="mt-1 flex items-center gap-1.5" onSubmit={handleSave}>
              <span className="text-ink-muted text-sm">PKR</span>
              <input
                type="number"
                className="input num w-28 px-3 py-1.5 text-sm"
                value={limitStr}
                onChange={(e) => setLimitStr(e.target.value)}
                aria-label={`Monthly limit for ${budget.category}`}
                disabled={isBusy}
                autoFocus
              />
              <span className="text-ink-muted text-xs">/mo</span>
              <button
                type="submit"
                className="icon-btn text-success-700 hover:bg-success-50"
                aria-label={`Save limit for ${budget.category}`}
                disabled={isBusy}
              >
                {saveBudgetMutation.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Check size={16} />
                )}
              </button>
              <button
                type="button"
                className="icon-btn"
                aria-label="Cancel edit"
                onClick={() => setIsEditing(false)}
                disabled={isBusy}
              >
                <X size={16} />
              </button>
            </form>
          ) : (
            <p className="num text-sm font-bold text-ink">
              {formatCurrency(budget.monthly_limit)}{' '}
              <span className="font-medium text-ink-muted">/mo</span>
            </p>
          )}
        </div>
      </div>

      <p className="text-xs text-ink-muted">
        Move to plan: add a cost for {budget.category} in{' '}
        <Link to="/plan/items" className="font-semibold text-primary-700 underline">
          Income & costs
        </Link>{' '}
        with the category set to {budget.category}, then delete this limit.
      </p>

      {!isEditing && !isDeleting && (
        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-2">
          <button
            type="button"
            className="btn-secondary min-h-[44px] gap-1.5 px-4 text-sm"
            aria-label={`Edit limit for ${budget.category}`}
            onClick={() => {
              setLimitStr(String(budget.monthly_limit));
              setError(null);
              setIsEditing(true);
            }}
            disabled={isBusy}
          >
            <Pencil size={16} aria-hidden="true" />
            Edit
          </button>
          <button
            type="button"
            className="btn-secondary min-h-[44px] gap-1.5 px-4 text-sm text-danger-700 hover:bg-danger-50"
            aria-label={`Delete limit for ${budget.category}`}
            onClick={() => {
              setError(null);
              setIsDeleting(true);
            }}
            disabled={isBusy}
          >
            <Trash2 size={16} aria-hidden="true" />
            Delete
          </button>
        </div>
      )}

      {isDeleting && (
        <div
          className="rounded-2xl border border-danger-100 bg-danger-50 p-3"
          role="group"
          aria-label={`Confirm removing the ${budget.category} limit`}
        >
          <p className="text-sm font-semibold text-danger-700">
            Remove this limit? Transactions are not affected.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className="btn-danger inline-flex items-center gap-1.5"
              onClick={handleDelete}
              disabled={isBusy}
            >
              {deleteBudgetMutation.isPending && (
                <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              )}
              Remove
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsDeleting(false)}
              disabled={isBusy}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="alert-error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

function ActualVsBudgetSection() {
  const [selectedMonth, setSelectedMonth] = useState(null);

  const currentMonthActuals = useActuals(null);
  const selectedMonthActuals = useActuals(selectedMonth, selectedMonth !== null);
  const actualsQuery = selectedMonth === null ? currentMonthActuals : selectedMonthActuals;

  const currentMonth = currentMonthActuals.data?.month ?? null;
  const activeMonth = selectedMonth ?? currentMonth;

  const [search, setSearch] = useState('');
  const trimmedSearch = search.trim().toLowerCase();

  const assumptionsQuery = useAssumptions();
  const categoriesQuery = useCategories();

  const planItems = assumptionsQuery.data?.items ?? [];
  const planCosts = useMemo(
    () => planItems.filter((p) => p.assumption_type === 'cost' && !p.into_bucket),
    [planItems]
  );

  const allCategoryNames = useMemo(() => {
    const fromCats = (categoriesQuery.data?.categories ?? []).map((c) => c.name);
    const fromPlan = planItems.map((p) => p.category).filter(Boolean);
    return Array.from(new Set([...fromCats, ...fromPlan])).sort();
  }, [categoriesQuery.data, planItems]);

  const [editingPlanKey, setEditingPlanKey] = useState(null);
  const [linkingCategory, setLinkingCategory] = useState(null);

  const editingPlanItem = useMemo(
    () => planItems.find((p) => p.key === editingPlanKey) ?? null,
    [planItems, editingPlanKey]
  );

  const isFetching = actualsQuery.isFetching;
  const isError = actualsQuery.isError;
  const errorMsg = isError
    ? actualsQuery.error instanceof Error
      ? actualsQuery.error.message
      : 'Failed to load actual vs budget'
    : null;

  const canGoNext = activeMonth !== null && currentMonth !== null && activeMonth < currentMonth;

  const handleMonthDelta = (delta) => {
    if (!activeMonth) return;
    const next = offsetMonth(activeMonth, delta);
    setSelectedMonth(next === currentMonth ? null : next);
  };

  const actualsData = actualsQuery.data ?? null;

  const filteredBudgets = useMemo(() => {
    const list = actualsData?.budgets ?? [];
    if (!trimmedSearch) return list;
    return list.filter((b) =>
      [
        b.category,
        ...(b.categories ?? []),
        ...(b.items ?? []).map((it) => it.label),
      ].some((str) => str?.toLowerCase().includes(trimmedSearch))
    );
  }, [actualsData, trimmedSearch]);

  return (
    <div className="space-y-3">
      {/* Header and month picker */}
      <div className="flex items-center justify-between gap-2">
        <p className="eyebrow">Actual vs budget</p>
        <div className="flex items-center gap-1 rounded-full bg-white border border-line shadow-card p-0.5">
          <button
            type="button"
            onClick={() => handleMonthDelta(-1)}
            disabled={isFetching || !activeMonth}
            className="icon-btn"
            aria-label="Previous month"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-semibold text-ink min-w-[7.5rem] text-center">
            {activeMonth ? formatFullMonthYear(activeMonth) : '...'}
          </span>
          <button
            type="button"
            onClick={() => handleMonthDelta(1)}
            disabled={isFetching || !canGoNext}
            className="icon-btn"
            aria-label="Next month"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="alert-error flex items-center justify-between gap-3" role="alert">
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => actualsQuery.refetch()}
            disabled={actualsQuery.isFetching}
            className="btn-secondary shrink-0 px-3 text-xs"
          >
            Retry
          </button>
        </div>
      )}

      {actualsQuery.isPending && (
        <LoadingSkeleton label="Loading budgets" rows={4} />
      )}

      {actualsData && (
        <div
          className={`space-y-3 transition-opacity ${isFetching ? 'opacity-60' : ''}`}
          aria-busy={isFetching}
        >
          {actualsData.budgets.length > 3 && (
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search budgets"
              label="Search budgets"
            />
          )}

          {actualsData.budgets.length === 0 && (
            <div className="card p-4 text-sm text-ink-muted">
              No budgets yet. Link a plan cost to a spending category to create one.
            </div>
          )}

          {/* Grid of Budget Cards */}
          <div className="grid gap-3 md:grid-cols-2">
            {filteredBudgets.map((b, i) => (
              <BudgetCard
                key={`${b.category}-${i}`}
                budget={b}
                onEdit={(key) => setEditingPlanKey(key)}
              />
            ))}
          </div>

          {/* Unbudgeted Spending */}
          {actualsData.unbudgeted && actualsData.unbudgeted.length > 0 && (
            <div className="card rounded-2xl p-4 space-y-2">
              <p className="text-sm font-bold text-ink">Spending without a budget</p>
              {actualsData.unbudgeted.map((u) => (
                <div
                  key={u.category}
                  className="flex items-center justify-between text-xs text-ink-muted"
                >
                  <span>
                    {u.category} <span>({u.count})</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="num text-ink font-semibold">
                      {formatCurrency(u.amount)}
                    </span>
                    <button
                      type="button"
                      className="btn-secondary min-h-[44px] px-3 text-xs"
                      onClick={() => setLinkingCategory(u.category)}
                      aria-label={`Set budget for ${u.category}`}
                    >
                      Set budget
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Plan vs Logged Summary */}
          {actualsData.plan_vs_logged && (
            <div className="card rounded-2xl p-4 text-xs text-ink-muted space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span>Planned costs</span>
                <span className="num text-ink font-semibold">
                  {actualsData.plan_vs_logged.planned_costs !== null
                    ? formatCurrency(actualsData.plan_vs_logged.planned_costs)
                    : 'Outside projection window'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span>Logged spending</span>
                <span className="num text-ink font-semibold">
                  {formatCurrency(actualsData.plan_vs_logged.logged_spend)}
                </span>
              </div>
              {actualsData.plan_vs_logged.partial_coverage && (
                <p className="pt-1">{actualsData.plan_vs_logged.note}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Edit Plan Item Modal */}
      <PlanItemModal
        open={editingPlanItem !== null}
        onClose={() => setEditingPlanKey(null)}
        item={editingPlanItem}
        categories={allCategoryNames}
      />

      {/* Link Plan Cost Modal */}
      <LinkPlanCostModal
        category={linkingCategory}
        costs={planCosts}
        onClose={() => setLinkingCategory(null)}
      />
    </div>
  );
}

function HowBudgetsWorkSection() {
  const budgetsQuery = useBudgets();
  const actualsQuery = useActuals(null);

  const planCategories = useMemo(() => {
    const list = actualsQuery.data?.budgets ?? [];
    return new Set(
      list
        .filter((s) => s.source === 'plan')
        .flatMap((s) => [s.category, ...(s.categories ?? [])])
        .map((s) => s.trim().toLowerCase())
    );
  }, [actualsQuery.data]);

  const legacyBudgets = useMemo(() => {
    const list = budgetsQuery.data?.budgets ?? [];
    return list.filter((s) => !planCategories.has(s.category.trim().toLowerCase()));
  }, [budgetsQuery.data, planCategories]);

  const isLoaded = budgetsQuery.isSuccess && actualsQuery.isSuccess;

  return (
    <section className="space-y-3" aria-label="How budgets work">
      <div className="card rounded-2xl p-4 text-sm text-ink-muted" data-testid="budgets-plan-note">
        Budgets come from your plan. A cost in{' '}
        <Link to="/plan/items" className="font-semibold text-primary-700 underline">
          Income & costs
        </Link>{' '}
        whose category matches a spending category sets that category's limit each month, so raises
        and adjustments carry through automatically.
      </div>

      {isLoaded && legacyBudgets.length > 0 && (
        <div className="space-y-3" data-testid="legacy-limits">
          <h2 className="section-title">Spending limits not tied to a plan item</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {legacyBudgets.map((b) => (
              <LegacyBudgetCard key={b.id || b.category} budget={b} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export function BudgetsPage() {
  return (
    <div className="space-y-6">
      <ActualVsBudgetSection />
      <HowBudgetsWorkSection />
    </div>
  );
}
