import { apiFetch } from './client';

export async function getDigests(limit = 8) {
  return apiFetch(`/api/digests?limit=${limit}`);
}

export async function generateDigest() {
  return apiFetch('/api/digests/generate', {
    method: 'POST',
  });
}

export async function markDigestRead(id) {
  return apiFetch(`/api/digests/${encodeURIComponent(id)}/read`, {
    method: 'POST',
  });
}
