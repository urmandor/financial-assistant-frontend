function getApiBaseUrl() {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (typeof window === 'undefined') return envUrl || '';

  const { hostname } = window.location;
  // If on the original domain or localhost, direct calls are allowed by backend CORS
  if (
    hostname === 'financial-assistant-a4x.pages.dev' ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1'
  ) {
    return envUrl || 'https://financial-assistant-backend.menuvis.workers.dev';
  }

  // On new staging / preview domains (e.g. financial-assistant-frontend.pages.dev),
  // use same-origin relative '/api' paths proxied by Cloudflare Pages Functions to eliminate CORS errors!
  return '';
}

const API_BASE_URL = getApiBaseUrl();

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

export class AuthError extends ApiError {
  constructor(message = "Session expired, please sign in again") {
    super(message, 401);
    this.name = "AuthError";
  }
}

let sessionTokenGetter = () => null;
let onSessionExpired = () => {};

export function setAuthTokenProvider(getToken, onExpired) {
  sessionTokenGetter = getToken;
  if (onExpired) onSessionExpired = onExpired;
}

export async function apiFetch(path, options = {}, timeoutMs = 45000, requiresAuth = true) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers = new Headers(options.headers);
    if (requiresAuth) {
      const token = sessionTokenGetter();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      if (response.status === 401 && requiresAuth) {
        onSessionExpired();
        throw new AuthError();
      }
      const data = await response.json().catch(() => ({ error: response.statusText }));
      throw new ApiError(data.error ?? `HTTP ${response.status}`, response.status);
    }

    if (response.status === 204) {
      return undefined;
    }

    return await response.json();
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(
        "Request timed out — the assistant took too long to respond. Please try again."
      );
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
