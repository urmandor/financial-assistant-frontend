import { apiFetch } from './client';

export async function getAccounts() {
  return apiFetch('/api/accounts');
}

export async function createAccount(data) {
  return apiFetch('/api/accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function updateAccount(id, patch) {
  return apiFetch(`/api/accounts/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
}

export async function deleteAccount(id) {
  return apiFetch(`/api/accounts/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
