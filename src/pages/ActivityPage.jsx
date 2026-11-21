import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CloudUpload,
  Search,
  X,
  Plus,
  Loader2,
  ArrowLeftRight,
} from 'lucide-react';
import {
  useTransactionWindow,
  usePeople,
  useImportCsv,
  useUndoDeleteTransaction,
} from '../hooks/useQueries';
import { useToast } from '../hooks/useToast';
import { Modal } from '../components/layout/Modal';
import { EditTransactionModal } from '../components/modals/EditTransactionModal';
import { TransactionRow } from '../components/common/TransactionRow';
import { formatCurrency } from '../utils/formatters';
import {
  getCurrentMonth,
  getKarachiToday,
  addDays,
} from '../utils/dates';
import { getCategoryColor } from '../utils/categories';

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

const SHORT_MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const KIND_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'expense', label: 'Expenses' },
  { value: 'income', label: 'Income' },
  { value: 'transfer', label: 'Transfers' },
];

const EMPTY_KIND_LABELS = {
  expense: 'No expenses',
  income: 'No income',
  transfer: 'No transfers',
};

function formatMonthTitle(monthStr) {
  const [year, month] = monthStr.split('-').map(Number);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

function shiftMonth(monthStr, delta) {
  const [year, month] = monthStr.split('-').map(Number);
  const total = month - 1 + delta;
  const newYear = year + Math.floor(total / 12);
  const newMonth = (((total % 12) + 12) % 12) + 1;
  return `${newYear}-${String(newMonth).padStart(2, '0')}`;
}

function getMonthDateRange(monthStr) {
  const [year, month] = monthStr.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    from: `${year}-${String(month).padStart(2, '0')}-01`,
    to: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
  };
}

function formatDayHeader(dateStr, today) {
  if (dateStr === today) return 'Today';
  if (dateStr === addDays(today, -1)) return 'Yesterday';
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dayName = WEEKDAY_NAMES[dt.getUTCDay()];
  const monthName = SHORT_MONTH_NAMES[dt.getUTCMonth()];
  const base = `${dayName} ${dt.getUTCDate()} ${monthName}`;
  return dateStr.slice(0, 4) === today.slice(0, 4)
    ? base
    : `${base} ${dt.getUTCFullYear()}`;
}

function formatPersonBalance(person, balance) {
  const rounded = Math.round(balance * 100) / 100;
  if (rounded === 0) return `Settled with ${person}`;
  const amountStr = Math.abs(rounded).toLocaleString('en-US');
  return rounded > 0
    ? `${person} owes you PKR ${amountStr}`
    : `You owe ${person} PKR ${amountStr}`;
}

function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debounced;
}

function groupTransactionsByDate(transactions) {
  const groups = [];
  for (const tx of transactions) {
    let last = groups[groups.length - 1];
    if (!last || last.date !== tx.date) {
      last = { date: tx.date, rows: [], spent: 0 };
      groups.push(last);
    }
    last.rows.push(tx);
    const kind = tx.kind ?? 'expense';
    if (kind === 'expense' && !tx.person) {
      last.spent += Number(tx.amount);
    }
  }
  return groups;
}



function CsvImportForm() {
  const importMutation = useImportCsv();
  const isBusy = importMutation.isPending;
  const [isDragging, setIsDragging] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const fileInputRef = useRef(null);

  const handleUpload = useCallback(
    async (file) => {
      if (isBusy) return;
      setErrorMsg(null);
      setResult(null);
      try {
        const res = await importMutation.mutateAsync(file);
        setResult(res);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Failed to import CSV');
      }
    },
    [isBusy, importMutation]
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleUpload(file);
    },
    [handleUpload]
  );

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragging(false);
        }}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`cursor-pointer rounded-3xl border-2 border-dashed p-5 text-center transition-colors ${
          isDragging
            ? 'border-primary-500 bg-primary-50'
            : 'border-primary-200 bg-white/70 hover:border-primary-400 hover:bg-primary-50/60'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          data-testid="csv-input"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
            e.target.value = '';
          }}
        />
        <span className="icon-chip mx-auto mb-2 bg-primary-100 text-primary-600">
          {isBusy ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <CloudUpload size={20} />
          )}
        </span>
        <p className="text-sm font-medium text-ink-soft">
          {isBusy
            ? 'Importing…'
            : 'Drop a CSV of transactions here, or tap to browse'}
        </p>
      </div>

      {errorMsg && (
        <div className="alert-error" role="alert">
          {errorMsg}
        </div>
      )}

      {result && (
        <div
          className="rounded-2xl bg-surface-muted p-4 text-sm text-ink-soft"
          role="status"
        >
          <p>
            Imported{' '}
            <span className="font-bold text-success-700">
              {result.inserted}
            </span>{' '}
            transactions, skipped{' '}
            <span className="font-bold text-warning-700">
              {result.skipped}
            </span>
            .
          </p>
          {result.errors && result.errors.length > 0 && (
            <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-xs text-ink-muted">
              {result.errors.map((err, idx) => (
                <li key={idx}>
                  Row {err.row}: {err.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading transactions"
      className="space-y-5"
    >
      {[0, 1].map((e) => (
        <div key={e} className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <div className="h-3.5 w-20 rounded-full bg-surface-muted animate-pulse" />
            <div className="h-3.5 w-16 rounded-full bg-surface-muted animate-pulse" />
          </div>
          <div className="card divide-y divide-line p-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex min-h-[64px] items-center gap-3 px-3 py-2"
              >
                <div className="h-10 w-10 shrink-0 rounded-2xl bg-surface-muted animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between">
                    <div className="h-3.5 w-1/3 rounded-full bg-surface-muted animate-pulse" />
                    <div className="h-3.5 w-16 rounded-full bg-surface-muted animate-pulse" />
                  </div>
                  <div className="h-3 w-1/4 rounded-full bg-surface-muted animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ActivityPage({ onOpenAdd, onEditTransaction }) {
  const currentMonth = useMemo(() => getCurrentMonth(), []);
  const today = useMemo(() => getKarachiToday(), []);

  const [month, setMonth] = useState(currentMonth);
  const [selectedKind, setSelectedKind] = useState('all');
  const [selectedPerson, setSelectedPerson] = useState('all');
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(50);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [localEditingTx, setLocalEditingTx] = useState(null);

  const people = usePeople().data?.people ?? [];
  const toast = useToast();
  const undoMutation = useUndoDeleteTransaction();

  const debouncedSearch = useDebounce(search.trim(), 300);
  const { from, to } = useMemo(() => getMonthDateRange(month), [month]);

  const queryParams = useMemo(() => ({
    from,
    to,
    limit,
    ...(selectedKind !== 'all' ? { kind: selectedKind } : {}),
    ...(debouncedSearch ? { q: debouncedSearch } : {}),
    ...(selectedPerson !== 'all' ? { person: selectedPerson } : {}),
  }), [from, to, limit, selectedKind, debouncedSearch, selectedPerson]);

  const txQuery = useTransactionWindow(queryParams);
  const data = txQuery.data ?? null;
  const transactions = data?.transactions ?? [];
  const summary = data?.summary ?? null;
  const totalCount = data?.total_count ?? transactions.length;

  const groupedDays = useMemo(
    () => groupTransactionsByDate(transactions),
    [transactions]
  );

  const canGoNextMonth = month < currentMonth;
  const resetLimit = () => setLimit(50);

  const handleMonthChange = (delta) => {
    setMonth((m) => shiftMonth(m, delta));
    resetLimit();
  };

  const hasMore = !!data && transactions.length < totalCount;
  const isLoadingMore = txQuery.isFetching && limit > 50;
  const isFiltered = selectedKind !== 'all' || debouncedSearch !== '' || selectedPerson !== 'all';

  const personEntries = useMemo(() => {
    return Object.entries(summary?.by_person ?? {}).filter(
      ([, d]) => d.spent_for !== 0 || d.repaid !== 0
    );
  }, [summary?.by_person]);

  const queryError = txQuery.isError
    ? txQuery.error instanceof Error
      ? txQuery.error.message
      : 'Failed to load transactions'
    : null;

  const handleEdit = onEditTransaction || setLocalEditingTx;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Month selector */}
        <div
          className="flex items-center gap-1 rounded-full border border-line bg-white p-0.5 shadow-card"
          role="group"
          aria-label="Month"
        >
          <button
            type="button"
            onClick={() => handleMonthChange(-1)}
            className="icon-btn"
            aria-label="Previous month"
          >
            <ChevronLeft size={20} aria-hidden="true" />
          </button>
          <span
            className="min-w-[7.25rem] text-center text-sm font-bold text-ink"
            data-testid="activity-month"
            aria-live="polite"
          >
            {formatMonthTitle(month)}
          </span>
          <button
            type="button"
            onClick={() => handleMonthChange(1)}
            disabled={!canGoNextMonth}
            className="icon-btn"
            aria-label="Next month"
          >
            <ChevronRight size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Import CSV button */}
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setIsCsvModalOpen(true)}
        >
          <CloudUpload size={18} aria-hidden="true" />
          Import CSV
        </button>
      </div>

      <div className="space-y-3">
        {/* Search input */}
        <div className="relative">
          <Search
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              resetLimit();
            }}
            maxLength={100}
            placeholder="Search merchant or notes"
            aria-label="Search transactions"
            className="input pl-11 pr-11"
            enterKeyHint="search"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                resetLimit();
              }}
              className="icon-btn absolute right-0.5 top-1/2 -translate-y-1/2"
              aria-label="Clear search"
            >
              <X size={18} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Kind filter pills */}
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Filter transactions"
        >
          {KIND_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              aria-pressed={selectedKind === opt.value}
              onClick={() => {
                setSelectedKind(opt.value);
                resetLimit();
              }}
              className={`inline-flex min-h-[40px] items-center rounded-full border px-3.5 text-sm font-semibold transition duration-150 motion-safe:active:scale-95 ${
                selectedKind === opt.value
                  ? 'border-primary-600 bg-primary-600 text-white shadow-sm'
                  : 'border-line-strong bg-white text-ink-soft hover:border-primary-200 hover:bg-primary-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Person filter pills */}
        {people.length > 0 && (
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Filter by person"
          >
            {[
              { value: 'all', label: 'Everyone' },
              { value: 'me', label: 'Me' },
              ...people.map((p) => ({ value: p.name, label: p.name })),
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={selectedPerson === item.value}
                onClick={() => {
                  setSelectedPerson(item.value);
                  resetLimit();
                }}
                className={`inline-flex min-h-[44px] items-center rounded-full border px-3.5 text-sm font-semibold transition duration-150 motion-safe:active:scale-95 ${
                  selectedPerson === item.value
                    ? 'border-warning-600 bg-warning-600 text-white shadow-sm'
                    : 'border-line-strong bg-white text-ink-soft hover:border-warning-100 hover:bg-warning-50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* People spending strip */}
      {summary && personEntries.length > 0 && (
        <p
          className="num -mt-2 break-words text-sm text-ink-muted"
          data-testid="activity-people-strip"
          aria-live="polite"
        >
          <span className="font-semibold text-ink">
            You spent {formatCurrency(summary.total_amount)}
          </span>
          {personEntries.map(([personName, personData]) => (
            <span key={personName}>
              {' · '}
              <span className="font-semibold text-warning-700">
                {formatPersonBalance(
                  personName,
                  personData.spent_for - personData.repaid
                ).replace(/^Settled with (.+)$/, '$1 settled')}
              </span>
            </span>
          ))}
        </p>
      )}

      {/* Activity summary strip */}
      {summary && (
        <p
          className="num -mt-2 text-sm text-ink-muted"
          data-testid="activity-summary"
          aria-live="polite"
        >
          {totalCount} {totalCount === 1 ? 'transaction' : 'transactions'}
          {debouncedSearch ? ` matching “${debouncedSearch}”` : ''}
          {' · '}
          <span className="font-semibold text-ink">
            {formatCurrency(summary.total_amount)}
          </span>{' '}
          spent
          {summary.income_total > 0 && (
            <>
              {' · '}
              <span className="font-semibold text-success-700">
                {formatCurrency(summary.income_total)}
              </span>{' '}
              income
            </>
          )}
        </p>
      )}

      {/* Query error */}
      {queryError && (
        <div
          className="alert-error flex items-center justify-between gap-3"
          role="alert"
        >
          <span>{queryError}</span>
          <button
            type="button"
            onClick={() => txQuery.refetch()}
            disabled={txQuery.isFetching}
            className="btn-secondary shrink-0 px-3 text-xs"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main transactions content */}
      {txQuery.isPending ? (
        <ActivitySkeleton />
      ) : summary && transactions.length === 0 ? (
        <div className="card px-4 py-12 text-center text-ink-muted">
          <p className="text-lg font-semibold text-ink">
            {debouncedSearch
              ? `Nothing matches “${debouncedSearch}”`
              : selectedKind !== 'all'
              ? `${EMPTY_KIND_LABELS[selectedKind]} in ${formatMonthTitle(month)}`
              : `No transactions in ${formatMonthTitle(month)}`}
          </p>
          <p className="mt-1 text-sm">
            {isFiltered
              ? 'Try a different search, filter or month.'
              : 'Add one with the + button, send a receipt in Chat, or import a CSV.'}
          </p>
          {!isFiltered && (
            <button
              type="button"
              className="btn-primary mt-4"
              onClick={onOpenAdd}
            >
              <Plus size={18} aria-hidden="true" />
              Add expense
            </button>
          )}
        </div>
      ) : (
        <div
          className={`space-y-5 transition-opacity ${
            txQuery.isFetching && !isLoadingMore ? 'opacity-60' : ''
          }`}
          aria-busy={txQuery.isFetching}
        >
          {groupedDays.map((group) => (
            <section
              key={group.date}
              aria-label={formatDayHeader(group.date, today)}
              data-testid="day-group"
              data-date={group.date}
            >
              <div className="mb-1.5 flex items-baseline justify-between gap-3 px-1">
                <h2 className="text-sm font-bold text-ink">
                  {formatDayHeader(group.date, today)}
                  {(group.date === today ||
                    group.date === addDays(today, -1)) && (
                    <span className="num ml-2 text-xs font-medium text-ink-muted">
                      {group.date}
                    </span>
                  )}
                </h2>
                {group.spent !== 0 && (
                  <span
                    className="num text-xs font-semibold text-ink-muted"
                    data-testid="day-total"
                  >
                    {formatCurrency(group.spent)} spent
                  </span>
                )}
              </div>

              <ul className="card divide-y divide-line p-1">
                {group.rows.map((tx) => (
                  <li key={tx.id}>
                    <TransactionRow transaction={tx} onEdit={handleEdit} />
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {/* Show more pagination button */}
          {hasMore && (
            <div className="flex justify-center">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setLimit((l) => l + 50)}
                disabled={isLoadingMore}
              >
                {isLoadingMore && (
                  <Loader2
                    size={16}
                    className="animate-spin"
                    aria-hidden="true"
                  />
                )}
                {isLoadingMore ? 'Loading' : 'Show more'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* CSV Import Modal */}
      <Modal
        open={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        title="Import CSV"
      >
        <CsvImportForm />
      </Modal>

      {/* Standalone Edit Transaction Modal (when not provided by parent) */}
      {!onEditTransaction && localEditingTx && (
        <EditTransactionModal
          transaction={localEditingTx}
          open={!!localEditingTx}
          onClose={() => setLocalEditingTx(null)}
          onDeleted={() => {
            toast.show({
              message: `Deleted ${localEditingTx.merchant}`,
              actionLabel: 'Undo',
              onAction: () => {
                undoMutation.mutateAsync().then(
                  (res) =>
                    toast.show({
                      message:
                        res?.restored?.length > 0
                          ? 'Restored'
                          : res?.message ?? 'Nothing to restore',
                      durationMs: 4000,
                    }),
                  (err) =>
                    toast.show({
                      message:
                        err instanceof Error
                          ? `Undo failed: ${err.message}`
                          : 'Undo failed',
                    })
                );
              },
            });
          }}
        />
      )}
    </>
  );
}
