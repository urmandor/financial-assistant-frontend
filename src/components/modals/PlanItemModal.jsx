import React, { useState, useEffect, useMemo, useId } from 'react';
import { Loader2 } from 'lucide-react';
import { Modal } from '../layout/Modal';
import {
  useSavePlanItem,
  useBuckets,
  useCategories,
} from '../../hooks/useQueries';
import { getCurrentMonth, formatFullMonthYear } from '../../utils/dates';
import { formatCurrency } from '../../utils/formatters';

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

const TYPE_OPTIONS = [
  { value: 'income', label: 'Income' },
  { value: 'cost', label: 'Cost' },
  { value: 'reference', label: 'Balance / target' },
];

const INTERVAL_PRESETS = [
  { value: '1', label: 'Monthly' },
  { value: '3', label: 'Every 3 months' },
  { value: '6', label: 'Every 6 months' },
  { value: '12', label: 'Yearly' },
  { value: 'custom', label: 'Custom' },
];

export function PlanItemModal({
  open,
  onClose,
  item = null,
  defaultType = 'cost',
  defaultOneOff = false,
  categories = [],
  defaultSavingFund = null,
}) {
  const idPrefix = useId();
  const saveMutation = useSavePlanItem();
  const bucketsQuery = useBuckets();
  const categoriesQuery = useCategories();

  const buckets = bucketsQuery.data?.buckets ?? [];

  // Form state
  const [type, setType] = useState(defaultType);
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [recurring, setRecurring] = useState(!defaultOneOff);
  const [everyPreset, setEveryPreset] = useState('1');
  const [customEvery, setCustomEvery] = useState('1');
  const [startMonth, setStartMonth] = useState('');
  const [endMonth, setEndMonth] = useState('');
  const [category, setCategory] = useState('');
  const [spendCategories, setSpendCategories] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [intoFund, setIntoFund] = useState('');
  const [paidFromFund, setPaidFromFund] = useState('');
  const [raiseOn, setRaiseOn] = useState(false);
  const [raisePct, setRaisePct] = useState('');
  const [raiseMonth, setRaiseMonth] = useState(1);

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);

  // Initialize or reset form when modal opens
  useEffect(() => {
    if (!open) return;
    setErrors({});
    setServerError(null);

    if (item) {
      setType(item.assumption_type ?? defaultType);
      setLabel(item.label ?? '');
      setAmount(String(item.value ?? ''));
      setRecurring(Boolean(item.is_recurring));

      const repeatMonths = item.repeat_every_months ?? (item.recurrence === 'yearly' ? 12 : 1);
      const isPreset = [1, 3, 6, 12].includes(repeatMonths);
      setEveryPreset(isPreset ? String(repeatMonths) : 'custom');
      setCustomEvery(String(repeatMonths || 1));

      setStartMonth(item.start_month ? item.start_month.slice(0, 7) : '');
      setEndMonth(item.end_month ? item.end_month.slice(0, 7) : '');
      setCategory(item.category ?? '');
      setSpendCategories(item.spend_categories ?? []);
      setIsSaving(Boolean(item.into_bucket));
      setIntoFund(item.into_bucket ?? '');
      setPaidFromFund(item.paid_from_bucket ?? '');

      if (item.escalation) {
        setRaiseOn(true);
        setRaisePct(String(Math.round(item.escalation.escalation_pct * 10000) / 100));
        setRaiseMonth(item.escalation.trigger_month ?? 1);
      } else {
        setRaiseOn(false);
        setRaisePct('');
        setRaiseMonth(1);
      }
    } else {
      setType(defaultType);
      setLabel('');
      setAmount('');
      setRecurring(!defaultOneOff);
      setEveryPreset('1');
      setCustomEvery('1');
      setStartMonth(getCurrentMonth());
      setEndMonth('');
      setCategory('');
      setSpendCategories([]);
      setIsSaving(Boolean(defaultSavingFund));
      setIntoFund(defaultSavingFund ?? '');
      setPaidFromFund('');
      setRaiseOn(false);
      setRaisePct('');
      setRaiseMonth(1);
    }
  }, [open, item, defaultType, defaultOneOff, defaultSavingFund]);

  const allAvailableCategories = useMemo(() => {
    const list = new Set();
    for (const c of categoriesQuery.data?.categories ?? []) {
      if (c.name && c.name.toLowerCase() !== 'general') list.add(c.name);
    }
    for (const c of categories) {
      if (c && c.toLowerCase() !== 'general') list.add(c);
    }
    return Array.from(list).sort();
  }, [categoriesQuery.data, categories]);

  if (!open) return null;

  const validate = () => {
    const errs = {};
    if (!label.trim()) {
      errs.label = 'Give the item a name';
    } else if (label.trim().length > 80) {
      errs.label = 'Name must be 80 characters or fewer';
    }

    const num = Number(amount);
    if (!amount.trim() || !Number.isFinite(num)) {
      errs.amount = 'Enter an amount in PKR';
    } else if (num < 0) {
      errs.amount = 'The amount cannot be negative';
    }

    if (!recurring && !startMonth) {
      errs.startMonth = 'Pick the month this happens';
    }

    if (recurring && type !== 'reference') {
      const everyVal = Number(everyPreset === 'custom' ? customEvery : everyPreset);
      if (!Number.isInteger(everyVal) || everyVal < 1 || everyVal > 120) {
        errs.every = 'Repeat every 1 to 120 months';
      }
      if (startMonth && endMonth && endMonth < startMonth) {
        errs.endMonth = 'End month cannot be before start month';
      }
    }

    if (type === 'cost' && isSaving && !intoFund) {
      errs.intoFund = 'Pick the fund this saving goes into';
    }

    if (raiseOn && recurring && type !== 'reference') {
      const pct = Number(raisePct);
      if (!raisePct.trim() || !Number.isFinite(pct) || pct <= 0 || pct > 200) {
        errs.raisePct = 'Enter a raise percentage between 0% and 200%';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setServerError(null);

    const numAmount = Number(amount);
    const repeatMonths =
      recurring && type !== 'reference'
        ? Number(everyPreset === 'custom' ? customEvery : everyPreset)
        : 1;

    const payload = {
      label: label.trim(),
      value: numAmount,
      assumption_type: type,
      is_recurring: recurring,
      ...(recurring && type !== 'reference'
        ? repeatMonths === 12
          ? { recurrence: 'yearly' }
          : repeatMonths === 1
          ? { recurrence: 'monthly' }
          : { repeat_every_months: repeatMonths }
        : {}),
      ...(startMonth ? { start_month: `${startMonth}-01` } : {}),
      ...(recurring && endMonth ? { end_month: `${endMonth}-01` } : { end_month: null }),
      ...(category.trim() && !(type === 'cost' && isSaving)
        ? { category: category.trim() }
        : { category: null }),
      ...(type === 'cost'
        ? {
            into_bucket: isSaving ? intoFund || null : null,
            paid_from_bucket: !isSaving && paidFromFund ? paidFromFund : null,
            spend_categories: spendCategories,
          }
        : {
            into_bucket: null,
            paid_from_bucket: null,
            spend_categories: [],
          }),
    };

    let raiseConfig = { kind: 'keep' };
    if (raiseOn && recurring && type !== 'reference') {
      raiseConfig = {
        kind: 'set',
        body: {
          escalation_pct: Number(raisePct) / 100,
          trigger_month: Number(raiseMonth),
        },
      };
    } else if (item?.escalation) {
      raiseConfig = { kind: 'clear' };
    }

    try {
      await saveMutation.mutateAsync({
        key: item?.key,
        input: payload,
        raise: raiseConfig,
      });
      onClose();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Failed to save item');
    }
  };

  const toggleSpendCategory = (catName) => {
    const exists = spendCategories.some((c) => c.toLowerCase() === catName.toLowerCase());
    setSpendCategories(
      exists
        ? spendCategories.filter((c) => c.toLowerCase() !== catName.toLowerCase())
        : [...spendCategories, catName]
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={item ? `Edit ${item.label}` : 'New Plan Item'}
      dismissible={!saveMutation.isPending}
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Type selector */}
        <div className="space-y-1">
          <span className="text-xs font-semibold text-ink-soft">Type</span>
          <div
            role="radiogroup"
            className="grid grid-cols-3 gap-1 rounded-full bg-surface-muted p-1"
          >
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={type === opt.value}
                onClick={() => setType(opt.value)}
                disabled={saveMutation.isPending}
                className={`min-h-[40px] rounded-full px-2 text-sm font-semibold transition ${
                  type === opt.value
                    ? 'bg-white text-primary-700 shadow-card'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {type === 'reference' && (
            <p className="text-xs text-ink-muted">
              A balance or target to look up. It is not counted as monthly income or cost.
            </p>
          )}
        </div>

        {/* Cost sub-type: Expense vs Saving */}
        {type === 'cost' && (
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-ink-soft">This is</span>
            <div className="grid grid-cols-2 gap-1 rounded-full bg-surface-muted p-1">
              <button
                type="button"
                onClick={() => setIsSaving(false)}
                className={`min-h-[40px] rounded-full px-2 text-sm font-semibold transition ${
                  !isSaving
                    ? 'bg-white text-primary-700 shadow-card'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => setIsSaving(true)}
                className={`min-h-[40px] rounded-full px-2 text-sm font-semibold transition ${
                  isSaving
                    ? 'bg-white text-primary-700 shadow-card'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                Saving into a fund
              </button>
            </div>

            {isSaving ? (
              <div className="space-y-1 pt-1">
                <label
                  htmlFor={`${idPrefix}-into`}
                  className="text-xs font-semibold text-ink-soft"
                >
                  Into fund
                </label>
                <select
                  id={`${idPrefix}-into`}
                  className="input text-sm"
                  value={intoFund}
                  onChange={(e) => setIntoFund(e.target.value)}
                >
                  <option value="">Choose a fund…</option>
                  {buckets.map((b) => (
                    <option key={b.name} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
                {errors.intoFund && (
                  <p className="text-xs text-danger-700">{errors.intoFund}</p>
                )}
                <p className="text-xs text-ink-muted">
                  Money moved into the fund leaves your cash balance but does not count against budgets.
                </p>
              </div>
            ) : (
              buckets.length > 0 && (
                <div className="space-y-1 pt-1">
                  <label
                    htmlFor={`${idPrefix}-paid-from`}
                    className="text-xs font-semibold text-ink-soft"
                  >
                    Paid from fund (optional)
                  </label>
                  <select
                    id={`${idPrefix}-paid-from`}
                    className="input text-sm"
                    value={paidFromFund}
                    onChange={(e) => setPaidFromFund(e.target.value)}
                  >
                    <option value="">Paid from main cash account</option>
                    {buckets.map((b) => (
                      <option key={b.name} value={b.name}>
                        Paid from {b.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-ink-muted">
                    If selected, this expense will be funded out of your reserve bucket instead of operating cash.
                  </p>
                </div>
              )
            )}
          </div>
        )}

        {/* Name / Label */}
        <div className="space-y-1">
          <label htmlFor={`${idPrefix}-label`} className="text-xs font-semibold text-ink-soft">
            Name
          </label>
          <input
            id={`${idPrefix}-label`}
            type="text"
            className="input text-sm"
            placeholder="e.g. Salary, Rent, Health Insurance"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            disabled={saveMutation.isPending}
          />
          {errors.label && <p className="text-xs text-danger-700">{errors.label}</p>}
        </div>

        {/* Amount */}
        <div className="space-y-1">
          <label htmlFor={`${idPrefix}-amount`} className="text-xs font-semibold text-ink-soft">
            Amount (PKR)
          </label>
          <input
            id={`${idPrefix}-amount`}
            type="number"
            className="input text-sm num"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={saveMutation.isPending}
          />
          {errors.amount && <p className="text-xs text-danger-700">{errors.amount}</p>}
        </div>

        {/* Recurrence (if not reference) */}
        {type !== 'reference' && (
          <div className="space-y-3 rounded-2xl border border-line bg-surface-muted/40 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ink">Repeats regularly?</span>
              <div className="flex gap-1 rounded-full bg-surface-muted p-0.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setRecurring(true)}
                  className={`rounded-full px-3 py-1 transition ${
                    recurring ? 'bg-white text-primary-700 shadow-sm' : 'text-ink-muted'
                  }`}
                >
                  Recurring
                </button>
                <button
                  type="button"
                  onClick={() => setRecurring(false)}
                  className={`rounded-full px-3 py-1 transition ${
                    !recurring ? 'bg-white text-primary-700 shadow-sm' : 'text-ink-muted'
                  }`}
                >
                  One-off
                </button>
              </div>
            </div>

            {recurring ? (
              <div className="space-y-3 pt-1">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-ink-soft">Frequency</label>
                  <div className="grid grid-cols-3 gap-1 sm:grid-cols-5">
                    {INTERVAL_PRESETS.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setEveryPreset(p.value)}
                        className={`min-h-[36px] rounded-xl border px-2 text-xs font-semibold transition ${
                          everyPreset === p.value
                            ? 'border-primary-600 bg-primary-50 text-primary-700'
                            : 'border-line bg-white text-ink-soft hover:bg-surface-muted'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  {everyPreset === 'custom' && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-ink-muted">Every</span>
                      <input
                        type="number"
                        min="1"
                        max="120"
                        className="input num w-20 text-xs py-1"
                        value={customEvery}
                        onChange={(e) => setCustomEvery(e.target.value)}
                      />
                      <span className="text-xs text-ink-muted">months</span>
                    </div>
                  )}
                  {errors.every && <p className="text-xs text-danger-700">{errors.every}</p>}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label
                      htmlFor={`${idPrefix}-start`}
                      className="text-xs font-semibold text-ink-soft"
                    >
                      Start Month
                    </label>
                    <input
                      id={`${idPrefix}-start`}
                      type="month"
                      className="input text-xs"
                      value={startMonth}
                      onChange={(e) => setStartMonth(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label
                      htmlFor={`${idPrefix}-end`}
                      className="text-xs font-semibold text-ink-soft"
                    >
                      End Month (optional)
                    </label>
                    <input
                      id={`${idPrefix}-end`}
                      type="month"
                      className="input text-xs"
                      value={endMonth}
                      onChange={(e) => setEndMonth(e.target.value)}
                    />
                    {errors.endMonth && (
                      <p className="text-xs text-danger-700">{errors.endMonth}</p>
                    )}
                  </div>
                </div>

                {/* Yearly raise toggle */}
                <div className="space-y-2 pt-2 border-t border-line/60">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={raiseOn}
                      onChange={(e) => setRaiseOn(e.target.checked)}
                      className="rounded text-primary-600"
                    />
                    <span className="text-xs font-semibold text-ink">
                      Subject to yearly raise?
                    </span>
                  </label>

                  {raiseOn && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="space-y-1">
                        <label className="text-xs text-ink-muted">Raise percentage (%)</label>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="e.g. 10"
                          className="input num text-xs"
                          value={raisePct}
                          onChange={(e) => setRaisePct(e.target.value)}
                        />
                        {errors.raisePct && (
                          <p className="text-xs text-danger-700">{errors.raisePct}</p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-ink-muted">Month of raise</label>
                        <select
                          className="input text-xs"
                          value={raiseMonth}
                          onChange={(e) => setRaiseMonth(Number(e.target.value))}
                        >
                          {MONTH_NAMES.map((mname, idx) => (
                            <option key={mname} value={idx + 1}>
                              {mname}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-1 pt-1">
                <label
                  htmlFor={`${idPrefix}-oneoff-month`}
                  className="text-xs font-semibold text-ink-soft"
                >
                  Month of occurrence
                </label>
                <input
                  id={`${idPrefix}-oneoff-month`}
                  type="month"
                  className="input text-xs"
                  value={startMonth}
                  onChange={(e) => setStartMonth(e.target.value)}
                />
                {errors.startMonth && (
                  <p className="text-xs text-danger-700">{errors.startMonth}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Primary category and covered categories */}
        {type === 'cost' && !isSaving && (
          <div className="space-y-2">
            <div className="space-y-1">
              <label
                htmlFor={`${idPrefix}-cat`}
                className="text-xs font-semibold text-ink-soft"
              >
                Primary Category
              </label>
              <input
                id={`${idPrefix}-cat`}
                type="text"
                list={`${idPrefix}-cat-list`}
                className="input text-sm"
                placeholder="e.g. Groceries"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
              <datalist id={`${idPrefix}-cat-list`}>
                {allAvailableCategories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            {allAvailableCategories.length > 0 && (
              <div className="space-y-1">
                <span className="text-xs font-semibold text-ink-soft">
                  Also covers spending categories
                </span>
                <p className="text-[11px] text-ink-muted">
                  Transactions in any of these categories will count against this budget limit.
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1.5 border border-line rounded-xl bg-surface-muted/30">
                  {allAvailableCategories.map((catName) => {
                    const active = spendCategories.some(
                      (c) => c.toLowerCase() === catName.toLowerCase()
                    );
                    return (
                      <button
                        key={catName}
                        type="button"
                        onClick={() => toggleSpendCategory(catName)}
                        className={`badge text-xs cursor-pointer transition ${
                          active
                            ? 'badge-primary'
                            : 'badge-neutral hover:border-ink-muted'
                        }`}
                      >
                        {catName}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {serverError && (
          <div className="alert-error" role="alert">
            {serverError}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            className="btn-primary inline-flex items-center gap-1.5"
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending && (
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            )}
            Save item
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={saveMutation.isPending}
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
