import React, { useState, useMemo, useCallback } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  ReferenceDot,
} from 'recharts';
import { ChevronRight, Info, ArrowRight } from 'lucide-react';
import { useProjections, useAssumptions } from '../hooks/useQueries';
import { getCurrentMonth, formatFullMonthYear } from '../utils/dates';
import { formatCurrency, formatIntegerAmount } from '../utils/formatters';
import { Link } from '../hooks/useRouter';
import { ErrorMessage, formatError } from '../components/common/ErrorMessage';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';

const HORIZONS = [
  { months: 12, label: '1 year' },
  { months: 24, label: '2 years' },
  { months: 36, label: '3 years' },
  { months: 60, label: '5 years' },
];

const DEFAULT_HORIZON = 24;
const HORIZON_STORAGE_KEY = 'forecast.horizon';
const FUNDS_STORAGE_KEY = 'forecast.funds';

const TILE_TONES = {
  default: 'border-line',
  danger: 'border-danger-100 bg-danger-50/60',
  success: 'border-line',
  warning: 'border-warning-100 bg-warning-50/60',
};

function formatCompactAmount(num) {
  const abs = Math.abs(num);
  if (abs >= 1e6) {
    return `${(num / 1e6).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (abs >= 1e4) {
    return `${Math.round(num / 1e3)}k`;
  }
  return Math.round(num).toLocaleString('en-US');
}

function formatYAxis(val) {
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (abs >= 1e6) {
    return `${sign}${Math.round(abs / 1e5) / 10}M`;
  }
  if (abs >= 1e3) {
    return `${sign}${Math.round(abs / 1e3)}K`;
  }
  return `${sign}${Math.round(abs)}`;
}

function formatShortMonth(monthStr) {
  const full = formatFullMonthYear(monthStr);
  return `${full.slice(0, 3)} ${full.slice(-2)}`;
}

function getFundsSummary(month) {
  const net = Math.round(month.funds_net ?? 0);
  const total = Math.round(month.funds_total ?? 0);
  return {
    net:
      net > 0
        ? `+${net.toLocaleString('en-US')}`
        : net < 0
        ? `-${Math.abs(net).toLocaleString('en-US')}`
        : '0',
    tone: net > 0 ? 'up' : net < 0 ? 'down' : 'none',
    total: total !== 0 ? `in funds ${formatCompactAmount(total)}` : null,
  };
}

function findLowestMonth(months) {
  let lowest = null;
  for (const m of months) {
    if (lowest === null || m.cash_balance < lowest.cash_balance) {
      lowest = m;
    }
  }
  return lowest;
}

function calculateSummaries(months) {
  const lowest = findLowestMonth(months);
  if (!lowest) return null;
  return {
    lowest,
    in6: months[6] ?? null,
    in12: months[12] ?? null,
    totalIncome: months.reduce((acc, m) => acc + (m.income || 0), 0),
    totalCosts: months.reduce((acc, m) => acc + (m.costs || 0), 0),
    totalSpending: months.reduce((acc, m) => acc + (m.spending ?? m.costs ?? 0), 0),
    totalMovedToFunds: months.reduce((acc, m) => acc + (m.fund_saved ?? 0), 0),
  };
}

const totalItemCost = (item) => item.final_value + (item.fund_paid ?? 0);

function formatItemAdjustment(item) {
  const adj = item.adjustment_applied;
  if (adj && !adj.startsWith('paid from')) {
    return adj === 'pause' ? 'paused' : 'adjusted';
  }
  if (
    item.base_value !== undefined &&
    item.escalated_value !== undefined &&
    item.escalated_value !== item.base_value
  ) {
    return 'with yearly raise';
  }
  return null;
}

function BreakdownSection({ title, total, lines, tone, renderItem }) {
  if (!lines || lines.length === 0) return null;
  return (
    <section aria-label={title} className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <h4 className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">
          {title}
        </h4>
        <span className={`num text-xs font-bold ${tone}`}>{formatCurrency(total)}</span>
      </div>
      <ul className="divide-y divide-line rounded-xl border border-line bg-white">
        {lines.map(renderItem)}
      </ul>
    </section>
  );
}

function BreakdownRow({ label, sub, amount, tone = 'text-ink' }) {
  return (
    <li className="flex items-start justify-between gap-3 px-3 py-2">
      <span className="min-w-0">
        <span className="block break-words text-sm font-medium text-ink">{label}</span>
        {sub && <span className="block break-words text-[11px] text-ink-muted">{sub}</span>}
      </span>
      <span className={`num shrink-0 text-sm font-semibold ${tone}`}>{amount}</span>
    </li>
  );
}

function MonthBreakdown({ month }) {
  const items = month.line_items ?? [];
  const incomeItems = items.filter((p) => p.type === 'income' && p.final_value !== 0);
  const movedToFundItems = items.filter(
    (p) => p.type === 'cost' && p.into_bucket && p.final_value !== 0
  );
  const costItems = items
    .filter((p) => p.type === 'cost' && !p.into_bucket && totalItemCost(p) !== 0)
    .sort((a, b) => totalItemCost(b) - totalItemCost(a));

  const fundNameOf = (p) =>
    (p.adjustment_applied ?? '').replace(/^paid from /, '') || 'a fund';

  const cashCostItems = costItems.filter((p) => p.final_value > 0);

  const fundPaidItems = costItems.filter((p) => (p.fund_paid ?? 0) > 0);
  const fundGroupsMap = new Map();
  for (const item of fundPaidItems) {
    const fname = fundNameOf(item);
    if (!fundGroupsMap.has(fname)) fundGroupsMap.set(fname, []);
    fundGroupsMap.get(fname).push(item);
  }
  const fundGroups = Array.from(fundGroupsMap.entries());

  const totalCostsAll = costItems.reduce((acc, p) => acc + totalItemCost(p), 0);
  const totalFundPaid = costItems.reduce((acc, p) => acc + (p.fund_paid ?? 0), 0);
  const totalMovedToFunds = movedToFundItems.reduce((acc, p) => acc + p.final_value, 0);
  const totalIncome = incomeItems.reduce((acc, p) => acc + p.final_value, 0);
  const cashOutTotal = totalCostsAll - totalFundPaid + totalMovedToFunds;

  return (
    <div className="space-y-4" data-testid="month-breakdown">
      <BreakdownSection
        title="Income"
        total={totalIncome}
        tone="text-success-700"
        lines={incomeItems}
        renderItem={(item) => (
          <BreakdownRow
            key={item.key}
            label={item.label}
            sub={formatItemAdjustment(item)}
            amount={`+${formatCurrency(item.final_value)}`}
            tone="text-success-700"
          />
        )}
      />

      <BreakdownSection
        title="Paid from cash"
        total={totalCostsAll - totalFundPaid}
        tone="text-ink"
        lines={cashCostItems}
        renderItem={(item) => {
          const details = [
            item.category && item.category !== 'General' ? item.category : null,
            item.spend_categories && item.spend_categories.length > 0
              ? `covers ${item.spend_categories.join(', ')}`
              : null,
            formatItemAdjustment(item),
            (item.fund_paid ?? 0) > 0
              ? `rest (${formatCurrency(item.fund_paid ?? 0)}) paid from ${fundNameOf(item)}`
              : null,
          ].filter(Boolean);

          return (
            <BreakdownRow
              key={item.key}
              label={item.label}
              sub={details.join(' · ') || null}
              amount={formatCurrency(item.final_value)}
            />
          );
        }}
      />

      {fundGroups.map(([fname, lines]) => (
        <BreakdownSection
          key={fname}
          title={`Paid from ${fname}`}
          total={lines.reduce((acc, item) => acc + (item.fund_paid ?? 0), 0)}
          tone="text-info-700"
          lines={lines}
          renderItem={(item) => {
            const details = [
              item.category && item.category !== 'General' ? item.category : null,
              formatItemAdjustment(item),
              item.final_value > 0
                ? `${formatCurrency(item.final_value)} of this came from cash`
                : null,
            ].filter(Boolean);

            return (
              <BreakdownRow
                key={item.key}
                label={item.label}
                sub={details.join(' · ') || null}
                amount={formatCurrency(item.fund_paid ?? 0)}
                tone="text-info-700"
              />
            );
          }}
        />
      ))}

      <BreakdownSection
        title="Moved into funds"
        total={totalMovedToFunds}
        tone="text-warning-700"
        lines={movedToFundItems}
        renderItem={(item) => (
          <BreakdownRow
            key={item.key}
            label={item.label}
            sub={`into ${item.into_bucket}`}
            amount={formatCurrency(item.final_value)}
          />
        )}
      />

      <div className="space-y-1 rounded-xl bg-surface-muted px-3 py-2 text-xs text-ink-soft">
        <div className="flex justify-between gap-3">
          <span>Cash out this month (from your account)</span>
          <span className="num font-semibold text-ink">{formatCurrency(cashOutTotal)}</span>
        </div>
        <p className="text-[11px] text-ink-muted">
          Cash spending {formatCurrency(totalCostsAll - totalFundPaid)} + moved into funds{' '}
          {formatCurrency(totalMovedToFunds)}. Spending paid by funds (
          {formatCurrency(totalFundPaid)}) comes out of the funds, not your cash.
        </p>
      </div>
    </div>
  );
}

function ProjectionTile({ label, value, hint, tone = 'default', testId }) {
  return (
    <div
      className={`min-w-0 rounded-2xl border bg-surface p-3.5 shadow-card ${
        TILE_TONES[tone] ?? TILE_TONES.default
      }`}
      data-testid={testId}
    >
      <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
        {label}
      </p>
      <div className="num mt-1 break-words text-lg font-extrabold text-ink sm:text-xl">
        {value}
      </div>
      {hint && <p className="mt-1 text-[11px] text-ink-muted">{hint}</p>}
    </div>
  );
}

function ProjectionChart({ months, lowest }) {
  const data = useMemo(
    () =>
      months.map((m) => ({
        month: m.month,
        label: formatShortMonth(m.month),
        balance: m.cash_balance,
      })),
    [months]
  );

  const maxBalance = Math.max(...data.map((d) => d.balance));
  const minBalance = Math.min(...data.map((d) => d.balance));
  const gradientOffset =
    maxBalance <= 0 ? 0 : minBalance >= 0 ? 1 : maxBalance / (maxBalance - minBalance);
  const isLowestNegative = lowest.cash_balance < 0;
  const ariaLabel = `Projected cash balance for ${months.length} months. Lowest point ${formatCurrency(
    lowest.cash_balance
  )} in ${formatFullMonthYear(lowest.month)}.`;

  return (
    <div role="img" aria-label={ariaLabel} data-testid="projection-chart">
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="proj-stroke" x1="0" y1="0" x2="0" y2="1">
              <stop offset={gradientOffset} stopColor="#4F46E5" />
              <stop offset={gradientOffset} stopColor="#E11D48" />
            </linearGradient>
            <linearGradient id="proj-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset={gradientOffset} stopColor="#6366F1" stopOpacity={0.28} />
              <stop offset={gradientOffset} stopColor="#F43F5E" stopOpacity={0.28} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 4" stroke="#E6E8F0" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: '#5B6578', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={28}
          />
          <YAxis
            tick={{ fill: '#5B6578', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={48}
            tickFormatter={formatYAxis}
            domain={[(val) => Math.min(0, val), (val) => Math.max(0, val)]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E6E8F0',
              borderRadius: '1rem',
              color: '#0F172A',
              boxShadow: '0 12px 32px -12px rgba(15,23,42,0.25)',
              fontSize: 13,
            }}
            labelFormatter={(label, items) => {
              const month = items?.[0]?.payload?.month;
              return month ? formatFullMonthYear(month) : '';
            }}
            formatter={(val) => [formatCurrency(val), 'Balance']}
          />
          <ReferenceLine y={0} stroke="#BE123C" strokeDasharray="5 4" strokeWidth={1.5} />
          <Area
            type="monotone"
            dataKey="balance"
            stroke="url(#proj-stroke)"
            strokeWidth={2.5}
            fill="url(#proj-fill)"
            dot={false}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
          <ReferenceDot
            x={formatShortMonth(lowest.month)}
            y={lowest.cash_balance}
            r={6}
            fill={isLowestNegative ? '#E11D48' : '#4F46E5'}
            stroke="#FFFFFF"
            strokeWidth={2.5}
            label={{
              value: 'Lowest',
              position: 'left',
              fill: isLowestNegative ? '#BE123C' : '#4338CA',
              fontSize: 11,
              fontWeight: 700,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function FundHeaderCells({ selection, cellClass }) {
  if (selection.picked.length === 0) {
    return (
      <th scope="col" className={cellClass}>
        Funds
      </th>
    );
  }
  return (
    <>
      {selection.picked.map((name) => (
        <th key={name} scope="col" className={`${cellClass} min-w-[5.5rem]`}>
          <span className="block truncate" title={name}>
            {name}
          </span>
        </th>
      ))}
    </>
  );
}

function FundRowCells({ m, selection, cellClass, compact = false }) {
  if (selection.picked.length === 0) {
    const summary = getFundsSummary(m);
    const toneClass =
      summary.tone === 'up'
        ? 'text-success-700'
        : summary.tone === 'down'
        ? 'text-warning-700'
        : 'text-ink-muted';

    return (
      <td className={`num ${cellClass} text-right align-top`}>
        <span className={`block ${toneClass}`}>{summary.net}</span>
        {!compact && summary.total && (
          <span className="block text-[10px] font-normal leading-tight text-ink-muted">
            {summary.total}
          </span>
        )}
      </td>
    );
  }

  return (
    <>
      {selection.picked.map((fname) => {
        const f = (m.funds ?? []).find((x) => x.name === fname);
        const hasShortfall = (f?.shortfall ?? 0) > 0;

        return (
          <td
            key={fname}
            className={`num ${cellClass} text-right align-top ${
              hasShortfall ? 'bg-warning-50' : ''
            }`}
            data-testid="fund-cell"
          >
            <span
              className={`block font-semibold ${
                hasShortfall ? 'text-warning-800' : 'text-ink'
              }`}
            >
              {f ? Math.round(f.balance).toLocaleString('en-US') : '-'}
            </span>
            {f && f.net !== undefined && f.net !== 0 && (
              <span
                className={`block text-[10px] font-normal leading-tight ${
                  f.net > 0 ? 'text-success-700' : 'text-warning-700'
                }`}
              >
                {f.net > 0
                  ? `+${Math.round(f.net).toLocaleString('en-US')}`
                  : `-${Math.round(Math.abs(f.net)).toLocaleString('en-US')}`}
              </span>
            )}
          </td>
        );
      })}
    </>
  );
}

export function ProjectionPage() {
  const currentMonth = useMemo(() => getCurrentMonth(), []);
  const [months, setMonths] = useState(() => {
    try {
      const saved = Number(window.localStorage.getItem(HORIZON_STORAGE_KEY));
      return HORIZONS.some((h) => h.months === saved) ? saved : DEFAULT_HORIZON;
    } catch {
      return DEFAULT_HORIZON;
    }
  });

  const [expandedMonth, setExpandedMonth] = useState(null);

  const [pickedFunds, setPickedFunds] = useState(() => {
    try {
      const saved = window.localStorage.getItem(FUNDS_STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) ? parsed.filter((n) => typeof n === 'string') : [];
    } catch {
      return [];
    }
  });

  const handleHorizonChange = (h) => {
    setMonths(h);
    setExpandedMonth(null);
    try {
      window.localStorage.setItem(HORIZON_STORAGE_KEY, String(h));
    } catch {}
  };

  const projectionQuery = useProjections(months, currentMonth);
  const assumptionsQuery = useAssumptions();

  const projectionList = projectionQuery.data?.projections ?? [];
  const summaries = useMemo(() => calculateSummaries(projectionList), [projectionList]);

  const nonRecurringItemKeys = useMemo(() => {
    return new Set(
      (assumptionsQuery.data?.items ?? [])
        .filter((item) => !item.is_recurring)
        .map((item) => item.key)
    );
  }, [assumptionsQuery.data]);

  const hasNoAssumptions =
    assumptionsQuery.isSuccess && (assumptionsQuery.data?.items ?? []).length === 0;

  // Funds selection
  const availableFunds = useMemo(() => {
    const list = [];
    for (const m of projectionList) {
      for (const f of m.funds ?? []) {
        if (!list.includes(f.name)) list.push(f.name);
      }
    }
    return list;
  }, [projectionList]);

  const activePickedFunds = useMemo(
    () => pickedFunds.filter((name) => availableFunds.includes(name)),
    [pickedFunds, availableFunds]
  );

  const saveFunds = useCallback((next) => {
    setPickedFunds(next);
    try {
      window.localStorage.setItem(FUNDS_STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }, []);

  const toggleFund = useCallback(
    (name) => {
      saveFunds(
        activePickedFunds.includes(name)
          ? activePickedFunds.filter((n) => n !== name)
          : [...activePickedFunds, name]
      );
    },
    [activePickedFunds, saveFunds]
  );

  const setAllFunds = useCallback(() => saveFunds([]), [saveFunds]);

  const fundsSelection = useMemo(
    () => ({
      available: availableFunds,
      picked: activePickedFunds,
      toggle: toggleFund,
      setAll: setAllFunds,
    }),
    [availableFunds, activePickedFunds, toggleFund, setAllFunds]
  );

  const showScrollHint = activePickedFunds.length > 1;

  const aboutSection = (
    <section className="card flex items-start gap-3 p-4" aria-label="About this projection">
      <span className="icon-chip bg-info-50 text-info-600" aria-hidden="true">
        <Info size={20} />
      </span>
      <div className="min-w-0 text-sm text-ink-soft">
        <p>
          This is your plan played forward, not a forecast of logged spending. It reflects
          your recurring income and costs, one-offs, yearly raises, temporary adjustments
          and goal contributions.
        </p>
        <Link
          to="/plan/items"
          className="mt-2 inline-flex min-h-[44px] items-center gap-1 font-semibold text-primary-700 hover:underline"
        >
          Edit Income & costs
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );

  if (projectionQuery.isPending) {
    return <LoadingSkeleton label="Loading projection" rows={6} />;
  }

  if (projectionQuery.isError) {
    return (
      <ErrorMessage
        message={formatError(projectionQuery.error, 'Failed to load the projection')}
        onRetry={() => projectionQuery.refetch()}
        busy={projectionQuery.isFetching}
      />
    );
  }

  if (!summaries || hasNoAssumptions) {
    return (
      <div className="space-y-4">
        <div className="card px-4 py-12 text-center" data-testid="projection-empty">
          <p className="text-lg font-semibold text-ink">No projection yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-muted">
            Add your income and recurring costs and your cash balance will be projected
            month by month.
          </p>
          <Link to="/plan/items" className="btn-primary mt-4">
            Add income & costs
          </Link>
        </div>
        {aboutSection}
      </div>
    );
  }

  const isLowestNegative = summaries.lowest.cash_balance < 0;
  const negativeMonthsCount = projectionList.filter((m) => m.cash_balance < 0).length;

  return (
    <div className="space-y-4">
      {/* Horizon Radio Group */}
      <div
        role="radiogroup"
        aria-label="How far ahead"
        className="grid grid-cols-4 gap-1 rounded-full bg-surface-muted p-1"
        data-testid="projection-horizon"
      >
        {HORIZONS.map((v) => (
          <button
            key={v.months}
            type="button"
            role="radio"
            aria-checked={months === v.months}
            onClick={() => handleHorizonChange(v.months)}
            className={`min-h-[44px] rounded-full px-1 text-xs font-semibold transition motion-reduce:transition-none sm:text-sm ${
              months === v.months
                ? 'bg-white text-primary-700 shadow-card'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Top 4 Stat Tiles */}
      <div
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
        data-testid="projection-tiles"
      >
        <ProjectionTile
          label="Lowest balance"
          value={formatCurrency(summaries.lowest.cash_balance)}
          hint={
            isLowestNegative
              ? `Below zero in ${formatFullMonthYear(summaries.lowest.month)}`
              : `in ${formatFullMonthYear(summaries.lowest.month)}`
          }
          tone={isLowestNegative ? 'danger' : 'default'}
          testId="tile-lowest"
        />
        <ProjectionTile
          label="Balance in 6 months"
          value={summaries.in6 ? formatCurrency(summaries.in6.cash_balance) : '-'}
          hint={
            summaries.in6
              ? summaries.in6.cash_balance < 0
                ? `Below zero, ${formatFullMonthYear(summaries.in6.month)}`
                : formatFullMonthYear(summaries.in6.month)
              : undefined
          }
          tone={summaries.in6 && summaries.in6.cash_balance < 0 ? 'danger' : 'default'}
          testId="tile-6"
        />
        <ProjectionTile
          label="Balance in 12 months"
          value={summaries.in12 ? formatCurrency(summaries.in12.cash_balance) : '-'}
          hint={
            summaries.in12
              ? summaries.in12.cash_balance < 0
                ? `Below zero, ${formatFullMonthYear(summaries.in12.month)}`
                : formatFullMonthYear(summaries.in12.month)
              : undefined
          }
          tone={summaries.in12 && summaries.in12.cash_balance < 0 ? 'danger' : 'default'}
          testId="tile-12"
        />
        <ProjectionTile
          label={`Planned over ${projectionList.length} months`}
          value={
            <span className="block text-base leading-snug">
              <span className="block text-success-700">
                +{formatCurrency(summaries.totalIncome)}
              </span>
              <span className="block text-ink">
                -{formatCurrency(summaries.totalSpending)}
              </span>
              <span className="block text-warning-700">
                {formatCurrency(summaries.totalMovedToFunds)} to funds
              </span>
            </span>
          }
          hint="Income, spending, moved to funds"
          testId="tile-totals"
        />
      </div>

      {/* Cash Balance Chart */}
      <section className="card p-4" aria-label="Projected cash balance">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3">
          <h2 className="section-title">Cash balance</h2>
          <p className="text-xs text-ink-muted">
            {formatFullMonthYear(projectionList[0].month)} to{' '}
            {formatFullMonthYear(projectionList[projectionList.length - 1].month)}
          </p>
        </div>

        <ProjectionChart months={projectionList} lowest={summaries.lowest} />

        {negativeMonthsCount > 0 && (
          <p
            className="mt-2 text-xs font-semibold text-danger-700"
            data-testid="negative-note"
          >
            Below zero in {negativeMonthsCount} of {projectionList.length} months. Months
            below zero are marked in the table.
          </p>
        )}
      </section>

      {/* Month By Month Table */}
      <section className="card p-2 sm:p-4" aria-label="Month by month">
        <h2 className="section-title px-2 pb-2 pt-2 sm:px-0 sm:pt-0">Month by month</h2>

        {/* Funds Filter Pills */}
        {fundsSelection.available.length > 0 && (
          <div
            className="flex flex-wrap items-center gap-2 px-2 pb-2 sm:px-0"
            role="group"
            aria-label="Funds to show"
            data-testid="fund-picker"
          >
            <span className="text-xs font-semibold text-ink-muted">Funds</span>
            <button
              type="button"
              className={`inline-flex min-h-[44px] items-center rounded-full border px-3.5 text-sm font-semibold transition duration-150 motion-safe:active:scale-95 ${
                fundsSelection.picked.length === 0
                  ? 'border-warning-600 bg-warning-600 text-white shadow-sm'
                  : 'border-line-strong bg-white text-ink-soft hover:bg-warning-50'
              }`}
              aria-pressed={fundsSelection.picked.length === 0}
              onClick={fundsSelection.setAll}
            >
              All combined
            </button>
            {fundsSelection.available.map((name) => {
              const isPicked = fundsSelection.picked.includes(name);
              return (
                <button
                  key={name}
                  type="button"
                  className={`inline-flex min-h-[44px] items-center rounded-full border px-3.5 text-sm font-semibold transition duration-150 motion-safe:active:scale-95 ${
                    isPicked
                      ? 'border-warning-600 bg-warning-600 text-white shadow-sm'
                      : 'border-line-strong bg-white text-ink-soft hover:bg-warning-50'
                  }`}
                  aria-pressed={isPicked}
                  onClick={() => fundsSelection.toggle(name)}
                >
                  {name}
                </button>
              );
            })}
          </div>
        )}

        {showScrollHint && (
          <p
            className="px-2 pb-1 text-[11px] font-semibold text-ink-muted sm:px-0"
            data-testid="scroll-hint"
          >
            Scroll sideways to see every fund →
          </p>
        )}

        <div
          className={showScrollHint ? 'overflow-x-auto' : undefined}
          data-testid="projection-scroll"
        >
          <table
            className={`border-collapse text-xs sm:text-sm ${
              showScrollHint ? 'min-w-[38rem]' : 'w-full table-fixed'
            }`}
            data-testid="projection-table"
          >
            <caption className="sr-only">
              Planned income, spending, net movement of funds and main cash balance for
              each month, in PKR
            </caption>
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                <th
                  scope="col"
                  className={`px-2 py-2 ${
                    showScrollHint
                      ? 'sticky left-0 z-10 w-[5.5rem] bg-white'
                      : 'w-[22%]'
                  }`}
                >
                  Month
                </th>
                <th scope="col" className="px-1 py-2 text-right">
                  Income
                </th>
                <th scope="col" className="px-1 py-2 text-right">
                  Spending
                </th>
                <FundHeaderCells selection={fundsSelection} cellClass="px-1 py-2 text-right" />
                <th scope="col" className="px-2 py-2 text-right">
                  Balance
                </th>
              </tr>
            </thead>
            {projectionList.map((m) => {
              const isNegative = m.cash_balance < 0;
              const isLowest = m.month === summaries.lowest.month;
              const majorItems = (m.line_items ?? []).filter(
                (j) => nonRecurringItemKeys.has(j.key) || (j.fund_paid ?? 0) > 0
              );
              const colSpan =
                4 + (fundsSelection.picked.length > 0 ? fundsSelection.picked.length : 1);
              const isExpanded = expandedMonth === m.month;

              return (
                <tbody
                  key={m.month}
                  data-testid="projection-month"
                  data-month={m.month}
                  className="border-t border-line"
                >
                  <tr
                    className={
                      isNegative
                        ? 'bg-danger-50/70'
                        : isLowest
                        ? 'bg-primary-50/60'
                        : ''
                    }
                  >
                    <th
                      scope="row"
                      className={`px-2 py-2 text-left align-top font-semibold text-ink ${
                        showScrollHint ? 'sticky left-0 z-10 bg-white' : ''
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedMonth((prev) => (prev === m.month ? null : m.month))
                        }
                        aria-expanded={isExpanded}
                        aria-label={`${isExpanded ? 'Hide' : 'Show'} details for ${formatFullMonthYear(
                          m.month
                        )}`}
                        className="-ml-1 flex min-h-[44px] items-center gap-1 whitespace-nowrap rounded-lg px-1 text-left font-semibold text-primary-700 hover:bg-primary-50"
                      >
                        <ChevronRight
                          size={14}
                          className={`shrink-0 transition-transform motion-reduce:transition-none ${
                            isExpanded ? 'rotate-90' : ''
                          }`}
                          aria-hidden="true"
                        />
                        {formatFullMonthYear(m.month)}
                      </button>
                      {isNegative && (
                        <span className="mt-0.5 inline-block whitespace-nowrap rounded-full bg-danger-100 px-1.5 py-px text-[10px] font-bold uppercase text-danger-700">
                          Below 0
                        </span>
                      )}
                      {!isNegative && isLowest && (
                        <span className="mt-0.5 inline-block rounded-full bg-primary-100 px-1.5 py-px text-[10px] font-bold uppercase text-primary-700">
                          Lowest
                        </span>
                      )}
                    </th>
                    <td className="num px-1 py-2 text-right align-top text-success-700">
                      {formatIntegerAmount(m.income)}
                    </td>
                    <td className="num px-1 py-2 text-right align-top text-ink-soft">
                      {formatIntegerAmount(m.spending ?? m.costs)}
                    </td>
                    <FundRowCells m={m} selection={fundsSelection} cellClass="px-1 py-2" />
                    <td
                      className={`num px-2 py-2 text-right align-top font-bold ${
                        isNegative ? 'text-danger-700' : 'text-ink'
                      }`}
                    >
                      {formatIntegerAmount(m.cash_balance)}
                    </td>
                  </tr>

                  {/* Expanded Month Breakdown */}
                  {isExpanded && (
                    <tr className={isNegative ? 'bg-danger-50/70' : 'bg-surface-muted/40'}>
                      <td colSpan={colSpan} className="px-2 pb-3 pt-1">
                        <MonthBreakdown month={m} />
                      </td>
                    </tr>
                  )}

                  {/* Collapsed One-Off / Major Planned Expenses */}
                  {!isExpanded && majorItems.length > 0 && (
                    <tr className={isNegative ? 'bg-danger-50/70' : ''}>
                      <td colSpan={colSpan} className="px-2 pb-2 pt-0">
                        <ul
                          className="flex flex-wrap gap-1.5"
                          aria-label={`One-offs in ${formatFullMonthYear(m.month)}`}
                        >
                          {majorItems.map((j) => (
                            <li
                              key={j.key}
                              className={`badge ${
                                j.type === 'income'
                                  ? 'badge-success'
                                  : (j.fund_paid ?? 0) > 0
                                  ? 'badge-info'
                                  : 'badge-warning'
                              }`}
                            >
                              {(j.fund_paid ?? 0) > 0
                                ? `${j.label} -${formatIntegerAmount(
                                    j.final_value + (j.fund_paid ?? 0)
                                  )}: ${formatIntegerAmount(
                                    j.fund_paid ?? 0
                                  )} from ${(j.adjustment_applied ?? '').replace(
                                    /^paid from /,
                                    ''
                                  ) || 'fund'}${
                                    j.final_value > 0
                                      ? `, ${formatIntegerAmount(j.final_value)} cash`
                                      : ''
                                  }`
                                : `One-off: ${j.label} ${
                                    j.type === 'income' ? '+' : '-'
                                  }${formatIntegerAmount(Math.abs(j.final_value))}`}
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                </tbody>
              );
            })}
          </table>
        </div>
        <p
          className="px-2 pt-2 text-[11px] text-ink-muted sm:px-0"
          data-testid="projection-legend"
        >
          Tap a month to see exactly what makes it up. Balance = main cash only. Funds =
          money moved into (+) or paid out of (-) your funds. All figures in PKR.
        </p>
      </section>

      {/* About this projection */}
      {aboutSection}
    </div>
  );
}
