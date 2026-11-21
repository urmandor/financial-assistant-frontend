import React, { useState } from 'react';
import { Eye, EyeOff, Lock, LoaderCircle } from 'lucide-react';
import { useAuth, signIn } from '../hooks/useAuth';
import { login } from '../api/auth';
import { ApiError } from '../api/client';

function getAuthErrorMessage(err) {
  if (err instanceof ApiError) {
    if (err.status === 401) return 'Incorrect password. Please try again.';
    if (err.status === 429) return 'Too many attempts. Wait a minute and try again.';
    if (err.status === 503) return 'The server is not configured for sign-in yet.';
    if (err.status === 400) return 'Please enter your password.';
    return 'Something went wrong on the server. Please try again.';
  }
  return 'Could not reach the server. Check your connection and try again.';
}

export function SignInPage() {
  const { sessionExpired } = useAuth();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting || !password) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const data = await login(password);
      signIn(data.token, data.expires_at);
    } catch (err) {
      setErrorMsg(getAuthErrorMessage(err));
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-canvas px-4"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="wash pointer-events-none absolute inset-x-0 top-0 h-96" aria-hidden="true" />
      <main className="card relative w-full max-w-sm p-6 md:p-8 motion-safe:animate-fade-in">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-600 to-violet-600 shadow-glow">
            <span className="text-2xl font-extrabold text-white">₨</span>
          </div>
          <h1 className="mt-4 text-xl font-bold tracking-tight text-ink">
            Financial Assistant
          </h1>
          <p className="mt-1 text-sm text-ink-muted">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          {sessionExpired && !errorMsg && (
            <div
              role="status"
              className="rounded-2xl border border-warning-400/50 bg-warning-100 p-3 text-sm text-warning-800"
            >
              Session expired, please sign in again.
            </div>
          )}

          {errorMsg && (
            <div role="alert" className="alert-error">
              {errorMsg}
            </div>
          )}

          <div>
            <label htmlFor="password" className="eyebrow mb-1.5 block">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                className="input pr-12"
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                className="icon-btn absolute right-0 top-1/2 -translate-y-1/2"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !password}
            className="btn-primary w-full"
          >
            {isSubmitting ? (
              <>
                <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
                Signing in...
              </>
            ) : (
              <>
                <Lock size={16} aria-hidden="true" />
                Sign in
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
