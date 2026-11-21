import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useIsFetching, useIsMutating } from '@tanstack/react-query';
import { useRouter, navigate } from '../../hooks/useRouter';
import { useAlerts, useDeleteTransaction } from '../../hooks/useQueries';
import { useToast } from '../../hooks/useToast';
import { Header } from './Header';
import { DesktopRail } from './DesktopRail';
import { MobileNav } from './MobileNav';
import { QuickAddModal } from '../modals/QuickAddModal';
import { EditTransactionModal } from '../modals/EditTransactionModal';
import { formatUndoToast } from '../../utils/formatters';

// Pages
import { HomePage } from '../../pages/HomePage';
import { AlertsPage } from '../../pages/AlertsPage';
import { DigestPage } from '../../pages/DigestPage';
import { ActivityPage } from '../../pages/ActivityPage';
import { PlanPage } from '../../pages/PlanPage';
import { BudgetsPage } from '../../pages/BudgetsPage';
import { IncomeCostsPage } from '../../pages/IncomeCostsPage';
import { GoalsPage } from '../../pages/GoalsPage';
import { FundsPage } from '../../pages/FundsPage';
import { ProjectionPage } from '../../pages/ProjectionPage';
import { ChatPage } from '../../pages/ChatPage';
import { SettingsPage } from '../../pages/SettingsPage';
import { CategoriesPage } from '../../pages/CategoriesPage';
import { RulesPage } from '../../pages/RulesPage';
import { AccountsPage } from '../../pages/AccountsPage';
import { PeoplePage } from '../../pages/PeoplePage';
import { DataPage } from '../../pages/DataPage';

const ROUTE_COMPONENTS = {
  '/home': HomePage,
  '/alerts': AlertsPage,
  '/digest': DigestPage,
  '/activity': ActivityPage,
  '/plan': PlanPage,
  '/plan/budgets': BudgetsPage,
  '/plan/items': IncomeCostsPage,
  '/plan/goals': GoalsPage,
  '/plan/funds': FundsPage,
  '/plan/projection': ProjectionPage,
  '/chat': ChatPage,
  '/settings': SettingsPage,
  '/settings/categories': CategoriesPage,
  '/settings/rules': RulesPage,
  '/settings/accounts': AccountsPage,
  '/settings/people': PeoplePage,
  '/settings/data': DataPage,
};

const APP_TITLE = 'Financial Assistant';

export function AppShell() {
  const { route, path } = useRouter();
  const toast = useToast();
  const deleteTxMutation = useDeleteTransaction();

  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);

  const mainScrollRef = useRef(null);
  const prevPathRef = useRef(null);

  // Handle ?quick=1 shortcut on launch
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('quick') === '1') {
      url.searchParams.delete('quick');
      window.history.replaceState(
        window.history.state,
        '',
        `${url.pathname}${url.search}${url.hash}`
      );
      if (!url.hash) {
        navigate('/home', { replace: true });
      }
      setIsQuickAddOpen(true);
    }
  }, []);

  // Scroll to top and title update on navigation
  useEffect(() => {
    if (prevPathRef.current === path) return;
    prevPathRef.current = path;

    document.title = `${route.title} · ${APP_TITLE}`;
    mainScrollRef.current?.scrollTo({ top: 0 });

    const heading = document.querySelector('[data-page-heading]');
    heading?.focus({ preventScroll: true });
  }, [path, route]);

  const scrollToTop = useCallback(() => {
    mainScrollRef.current?.scrollTo({ top: 0 });
  }, []);

  const handleCreatedTransaction = useCallback(
    (created) => {
      toast.show({
        message: formatUndoToast(created),
        actionLabel: 'Undo',
        onAction: () => {
          deleteTxMutation.mutateAsync(created.id).then(
            () => toast.show({ message: 'Removed transaction', durationMs: 4000 }),
            (err) =>
              toast.show({
                message: err instanceof Error ? `Undo failed: ${err.message}` : 'Undo failed',
              })
          );
        },
      });
    },
    [toast, deleteTxMutation]
  );

  const alertsQuery = useAlerts();
  const alertCounts = alertsQuery.data?.counts ?? null;
  const isNetworkBusy = useIsFetching() + useIsMutating() > 0;

  const PageComponent = ROUTE_COMPONENTS[path] ?? HomePage;
  const isFillLayout = route.layout === 'fill';

  return (
    <div className="relative flex h-[100dvh] overflow-hidden bg-canvas">
      {/* Desktop Rail Nav */}
      <DesktopRail
        route={route}
        alertCounts={alertCounts}
        onAdd={() => setIsQuickAddOpen(true)}
        onScrollTop={scrollToTop}
      />

      {/* Main Content Area */}
      <div className="relative flex min-w-0 flex-1 flex-col">
        {/* Top Loading Progress Bar */}
        {isNetworkBusy && (
          <div
            role="progressbar"
            aria-label="Loading data"
            aria-busy="true"
            className="pointer-events-none absolute inset-x-0 top-0 z-40 h-0.5 overflow-hidden bg-primary-100"
            style={{ top: 'env(safe-area-inset-top, 0px)' }}
          >
            <div className="progress-indeterminate h-full rounded-full bg-gradient-to-r from-primary-600 to-violet-600" />
          </div>
        )}

        <main
          id="main"
          ref={mainScrollRef}
          className={`relative min-h-0 flex-1 ${
            isFillLayout
              ? 'overflow-hidden'
              : 'overflow-y-auto overflow-x-hidden overscroll-contain'
          }`}
        >
          <div
            className={`relative motion-safe:animate-page-in ${
              isFillLayout ? 'flex h-full flex-col' : 'min-h-full'
            }`}
          >
            <div
              className="wash pointer-events-none absolute inset-x-0 top-0 h-72"
              aria-hidden="true"
            />
            <Header route={route} sticky={!isFillLayout} />
            <div
              className={`relative z-10 mx-auto w-full max-w-4xl px-4 md:px-6 lg:max-w-5xl ${
                isFillLayout
                  ? 'flex min-h-0 flex-1 flex-col pb-3 pt-3'
                  : 'space-y-6 pb-10 pt-2'
              }`}
            >
              <PageComponent
                onOpenAdd={() => setIsQuickAddOpen(true)}
                onEditTransaction={(tx) => setEditingTransaction(tx)}
              />
            </div>
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileNav
          route={route}
          alertCounts={alertCounts}
          onAdd={() => setIsQuickAddOpen(true)}
          onScrollTop={scrollToTop}
        />
      </div>

      {/* Modals */}
      <QuickAddModal
        open={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onCreated={handleCreatedTransaction}
      />

      <EditTransactionModal
        transaction={editingTransaction}
        open={Boolean(editingTransaction)}
        onClose={() => setEditingTransaction(null)}
      />
    </div>
  );
}
