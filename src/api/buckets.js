import { apiFetch } from './client';

export async function getBuckets() {
  return apiFetch('/api/buckets');
}

export async function createBucket(data) {
  return apiFetch('/api/buckets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function deleteBucket(name) {
  return apiFetch(`/api/buckets/${encodeURIComponent(name)}?confirm=true`, {
    method: 'DELETE',
  });
}
