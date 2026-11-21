import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { getCategoryColor } from '../../utils/categories';
import { formatCurrency } from '../../utils/formatters';

const TOOLTIP_STYLE = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #E6E8F0',
  borderRadius: '1rem',
  color: '#0F172A',
  boxShadow: '0 12px 32px -12px rgba(15, 23, 42, 0.25)',
  fontSize: 13,
};

export function CategoryPieChart({ data = {} }) {
  const items = Object.entries(data)
    .map(([category, amount]) => ({
      category,
      total: Number(Number(amount).toFixed(2)),
    }))
    .sort((a, b) => b.total - a.total);

  if (items.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-ink-muted">
        No spending data yet
      </div>
    );
  }

  const grandTotal = items.reduce((sum, item) => sum + item.total, 0);
  const maxTotal = items[0].total;

  return (
    <div className="grid min-w-0 gap-6 md:grid-cols-2 md:items-center">
      <div className="min-w-0">
        <h3 className="mb-2 text-sm font-semibold text-ink">
          Spending by category
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={items}
              dataKey="total"
              nameKey="category"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={88}
              paddingAngle={2}
              stroke="#FFFFFF"
              strokeWidth={2}
              labelLine={false}
            >
              {items.map((item) => (
                <Cell
                  key={item.category}
                  fill={getCategoryColor(item.category).fill}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(val) => [formatCurrency(val, { decimals: 2 })]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul
        className="min-w-0 space-y-3"
        aria-label="Spending by category, largest first"
      >
        {items.map((item) => {
          const color = getCategoryColor(item.category);
          const pct = Math.round((item.total / grandTotal) * 100);
          const barWidth = Math.max(2, (item.total / maxTotal) * 100);

          return (
            <li key={item.category} className="min-w-0">
              <div className="flex items-baseline justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-ink">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: color.fill }}
                    aria-hidden="true"
                  />
                  <span className="truncate">{item.category}</span>
                </span>
                <span className="num shrink-0 text-sm font-semibold text-ink">
                  {formatCurrency(item.total)}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${barWidth}%`,
                      backgroundColor: color.fill,
                    }}
                  />
                </div>
                <span className="num w-9 shrink-0 text-right text-[11px] text-ink-muted">
                  {pct}%
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
