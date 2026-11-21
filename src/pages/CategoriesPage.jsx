import React, { useState } from 'react';
import { Plus, Trash2, Pencil, Check } from 'lucide-react';
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from '../hooks/useQueries';
import { ErrorMessage, formatError } from '../components/common/ErrorMessage';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { getCategoryColor } from '../utils/categories';
import { useToast } from '../hooks/useToast';

export function CategoriesPage() {
  const toast = useToast();
  const categoriesQuery = useCategories();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  const [isAdding, setIsAdding] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [editName, setEditName] = useState('');
  const [deletingCategory, setDeletingCategory] = useState(null);
  const [reassignTarget, setReassignTarget] = useState('Uncategorized');
  const [errorMsg, setErrorMsg] = useState(null);

  const categories = categoriesQuery.data?.categories ?? [];

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    setErrorMsg(null);
    try {
      await createMutation.mutateAsync({ name: newCategoryName.trim() });
      toast.show({ message: `Created category "${newCategoryName}"` });
      setNewCategoryName('');
      setIsAdding(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create category');
    }
  };

  const handleUpdate = async (oldName) => {
    if (!editName.trim() || editName.trim() === oldName) {
      setEditingCategory(null);
      return;
    }
    try {
      await updateMutation.mutateAsync({ name: oldName, newName: editName.trim() });
      toast.show({ message: `Renamed to "${editName}"` });
      setEditingCategory(null);
    } catch (err) {
      toast.show({ message: 'Failed to update category' });
    }
  };

  const handleDelete = async (categoryName) => {
    try {
      await deleteMutation.mutateAsync({
        name: categoryName,
        reassignTo: reassignTarget,
      });
      toast.show({ message: `Deleted "${categoryName}"` });
      setDeletingCategory(null);
    } catch (err) {
      toast.show({ message: 'Failed to delete category' });
    }
  };

  if (categoriesQuery.isPending) {
    return <LoadingSkeleton label="Loading categories" rows={5} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-ink">Categories</h2>
          <p className="text-xs text-ink-muted">Organize spending & income items.</p>
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
          Add category
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleCreate} className="card p-4 space-y-3">
          <h3 className="text-sm font-bold text-ink">New category</h3>
          {errorMsg && <div className="alert-error text-xs">{errorMsg}</div>}
          <div className="flex gap-2">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="e.g. Subscriptions, Gym"
              className="input flex-1"
              autoFocus
            />
            <button
              type="submit"
              disabled={createMutation.isPending || !newCategoryName.trim()}
              className="btn-primary text-xs shrink-0"
            >
              {createMutation.isPending ? 'Saving...' : 'Add'}
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

      {categoriesQuery.isError && (
        <ErrorMessage
          message={formatError(categoriesQuery.error, 'Failed to load categories')}
          onRetry={() => categoriesQuery.refetch()}
          busy={categoriesQuery.isFetching}
        />
      )}

      {/* Delete / Reassign Confirmation Card */}
      {deletingCategory && (
        <div className="card p-4 space-y-3 border-danger-200 bg-danger-50/50">
          <p className="text-sm font-bold text-danger-800">
            Delete "{deletingCategory}"?
          </p>
          <p className="text-xs text-ink-muted">
            Choose what to reassign existing transactions in this category to:
          </p>
          <select
            value={reassignTarget}
            onChange={(e) => setReassignTarget(e.target.value)}
            className="input text-xs"
          >
            <option value="Uncategorized">Uncategorized</option>
            {categories
              .map((c) => (typeof c === 'string' ? c : c.name))
              .filter((c) => c !== deletingCategory)
              .map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
          </select>
          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={() => setDeletingCategory(null)}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleDelete(deletingCategory)}
              disabled={deleteMutation.isPending}
              className="btn-danger text-xs"
            >
              Confirm Delete
            </button>
          </div>
        </div>
      )}

      <div className="card divide-y divide-line p-1">
        {categories.map((c) => {
          const name = typeof c === 'string' ? c : c.name;
          const color = getCategoryColor(name);
          const isEditing = editingCategory === name;

          return (
            <div
              key={name}
              className="flex items-center justify-between p-3 gap-2"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <span
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: color.fill }}
                  aria-hidden="true"
                />
                {isEditing ? (
                  <div className="flex items-center gap-1.5 flex-1">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="input h-8 text-xs py-1"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => handleUpdate(name)}
                      className="btn-primary h-8 px-2 text-xs"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingCategory(null)}
                      className="btn-secondary h-8 px-2 text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <span className="font-semibold text-sm text-ink truncate">
                    {name}
                  </span>
                )}
              </div>

              {!isEditing && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCategory(name);
                      setEditName(name);
                    }}
                    className="icon-btn h-8 w-8 text-ink-muted hover:text-ink"
                    title="Rename category"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingCategory(name)}
                    className="icon-btn h-8 w-8 text-ink-muted hover:text-danger-600"
                    title="Delete category"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
