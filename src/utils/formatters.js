export function formatCurrency(amount, options) {
  const decimals = options?.decimals;
  const num = Number(amount) || 0;
  const formatted = Math.abs(num).toLocaleString('en-US', {
    minimumFractionDigits: decimals ?? 0,
    maximumFractionDigits: decimals ?? 0,
  });
  return `${num < 0 ? '-' : ''}PKR ${formatted}`;
}

export function formatAmount(amount) {
  const num = Number(amount) || 0;
  const isInteger = Number.isInteger(num);
  const formatted = Math.abs(num).toLocaleString('en-US', {
    minimumFractionDigits: isInteger ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `${num < 0 ? '-' : ''}PKR ${formatted}`;
}

export function formatIntegerAmount(amount) {
  return Math.round(Number(amount) || 0).toLocaleString('en-US');
}

export function pluralize(count, noun) {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

export function parseNumericInput(str) {
  if (!str) return null;
  const cleaned = String(str).trim().replace(/,/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned) && !/^\.\d{1,2}$/.test(cleaned)) {
    return null;
  }
  const val = Number(cleaned);
  return Number.isFinite(val) && val > 0 && val < 1e9 ? val : null;
}

export function formatUndoToast(tx) {
  const kind = tx.kind ?? 'expense';
  const desc =
    kind === 'transfer'
      ? `${formatAmount(Number(tx.amount))} · ${tx.merchant.replace(/^Transfer (?=to |from )/i, '')}`
      : `${formatAmount(Number(tx.amount))} · ${tx.merchant} · ${tx.category}`;
  return `Added ${kind === 'expense' ? '' : `${kind} `}${desc}`;
}
