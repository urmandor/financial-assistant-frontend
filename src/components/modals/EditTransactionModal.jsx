import React, { useState, useId, useEffect } from 'react';
import { Trash2, Check, LoaderCircle } from 'lucide-react';
import { Modal } from '../layout/Modal';
import { TypeSelector } from '../common/TypeSelector';
import {
  useUpdateTransaction,
  useDeleteTransaction,
  useCategories,
  useCreateRule,
  useApplyRules,
} from '../../hooks/useQueries';
import { useToast } from '../../hooks/useToast';
import { parseNumericInput, formatAmount } from '../../utils/formatters';

export function EditTransactionModal({ transaction, open, onClose, onUpdated, onDeleted }) {
  const formId = useId();
  const toast = useToast();
  const updateMutation = useUpdateTransaction();
  const deleteMutation = useDeleteTransaction();
  const createRuleMutation = useCreateRule();
  const applyRulesMutation = useApplyRules();
  const categories = useCategories().data?.categories ?? [];

  const [kind, setKind] = useState('expense');
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [createRule, setCreateRule] = useState(false);
  const [rulePattern, setRulePattern] = useState('');
  const [applyExisting, setApplyExisting] = useState(false);
  const [applyScope, setApplyScope] = useState('uncategorized');
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (transaction) {
      setKind(transaction.kind ?? 'expense');
      setAmount(String(transaction.amount ?? ''));
      setMerchant(transaction.merchant ?? '');
      setCategory(transaction.category ?? '');
      setDate(transaction.date ? transaction.date.slice(0, 10) : '');
      setNotes(transaction.notes ?? '');
      setIsConfirmingDelete(false);
      setCreateRule(false);
      setRulePattern(transaction.merchant ?? '');
      setErrorMsg(null);
    }
  }, [transaction]);

  const isBusy =
    updateMutation.isPending ||
    deleteMutation.isPending ||
    createRuleMutation.isPending ||
    applyRulesMutation.isPending;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const parsedAmount = parseNumericInput(amount);
    if (!parsedAmount) {
      setErrorMsg('Please enter a valid amount');
      return;
    }
    if (!merchant.trim()) {
      setErrorMsg('Please enter a merchant name');
      return;
    }

    setErrorMsg(null);

    try {
      const patch = {
        kind,
        amount: parsedAmount,
        merchant: merchant.trim(),
        category: category.trim() || 'Uncategorized',
        date,
        notes: notes.trim() || null,
      };

      const updated = await updateMutation.mutateAsync({
        id: transaction.id,
        patch,
      });

      if (createRule && rulePattern.trim()) {
        const cat = category.trim() || 'Uncategorized';
        await createRuleMutation.mutateAsync({
          merchant_pattern: rulePattern.trim().toLowerCase(),
          category: cat,
        });

        if (applyExisting) {
          await applyRulesMutation.mutateAsync({
            scope: applyScope,
            only: {
              merchant_pattern: rulePattern.trim().toLowerCase(),
              category: cat,
            },
          });
        }
      }

      toast.show({ message: 'Transaction updated' });
      onUpdated?.(updated);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(transaction.id);
      toast.show({
        message: `Deleted ${transaction.merchant} (${formatAmount(transaction.amount)})`,
      });
      onDeleted?.(transaction.id);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  if (!transaction) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit transaction"
      dismissible={!isBusy}
    >
      <div className="space-y-4">
        <TypeSelector value={kind} onChange={setKind} disabled={isBusy} />

        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div role="alert" className="alert-error">
              {errorMsg}
            </div>
          )}

          <div>
            <label htmlFor={`${formId}-amount`} className="eyebrow mb-1.5 block">
              Amount (PKR)
            </label>
            <input
              id={`${formId}-amount`}
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input text-2xl font-bold"
              disabled={isBusy}
            />
          </div>

          <div>
            <label htmlFor={`${formId}-merchant`} className="eyebrow mb-1.5 block">
              Merchant / Description
            </label>
            <input
              id={`${formId}-merchant`}
              type="text"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              className="input"
              disabled={isBusy}
            />
          </div>

          <div>
            <label htmlFor={`${formId}-category`} className="eyebrow mb-1.5 block">
              Category
            </label>
            <input
              id={`${formId}-category`}
              type="text"
              list={`${formId}-categories`}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input"
              disabled={isBusy || kind === 'transfer'}
            />
            <datalist id={`${formId}-categories`}>
              {categories.map((c) => {
                const name = typeof c === 'string' ? c : c.name;
                return <option key={name} value={name} />;
              })}
            </datalist>
          </div>

          <div>
            <label htmlFor={`${formId}-date`} className="eyebrow mb-1.5 block">
              Date
            </label>
            <input
              id={`${formId}-date`}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input"
              disabled={isBusy}
            />
          </div>

          <div>
            <label htmlFor={`${formId}-notes`} className="eyebrow mb-1.5 block">
              Notes
            </label>
            <textarea
              id={`${formId}-notes`}
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input rounded-2xl py-2"
              disabled={isBusy}
            />
          </div>

          {/* Rule creation checkbox */}
          <div className="rounded-2xl border border-line bg-surface-muted p-3 space-y-2">
            <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-ink-soft">
              <input
                type="checkbox"
                checked={createRule}
                onChange={(e) => setCreateRule(e.target.checked)}
                className="h-4 w-4 rounded accent-primary-600"
              />
              <span>
                Always categorize merchants matching this as{' '}
                <strong>{category || 'this category'}</strong>
              </span>
            </label>
            {createRule && (
              <div className="space-y-2 pt-1">
                <input
                  type="text"
                  value={rulePattern}
                  onChange={(e) => setRulePattern(e.target.value)}
                  placeholder="Merchant keyword (e.g. Metro)"
                  className="input text-xs"
                />
                <label className="flex cursor-pointer items-center gap-2 text-xs text-ink-muted">
                  <input
                    type="checkbox"
                    checked={applyExisting}
                    onChange={(e) => setApplyExisting(e.target.checked)}
                    className="h-3.5 w-3.5 rounded accent-primary-600"
                  />
                  <span>Apply to existing transactions</span>
                </label>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isBusy || !amount || !merchant}
            className="btn-primary w-full"
          >
            {updateMutation.isPending ? (
              <>
                <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />
                Saving...
              </>
            ) : (
              <>
                <Check size={18} aria-hidden="true" />
                Save changes
              </>
            )}
          </button>
        </form>

        {/* Delete confirmation section */}
        <div className="border-t border-line pt-3">
          {isConfirmingDelete ? (
            <div className="space-y-2 text-center">
              <p className="text-sm font-semibold text-danger-700">
                Are you sure you want to delete this transaction?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isBusy}
                  className="btn-danger flex-1"
                >
                  Confirm Delete
                </button>
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(false)}
                  disabled={isBusy}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsConfirmingDelete(true)}
              disabled={isBusy}
              className="btn-ghost w-full text-danger-600 hover:bg-danger-50 hover:text-danger-700"
            >
              <Trash2 size={16} aria-hidden="true" />
              Delete transaction
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
