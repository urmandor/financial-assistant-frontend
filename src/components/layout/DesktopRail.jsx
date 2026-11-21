import React from 'react';
import {
  House,
  ReceiptText,
  Target,
  MessageCircle,
  Plus,
  Settings,
  LogOut,
} from 'lucide-react';
import { TAB_ROOTS, navigate, toHash, Link } from '../../hooks/useRouter';
import { signOut } from '../../hooks/useAuth';
import { AlertBadge } from './AlertBadge';

const TABS = [
  { key: 'home', label: 'Home', icon: House },
  { key: 'activity', label: 'Activity', icon: ReceiptText },
  { key: 'plan', label: 'Plan', icon: Target },
  { key: 'chat', label: 'Chat', icon: MessageCircle },
];

export function DesktopRail({ route, alertCounts, onAdd, onScrollTop }) {
  const currentTab = route.tab ?? 'home';
  const isSettings = route.path.startsWith('/settings');

  const handleTabClick = (tabKey) => (e) => {
    if (
      e.defaultPrevented ||
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey
    ) {
      return;
    }
    e.preventDefault();
    const targetPath = TAB_ROOTS[tabKey];
    navigate(targetPath);
    if (currentTab === tabKey && onScrollTop) {
      onScrollTop();
    }
  };

  const getLinkClasses = (active) =>
    `flex min-h-[48px] items-center gap-3 rounded-2xl px-3 text-sm font-semibold transition-colors ${
      active
        ? 'bg-primary-50 text-primary-700'
        : 'text-ink-soft hover:bg-surface-muted hover:text-ink'
    }`;

  return (
    <nav
      aria-label="Primary"
      className="hidden w-64 shrink-0 flex-col border-r border-line bg-white/75 px-4 pb-6 pt-6 backdrop-blur-xl lg:flex"
    >
      <div className="mb-6 flex items-center gap-3 px-1">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-600 to-violet-600 shadow-glow">
          <span className="text-base font-extrabold text-white" aria-hidden="true">
            ₨
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-base font-bold leading-tight tracking-tight text-ink">
            Financial Assistant
          </p>
          <p className="text-xs text-ink-muted">AI-powered finance tracker</p>
        </div>
      </div>

      <ul className="space-y-1">
        {TABS.map(({ key, label, icon: Icon }) => {
          const isActive = currentTab === key && !isSettings;
          return (
            <li key={key}>
              <a
                href={toHash(TAB_ROOTS[key])}
                onClick={handleTabClick(key)}
                aria-current={isActive ? 'page' : undefined}
                className={getLinkClasses(isActive)}
              >
                <span className="relative">
                  <Icon size={20} aria-hidden="true" />
                  {key === 'home' && (
                    <AlertBadge
                      counts={alertCounts}
                      className="absolute -right-2.5 -top-2"
                    />
                  )}
                </span>
                {label}
              </a>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={onAdd}
        className="btn-primary mt-5 w-full"
        data-testid="rail-add"
      >
        <Plus size={20} strokeWidth={2.5} aria-hidden="true" />
        Add expense
      </button>

      <div className="mt-auto space-y-1 border-t border-line pt-4">
        <Link
          to="/settings"
          aria-current={isSettings ? 'page' : undefined}
          className={getLinkClasses(isSettings)}
        >
          <Settings size={20} aria-hidden="true" />
          Settings
        </Link>
        <button
          type="button"
          onClick={() => signOut()}
          className={`${getLinkClasses(false)} w-full text-left`}
        >
          <LogOut size={20} aria-hidden="true" />
          Sign out
        </button>
      </div>
    </nav>
  );
}
