import React, { useState } from 'react';
import { Plus, Trash2, Users } from 'lucide-react';
import {
  usePeople,
  useCreatePerson,
  useUpdatePerson,
  useDeletePerson,
} from '../hooks/useQueries';
import { ErrorMessage, formatError } from '../components/common/ErrorMessage';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { formatCurrency } from '../utils/formatters';
import { useToast } from '../hooks/useToast';

export function PeoplePage() {
  const toast = useToast();
  const peopleQuery = usePeople();
  const createMutation = useCreatePerson();
  const deleteMutation = useDeletePerson();

  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);

  const people = peopleQuery.data?.people ?? [];

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setErrorMsg(null);
    try {
      await createMutation.mutateAsync(name.trim());
      toast.show({ message: `Added ${name}` });
      setName('');
      setIsAdding(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to add person');
    }
  };

  const handleDelete = async (personName) => {
    try {
      await deleteMutation.mutateAsync({ name: personName, confirm: true });
      toast.show({ message: `Deleted ${personName}` });
    } catch {
      toast.show({ message: 'Failed to delete' });
    }
  };

  if (peopleQuery.isPending) {
    return <LoadingSkeleton label="Loading people" rows={3} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-ink">People</h2>
          <p className="text-xs text-ink-muted">
            Track money you spent on behalf of others or are owed.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsAdding((prev) => !prev);
            setErrorMsg(null);
          }}
          className="btn-primary"
        >
          <Plus size={16} aria-hidden="true" />
          Add person
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleCreate} className="card p-4 space-y-3">
          <h3 className="text-sm font-bold text-ink">Add person</h3>
          {errorMsg && <div className="alert-error text-xs">{errorMsg}</div>}
          <div className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Person's name (e.g. Ali, Sarah)"
              className="input flex-1"
              autoFocus
            />
            <button
              type="submit"
              disabled={createMutation.isPending || !name.trim()}
              className="btn-primary text-xs shrink-0"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="btn-secondary text-xs shrink-0"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {peopleQuery.isError && (
        <ErrorMessage
          message={formatError(peopleQuery.error, 'Failed to load people')}
          onRetry={() => peopleQuery.refetch()}
          busy={peopleQuery.isFetching}
        />
      )}

      {people.length === 0 && !isAdding && (
        <div className="card py-10 text-center space-y-2">
          <p className="text-sm font-semibold text-ink">No people tracked yet</p>
          <p className="text-xs text-ink-muted">
            Add people to keep track of shared expenses, split bills, and reimbursements.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {people.map((p) => {
          const balance = Number(p.balance) || 0;
          const isOwed = balance > 0;
          const owesYou = balance < 0;

          return (
            <div key={p.name} className="card p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="icon-chip h-10 w-10 bg-primary-50 text-primary-600 rounded-2xl font-bold">
                  {p.name[0]?.toUpperCase()}
                </span>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-ink">{p.name}</h3>
                  <p className="text-xs text-ink-muted">
                    {balance === 0
                      ? 'Settled up'
                      : isOwed
                      ? 'Owes you'
                      : 'You owe'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`num font-bold text-sm ${
                    balance === 0
                      ? 'text-ink-muted'
                      : isOwed
                      ? 'text-success-600'
                      : 'text-danger-600'
                  }`}
                >
                  {formatCurrency(balance)}
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(p.name)}
                  className="icon-btn h-8 w-8 text-ink-muted hover:text-danger-600"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
