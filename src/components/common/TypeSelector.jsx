import React from 'react';

const TRANSACTION_TYPES = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
  { value: 'transfer', label: 'Transfer' },
];

export function TypeSelector({ value, onChange, disabled }) {
  return (
    <div
      role="radiogroup"
      aria-label="Transaction Type"
      className="grid grid-cols-3 gap-1 rounded-full border border-line bg-surface-muted p-1"
    >
      {TRANSACTION_TYPES.map((item) => {
        const isSelected = value === item.value;
        return (
          <button
            key={item.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => onChange(item.value)}
            className={`min-h-[40px] rounded-full px-3 text-sm font-semibold transition duration-150 motion-safe:active:scale-95 ${
              isSelected
                ? item.value === 'income'
                  ? 'bg-success-600 text-white shadow-sm'
                  : item.value === 'transfer'
                  ? 'bg-ink-soft text-white shadow-sm'
                  : 'bg-primary-600 text-white shadow-sm'
                : 'text-ink-soft hover:bg-white'
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
