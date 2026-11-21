import React from 'react';
import { Sparkles, LoaderCircle, CheckCheck } from 'lucide-react';
import { useDigests, useGenerateDigest, useMarkDigestRead } from '../hooks/useQueries';
import { ErrorMessage, formatError } from '../components/common/ErrorMessage';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { useToast } from '../hooks/useToast';
import { formatDateLabel } from '../utils/dates';

export function DigestPage() {
  const toast = useToast();
  const digestsQuery = useDigests(8);
  const generateMutation = useGenerateDigest();
  const markReadMutation = useMarkDigestRead();

  const digests = digestsQuery.data?.digests ?? [];

  const handleGenerate = async () => {
    try {
      await generateMutation.mutateAsync();
      toast.show({ message: 'New weekly digest generated!' });
    } catch (err) {
      toast.show({
        message: err instanceof Error ? err.message : 'Failed to generate digest',
      });
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await markReadMutation.mutateAsync(id);
    } catch {}
  };

  if (digestsQuery.isPending) {
    return <LoadingSkeleton label="Loading digests" rows={3} />;
  }

  return (
    <div className="space-y-4">
      {/* Header action card */}
      <div className="card flex items-center justify-between p-4">
        <div>
          <h2 className="text-base font-bold text-ink">AI Financial Digest</h2>
          <p className="text-xs text-ink-muted">
            Weekly recaps of your spending, savings, and pacing.
          </p>
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generateMutation.isPending}
          className="btn-primary shrink-0"
        >
          {generateMutation.isPending ? (
            <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
          ) : (
            <Sparkles size={16} aria-hidden="true" />
          )}
          Generate now
        </button>
      </div>

      {digestsQuery.isError && (
        <ErrorMessage
          message={formatError(digestsQuery.error, 'Failed to load digests')}
          onRetry={() => digestsQuery.refetch()}
          busy={digestsQuery.isFetching}
        />
      )}

      {digestsQuery.isSuccess && digests.length === 0 && (
        <div className="card py-12 text-center space-y-3">
          <p className="text-sm font-semibold text-ink">No digests yet</p>
          <p className="text-xs text-ink-muted">
            Click "Generate now" to get an AI summary of your recent finances.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {digests.map((digest) => (
          <article
            key={digest.id}
            className={`card space-y-3 p-5 transition ${
              digest.unread ? 'border-primary-300 ring-2 ring-primary-100' : ''
            }`}
            onClick={() => digest.unread && handleMarkRead(digest.id)}
          >
            <div className="flex items-center justify-between gap-2 border-b border-line pb-3">
              <div>
                <h3 className="text-sm font-bold text-ink">
                  {digest.title || 'Weekly financial recap'}
                </h3>
                <p className="text-xs text-ink-muted">
                  {formatDateLabel(digest.created_at?.slice(0, 10))}
                </p>
              </div>
              {digest.unread && (
                <span className="badge badge-primary">New</span>
              )}
            </div>

            <div className="prose prose-sm text-sm text-ink-soft whitespace-pre-line leading-relaxed">
              {digest.content || digest.summary}
            </div>

            {digest.highlights && digest.highlights.length > 0 && (
              <ul className="mt-3 space-y-1 rounded-2xl bg-surface-muted p-3 text-xs text-ink-soft">
                {digest.highlights.map((h, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-600" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
