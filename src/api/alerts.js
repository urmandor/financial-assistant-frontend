import { apiFetch } from './client';

export async function getAlerts() {
  return apiFetch('/api/alerts');
}

export async function dismissAlert(id) {
  return apiFetch(`/api/alerts/${encodeURIComponent(id)}/dismiss`, {
    method: 'POST',
  });
}
