import { apiFetch } from './client';

export async function getBudgets() {
  return apiFetch('/api/budgets');
}

export async function saveBudget(category, monthlyLimit) {
  return apiFetch('/api/budgets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category, monthly_limit: monthlyLimit }),
  });
}

export async function deleteBudget(category) {
  return apiFetch(`/api/budgets/${encodeURIComponent(category)}`, {
    method: 'DELETE',
  });
}
