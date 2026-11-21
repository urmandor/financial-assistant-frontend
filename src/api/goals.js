import { apiFetch } from './client';

export async function getGoals() {
  return apiFetch('/api/goals');
}

export async function createGoal(data) {
  return apiFetch('/api/goals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function deleteGoal(name) {
  return apiFetch(`/api/goals/${encodeURIComponent(name)}`, {
    method: 'DELETE',
  });
}
