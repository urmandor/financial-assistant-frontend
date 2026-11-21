import { apiFetch } from './client';

export async function login(password) {
  return apiFetch(
    '/api/auth/login',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    },
    15000,
    false
  );
}

export async function getMe() {
  return apiFetch('/api/auth/me', undefined, 15000);
}
