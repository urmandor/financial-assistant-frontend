import React from 'react';
import { House, ReceiptText, Target, MessageCircle, Plus } from 'lucide-react';
import { TAB_ROOTS, navigate, toHash } from '../../hooks/useRouter';
import { AlertBadge } from './AlertBadge';

const TABS = {
  home: { label: 'Home', icon: House },
  activity: { label: 'Activity', icon: ReceiptText },
  plan: { label: 'Plan', icon: Target },
  chat: { label: 'Chat', icon: MessageCircle },
};

export function MobileNav({ route, alertCounts, onAdd, onScrollTop }) {
  const currentTab = route.tab ?? 'home';

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
    navigate(TAB_ROOTS[tabKey]);
    if (currentTab === tabKey && onScrollTop) {
      onScrollTop();
    }
  };

  const renderTabItem = (key) => {
    const { label, icon: Icon } = TABS[key];
    const isActive = currentTab === key;

    return (
      <li key={key} className="flex">
        <a
          href={toHash(TAB_ROOTS[key])}
          onClick={handleTabClick(key)}
          aria-current={isActive ? 'page' : undefined}
          className={`flex min-h-[56px] w-full flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-semibold leading-none transition-colors ${
            isActive ? 'text-primary-700' : 'text-ink-muted hover:text-ink'
          }`}
        >
          <span
            className={`relative flex h-7 w-12 items-center justify-center rounded-full transition-colors motion-reduce:transition-none ${
              isActive ? 'bg-primary-100' : ''
            }`}
          >
            <Icon
              size={21}
              strokeWidth={isActive ? 2.4 : 2}
              aria-hidden="true"
            />
            {key === 'home' && (
              <AlertBadge
                counts={alertCounts}
                className="absolute -right-0.5 -top-1.5"
              />
            )}
          </span>
          {label}
        </a>
      </li>
    );
  };

  return (
    <nav
      aria-label="Primary"
      className="relative z-30 shrink-0 pt-3.5 lg:hidden"
    >
      <div
        className="border-t border-line bg-white/95 shadow-[0_-8px_24px_-14px_rgba(15,23,42,0.25)] backdrop-blur-xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <ul className="mx-auto grid max-w-lg grid-cols-5 px-2">
          {renderTabItem('home')}
          {renderTabItem('activity')}
          <li className="flex items-start justify-center">
            <button
              type="button"
              onClick={onAdd}
              aria-label="Add expense"
              data-testid="quick-add-fab"
              className="-mt-[26px] inline-flex h-14 w-14 items-center justify-center rounded-full text-white shadow-glow ring-4 ring-canvas transition duration-150 hover:brightness-110 motion-safe:active:scale-95"
              style={{
                backgroundImage:
                  'linear-gradient(135deg, #4f46e5 0%, #7c3aed 55%, #db2777 100%)',
              }}
            >
              <Plus size={28} strokeWidth={2.5} aria-hidden="true" />
            </button>
          </li>
          {renderTabItem('plan')}
          {renderTabItem('chat')}
        </ul>
      </div>
    </nav>
  );
}
