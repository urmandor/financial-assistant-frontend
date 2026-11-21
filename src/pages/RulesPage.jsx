import React, { useState } from 'react';
import { Plus, Trash2, Check, Play, LoaderCircle } from 'lucide-react';
import {
  useRules,
  useCategories,
  useCreateRule,
  useDeleteRule,
  useApplyRules,
} from '../hooks/useQueries';
import { ErrorMessage, formatError } from '../components/common/ErrorMessage';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { useToast } from '../hooks/useToast';

export function RulesPage() {
  const toast = useToast();
  const rulesQuery = useRules();
  const categoriesQuery = useCategories();
  const createMutation = useCreateRule();
  const deleteMutation = useDeleteRule();
  const applyMutation = useApplyRules();

  const [isAdding, setIsAdding] = useState(false);
  const [pattern, setPattern] = useState('');
  const [category, setCategory] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [applyResult, setApplyResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const rules = rulesQuery.data?.rules ?? [];
  const categories = categoriesQuery.data?.categories ?? [];

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!pattern.trim() || !category.trim()) {
      setErrorMsg('Please enter both a merchant pattern and category');
      return;
    }
    setErrorMsg(null);
    try {
      await createMutation.mutateAsync({
        merchant_pattern: pattern.trim().toLowerCase(),
        category: category.trim(),
      });
      toast.show({ message: `Rule added for "${pattern}"` });
      setPattern('');
      setCategory('');
      setIsAdding(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save rule');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.show({ message: 'Rule removed' });
    } catch {
      toast.show({ message: 'Failed to delete rule' });
    }
  };

  const handleApplyAll = async () => {
    setIsApplying(true);
    setApplyResult(null);
    try {
      const res = await applyMutation.mutateAsync({ scope: 'all' });
      setApplyResult(res);
      toast.show({
        message: `Applied rules: updated ${res.changed ?? 0} transactions`,
      });
    } catch (err) {
      toast.show({
        message: err instanceof Error ? err.message : 'Failed to apply rules',
      });
    } finally {
      setIsApplying(false);
    }
  };

  if (rulesQuery.isPending) {
    return <LoadingSkeleton label="Loading rules" rows={5} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-ink">Categorization Rules</h2>
          <p className="text-xs text-ink-muted">
            Automatically assign categories when importing or adding transactions.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleApplyAll}
            disabled={isApplying || rules.length === 0}
            className="btn-secondary text-xs"
            title="Re-run all rules across all past transactions"
          >
            {isApplying ? (
              <LoaderCircle size={14} className="animate-spin" />
            ) : (
              <Play size={14} />
            )}
            Apply to past transactions
          </button>
          <button
            type="button"
            onClick={() => {
              setIsAdding((prev) => !prev);
              setErrorMsg(null);
            }}
            className="btn-primary"
          >
            <Plus size={16} aria-hidden="true" />
            Add rule
          </button>
        </div>
      </div>

      {applyResult && (
        <div className="card p-3 bg-success-50 border-success-200 text-success-800 text-xs">
          Applied rules: <strong>{applyResult.changed ?? 0}</strong> transactions
          updated (matched {applyResult.matched ?? 0}).
        </div>
      )}

      {isAdding && (
        <form onSubmit={handleCreate} className="card p-4 space-y-3">
          <h3 className="text-sm font-bold text-ink">New auto-categorize rule</h3>
          {errorMsg && <div className="alert-error text-xs">{errorMsg}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="eyebrow mb-1 block">If merchant contains</label>
              <input
                type="text"
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                placeholder="e.g. uber, netflix, careem"
                className="input"
                autoFocus
              />
            </div>
            <div>
              <label className="eyebrow mb-1 block">Assign category</label>
              <input
                type="text"
                list="rule-categories"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Select category"
                className="input"
              />
              <datalist id="rule-categories">
                {categories.map((c) => {
                  const name = typeof c === 'string' ? c : c.name;
                  return <option key={name} value={name} />;
                })}
              </datalist>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="btn-primary text-xs"
            >
              {createMutation.isPending ? 'Saving...' : 'Save rule'}
            </button>
          </div>
        </form>
      )}

      {rulesQuery.isError && (
        <ErrorMessage
          message={formatError(rulesQuery.error, 'Failed to load rules')}
          onRetry={() => rulesQuery.refetch()}
          busy={rulesQuery.isFetching}
        />
      )}

      {rules.length === 0 && !isAdding && (
        <div className="card py-10 text-center space-y-2">
          <p className="text-sm font-semibold text-ink">No rules configured</p>
          <p className="text-xs text-ink-muted">
            Add rules to automatically categorize repeat transactions by merchant keyword.
          </p>
        </div>
      )}

      <div className="card divide-y divide-line p-1">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className="flex items-center justify-between p-3 gap-3"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">
                "{rule.merchant_pattern}"
              </p>
              <p className="text-xs text-ink-muted">
                Assigns to{' '}
                <strong className="text-primary-700 font-semibold">
                  {rule.category}
                </strong>
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleDelete(rule.id)}
              className="icon-btn h-8 w-8 text-ink-muted hover:text-danger-600 shrink-0"
              title="Delete rule"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
