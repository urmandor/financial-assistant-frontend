const KARACHI_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Karachi',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function getKarachiToday(date = new Date()) {
  return KARACHI_FORMATTER.format(date);
}

export function getCurrentMonth() {
  return getKarachiToday().slice(0, 7);
}

export function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function formatShortMonthYear(monthStr) {
  if (!monthStr) return '';
  const [y, m] = monthStr.split('-').map(Number);
  const dt = new Date(y, m - 1, 1);
  return dt.toLocaleDateString(undefined, {
    month: 'short',
    year: '2-digit',
  });
}

export function formatFullMonthYear(monthStr) {
  if (!monthStr) return '';
  const [y, m] = monthStr.split('-').map(Number);
  const dt = new Date(y, m - 1, 1);
  return dt.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

export function getMonthDateRange(monthStr) {
  const ym = monthStr || getCurrentMonth();
  const [y, m] = ym.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const pad = (n) => String(n).padStart(2, '0');
  return {
    from: `${ym}-01`,
    to: `${ym}-${pad(lastDay)}`,
  };
}

export function formatDateLabel(dateStr) {
  if (!dateStr) return '';
  const today = getKarachiToday();
  const yesterday = addDays(today, -1);
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';

  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}
