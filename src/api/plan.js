import { apiFetch } from './client';

export async function getAssumptions() {
  return apiFetch('/api/assumptions');
}

export async function getProjections(months = 12, startMonth = null) {
  const query = new URLSearchParams();
  if (months) query.set('months', String(months));
  if (startMonth) query.set('start', startMonth);
  const qs = query.toString() ? `?${query}` : '';
  return apiFetch(`/api/projections${qs}`);
}

export async function createPlanItem(data) {
  return apiFetch('/api/assumptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function updatePlanItem(key, data) {
  return apiFetch(`/api/assumptions/${encodeURIComponent(key)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function deletePlanItem(key) {
  return apiFetch(`/api/assumptions/${encodeURIComponent(key)}`, {
    method: 'DELETE',
  });
}

export async function setYearlyRaise(key, data) {
  return apiFetch(`/api/assumptions/${encodeURIComponent(key)}/escalation`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function clearYearlyRaise(key) {
  return apiFetch(`/api/assumptions/${encodeURIComponent(key)}/escalation`, {
    method: 'DELETE',
  });
}

export async function importCsv(file) {
  const formData = new FormData();
  formData.append('file', file);
  return apiFetch('/api/import-csv', {
    method: 'POST',
    body: formData,
  });
}
