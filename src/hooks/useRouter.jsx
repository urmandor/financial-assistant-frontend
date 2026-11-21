import React, { useSyncExternalStore, useMemo, useEffect } from 'react';

export const ROUTES = [
  {
    path: '/home',
    title: 'Home',
    subtitle: 'This month at a glance',
    parent: null,
    tab: 'home',
  },
  {
    path: '/alerts',
    title: 'Alerts',
    subtitle: 'What needs your attention',
    parent: '/home',
    tab: 'home',
  },
  {
    path: '/digest',
    title: 'Weekly digest',
    subtitle: 'Your week in numbers',
    parent: '/home',
    tab: 'home',
  },
  {
    path: '/activity',
    title: 'Activity',
    subtitle: 'Every transaction, by day',
    parent: null,
    tab: 'activity',
  },
  {
    path: '/plan',
    title: 'Plan',
    subtitle: 'Budgets, income, goals and projection',
    parent: null,
    tab: 'plan',
  },
  {
    path: '/plan/budgets',
    title: 'Budgets',
    subtitle: 'Monthly limits and how you are doing',
    parent: '/plan',
    tab: 'plan',
  },
  {
    path: '/plan/items',
    title: 'Income & costs',
    subtitle: 'What drives your projection',
    parent: '/plan',
    tab: 'plan',
  },
  {
    path: '/plan/goals',
    title: 'Goals',
    subtitle: 'Savings targets and progress',
    parent: '/plan',
    tab: 'plan',
  },
  {
    path: '/plan/funds',
    title: 'Funds',
    subtitle: 'Money you are setting aside',
    parent: '/plan',
    tab: 'plan',
  },
  {
    path: '/plan/projection',
    title: 'Projection',
    subtitle: 'Your cash balance, month by month',
    parent: '/plan',
    tab: 'plan',
  },
  {
    path: '/chat',
    title: 'Chat',
    subtitle: 'Ask anything about your money',
    parent: null,
    tab: 'chat',
    layout: 'fill',
  },
  {
    path: '/settings',
    title: 'Settings',
    subtitle: 'Categories, rules, accounts and data',
    parent: '/home',
    tab: null,
  },
  {
    path: '/settings/categories',
    title: 'Categories',
    parent: '/settings',
    tab: null,
  },
  {
    path: '/settings/rules',
    title: 'Rules',
    parent: '/settings',
    tab: null,
  },
  {
    path: '/settings/accounts',
    title: 'Accounts',
    parent: '/settings',
    tab: null,
  },
  {
    path: '/settings/people',
    title: 'People',
    subtitle: 'Money you spend on behalf of others',
    parent: '/settings',
    tab: null,
  },
  {
    path: '/settings/data',
    title: 'Data',
    subtitle: 'Export and back up your records',
    parent: '/settings',
    tab: null,
  },
];

export const DEFAULT_PATH = '/home';
export const TAB_ROOTS = {
  home: '/home',
  activity: '/activity',
  plan: '/plan',
  chat: '/chat',
};

const routesByPath = new Map(ROUTES.map((r) => [r.path, r]));

function normalizePath(raw) {
  let p = raw.startsWith('#') ? raw.slice(1) : raw;
  const qIdx = p.indexOf('?');
  if (qIdx >= 0) p = p.slice(0, qIdx);
  if (!p.startsWith('/')) p = `/${p}`;
  p = p.replace(/\/{2,}/g, '/');
  if (p.length > 1) p = p.replace(/\/+$/, '');
  return p.toLowerCase();
}

export function getRouteByPath(rawPath) {
  return routesByPath.get(normalizePath(rawPath)) ?? null;
}

export function resolveRoute(rawPath) {
  return getRouteByPath(rawPath) ?? routesByPath.get(DEFAULT_PATH);
}

export function toHash(path) {
  return `#${path}`;
}

const ROUTE_EVENT = 'fa:route';

function getHistoryStep() {
  const state = window.history.state;
  return typeof state?.fa === 'number' ? state.fa : 0;
}

function subscribeToRoute(callback) {
  window.addEventListener('hashchange', callback);
  window.addEventListener('popstate', callback);
  window.addEventListener(ROUTE_EVENT, callback);
  return () => {
    window.removeEventListener('hashchange', callback);
    window.removeEventListener('popstate', callback);
    window.removeEventListener(ROUTE_EVENT, callback);
  };
}

export function getCurrentHash() {
  return window.location.hash;
}

export function getCurrentPath() {
  return resolveRoute(getCurrentHash()).path;
}

export function navigate(path, options = {}) {
  const targetHash = toHash(path);
  if (window.location.hash === targetHash) return;

  const currentStep = getHistoryStep();
  if (options.replace) {
    window.history.replaceState({ fa: currentStep }, '', targetHash);
  } else {
    window.history.pushState({ fa: currentStep + 1 }, '', targetHash);
  }
  window.dispatchEvent(new Event(ROUTE_EVENT));
}

export function goBack() {
  const step = getHistoryStep();
  const currentPath = getCurrentPath();
  const currentRoute = getRouteByPath(currentPath);

  if (step > 0) {
    window.history.back();
  } else {
    const parentPath = currentRoute?.parent ?? DEFAULT_PATH;
    navigate(parentPath, { replace: true });
  }
}

export function useRouter() {
  const hash = useSyncExternalStore(subscribeToRoute, getCurrentHash, () => '');
  const route = useMemo(() => resolveRoute(hash), [hash]);

  useEffect(() => {
    if (hash !== toHash(route.path)) {
      navigate(route.path, { replace: true });
    }
  }, [hash, route]);

  return { route, path: route.path };
}

export function Link({ to, replace, onClick, children, ...rest }) {
  const handleClick = (e) => {
    if (onClick) onClick(e);
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
    navigate(to, { replace });
  };

  return (
    <a href={toHash(to)} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
}
