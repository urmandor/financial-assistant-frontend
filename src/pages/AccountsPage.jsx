import React, { useState } from 'react';
import { Plus, Trash2, Wallet, CreditCard, Landmark } from 'lucide-react';
import {
  useAccounts,
  useCreateAccount,
  useUpdateAccount,
  useDeleteAccount,
} from '../hooks/useQueries';
import { ErrorMessage, formatError } from '../components/common/ErrorMessage';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { formatCurrency, parseNumericInput } from '../utils/formatters';
import { useToast } from '../hooks/useToast';

const ACCOUNT_TYPES = [
  { value: 'checking', label: 'Bank Account', icon: Landmark },
  { value: 'cash', label: 'Cash / Physical', icon: Wallet },
  { value: 'credit', label: 'Credit Card', icon: CreditCard },
  { value: 'savings', label: 'Savings', icon: Landmark },
];

export function AccountsPage() {
  const toast = useToast();
  const accountsQuery = useAccounts();
  const createMutation = useCreateAccount();
  const deleteMutation = useDeleteAccount();

  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('checking');
  const [balance, setBalance] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);

  const accounts = accountsQuery.data?.accounts ?? [];

  const handleCreate = async (e) => {
    e.preventDefault();
    const bal = parseNumericInput(balance) || 0;
    if (!name.trim()) {
      setErrorMsg('Please enter an account name');
      return;
    }
    setErrorMsg(null);
    try {
      await createMutation.mutateAsync({
        name: name.trim(),
        type,
        current_balance: bal,
      });
      toast.show({ message: `Account "${name}" created!` });
      setName('');
      setBalance('');
      setIsAdding(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create account');
    }
  };

  const handleDelete = async (id, accName) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.show({ message: `Deleted ${accName}` });
    } catch {
      toast.show({ message: 'Failed to delete account' });
    }
  };

  if (accountsQuery.isPending) {
    return <LoadingSkeleton label="Loading accounts" rows={3} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-ink">Accounts</h2>
          <p className="text-xs text-ink-muted">Manage banks, cards, and cash wallets.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsAdding((prev) => !prev);
            setErrorMsg(null);
          }}
          className="btn-primary"
        >
          <Plus size={16} aria-hidden="true" />
          Add account
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleCreate} className="card p-4 space-y-3">
          <h3 className="text-sm font-bold text-ink">New account</h3>
          {errorMsg && <div className="alert-error text-xs">{errorMsg}</div>}

          <div className="space-y-3">
            <div>
              <label className="eyebrow mb-1 block">Account name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Meezan Bank, HBL, Cash Wallet"
                className="input"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="eyebrow mb-1 block">Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="input"
                >
                  {ACCOUNT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="eyebrow mb-1 block">Current balance (PKR)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  placeholder="0.00"
                  className="input font-semibold"
                />
              </div>
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
              {createMutation.isPending ? 'Saving...' : 'Save account'}
            </button>
          </div>
        </form>
      )}

      {accountsQuery.isError && (
        <ErrorMessage
          message={formatError(accountsQuery.error, 'Failed to load accounts')}
          onRetry={() => accountsQuery.refetch()}
          busy={accountsQuery.isFetching}
        />
      )}

      {accounts.length === 0 && !isAdding && (
        <div className="card py-10 text-center space-y-2">
          <p className="text-sm font-semibold text-ink">No accounts configured</p>
          <p className="text-xs text-ink-muted">
            Add accounts to track payment methods and transfers.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {accounts.map((acc) => {
          const typeObj =
            ACCOUNT_TYPES.find((t) => t.value === acc.type) ?? ACCOUNT_TYPES[0];
          const Icon = typeObj.icon;
          const bal = Number(acc.current_balance) || 0;

          return (
            <div key={acc.id} className="card p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="icon-chip h-10 w-10 bg-primary-50 text-primary-600 rounded-2xl">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-ink">{acc.name}</h3>
                  <p className="text-xs text-ink-muted capitalize">{typeObj.label}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="num font-bold text-sm text-ink">
                  {formatCurrency(bal)}
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(acc.id, acc.name)}
                  className="icon-btn h-8 w-8 text-ink-muted hover:text-danger-600"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
