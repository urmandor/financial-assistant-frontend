import React from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { getCategoryColor } from '../../utils/categories';
import { formatCurrency } from '../../utils/formatters';

export function TransactionRow({ transaction: tx, onEdit, showDate = false }) {
  const color = getCategoryColor(tx.category);
  const amountNum = Number(tx.amount);
  const kind = tx.kind ?? 'expense';
  const isIncome = kind === 'income';
  const isTransfer = kind === 'transfer';
  const isRefund = kind === 'expense' && amountNum < 0;

  return (
    <button
      type="button"
      onClick={() => onEdit?.(tx)}
      aria-label={`Edit ${tx.merchant}`}
      data-testid="tx-row"
      className="flex min-h-[64px] w-full min-w-0 items-center gap-3 rounded-2xl px-3 py-2 text-left transition-colors hover:bg-primary-50/60 motion-safe:active:scale-[0.99]"
    >
      <span
        className="icon-chip text-base font-bold"
        style={{ backgroundColor: color.soft, color: color.text }}
        aria-hidden="true"
        data-testid={isTransfer ? 'transfer-icon' : undefined}
      >
        {isTransfer ? (
          <ArrowLeftRight size={18} />
        ) : (
          (tx.merchant?.trim().charAt(0) || '?').toUpperCase()
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate font-semibold text-ink">
            {tx.merchant}
          </span>
          <span
            data-testid="tx-amount"
            className={`num shrink-0 font-bold ${
              tx.person && !isTransfer
                ? 'text-ink-muted'
                : isIncome || isRefund
                ? 'text-success-700'
                : isTransfer
                ? 'text-ink-muted'
                : 'text-ink'
            }`}
          >
            {isIncome ? '+' : ''}
            {formatCurrency(amountNum, { decimals: 2 })}
          </span>
        </span>

        <span className="mt-1 flex min-w-0 items-center gap-2">
          {!isTransfer && (
            <span
              className="max-w-[45%] shrink-0 truncate rounded-full px-2 py-0.5 text-[11px] font-semibold"
              style={{ backgroundColor: color.soft, color: color.text }}
            >
              {tx.category}
            </span>
          )}
          {isRefund && (
            <span className="badge badge-success shrink-0">Refund</span>
          )}
          {isIncome && !tx.person && (
            <span className="badge badge-success shrink-0">Income</span>
          )}
          {isTransfer && (
            <span className="badge badge-neutral shrink-0">Transfer</span>
          )}
          {tx.person && !isTransfer && (
            <span
              className="badge badge-warning shrink-0"
              data-testid="tx-person"
              title={
                isIncome
                  ? `Received from ${tx.person}, not your income`
                  : `Paid to or for ${tx.person}, not your own spending`
              }
            >
              {isIncome ? `From ${tx.person}` : `For ${tx.person}`}
            </span>
          )}
          {showDate && tx.date && (
            <span className="num shrink-0 text-xs text-ink-muted">
              {tx.date}
            </span>
          )}
          {tx.notes && (
            <span className="truncate text-xs text-ink-muted">
              {tx.notes}
            </span>
          )}
        </span>
      </span>
    </button>
  );
}
