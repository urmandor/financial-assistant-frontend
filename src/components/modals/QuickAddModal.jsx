import React, { useState, useId, useMemo, useEffect, useRef } from 'react';
import { Camera, Sparkles, LoaderCircle, Check } from 'lucide-react';
import { Modal } from '../layout/Modal';
import { TypeSelector } from '../common/TypeSelector';
import {
  useTransactions,
  useRules,
  useCategories,
  useAccounts,
  usePeople,
  useCreateTransaction,
  useParseTransactionText,
} from '../../hooks/useQueries';
import { useToast } from '../../hooks/useToast';
import { getKarachiToday } from '../../utils/dates';
import { parseNumericInput, formatAmount } from '../../utils/formatters';
import {
  DEFAULT_QUICK_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
  inferCategoryFromHistory,
} from '../../utils/categories';
import { uploadReceipt } from '../../api/chat';

const PEOPLE_OPTIONS = [
  { value: 'none', label: 'Just me' },
  { value: 'spent_for', label: 'Spent for someone' },
  { value: 'received', label: 'Received from someone' },
  { value: 'paid', label: 'Paid to someone' },
];

function QuickAddForm({ onClose, onCreated, onBusyChange }) {
  const formId = useId();
  const toast = useToast();
  const createTxMutation = useCreateTransaction();
  const parseMutation = useParseTransactionText();

  const recentTx = useTransactions(10).data?.transactions ?? [];
  const rules = useRules().data?.rules ?? [];
  const categoriesData = useCategories().data?.categories ?? [];
  const accounts = useAccounts().data?.accounts ?? [];
  const people = usePeople().data?.people ?? [];

  const [kind, setKind] = useState('expense');
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(getKarachiToday());
  const [notes, setNotes] = useState('');
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [personMode, setPersonMode] = useState('none');
  const [selectedPerson, setSelectedPerson] = useState('');
  const [parseText, setParseText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const fileInputRef = useRef(null);

  const isBusy =
    createTxMutation.isPending ||
    parseMutation.isPending ||
    isUploadingReceipt;

  useEffect(() => {
    onBusyChange?.(isBusy);
  }, [isBusy, onBusyChange]);

  // Suggested merchants from recent transactions
  const suggestedMerchants = useMemo(() => {
    const set = new Set();
    const result = [];
    for (const tx of recentTx) {
      const m = (tx.merchant ?? '').trim();
      const lower = m.toLowerCase();
      if (m && !set.has(lower)) {
        set.add(lower);
        result.push(m);
        if (result.length >= 6) break;
      }
    }
    return result;
  }, [recentTx]);

  // Available categories list
  const availableCategories = useMemo(() => {
    const set = new Set();
    const result = [];
    const defaults =
      kind === 'income' ? DEFAULT_INCOME_CATEGORIES : DEFAULT_QUICK_CATEGORIES;
    for (const c of defaults) {
      set.add(c.toLowerCase());
      result.push(c);
    }
    for (const c of categoriesData) {
      const name = typeof c === 'string' ? c : c.name;
      if (name && !set.has(name.toLowerCase())) {
        set.add(name.toLowerCase());
        result.push(name);
      }
    }
    return result;
  }, [kind, categoriesData]);

  // Infer category when merchant changes
  const handleMerchantChange = (newMerchant) => {
    setMerchant(newMerchant);
    if (!category || category === 'Uncategorized') {
      const inferred = inferCategoryFromHistory(newMerchant, recentTx, rules);
      if (inferred) setCategory(inferred);
    }
  };

  // Natural language parsing submit
  const handleParse = async (e) => {
    e.preventDefault();
    if (!parseText.trim() || isParsing) return;
    setIsParsing(true);
    setErrorMsg(null);
    try {
      const res = await parseMutation.mutateAsync(parseText.trim());
      if (res.amount) setAmount(String(res.amount));
      if (res.merchant) handleMerchantChange(res.merchant);
      if (res.category) setCategory(res.category);
      if (res.date) setDate(res.date);
      if (res.kind) setKind(res.kind);
      setParseText('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not parse text');
    } finally {
      setIsParsing(false);
    }
  };

  // Receipt image upload
  const handleReceiptFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingReceipt(true);
    setErrorMsg(null);
    try {
      const res = await uploadReceipt(file);
      if (res.transaction) {
        const tx = res.transaction;
        if (tx.amount) setAmount(String(tx.amount));
        if (tx.merchant) handleMerchantChange(tx.merchant);
        if (tx.category) setCategory(tx.category);
        if (tx.date) setDate(tx.date);
        toast.show({
          message: `Receipt scanned: ${tx.merchant} (${formatAmount(tx.amount)})`,
        });
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Failed to scan receipt'
      );
    } finally {
      setIsUploadingReceipt(false);
    }
  };

  // Form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    const parsedAmount = parseNumericInput(amount);
    if (!parsedAmount) {
      setErrorMsg('Please enter a valid amount');
      return;
    }
    if (!merchant.trim()) {
      setErrorMsg('Please enter a merchant or description');
      return;
    }

    setErrorMsg(null);

    const payload = {
      kind,
      amount: parsedAmount,
      merchant: merchant.trim(),
      category: category.trim() || 'Uncategorized',
      date: date || getKarachiToday(),
      notes: notes.trim() || null,
      from_account_id: fromAccountId || null,
      to_account_id: toAccountId || null,
      person: personMode !== 'none' && selectedPerson ? selectedPerson : null,
      person_mode: personMode !== 'none' ? personMode : null,
    };

    try {
      const created = await createTxMutation.mutateAsync(payload);
      onCreated?.(created);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to add transaction');
    }
  };

  return (
    <div className="space-y-4">
      {/* Quick AI Parse input */}
      <form onSubmit={handleParse} className="relative">
        <input
          type="text"
          value={parseText}
          onChange={(e) => setParseText(e.target.value)}
          placeholder="e.g. Dinner with Ali 2500"
          className="input pr-10 text-sm"
          disabled={isBusy}
        />
        <button
          type="submit"
          disabled={!parseText.trim() || isBusy}
          aria-label="Parse text with AI"
          className="icon-btn absolute right-1 top-1/2 -translate-y-1/2"
        >
          {isParsing ? (
            <LoaderCircle size={18} className="animate-spin text-primary-600" />
          ) : (
            <Sparkles size={18} className="text-primary-600" />
          )}
        </button>
      </form>

      {/* Hidden file input for receipt scan */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleReceiptFile}
        className="hidden"
      />

      <div className="flex items-center justify-between gap-2">
        <TypeSelector value={kind} onChange={setKind} disabled={isBusy} />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isBusy}
          aria-label="Scan receipt"
          className="icon-btn shrink-0 border border-line bg-surface-muted"
        >
          {isUploadingReceipt ? (
            <LoaderCircle size={18} className="animate-spin text-primary-600" />
          ) : (
            <Camera size={18} />
          )}
        </button>
      </div>

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
            placeholder="0.00"
            className="input text-2xl font-bold"
            autoFocus
            disabled={isBusy}
          />
        </div>

        <div>
          <label htmlFor={`${formId}-merchant`} className="eyebrow mb-1.5 block">
            {kind === 'transfer' ? 'Transfer description' : 'Merchant / Description'}
          </label>
          <input
            id={`${formId}-merchant`}
            type="text"
            value={merchant}
            onChange={(e) => handleMerchantChange(e.target.value)}
            placeholder={kind === 'income' ? 'e.g. Salary' : 'e.g. Metro Supermarket'}
            className="input"
            disabled={isBusy}
          />
          {suggestedMerchants.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {suggestedMerchants.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleMerchantChange(m)}
                  className="rounded-full border border-line bg-surface-muted px-2.5 py-1 text-xs font-medium text-ink-soft hover:bg-white"
                >
                  {m}
                </button>
              ))}
            </div>
          )}
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
            placeholder="Select or enter category"
            className="input"
            disabled={isBusy || kind === 'transfer'}
          />
          <datalist id={`${formId}-categories`}>
            {availableCategories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>

        <div className="grid grid-cols-2 gap-3">
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
            <label htmlFor={`${formId}-person-mode`} className="eyebrow mb-1.5 block">
              Split / Person
            </label>
            <select
              id={`${formId}-person-mode`}
              value={personMode}
              onChange={(e) => setPersonMode(e.target.value)}
              className="input"
              disabled={isBusy}
            >
              {PEOPLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {personMode !== 'none' && (
          <div>
            <label htmlFor={`${formId}-person`} className="eyebrow mb-1.5 block">
              Person
            </label>
            <input
              id={`${formId}-person`}
              type="text"
              list={`${formId}-people`}
              value={selectedPerson}
              onChange={(e) => setSelectedPerson(e.target.value)}
              placeholder="Name of person"
              className="input"
              disabled={isBusy}
            />
            <datalist id={`${formId}-people`}>
              {people.map((p) => (
                <option key={p.name} value={p.name} />
              ))}
            </datalist>
          </div>
        )}

        <div>
          <label htmlFor={`${formId}-notes`} className="eyebrow mb-1.5 block">
            Notes (Optional)
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

        <button
          type="submit"
          disabled={isBusy || !amount || !merchant}
          className="btn-primary w-full"
        >
          {createTxMutation.isPending ? (
            <>
              <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />
              Adding...
            </>
          ) : (
            <>
              <Check size={18} aria-hidden="true" />
              Save transaction
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export function QuickAddModal({ open, onClose, onCreated }) {
  const [isBusy, setIsBusy] = useState(false);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add transaction"
      dismissible={!isBusy}
    >
      {open && (
        <QuickAddForm
          onClose={onClose}
          onCreated={onCreated}
          onBusyChange={setIsBusy}
        />
      )}
    </Modal>
  );
}
