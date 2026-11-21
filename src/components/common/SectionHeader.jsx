import React from 'react';
import { Link } from '../../hooks/useRouter';

export function SectionHeader({ title, to, action = 'See all', right }) {
  return (
    <div className="flex min-h-[32px] items-center justify-between gap-3">
      <h2 className="section-title">{title}</h2>
      {right}
      {to && (
        <Link
          to={to}
          className="-mr-2 inline-flex min-h-[44px] items-center rounded-full px-3 text-sm font-semibold text-primary-700 hover:bg-primary-50"
        >
          {action}
        </Link>
      )}
    </div>
  );
}
