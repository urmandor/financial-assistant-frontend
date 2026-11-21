import { apiFetch } from './client';

export async function getCategories() {
  return apiFetch('/api/categories');
}

export async function createCategory(data) {
  return apiFetch('/api/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function updateCategory(name, newName, merge = false) {
  return apiFetch(`/api/categories/${encodeURIComponent(name)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: newName, ...(merge ? { merge: true } : {}) }),
  });
}

export async function deleteCategory(name, reassignTo) {
  return apiFetch(`/api/categories/${encodeURIComponent(name)}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reassign_to: reassignTo }),
  });
}

export async function getCategoryImpact(name) {
  return apiFetch(`/api/categories/${encodeURIComponent(name)}/impact`);
}
