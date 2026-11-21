import { useSyncExternalStore, useEffect } from 'react';
import { setAuthTokenProvider } from '../api/client';

const SESSION_KEY = 'fa.session';

function readStoredSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed.token !== 'string' || typeof parsed.expiresAt !== 'number') {
      return null;
    }
    return { token: parsed.token, expiresAt: parsed.expiresAt };
  } catch {
    return null;
  }
}

function writeStoredSession(session) {
  try {
    if (session) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  } catch {}
}

function getValidToken(session) {
  return session && session.expiresAt > Date.now() ? session.token : null;
}

const initialStored = readStoredSession();
let currentSessionState = {
  token: getValidToken(initialStored),
  sessionExpired: initialStored !== null && getValidToken(initialStored) === null,
};

if (initialStored && !currentSessionState.token) {
  writeStoredSession(null);
}

const subscribers = new Set();
let onSignOutCallback = null;

function notifySubscribers(nextState) {
  currentSessionState = nextState;
  subscribers.forEach((fn) => fn());
}

export function registerSignOutCallback(cb) {
  onSignOutCallback = cb;
}

export function getSessionToken() {
  return currentSessionState.token;
}

export function signIn(token, expiresAtInput) {
  const parsed =
    typeof expiresAtInput === 'number'
      ? expiresAtInput
      : Date.parse(expiresAtInput);
  const expiresAt = Number.isFinite(parsed)
    ? parsed
    : Date.now() + 24 * 60 * 60 * 1000;

  writeStoredSession({ token, expiresAt });
  notifySubscribers({ token, sessionExpired: false });
}

export function signOut(reason) {
  writeStoredSession(null);
  if (onSignOutCallback) onSignOutCallback();
  notifySubscribers({
    token: null,
    sessionExpired: reason === 'expired',
  });
}

function subscribe(callback) {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== SESSION_KEY) return;
    const token = getValidToken(readStoredSession());
    if (token !== currentSessionState.token) {
      if (!token && onSignOutCallback) onSignOutCallback();
      notifySubscribers({ token, sessionExpired: false });
    }
  });

  setAuthTokenProvider(
    () => currentSessionState.token,
    () => signOut('expired')
  );
}

export function useAuth() {
  return useSyncExternalStore(
    subscribe,
    () => currentSessionState,
    () => currentSessionState
  );
}
