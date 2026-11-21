import React from 'react';
import {
  Tags,
  ListChecks,
  Wallet,
  Users,
  Database,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { Link } from '../hooks/useRouter';
import { signOut } from '../hooks/useAuth';

const SETTINGS_SECTIONS = [
  {
    to: '/settings/categories',
    title: 'Categories',
    subtitle: 'Manage expense & income categories and custom colors',
    icon: Tags,
    tone: 'bg-primary-50 text-primary-600',
  },
  {
    to: '/settings/rules',
    title: 'Rules',
    subtitle: 'Auto-assign categories based on merchant names',
    icon: ListChecks,
    tone: 'bg-amber-50 text-amber-600',
  },
  {
    to: '/settings/accounts',
    title: 'Accounts',
    subtitle: 'Cash, bank accounts, credit cards, and balances',
    icon: Wallet,
    tone: 'bg-emerald-50 text-emerald-600',
  },
  {
    to: '/settings/people',
    title: 'People',
    subtitle: 'Track money spent on behalf of others or received',
    icon: Users,
    tone: 'bg-rose-50 text-rose-600',
  },
  {
    to: '/settings/data',
    title: 'Data & Backup',
    subtitle: 'Import CSV records, download JSON backups',
    icon: Database,
    tone: 'bg-violet-50 text-violet-600',
  },
];

export function SettingsPage() {
  return (
    <div className="space-y-4">
      <div className="card divide-y divide-line p-1">
        {SETTINGS_SECTIONS.map(({ to, title, subtitle, icon: Icon, tone }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center justify-between gap-3 p-3.5 transition hover:bg-surface-muted/60 motion-safe:active:scale-[0.99]"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className={`icon-chip h-10 w-10 rounded-2xl ${tone}`}>
                <Icon size={20} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-ink">{title}</h3>
                <p className="text-xs text-ink-muted truncate">{subtitle}</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-ink-muted shrink-0" />
          </Link>
        ))}
      </div>

      <div className="card p-4">
        <button
          type="button"
          onClick={() => signOut()}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-danger-200 bg-danger-50 px-4 text-sm font-semibold text-danger-700 transition hover:bg-danger-100"
        >
          <LogOut size={18} aria-hidden="true" />
          Sign out of Financial Assistant
        </button>
      </div>

      <div className="text-center text-xs text-ink-muted py-2 space-y-1">
        <p className="font-semibold text-ink">Financial Assistant</p>
        <p>AI-powered personal finance tracker</p>
      </div>
    </div>
  );
}
