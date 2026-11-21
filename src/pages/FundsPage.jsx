import React, { useState, useCallback, useMemo } from 'react';
import {
  PiggyBank,
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  Loader2,
  ArrowDownToLine,
  ArrowUpFromLine,
} from 'lucide-react';
import {
  useBuckets,
  useCreateBucket,
  useDeleteBucket,
  useAssumptions,
  useProjections,
  useGoals,
  useSavePlanItem,
} from '../hooks/useQueries';
import { useToast } from '../hooks/useToast';
import { PlanItemModal } from '../components/modals/PlanItemModal';
import { formatCurrency } from '../utils/formatters';
import {
  getCurrentMonth,
  formatShortMonthYear,
  formatFullMonthYear,
} from '../utils/dates';

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

const isSameFund = (a, b) =>
  (a ?? '').trim().toLowerCase() === (b ?? '').trim().toLowerCase();

function formatItemAmountRate(item) {
  if (!item.is_recurring) return `${formatCurrency(item.value)} once`;
  const repeat =
    item.repeat_every_months ?? (item.recurrence === 'yearly' ? 12 : 1);
  return repeat === 1
    ? `${formatCurrency(item.value)}/mo`
    : repeat === 12
      ? `${formatCurrency(item.value)}/yr`
      : `${formatCurrency(item.value)} every ${repeat} mo`;
}

function formatRecurrenceSchedule(item) {
  if (item.assumption_type === 'reference') return 'balance or target';
  if (!item.is_recurring) {
    return item.start_month
      ? `one-off ${formatFullMonthYear(item.start_month)}`
      : 'one-off (no month set)';
  }

  const start = item.start_month ? formatFullMonthYear(item.start_month) : null;
  const end = item.end_month ? formatFullMonthYear(item.end_month) : null;
  const repeatMonths =
    item.repeat_every_months ?? (item.recurrence === 'yearly' ? 12 : 1);

  if (repeatMonths > 1 && repeatMonths !== 12 && start) {
    return end
      ? `every ${repeatMonths} months from ${start} to ${end}`
      : `every ${repeatMonths} months from ${start}`;
  }

  if (repeatMonths === 12 && item.start_month) {
    const monthNum = Number(item.start_month.slice(5, 7));
    const mname = MONTH_NAMES[monthNum - 1] ?? 'year';
    return end
      ? `every ${mname} from ${start} to ${end}`
      : `every ${mname} from ${start}`;
  }

  if (start && end) return `every month, ${start} to ${end}`;
  if (start) return `every month from ${start}`;
  if (end) return `every month until ${end}`;
  return 'every month';
}

function FundDetails({
  bucket,
  costs,
  summary,
  onEditItem,
  onAddSaving,
  linkedGoals,
}) {
  const saveItemMutation = useSavePlanItem();
  const deleteBucketMutation = useDeleteBucket();
  const toast = useToast();

  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [paidFromError, setPaidFromError] = useState(null);
  const [removeSavingError, setRemoveSavingError] = useState(null);
  const [selectedExpenseToAdd, setSelectedExpenseToAdd] = useState('');
  const [movingExpenseKey, setMovingExpenseKey] = useState(null);

  const savingsItems = costs.filter((it) => isSameFund(it.into_bucket, bucket.name));
  const paysItems = costs.filter((it) => isSameFund(it.paid_from_bucket, bucket.name));
  const availableExpenses = costs.filter(
    (it) => !it.into_bucket && !isSameFund(it.paid_from_bucket, bucket.name)
  );

  const firstShortfall = summary?.first_shortfall ?? null;
  const isBusy = saveItemMutation.isPending || deleteBucketMutation.isPending;

  const handleDeleteBucket = async () => {
    setDeleteError(null);
    try {
      await deleteBucketMutation.mutateAsync(bucket.name);
      toast.show({ message: `Deleted the ${bucket.name} fund`, durationMs: 5000 });
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete the fund');
    }
  };

  const handleRemoveSaving = async (itemKey) => {
    setRemoveSavingError(null);
    try {
      await saveItemMutation.mutateAsync({
        key: itemKey,
        input: { into_bucket: null },
        raise: { kind: 'keep' },
      });
    } catch (err) {
      setRemoveSavingError(err instanceof Error ? err.message : 'Failed to save');
    }
  };

  const handleSetPaidFrom = async (itemKey, bucketName) => {
    setPaidFromError(null);
    try {
      await saveItemMutation.mutateAsync({
        key: itemKey,
        input: { paid_from_bucket: bucketName },
        raise: { kind: 'keep' },
      });
      setSelectedExpenseToAdd('');
      setMovingExpenseKey(null);
    } catch (err) {
      setPaidFromError(err instanceof Error ? err.message : 'Failed to save');
    }
  };

  const handleAddExpense = () => {
    const exp = availableExpenses.find((it) => it.key === selectedExpenseToAdd);
    if (exp) {
      if (exp.paid_from_bucket && !isSameFund(exp.paid_from_bucket, bucket.name)) {
        setMovingExpenseKey(exp.key);
        return;
      }
      handleSetPaidFrom(exp.key, bucket.name);
    }
  };

  const movingExpense = movingExpenseKey
    ? costs.find((it) => it.key === movingExpenseKey) ?? null
    : null;

  return (
    <div
      className="mt-3 space-y-4 border-t border-line pt-3"
      data-testid="fund-details"
      data-fund={bucket.name}
    >
      {/* Money in: savings */}
      <section
        className="space-y-2"
        aria-label={`${bucket.name}: money in`}
        data-testid="fund-money-in"
      >
        <h3 className="flex items-center gap-1.5 text-sm font-bold text-success-700">
          <ArrowDownToLine size={16} aria-hidden="true" />
          Money in: savings
        </h3>
        <p className="text-xs text-ink-muted">
          Amounts you move into this fund each month. They leave your cash but are not spending.
        </p>

        {savingsItems.length === 0 ? (
          <p className="text-xs text-ink-muted">No savings yet.</p>
        ) : (
          <ul className="space-y-2">
            {savingsItems.map((item) => (
              <li
                key={item.key}
                className="rounded-xl border border-line p-2.5"
                data-testid="fund-saving-item"
              >
                <p className="break-words text-sm font-semibold text-ink">
                  {item.label}
                </p>
                <p className="num break-words text-xs text-ink-muted">
                  {formatItemAmountRate(item)} · {formatRecurrenceSchedule(item)}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-line pt-2">
                  <button
                    type="button"
                    className="btn-secondary min-h-[44px] gap-1.5 px-4 text-sm"
                    aria-label={`Edit ${item.label}`}
                    onClick={() => onEditItem(item.key)}
                    disabled={isBusy}
                  >
                    <Pencil size={16} aria-hidden="true" />
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn-secondary min-h-[44px] px-4 text-sm text-danger-700 hover:bg-danger-50"
                    aria-label={`Remove saving ${item.label} from ${bucket.name}`}
                    onClick={() => handleRemoveSaving(item.key)}
                    disabled={isBusy}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          className="btn-secondary min-h-[44px] gap-1.5 px-4 text-sm"
          onClick={() => onAddSaving(bucket.name)}
          disabled={isBusy}
        >
          <Plus size={16} aria-hidden="true" />
          Add saving
        </button>

        {removeSavingError && (
          <div className="alert-error" role="alert">
            {removeSavingError}
          </div>
        )}
      </section>

      {/* Money out: expenses this fund pays */}
      <section
        className="space-y-2"
        aria-label={`${bucket.name}: money out`}
        data-testid="fund-money-out"
      >
        <h3 className="flex items-center gap-1.5 text-sm font-bold text-warning-700">
          <ArrowUpFromLine size={16} aria-hidden="true" />
          Money out: expenses this fund pays
        </h3>
        <p className="text-xs text-ink-muted">
          Expenses paid out of this fund. Takes money out of the fund instead of your cash.
        </p>

        {paysItems.length === 0 ? (
          <p className="text-xs text-ink-muted">
            Nothing yet. Add an expense below.
          </p>
        ) : (
          <ul className="space-y-2">
            {paysItems.map((item) => (
              <li
                key={item.key}
                className="rounded-xl border border-line p-2.5"
                data-testid="fund-pays-item"
              >
                <p className="break-words text-sm font-semibold text-ink">
                  {item.label}
                </p>
                <p className="num break-words text-xs text-ink-muted">
                  {formatItemAmountRate(item)} · {formatRecurrenceSchedule(item)}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-line pt-2">
                  <button
                    type="button"
                    className="btn-secondary min-h-[44px] gap-1.5 px-4 text-sm"
                    aria-label={`Edit ${item.label}`}
                    onClick={() => onEditItem(item.key)}
                    disabled={isBusy}
                  >
                    <Pencil size={16} aria-hidden="true" />
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn-secondary min-h-[44px] px-4 text-sm text-danger-700 hover:bg-danger-50"
                    aria-label={`Remove ${item.label} from ${bucket.name}`}
                    onClick={() => handleSetPaidFrom(item.key, null)}
                    disabled={isBusy}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {availableExpenses.length > 0 && (
          <div className="space-y-2">
            <label
              htmlFor={`add-${bucket.name}`}
              className="text-xs font-semibold text-ink-soft"
            >
              Add an expense this fund pays
            </label>
            <div className="flex gap-2">
              <select
                id={`add-${bucket.name}`}
                className="input min-w-0 flex-1 text-sm"
                value={selectedExpenseToAdd}
                onChange={(e) => {
                  setSelectedExpenseToAdd(e.target.value);
                  setMovingExpenseKey(null);
                }}
                disabled={isBusy}
              >
                <option value="">Choose an expense…</option>
                {availableExpenses.map((exp) => (
                  <option key={exp.key} value={exp.key}>
                    {exp.label} · {formatItemAmountRate(exp)}
                    {exp.paid_from_bucket
                      ? ` (now: ${exp.paid_from_bucket})`
                      : ''}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn-primary min-h-[44px] shrink-0"
                onClick={handleAddExpense}
                disabled={!selectedExpenseToAdd || isBusy}
              >
                {saveItemMutation.isPending && !movingExpenseKey && (
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                )}
                Add
              </button>
            </div>

            {movingExpense && (
              <div
                className="rounded-xl border border-warning-100 bg-warning-50 p-3"
                role="group"
                aria-label="Confirm moving the expense"
              >
                <p className="text-sm font-semibold text-warning-800">
                  {movingExpense.label} is paid from {movingExpense.paid_from_bucket}. Move it to{' '}
                  {bucket.name}? A cost can only be paid from one fund.
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    className="btn-primary min-h-[44px]"
                    onClick={() => handleSetPaidFrom(movingExpense.key, bucket.name)}
                    disabled={isBusy}
                  >
                    {saveItemMutation.isPending && (
                      <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                    )}
                    Move
                  </button>
                  <button
                    type="button"
                    className="btn-secondary min-h-[44px]"
                    onClick={() => setMovingExpenseKey(null)}
                    disabled={isBusy}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {paidFromError && (
          <div className="alert-error" role="alert">
            {paidFromError}
          </div>
        )}
      </section>

      {/* Projected balance, next 12 months */}
      {summary && summary.months && summary.months.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-ink-soft">
            Projected balance, next {summary.months.length} months
          </p>
          {firstShortfall && (
            <p
              className="rounded-xl bg-warning-50 px-3 py-2 text-xs text-warning-800"
              role="status"
            >
              Short by{' '}
              <span className="num font-semibold">
                {formatCurrency(firstShortfall.short_by)}
              </span>{' '}
              in {formatShortMonthYear(firstShortfall.month)}:{' '}
              {firstShortfall.items.map((it) => it.label).join(', ')}. The rest comes out of cash.
            </p>
          )}
          <div
            className="overflow-x-auto"
            tabIndex={0}
            aria-label={`${bucket.name} projected balance by month`}
          >
            <ul className="flex gap-1.5 pb-1">
              {summary.months.map((m) => {
                const isShortfallMonth = firstShortfall?.month === m.month;
                const hasShortfall = m.shortfall > 0;
                return (
                  <li
                    key={m.month}
                    className={`min-w-[5.5rem] shrink-0 rounded-xl border px-2 py-1.5 text-center ${
                      isShortfallMonth
                        ? 'border-warning-600 bg-warning-50'
                        : hasShortfall
                        ? 'border-warning-100 bg-warning-50'
                        : 'border-line bg-white'
                    }`}
                    data-testid="fund-month"
                  >
                    <p className="text-[11px] text-ink-muted">
                      {formatShortMonthYear(m.month)}
                    </p>
                    <p className="num text-xs font-semibold text-ink">
                      {formatCurrency(m.balance)}
                    </p>
                    {(m.saved > 0 || m.paid > 0) && (
                      <p className="num text-[10px] text-ink-muted">
                        +{formatCurrency(m.saved)} / -{formatCurrency(m.paid)}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {/* Delete fund */}
      <div
        className="space-y-2 border-t border-line pt-3"
        data-testid="fund-delete"
      >
        {isConfirmingDelete ? (
          <div
            className="rounded-2xl border border-danger-100 bg-danger-50 p-3"
            role="group"
            aria-label={`Confirm deleting the ${bucket.name} fund`}
          >
            <p className="text-sm font-semibold text-danger-700">
              Delete the {bucket.name} fund?
            </p>
            <ul className="mt-1.5 space-y-1 break-words text-xs text-danger-700">
              <li>
                Balance{' '}
                <span className="num font-semibold">
                  {formatCurrency(bucket.current_balance)}
                </span>{' '}
                and its history are lost.
              </li>
              {paysItems.length > 0 && (
                <li>
                  Back to being paid from cash:{' '}
                  {paysItems.map((it) => it.label).join(', ')}.
                </li>
              )}
              {savingsItems.length > 0 && (
                <li>
                  Become plain monthly costs (still cash out, no fund):{' '}
                  {savingsItems.map((it) => it.label).join(', ')}.
                </li>
              )}
              {linkedGoals.length > 0 && (
                <li>Goals unlinked: {linkedGoals.join(', ')}.</li>
              )}
              <li>No plan item or goal is deleted.</li>
            </ul>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                className="btn-danger min-h-[44px]"
                onClick={handleDeleteBucket}
                disabled={isBusy}
              >
                {deleteBucketMutation.isPending && (
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                )}
                Delete fund
              </button>
              <button
                type="button"
                className="btn-secondary min-h-[44px]"
                onClick={() => setIsConfirmingDelete(false)}
                disabled={isBusy}
              >
                Cancel
              </button>
            </div>
            {deleteError && (
              <div className="alert-error mt-2" role="alert">
                {deleteError}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn-secondary min-h-[44px] gap-1.5 px-4 text-sm text-danger-700 hover:bg-danger-50"
              aria-label={`Delete fund ${bucket.name}`}
              onClick={() => {
                setDeleteError(null);
                setIsConfirmingDelete(true);
              }}
              disabled={isBusy}
            >
              <Trash2 size={16} aria-hidden="true" />
              Delete fund
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function FundsPage() {
  const bucketsQuery = useBuckets();
  const buckets = bucketsQuery.data?.buckets ?? [];

  const [search, setSearch] = useState('');
  const trimmedSearch = search.trim().toLowerCase();

  const filteredBuckets = trimmedSearch
    ? buckets.filter((b) =>
        [b.name, b.description].some((str) =>
          (str ?? '').toLowerCase().includes(trimmedSearch)
        )
      )
    : buckets;

  const createMutation = useCreateBucket();
  const assumptionsQuery = useAssumptions();
  const costItems = useMemo(
    () =>
      (assumptionsQuery.data?.items ?? []).filter(
        (it) => it.assumption_type === 'cost'
      ),
    [assumptionsQuery.data]
  );

  const currentMonth = useMemo(() => getCurrentMonth(), []);
  const projectionsQuery = useProjections(12, currentMonth);
  const projectionsFunds = projectionsQuery.data?.funds ?? [];

  const goalsQuery = useGoals();
  const goals = goalsQuery.data?.goals ?? [];

  const [addSavingFund, setAddSavingFund] = useState(null);
  const [editingCostItemKey, setEditingCostItemKey] = useState(null);
  const editingCostItem =
    editingCostItemKey ? costItems.find((it) => it.key === editingCostItemKey) ?? null : null;

  const isCreating = createMutation.isPending;
  const [createError, setCreateError] = useState(null);

  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newContribution, setNewContribution] = useState('');

  const handleCreateBucket = useCallback(async () => {
    const trimmed = newName.trim();
    const contrib = newContribution === '' ? 0 : Number(newContribution);
    if (!trimmed || Number.isNaN(contrib)) return;

    setCreateError(null);
    try {
      await createMutation.mutateAsync({
        name: trimmed,
        description: newDescription.trim() || undefined,
        monthly_contribution: contrib,
      });
      setNewName('');
      setNewDescription('');
      setNewContribution('');
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create bucket');
    }
  }, [newName, newDescription, newContribution, createMutation]);

  const queryError = bucketsQuery.isError
    ? bucketsQuery.error instanceof Error
      ? bucketsQuery.error.message
      : 'Failed to load buckets'
    : null;

  const displayError = createError ?? queryError;

  return (
    <div className="space-y-3">
      <div>
        <h2 className="section-title">Buckets & Funds</h2>
        <p className="text-sm text-ink-muted mt-0.5">
          Running-balance funds you contribute to and draw from over time
        </p>
        <p className="text-sm text-ink-muted mt-1">
          <span className="font-semibold text-success-700">Money in</span> is the
          savings you move into a fund each month.{' '}
          <span className="font-semibold text-warning-700">Money out</span> is the
          expenses the fund pays instead of your cash.
        </p>
      </div>

      {displayError && (
        <div className="alert-error flex items-center justify-between gap-3" role="alert">
          <span>{displayError}</span>
          {queryError && !createError && (
            <button
              type="button"
              onClick={() => bucketsQuery.refetch()}
              disabled={bucketsQuery.isFetching}
              className="btn-secondary shrink-0 px-3 text-xs"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {buckets.length > 1 && (
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
            placeholder="Search funds"
            aria-label="Search funds"
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

      {bucketsQuery.isPending ? (
        <div
          role="status"
          aria-busy="true"
          aria-label="Loading buckets"
          className="grid gap-3 md:grid-cols-2"
        >
          {Array.from({ length: 2 }).map((_, n) => (
            <div key={n} className="card rounded-2xl p-3 flex items-center gap-3">
              <div className="h-10 w-10 shrink-0 rounded-2xl bg-surface-muted animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-1/2 rounded-full bg-surface-muted animate-pulse" />
                <div className="h-3 w-3/4 rounded-full bg-surface-muted animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredBuckets.map((bucket) => (
            <div
              key={bucket.id || bucket.name}
              className="card min-w-0 rounded-2xl p-3"
            >
              <div className="flex items-center gap-3">
                <div className="icon-chip bg-accent-50 text-accent-600">
                  <PiggyBank size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="break-words text-sm font-semibold text-ink">
                    {bucket.name}
                  </p>
                  {bucket.description && (
                    <p className="text-xs text-ink-muted mt-0.5">
                      {bucket.description}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-3 mt-1 text-xs text-ink-muted">
                    <span>
                      Balance:{' '}
                      <span className="num text-ink font-semibold">
                        {formatCurrency(bucket.current_balance)}
                      </span>
                    </span>
                    <span className="num">
                      {formatCurrency(bucket.monthly_contribution)}/mo
                    </span>
                  </div>
                </div>
              </div>
              <FundDetails
                bucket={bucket}
                costs={costItems}
                summary={
                  projectionsFunds.find((f) => f.name === bucket.name) ?? null
                }
                onEditItem={setEditingCostItemKey}
                onAddSaving={setAddSavingFund}
                linkedGoals={goals
                  .filter((g) => g.bucket_name === bucket.name)
                  .map((g) => g.name)}
              />
            </div>
          ))}
        </div>
      )}

      {bucketsQuery.isSuccess && buckets.length === 0 && !displayError && (
        <div className="card p-4 text-center text-sm text-ink-muted">
          No buckets set yet.
        </div>
      )}

      {/* Plan item modal for adding savings */}
      <PlanItemModal
        open={addSavingFund !== null}
        onClose={() => setAddSavingFund(null)}
        item={null}
        defaultType="cost"
        categories={[]}
        defaultSavingFund={addSavingFund}
      />

      {/* Plan item modal for editing item */}
      <PlanItemModal
        open={editingCostItem !== null}
        onClose={() => setEditingCostItemKey(null)}
        item={editingCostItem}
        defaultType="cost"
        categories={[]}
      />

      {/* Add a bucket */}
      <div className="card p-4 space-y-3">
        <p className="text-sm font-bold text-ink">Add a bucket</p>
        <input
          type="text"
          placeholder="Name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="input text-sm"
        />
        <input
          type="text"
          placeholder="Description (optional)"
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
          className="input text-sm"
        />
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="PKR/mo contribution (optional)"
            value={newContribution}
            onChange={(e) => setNewContribution(e.target.value)}
            className="input num flex-1 min-w-0 text-sm"
          />
          <button
            type="button"
            onClick={handleCreateBucket}
            disabled={!newName.trim() || isCreating}
            className="btn-primary btn-icon"
            aria-label="Add bucket"
          >
            {isCreating ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Plus size={16} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
