import { apiFetch } from './client';

export async function login(email, password) {
  return apiFetch(
    '/api/auth/login',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    },
    15000,
    false
  );
}

export async function register(email, password) {
  return apiFetch(
    '/api/auth/register',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    },
    15000,
    false
  );
}

export async function forgotPassword(email) {
  return apiFetch(
    '/api/auth/forgot-password',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    },
    15000,
    false
  );
}

export async function getMe() {
  return apiFetch('/api/auth/me', undefined, 15000);
}

export async function initOnboarding(preferences = {}) {
  return apiFetch(
    '/api/onboarding/init',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preferences),
    },
    15000
  );
}
