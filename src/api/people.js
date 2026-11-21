import { apiFetch } from './client';

export async function getPeople() {
  return apiFetch('/api/people');
}

export async function createPerson(name) {
  return apiFetch('/api/people', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
}

export async function updatePerson(name, patch) {
  return apiFetch(`/api/people/${encodeURIComponent(name)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
}

export async function deletePerson(name, confirm = false) {
  const qs = confirm ? '?confirm=true' : '';
  return apiFetch(`/api/people/${encodeURIComponent(name)}${qs}`, {
    method: 'DELETE',
  });
}
