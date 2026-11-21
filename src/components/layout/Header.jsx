import React from 'react';
import { ChevronLeft, Settings } from 'lucide-react';
import { goBack, getRouteByPath, Link } from '../../hooks/useRouter';

export function Header({ route, sticky = true }) {
  const parentRoute = route.parent ? getRouteByPath(route.parent) : null;
  const isRoot = parentRoute === null;
  const isSettings = route.path.startsWith('/settings');

  return (
    <header
      className={`${sticky ? 'sticky top-0' : 'relative shrink-0'} z-20 bg-canvas/80 backdrop-blur-xl`}
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="mx-auto w-full max-w-4xl px-4 pb-2 pt-3 md:px-6 lg:max-w-5xl">
        {!isRoot && parentRoute && (
          <button
            type="button"
            onClick={goBack}
            className="-ml-3 mb-0.5 inline-flex min-h-[44px] items-center gap-0.5 rounded-full pl-1 pr-3 text-sm font-semibold text-primary-700 transition hover:bg-primary-50 motion-safe:active:scale-95"
            aria-label={`Back to ${parentRoute.title}`}
          >
            <ChevronLeft size={22} aria-hidden="true" />
            {parentRoute.title}
          </button>
        )}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1
              data-page-heading=""
              tabIndex={-1}
              className="text-2xl font-bold tracking-tight text-ink truncate leading-tight outline-none"
            >
              {route.title}
            </h1>
            {route.subtitle && (
              <p className="mt-0.5 text-sm text-ink-muted">{route.subtitle}</p>
            )}
          </div>
          {isRoot && !isSettings && (
            <Link
              to="/settings"
              aria-label="Settings"
              className="icon-btn -mr-2 shrink-0 bg-white/80 border border-line shadow-card lg:hidden"
            >
              <Settings size={20} aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
