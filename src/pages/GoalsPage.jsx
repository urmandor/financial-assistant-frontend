import React, { useState, useCallback, useRef } from 'react';
import { Target, Plus, Pencil, Trash2, Search, X, Loader2 } from 'lucide-react';
import {
  useGoals,
  useBuckets,
  useAssumptions,
  useCreateGoal,
  useDeleteGoal,
} from '../hooks/useQueries';
import { formatCurrency } from '../utils/formatters';

const GOAL_STATUSES = {
  funded: {
    label: 'Funded',
    className: 'badge-success',
    fill: 'progress-fill-success',
  },
  on_track: {
    label: 'On track',
    className: 'badge-info',
    fill: '',
  },
  behind: {
    label: 'Behind',
    className: 'badge-warning',
    fill: 'progress-fill-warning',
  },
  overdue: {
    label: 'Overdue',
    className: 'badge-danger',
    fill: 'progress-fill-danger',
  },
  no_deadline: {
    label: 'No deadline',
    className: 'badge-neutral',
    fill: '',
  },
};

function formatMonthYear(monthStr) {
  if (!monthStr || typeof monthStr !== 'string') return '';
  const [year, month] = monthStr.split('-').map(Number);
  if (!year || !month) return monthStr;
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: 'short',
    year: 'numeric',
  });
}

function GoalCard({ goal, removing, onRemove, onEdit }) {
  const statusConfig = GOAL_STATUSES[goal.status] || GOAL_STATUSES.no_deadline;
  const isRemoving = removing === goal.name;
  const progressPct = typeof goal.progress_pct === 'number' ? goal.progress_pct : 0;
  const clampedProgress = Math.min(progressPct, 100);

  return (
    <div className="card rounded-2xl p-3 space-y-2">
      <div className="flex items-start gap-2">
        <div className="icon-chip bg-violet-100 text-violet-700 mt-0.5">
          <Target size={18} />
        </div>
        <div className="flex-1 min-w-0 pl-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-ink">{goal.name}</p>
            <span className={`badge ${statusConfig.className}`}>
              {statusConfig.label}
            </span>
          </div>

          {goal.description && (
            <p className="text-xs text-ink-muted mt-0.5">{goal.description}</p>
          )}

          <div className="progress-track mt-2.5">
            <div
              className={`progress-fill ${statusConfig.fill}`}
              style={{ width: `${clampedProgress}%` }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5 text-xs text-ink-muted">
            <span className="num">
              <span className="text-ink font-semibold">
                {formatCurrency(goal.progress_amount ?? 0)}
              </span>
              {' / '}
              {formatCurrency(goal.target_amount ?? 0)}
              {` (${progressPct}%)`}
            </span>
            {goal.target_date && <span>by {goal.target_date}</span>}
            {goal.bucket_name && <span>Bucket: {goal.bucket_name}</span>}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-ink-muted">
            <span className="num">
              Needs {formatCurrency(goal.required_monthly ?? 0)}/mo · Planned{' '}
              {formatCurrency(goal.planned_monthly ?? 0)}/mo
            </span>
            {goal.status === 'behind' && (goal.shortfall ?? 0) > 0 && (
              <span className="num font-semibold text-warning-700">
                Shortfall {formatCurrency(goal.shortfall)}
              </span>
            )}
            {goal.estimated_completion_month ? (
              <span data-testid="goal-estimate">
                Estimated completion: {formatMonthYear(goal.estimated_completion_month)}
              </span>
            ) : goal.estimate_beyond_window ? (
              <span data-testid="goal-estimate">
                Estimated completion: not within 5 years
              </span>
            ) : null}
          </div>

          {goal.after_goal ? (
            <p
              className="mt-1 break-words text-[11px] text-ink-muted"
              data-testid="goal-after"
            >
              Starts after {goal.after_goal}
              {goal.estimated_start_month
                ? ` (${formatMonthYear(goal.estimated_start_month)})`
                : ''}
            </p>
          ) : goal.estimate_source === 'fund' && goal.estimated_start_month ? (
            <p
              className="mt-1 text-[11px] text-ink-muted"
              data-testid="goal-after"
            >
              Starts {formatMonthYear(goal.estimated_start_month)}
            </p>
          ) : null}

          {goal.contribution_item && (
            <p
              className="text-[11px] text-ink-muted mt-1"
              data-testid="goal-contribution-item"
            >
              Funded by plan cost: {goal.contribution_item.label}
            </p>
          )}

          {goal.funds_assumption_key && (
            <p className="text-[11px] text-ink-muted mt-1">
              Funds: {goal.funds_assumption_key}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-2">
        <button
          type="button"
          className="btn-secondary min-h-[44px] gap-1.5 px-4 text-sm"
          aria-label={`Edit goal ${goal.name}`}
          onClick={() => onEdit(goal)}
          disabled={isRemoving}
        >
          <Pencil size={16} aria-hidden="true" />
          Edit
        </button>
        <button
          type="button"
          className="btn-secondary min-h-[44px] gap-1.5 px-4 text-sm text-danger-700 hover:bg-danger-50"
          aria-label={`Remove goal ${goal.name}`}
          onClick={() => onRemove(goal.name)}
          disabled={isRemoving}
        >
          {isRemoving ? (
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          ) : (
            <Trash2 size={16} aria-hidden="true" />
          )}
          Delete
        </button>
      </div>
    </div>
  );
}

function GoalsListSection({ title, goals, removing, onRemove, onEdit }) {
  if (!goals || goals.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="eyebrow">{title}</p>
      <div className="grid gap-3 md:grid-cols-2">
        {goals.map((g) => (
          <GoalCard
            key={g.id || g.name}
            goal={g}
            removing={removing}
            onRemove={onRemove}
            onEdit={onEdit}
          />
        ))}
      </div>
    </div>
  );
}

export function GoalsPage() {
  const goalsQuery = useGoals();
  const goals = goalsQuery.data?.goals ?? [];
  const buckets = useBuckets().data?.buckets ?? [];
  const costItems = (useAssumptions().data?.items ?? []).filter(
    (g) => g.assumption_type === 'cost'
  );
  const createMutation = useCreateGoal();
  const deleteMutation = useDeleteGoal();
  const isSaving = createMutation.isPending;

  const [submitError, setSubmitError] = useState(null);
  const [deletingGoalName, setDeletingGoalName] = useState(null);

  // Form states:
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [horizon, setHorizon] = useState('short'); // 'short' | 'long'
  const [targetDate, setTargetDate] = useState('');
  const [description, setDescription] = useState('');
  const [bucketName, setBucketName] = useState('');
  const [monthlyContribution, setMonthlyContribution] = useState('');
  const [contributionAssumptionKey, setContributionAssumptionKey] = useState('');
  const [afterGoal, setAfterGoal] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const formRef = useRef(null);

  const resetForm = useCallback(() => {
    setName('');
    setTargetAmount('');
    setHorizon('short');
    setTargetDate('');
    setDescription('');
    setBucketName('');
    setMonthlyContribution('');
    setContributionAssumptionKey('');
    setAfterGoal('');
    setIsEditing(false);
  }, []);

  const handleEdit = useCallback((goal) => {
    setName(goal.name);
    setTargetAmount(String(goal.target_amount));
    setHorizon(goal.horizon || 'short');
    setTargetDate(goal.target_date ?? '');
    setDescription(goal.description ?? '');
    setBucketName(goal.bucket_name ?? '');
    setMonthlyContribution(
      goal.monthly_contribution > 0 ? String(goal.monthly_contribution) : ''
    );
    setContributionAssumptionKey(goal.contribution_assumption_key ?? '');
    setAfterGoal(goal.after_goal ?? '');
    setIsEditing(true);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const queryError = goalsQuery.isError
    ? goalsQuery.error instanceof Error
      ? goalsQuery.error.message
      : 'Failed to load goals'
    : null;

  const displayError = submitError ?? queryError;

  const handleSubmit = useCallback(async () => {
    const trimmedName = name.trim();
    const parsedTarget = Number(targetAmount);
    const parsedMonthly =
      monthlyContribution === ''
        ? isEditing
          ? 0
          : undefined
        : Number(monthlyContribution);

    if (!trimmedName || targetAmount === '' || Number.isNaN(parsedTarget)) {
      return;
    }

    if (parsedMonthly !== undefined && (Number.isNaN(parsedMonthly) || parsedMonthly < 0)) {
      setSubmitError('Monthly contribution must be a number of 0 or more');
      return;
    }

    setSubmitError(null);
    try {
      await createMutation.mutateAsync({
        name: trimmedName,
        target_amount: parsedTarget,
        horizon,
        target_date: targetDate || undefined,
        description: description.trim() || undefined,
        bucket_name: bucketName || undefined,
        monthly_contribution: contributionAssumptionKey ? undefined : parsedMonthly,
        contribution_assumption_key: contributionAssumptionKey || (isEditing ? '' : undefined),
        after_goal: afterGoal || (isEditing ? '' : undefined),
      });
      resetForm();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save goal');
    }
  }, [
    name,
    targetAmount,
    horizon,
    targetDate,
    description,
    bucketName,
    monthlyContribution,
    contributionAssumptionKey,
    afterGoal,
    isEditing,
    resetForm,
    createMutation,
  ]);

  const handleDelete = useCallback(
    async (goalName) => {
      setDeletingGoalName(goalName);
      setSubmitError(null);
      try {
        await deleteMutation.mutateAsync(goalName);
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : 'Failed to remove goal');
      } finally {
        setDeletingGoalName(null);
      }
    },
    [deleteMutation]
  );

  const [search, setSearch] = useState('');
  const trimmedSearch = search.trim().toLowerCase();

  const filteredGoals = trimmedSearch
    ? goals.filter((g) =>
        [g.name, g.description, g.bucket_name, g.after_goal].some((val) =>
          (val ?? '').toLowerCase().includes(trimmedSearch)
        )
      )
    : goals;

  const shortGoals = filteredGoals.filter((g) => g.horizon === 'short');
  const longGoals = filteredGoals.filter((g) => g.horizon === 'long');

  return (
    <div className="space-y-3">
      <div>
        <h2 className="section-title">Goals</h2>
        <p className="text-sm text-ink-muted mt-0.5">
          Short-term and long-term savings targets
        </p>
      </div>

      {displayError && (
        <div className="alert-error flex items-center justify-between gap-3" role="alert">
          <span>{displayError}</span>
          {queryError && !submitError && (
            <button
              type="button"
              onClick={() => goalsQuery.refetch()}
              disabled={goalsQuery.isFetching}
              className="btn-secondary shrink-0 px-3 text-xs"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {goalsQuery.isPending && (
        <div
          role="status"
          aria-busy="true"
          aria-label="Loading goals"
          className="grid gap-3 md:grid-cols-2"
        >
          {[0, 1].map((idx) => (
            <div key={idx} className="card rounded-2xl p-3 flex items-start gap-3">
              <div className="mt-0.5 h-10 w-10 shrink-0 rounded-2xl bg-surface-muted animate-pulse" />
              <div className="flex-1 space-y-2.5">
                <div className="h-3.5 w-1/2 rounded-full bg-surface-muted animate-pulse" />
                <div className="h-2.5 w-full rounded-full bg-surface-muted animate-pulse" />
                <div className="h-3 w-3/4 rounded-full bg-surface-muted animate-pulse" />
                <div className="h-3 w-2/3 rounded-full bg-surface-muted animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      )}

      {goals.length > 0 && (
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
            placeholder="Search goals"
            aria-label="Search goals"
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

      {trimmedSearch && filteredGoals.length === 0 && (
        <div className="card p-4 text-center text-sm text-ink-muted">
          Nothing matches "{search.trim()}".
        </div>
      )}

      <GoalsListSection
        title="Short-term"
        goals={shortGoals}
        removing={deletingGoalName}
        onRemove={handleDelete}
        onEdit={handleEdit}
      />

      <GoalsListSection
        title="Long-term"
        goals={longGoals}
        removing={deletingGoalName}
        onRemove={handleDelete}
        onEdit={handleEdit}
      />

      {goalsQuery.isSuccess && goals.length === 0 && !displayError && (
        <div className="card p-4 text-center text-sm text-ink-muted">
          No goals set yet.
        </div>
      )}

      {/* Goal form */}
      <div ref={formRef} className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-ink">
            {isEditing ? `Edit goal: ${name}` : 'Add a goal'}
          </p>
          {isEditing && (
            <button
              type="button"
              onClick={resetForm}
              className="btn-ghost px-3"
            >
              Cancel
            </button>
          )}
        </div>

        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input text-sm"
        />

        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Target amount"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            className="input num flex-1 min-w-0 text-sm"
          />
          <select
            value={horizon}
            onChange={(e) => setHorizon(e.target.value)}
            className="input w-auto text-sm"
            aria-label="Goal horizon"
          >
            <option value="short">Short-term</option>
            <option value="long">Long-term</option>
          </select>
        </div>

        <input
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          className="input text-sm"
          aria-label="Target date (optional)"
        />

        <input
          type="text"
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input text-sm"
        />

        <select
          value={contributionAssumptionKey}
          onChange={(e) => setContributionAssumptionKey(e.target.value)}
          className="input text-sm"
          aria-label="Funded by plan cost (monthly saving)"
        >
          <option value="">Funded by plan cost (monthly saving): none</option>
          {costItems.map((g) => (
            <option key={g.key} value={g.key}>
              {g.label}
            </option>
          ))}
        </select>

        {!contributionAssumptionKey && (
          <input
            type="number"
            min="0"
            placeholder="Monthly contribution (optional)"
            value={monthlyContribution}
            onChange={(e) => setMonthlyContribution(e.target.value)}
            className="input num text-sm"
          />
        )}

        <label className="block space-y-1">
          <span className="text-xs font-semibold text-ink-soft">
            Starts after goal
          </span>
          <select
            value={afterGoal}
            onChange={(e) => setAfterGoal(e.target.value)}
            className="input text-sm"
            aria-label="Starts after goal"
          >
            <option value="">None (starts right away)</option>
            {goals
              .filter((g) => g.name !== name.trim())
              .map((g) => (
                <option key={g.id || g.name} value={g.name}>
                  {g.name}
                </option>
              ))}
          </select>
          <span className="block text-xs text-ink-muted">
            Goals sharing a fund are funded in order: this one gets nothing until that goal is fully funded.
          </span>
        </label>

        <div className="flex gap-2">
          <select
            value={bucketName}
            onChange={(e) => setBucketName(e.target.value)}
            className="input flex-1 min-w-0 text-sm"
            aria-label="Linked bucket (optional)"
          >
            <option value="">No linked bucket</option>
            {buckets.map((b) => (
              <option key={b.id || b.name} value={b.name}>
                {b.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!name.trim() || !targetAmount || isSaving}
            className="btn-primary btn-icon"
            aria-label={isEditing ? 'Save goal' : 'Add goal'}
          >
            {isSaving ? (
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
