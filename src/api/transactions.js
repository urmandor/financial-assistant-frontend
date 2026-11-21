import { apiFetch } from './client';

export async function getTransactions(params = {}) {
  const query = new URLSearchParams();
  if (params.limit) query.set('limit', String(params.limit));
  if (params.offset) query.set('offset', String(params.offset));
  if (params.category) query.set('category', params.category);
  if (params.from) query.set('from', params.from);
  if (params.to) query.set('to', params.to);
  if (params.kind) query.set('kind', params.kind);
  if (params.q) query.set('q', params.q);
  if (params.person) query.set('person', params.person);

  const qs = query.toString() ? `?${query}` : '';
  return apiFetch(`/api/transactions${qs}`);
}

export async function createTransaction(data) {
  return apiFetch('/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function updateTransaction(id, patch) {
  return apiFetch(`/api/transactions/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
}

export async function deleteTransaction(id) {
  return apiFetch(`/api/transactions/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function undoDeleteTransaction() {
  return apiFetch('/api/transactions/undo-delete', {
    method: 'POST',
  });
}

export async function parseTransactionText(text) {
  return apiFetch(
    '/api/transactions/parse',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    },
    30000
  );
}

export async function getActuals(month) {
  const qs = month ? `?month=${encodeURIComponent(month)}` : '';
  return apiFetch(`/api/actuals${qs}`);
}
