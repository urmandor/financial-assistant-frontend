import React from 'react';
import { Plus } from 'lucide-react';
import { useTransactions } from '../../hooks/useQueries';
import { SectionHeader } from '../common/SectionHeader';
import { ErrorMessage, formatError } from '../common/ErrorMessage';
import { TransactionRow } from '../common/TransactionRow';

export function RecentTransactionsCard({ onAdd, onEdit }) {
  const txQuery = useTransactions(5);
  const transactions = txQuery.data?.transactions ?? [];

  return (
    <section
      className="space-y-3"
      aria-label="Recent activity"
      data-testid="home-recent"
    >
      <SectionHeader title="Recent activity" to="/activity" />

      {txQuery.isError && (
        <ErrorMessage
          message={formatError(txQuery.error, 'Failed to load transactions')}
          onRetry={() => txQuery.refetch()}
          busy={txQuery.isFetching}
        />
      )}

      {txQuery.isPending ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 5 }).map((_, n) => (
            <div
              key={n}
              className="card rounded-2xl p-3 flex items-center gap-3 h-[68px]"
            >
              <div className="h-10 w-10 shrink-0 rounded-2xl bg-surface-muted animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-2/3 rounded-full bg-surface-muted animate-pulse" />
                <div className="h-3 w-1/2 rounded-full bg-surface-muted animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="card px-4 py-10 text-center text-sm text-ink-muted">
          <p className="text-base font-semibold text-ink">
            No transactions yet
          </p>
          <p className="mt-1">
            Add your first expense, or send a receipt in Chat.
          </p>
          <button
            type="button"
            className="btn-primary mt-4"
            onClick={onAdd}
          >
            <Plus size={18} aria-hidden="true" />
            Add expense
          </button>
        </div>
      ) : (
        <ul className="card divide-y divide-line p-1">
          {transactions.map((tx) => (
            <li key={tx.id}>
              <TransactionRow
                transaction={tx}
                onEdit={onEdit}
                showDate={true}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
