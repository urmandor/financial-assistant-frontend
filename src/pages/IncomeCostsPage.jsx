import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Plus,
  Search,
  X,
  Pencil,
  Trash2,
  Loader2,
} from 'lucide-react';
import {
  useAssumptions,
  useProjections,
  useDeletePlanItem,
  useCategories,
} from '../hooks/useQueries';
import { getCurrentMonth, formatFullMonthYear } from '../utils/dates';
import { formatCurrency, pluralize } from '../utils/formatters';
import { useToast } from '../hooks/useToast';
import { PlanItemModal } from '../components/modals/PlanItemModal';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const PLAN_GROUPS = [
  {
    id: 'income',
    title: 'Income',
    addLabel: 'Add income',
    empty: 'No income yet. Add your salary and other money coming in.',
    type: 'income',
    oneOff: false,
  },
  {
    id: 'costs',
    title: 'Costs',
    addLabel: 'Add cost',
    empty: 'No recurring costs yet.',
    type: 'cost',
    oneOff: false,
  },
  {
    id: 'oneOffs',
    title: 'One-offs',
    addLabel: 'Add one-off',
    empty: 'No one-off items yet: trips, bonuses, big purchases.',
    type: 'cost',
    oneOff: true,
  },
  {
    id: 'reference',
    title: 'Balances & targets',
    addLabel: 'Add balance',
    empty: 'No balances or targets yet.',
    type: 'reference',
    oneOff: false,
  },
];

function formatRecurrenceSchedule(item) {
  if (item.assumption_type === 'reference') return 'balance or target';
  if (!item.is_recurring) {
    return item.start_month
      ? `one-off ${formatFullMonthYear(item.start_month)}`
      : 'one-off (no month set)';
  }

  const start = item.start_month ? formatFullMonthYear(item.start_month) : null;
  const end = item.end_month ? formatFullMonthYear(item.end_month) : null;
  const repeatMonths = item.repeat_every_months ?? (item.recurrence === 'yearly' ? 12 : 1);

  if (repeatMonths > 1 && repeatMonths !== 12 && start) {
    return end
      ? `every ${repeatMonths} months from ${start} to ${end}`
      : `every ${repeatMonths} months from ${start}`;
  }

  if (repeatMonths === 12 && item.start_month) {
    const monthNum = Number(item.start_month.slice(5, 7));
    const mname = MONTH_NAMES[monthNum - 1] ?? 'year';
    return end ? `every ${mname} from ${start} to ${end}` : `every ${mname} from ${start}`;
  }

  if (start && end) return `every month, ${start} to ${end}`;
  if (start) return `every month from ${start}`;
  if (end) return `every month until ${end}`;
  return 'every month';
}

function formatEscalationBadge(escalation) {
  if (!escalation) return null;
  const pctStr = `${Math.round(escalation.escalation_pct * 10000) / 100}%`;
  const mname = MONTH_NAMES[(escalation.trigger_month ?? 1) - 1] ?? 'month';
  return `+${pctStr} each ${mname}`;
}

function formatAdjustmentBadge(adj) {
  if (!adj) return null;
  const month = adj.month ? formatFullMonthYear(adj.month) : 'month';
  return `Adjusted in ${month}: ${formatCurrency(adj.amount || adj.value)}`;
}

function groupPlanItems(items) {
  const groups = { income: [], costs: [], oneOffs: [], reference: [] };
  for (const item of items) {
    if (item.assumption_type === 'reference') {
      groups.reference.push(item);
    } else if (item.is_recurring) {
      if (item.assumption_type === 'income') {
        groups.income.push(item);
      } else {
        groups.costs.push(item);
      }
    } else {
      groups.oneOffs.push(item);
    }
  }
  return groups;
}

function PlanSummaryCard() {
  const currentMonth = useMemo(() => getCurrentMonth(), []);
  const projectionQuery = useProjections(1, currentMonth);

  const projection = projectionQuery.data?.projections?.[0] ?? null;
  const hasGoalContributions =
    projection?.line_items?.some((a) => a.key?.startsWith('goal:')) ?? false;

  return (
    <div className="card p-4 space-y-3" data-testid="plan-summary">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <p className="eyebrow">This month, from your plan</p>
        <p className="text-xs text-ink-muted">{formatFullMonthYear(currentMonth)}</p>
      </div>

      {projectionQuery.isError && (
        <div className="alert-error flex items-center justify-between gap-3" role="alert">
          <span>
            {projectionQuery.error instanceof Error
              ? projectionQuery.error.message
              : 'Failed to load the plan summary'}
          </span>
          <button
            type="button"
            onClick={() => projectionQuery.refetch()}
            disabled={projectionQuery.isFetching}
            className="btn-secondary shrink-0 px-3 text-xs"
          >
            Retry
          </button>
        </div>
      )}

      {projectionQuery.isPending && (
        <div
          role="status"
          aria-busy="true"
          aria-label="Loading plan summary"
          className="grid grid-cols-3 gap-3"
        >
          {[0, 1, 2].map((a) => (
            <div key={a} className="space-y-2">
              <div className="h-3 w-14 rounded-full bg-surface-muted animate-pulse" />
              <div className="h-6 w-full rounded-xl bg-surface-muted animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {projection && (
        <>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-3 sm:block">
              <dt className="flex items-center gap-1.5 text-xs font-semibold text-ink-muted sm:mb-1">
                <TrendingUp size={14} className="text-success-600" aria-hidden="true" />
                <span>Planned income</span>
              </dt>
              <dd
                className="num ml-auto text-lg font-bold text-ink sm:ml-0"
                data-testid="plan-income"
              >
                {formatCurrency(projection.income)}
              </dd>
            </div>

            <div className="flex items-center gap-3 sm:block">
              <dt className="flex items-center gap-1.5 text-xs font-semibold text-ink-muted sm:mb-1">
                <TrendingDown size={14} className="text-accent-600" aria-hidden="true" />
                <span>Planned costs</span>
              </dt>
              <dd
                className="num ml-auto text-lg font-bold text-ink sm:ml-0"
                data-testid="plan-costs"
              >
                {formatCurrency(projection.costs)}
              </dd>
            </div>

            <div className="flex items-center gap-3 sm:block">
              <dt className="text-xs font-semibold text-ink-muted sm:mb-1">Net</dt>
              <dd
                className={`num ml-auto text-lg font-bold sm:ml-0 ${
                  projection.net < 0 ? 'text-danger-700' : 'text-success-700'
                }`}
                data-testid="plan-net"
              >
                {formatCurrency(projection.net)}
              </dd>
            </div>
          </dl>

          <p className="text-xs text-ink-muted">
            Planned figures, not what you have logged.
            {hasGoalContributions && ' Costs include goal contributions.'}
          </p>
        </>
      )}
    </div>
  );
}

function PlanItemRow({
  item,
  confirming,
  onEdit,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
  deleting,
  error,
}) {
  const linkedDetails = [];
  if (item.escalation) {
    linkedDetails.push(`its yearly raise (${formatEscalationBadge(item.escalation)})`);
  }
  if (item.adjustments && item.adjustments.length > 0) {
    linkedDetails.push(pluralize(item.adjustments.length, 'adjustment'));
  }

  const categoryName =
    item.into_bucket || (item.category && item.category.trim().toLowerCase() === 'general')
      ? null
      : item.category?.trim() || null;

  const spendCategories =
    item.assumption_type === 'cost' ? item.spend_categories ?? [] : [];
  const paidFromBucket =
    item.assumption_type === 'cost' ? item.paid_from_bucket : null;
  const intoBucket = item.assumption_type === 'cost' ? item.into_bucket : null;

  const hasBadges =
    item.escalation ||
    (item.adjustments && item.adjustments.length > 0) ||
    categoryName ||
    spendCategories.length > 0 ||
    paidFromBucket ||
    intoBucket;

  return (
    <li
      className="card rounded-2xl p-3 space-y-2"
      data-testid="plan-row"
      data-key={item.key}
    >
      <div className="min-w-0">
        <p className="break-words text-sm font-semibold text-ink">{item.label}</p>
        <p className="num mt-0.5 text-sm font-bold text-ink">
          {formatCurrency(item.value)}
          {item.is_recurring && item.assumption_type !== 'reference' && (
            <span className="font-medium text-ink-muted"> /mo</span>
          )}
        </p>
        <p className="mt-0.5 break-words text-xs text-ink-muted">
          {formatRecurrenceSchedule(item)}
          {item.category && !categoryName ? ` · ${item.category}` : ''}
        </p>
      </div>

      {hasBadges && (
        <div className="flex flex-wrap gap-1.5">
          {intoBucket && (
            <span className="badge badge-success" data-testid="plan-row-saving">
              Saving → {intoBucket}
            </span>
          )}
          {paidFromBucket && (
            <span className="badge badge-info" data-testid="plan-row-fund">
              From {paidFromBucket}
            </span>
          )}
          {spendCategories.length > 0 && (
            <span className="badge badge-neutral" data-testid="plan-row-covers">
              Covers: {spendCategories.join(', ')}
            </span>
          )}
          {categoryName && spendCategories.length === 0 && (
            <span
              className="badge badge-neutral"
              data-testid="plan-row-category"
              title="Linked spending category"
            >
              {categoryName}
            </span>
          )}
          {item.escalation && (
            <span className="badge badge-success">
              {formatEscalationBadge(item.escalation)}
            </span>
          )}
          {(item.adjustments ?? []).map((adj, idx) => (
            <span key={adj.id ?? idx} className="badge badge-warning">
              {formatAdjustmentBadge(adj)}
            </span>
          ))}
        </div>
      )}

      {!confirming && (
        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-2">
          <button
            type="button"
            className="btn-secondary min-h-[44px] gap-1.5 px-4 text-sm"
            aria-label={`Edit ${item.label}`}
            onClick={onEdit}
            disabled={deleting}
          >
            <Pencil size={16} aria-hidden="true" />
            Edit
          </button>
          <button
            type="button"
            className="btn-secondary min-h-[44px] gap-1.5 px-4 text-sm text-danger-700 hover:bg-danger-50"
            aria-label={`Delete ${item.label}`}
            onClick={onAskDelete}
            disabled={deleting}
          >
            <Trash2 size={16} aria-hidden="true" />
            Delete
          </button>
        </div>
      )}

      {confirming && (
        <div
          className="rounded-2xl border border-danger-100 bg-danger-50 p-3"
          role="group"
          aria-label={`Confirm delete ${item.label}`}
        >
          <p className="text-sm font-semibold text-danger-700">
            Remove {item.label}
            {linkedDetails.length > 0 ? ` with ${linkedDetails.join(' and ')}` : ''}?
          </p>
          <p className="mt-1 text-xs text-danger-700">
            It leaves your projection. This cannot be undone.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className="btn-danger inline-flex items-center gap-1.5"
              onClick={onConfirmDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
              Remove
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={onCancelDelete}
              disabled={deleting}
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
    </li>
  );
}

export function IncomeCostsPage() {
  const assumptionsQuery = useAssumptions();
  const deleteMutation = useDeletePlanItem();
  const categoriesQuery = useCategories();
  const toast = useToast();

  const allItems = useMemo(
    () => assumptionsQuery.data?.items ?? [],
    [assumptionsQuery.data]
  );

  const [search, setSearch] = useState('');
  const trimmedSearch = search.trim().toLowerCase();

  const filteredItems = useMemo(() => {
    if (!trimmedSearch) return allItems;
    return allItems.filter((it) =>
      [
        it.label,
        it.key,
        it.category,
        it.paid_from_bucket,
        it.into_bucket,
        String(it.value),
        ...(it.spend_categories ?? []),
      ]
        .filter(Boolean)
        .some((str) => String(str).toLowerCase().includes(trimmedSearch))
    );
  }, [allItems, trimmedSearch]);

  const grouped = useMemo(() => groupPlanItems(filteredItems), [filteredItems]);

  const allCategoryNames = useMemo(() => {
    const fromCats = (categoriesQuery.data?.categories ?? []).map((c) => c.name);
    const fromItems = allItems.map((it) => it.category).filter(Boolean);
    return Array.from(new Set([...fromCats, ...fromItems])).sort();
  }, [categoriesQuery.data, allItems]);

  // Section expand/collapse state: default open Income
  const [openSections, setOpenSections] = useState({
    income: true,
    costs: false,
    oneOffs: false,
    reference: false,
  });

  const [modalState, setModalState] = useState(null);
  const [confirmDeleteKey, setConfirmDeleteKey] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  const queryError = assumptionsQuery.isError
    ? assumptionsQuery.error instanceof Error
      ? assumptionsQuery.error.message
      : 'Failed to load plan items'
    : null;

  const handleDelete = async (item) => {
    setDeleteError(null);
    try {
      const res = await deleteMutation.mutateAsync(item.key);
      setConfirmDeleteKey(null);
      const notes = [
        res?.removed?.escalation_rules > 0
          ? pluralize(res.removed.escalation_rules, 'raise')
          : null,
        res?.removed?.adjustments > 0
          ? pluralize(res.removed.adjustments, 'adjustment')
          : null,
      ].filter(Boolean);

      toast.show({
        message: `Removed ${item.label}${notes.length > 0 ? ` and ${notes.join(', ')}` : ''}`,
        durationMs: 5000,
      });
    } catch (err) {
      setDeleteError({
        key: item.key,
        message: err instanceof Error ? err.message : 'Failed to remove the item',
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Top summary card */}
      <PlanSummaryCard />

      {/* Query error */}
      {queryError && (
        <div className="alert-error flex items-center justify-between gap-3" role="alert">
          <span>{queryError}</span>
          <button
            type="button"
            onClick={() => assumptionsQuery.refetch()}
            disabled={assumptionsQuery.isFetching}
            className="btn-secondary shrink-0 px-3 text-xs"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {assumptionsQuery.isPending && (
        <div
          role="status"
          aria-busy="true"
          aria-label="Loading plan items"
          className="space-y-3"
        >
          {[0, 1, 2].map((s) => (
            <div key={s} className="card rounded-2xl p-3 flex items-center gap-3">
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-1/2 rounded-full bg-surface-muted animate-pulse" />
                <div className="h-4 w-1/3 rounded-full bg-surface-muted animate-pulse" />
                <div className="h-3 w-2/3 rounded-full bg-surface-muted animate-pulse" />
              </div>
              <div className="h-10 w-10 shrink-0 rounded-full bg-surface-muted animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {/* Search Input */}
      {assumptionsQuery.isSuccess && (
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, category, fund or amount"
            aria-label="Search plan items"
            className="input w-full pl-10 pr-11 text-sm"
          />
          {search && (
            <button
              type="button"
              className="icon-btn absolute right-0.5 top-1/2 -translate-y-1/2"
              aria-label="Clear search"
              onClick={() => setSearch('')}
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      {/* Search No Results */}
      {assumptionsQuery.isSuccess && trimmedSearch && filteredItems.length === 0 && (
        <div className="card p-4 text-center text-sm text-ink-muted">
          Nothing matches "{search.trim()}".
        </div>
      )}

      {/* 4 Groups of Plan Items */}
      {assumptionsQuery.isSuccess &&
        PLAN_GROUPS.map((group) => {
          const items = grouped[group.id] ?? [];
          if (trimmedSearch && items.length === 0) return null;
          const isOpen = trimmedSearch ? true : openSections[group.id];
          const contentId = `plan-group-${group.id}`;

          return (
            <section
              key={group.id}
              className="space-y-3"
              aria-label={group.title}
            >
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setOpenSections((prev) => ({
                      ...prev,
                      [group.id]: !prev[group.id],
                    }))
                  }
                  className="card flex min-h-[56px] flex-1 items-center gap-3 p-3 text-left transition-shadow hover:shadow-pop"
                  aria-expanded={isOpen}
                  aria-controls={contentId}
                >
                  <span className="icon-chip bg-primary-50 text-primary-600">
                    <ChevronRight
                      size={18}
                      className={`transition-transform duration-200 motion-reduce:transition-none ${
                        isOpen ? 'rotate-90' : ''
                      }`}
                    />
                  </span>
                  <h3 className="section-title">
                    {group.title} ({items.length})
                  </h3>
                </button>
                <button
                  type="button"
                  className="btn-secondary shrink-0 px-3 text-xs"
                  onClick={() =>
                    setModalState({
                      item: null,
                      type: group.type,
                      oneOff: group.oneOff,
                    })
                  }
                >
                  <Plus size={14} aria-hidden="true" />
                  {group.addLabel}
                </button>
              </div>

              {isOpen && (
                <div id={contentId} className="motion-safe:animate-fade-up">
                  {items.length === 0 ? (
                    <div className="card p-4 text-center text-sm text-ink-muted">
                      {group.empty}
                    </div>
                  ) : (
                    <ul className="grid gap-3 md:grid-cols-2" aria-label={group.title}>
                      {items.map((it) => (
                        <PlanItemRow
                          key={it.key}
                          item={it}
                          confirming={confirmDeleteKey === it.key}
                          onEdit={() => setModalState({ item: it })}
                          onAskDelete={() => setConfirmDeleteKey(it.key)}
                          onCancelDelete={() => setConfirmDeleteKey(null)}
                          onConfirmDelete={() => handleDelete(it)}
                          deleting={
                            deleteMutation.isPending &&
                            confirmDeleteKey === it.key
                          }
                          error={
                            deleteError?.key === it.key
                              ? deleteError.message
                              : null
                          }
                        />
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </section>
          );
        })}

      {/* Plan Item Create / Edit Modal */}
      <PlanItemModal
        open={modalState !== null}
        onClose={() => setModalState(null)}
        item={modalState?.item ?? null}
        defaultType={modalState?.type ?? 'cost'}
        defaultOneOff={modalState?.oneOff ?? false}
        categories={allCategoryNames}
      />
    </div>
  );
}
