import { useSyncExternalStore } from 'react';
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
    return {
      token: parsed.token,
      expiresAt: parsed.expiresAt,
      user: parsed.user || null,
    };
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
  user: initialStored?.user || null,
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

export function signIn(token, expiresAtInput, user = null) {
  const parsed =
    typeof expiresAtInput === 'number'
      ? expiresAtInput
      : Date.parse(expiresAtInput);
  const expiresAt = Number.isFinite(parsed)
    ? parsed
    : Date.now() + 24 * 60 * 60 * 1000;

  writeStoredSession({ token, expiresAt, user });
  notifySubscribers({ token, user, sessionExpired: false });
}

export function updateUser(userData) {
  if (!currentSessionState.token) return;
  const nextUser = { ...(currentSessionState.user || {}), ...userData };
  const stored = readStoredSession();
  if (stored) {
    writeStoredSession({ ...stored, user: nextUser });
  }
  notifySubscribers({ ...currentSessionState, user: nextUser });
}

export function signOut(reason) {
  writeStoredSession(null);
  if (onSignOutCallback) onSignOutCallback();
  notifySubscribers({
    token: null,
    user: null,
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
    const stored = readStoredSession();
    const token = getValidToken(stored);
    if (token !== currentSessionState.token) {
      if (!token && onSignOutCallback) onSignOutCallback();
      notifySubscribers({
        token,
        user: stored?.user || null,
        sessionExpired: false,
      });
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

export function useCurrentUser() {
  const auth = useAuth();
  return auth.user;
}
