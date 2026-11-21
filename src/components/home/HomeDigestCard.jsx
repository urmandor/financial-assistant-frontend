import React from 'react';
import { Sparkles } from 'lucide-react';
import { useDigests } from '../../hooks/useQueries';
import { SectionHeader } from '../common/SectionHeader';
import { ErrorMessage, formatError } from '../common/ErrorMessage';
import { LoadingSkeleton } from '../common/LoadingSkeleton';
import { Link } from '../../hooks/useRouter';
import { formatCurrency } from '../../utils/formatters';

export function HomeDigestCard() {
  const digestsQuery = useDigests();
  const latestDigest = digestsQuery.data?.digests?.[0];

  if (digestsQuery.isPending) {
    return <LoadingSkeleton label="Loading digest" rows={1} />;
  }

  const payload = latestDigest?.payload;
  const changePct = payload?.spend?.change_pct ?? null;
  const changeAmount = payload?.spend?.change_amount ?? 0;
  const isUp = changeAmount > 0;

  return (
    <section
      className="card relative overflow-hidden p-4"
      aria-label="Weekly digest"
      data-testid="home-digest"
    >
      <div
        className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary-600 via-violet-500 to-accent-500"
        aria-hidden="true"
      />
      <SectionHeader
        title="Weekly digest"
        to="/digest"
        action={latestDigest ? 'Open' : 'Generate'}
      />

      {digestsQuery.isError && (
        <ErrorMessage
          message={formatError(digestsQuery.error, 'Failed to load the digest')}
          onRetry={() => digestsQuery.refetch()}
          busy={digestsQuery.isFetching}
        />
      )}

      {digestsQuery.isSuccess && !latestDigest && (
        <p className="mt-2 text-sm text-ink-muted">
          No digest yet. One is generated every Monday morning, or generate one now.
        </p>
      )}

      {latestDigest && payload && (
        <Link
          to="/digest"
          className="mt-2 flex items-start gap-3 rounded-2xl transition hover:bg-surface-muted/50"
        >
          <span
            className="icon-chip bg-primary-50 text-primary-600 shrink-0"
            aria-hidden="true"
          >
            <Sparkles size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2 text-xs text-ink-muted">
              {latestDigest.period_start} to {latestDigest.period_end}
              {!latestDigest.read_at && (
                <span className="badge badge-primary !py-0">NEW</span>
              )}
            </span>
            <span className="num mt-0.5 block text-lg font-extrabold text-ink">
              {formatCurrency(payload.spend.total)}
            </span>
            <span
              className={`num block text-xs font-semibold ${
                changePct === null
                  ? 'text-ink-muted'
                  : isUp
                  ? 'text-warning-700'
                  : 'text-success-700'
              }`}
            >
              {changePct === null
                ? 'Nothing logged the week before'
                : `${isUp ? 'Up' : changeAmount < 0 ? 'Down' : 'Flat'} ${Math.abs(
                    changePct
                  )}% vs previous week`}
            </span>
          </span>
        </Link>
      )}
    </section>
  );
}
