import { apiFetch } from './client';

export async function getRules() {
  return apiFetch('/api/rules');
}

export async function createRule(data) {
  return apiFetch('/api/rules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function updateRule(id, data) {
  return apiFetch(`/api/rules/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function deleteRule(id) {
  return apiFetch(`/api/rules/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function applyRules(scope, dryRun, only) {
  return apiFetch('/api/rules/apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scope,
      dry_run: dryRun,
      ...(only ? { only } : {}),
    }),
  });
}
