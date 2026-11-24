import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, LoaderCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useAuth, signIn } from '../hooks/useAuth';
import { login, register, forgotPassword, initOnboarding } from '../api/auth';
import { ApiError } from '../api/client';

function getAuthErrorMessage(err) {
  if (err instanceof ApiError) {
    if (err.status === 401) return err.message || 'Incorrect email or password.';
    if (err.status === 429) return 'Too many attempts. Wait a minute and try again.';
    if (err.status === 503) return 'The server is not configured for sign-in yet.';
    if (err.status === 400) return err.message || 'Please check your information and try again.';
    return err.message || 'Something went wrong on the server. Please try again.';
  }
  return 'Could not reach the server. Check your connection and try again.';
}

export function SignInPage() {
  const { sessionExpired } = useAuth();
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const switchMode = (newMode) => {
    setMode(newMode);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    if (mode === 'forgot') {
      setIsSubmitting(true);
      try {
        const res = await forgotPassword(trimmedEmail);
        setSuccessMsg(res.message || 'Password reset instructions have been sent to your email.');
      } catch (err) {
        setErrorMsg(getAuthErrorMessage(err));
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    if (mode === 'signup') {
      if (password.length < 8) {
        setErrorMsg('Password must be at least 8 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match.');
        return;
      }

      setIsSubmitting(true);
      try {
        const data = await register(trimmedEmail, password);
        if (data.token) {
          // Set session first so subsequent calls have bearer token
          signIn(data.token, data.expires_at, data.user);
          try {
            await initOnboarding();
          } catch (e) {
            console.error('Initial onboarding error:', e);
          }
        } else {
          setSuccessMsg(data.message || 'Registration successful! Please check your email to verify your account.');
        }
      } catch (err) {
        setErrorMsg(getAuthErrorMessage(err));
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Default: Sign in
    setIsSubmitting(true);
    try {
      const data = await login(trimmedEmail, password);
      signIn(data.token, data.expires_at, data.user);
      if (data.user && !data.user.onboarding_completed) {
        try {
          await initOnboarding();
        } catch (e) {
          console.error('Onboarding init error:', e);
        }
      }
    } catch (err) {
      setErrorMsg(getAuthErrorMessage(err));
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-canvas px-4 py-8"
      style={{
        paddingTop: 'env(safe-area-inset-top, 24px)',
        paddingBottom: 'env(safe-area-inset-bottom, 24px)',
      }}
    >
      <div className="wash pointer-events-none absolute inset-x-0 top-0 h-96" aria-hidden="true" />
      <main className="card relative w-full max-w-sm p-6 md:p-8 motion-safe:animate-fade-in shadow-xl">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-600 to-violet-600 shadow-glow">
            <span className="text-2xl font-extrabold text-white">₨</span>
          </div>
          <h1 className="mt-4 text-xl font-bold tracking-tight text-ink">
            Financial Assistant
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {mode === 'signin' && 'Sign in to access your finances'}
            {mode === 'signup' && 'Create your personal account'}
            {mode === 'forgot' && 'Reset your password'}
          </p>
        </div>

        {/* Tab switcher for Sign In / Sign Up */}
        {mode !== 'forgot' && (
          <div className="mt-6 flex rounded-xl bg-surface-muted/80 p-1 border border-line">
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                mode === 'signin'
                  ? 'bg-white text-ink shadow-sm'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                mode === 'signup'
                  ? 'bg-white text-ink shadow-sm'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
          {sessionExpired && !errorMsg && mode === 'signin' && (
            <div
              role="status"
              className="rounded-2xl border border-warning-400/50 bg-warning-100 p-3 text-sm text-warning-800"
            >
              Session expired, please sign in again.
            </div>
          )}

          {errorMsg && (
            <div role="alert" className="alert-error text-xs">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div
              role="status"
              className="flex items-start gap-2 rounded-2xl border border-emerald-400/50 bg-emerald-50 p-3 text-xs text-emerald-800"
            >
              <CheckCircle2 size={16} className="shrink-0 text-emerald-600 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Email field */}
          <div>
            <label htmlFor="email" className="eyebrow mb-1.5 block">
              Email Address
            </label>
            <div className="relative">
              <input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                className="input pl-10"
                placeholder="you@example.com"
              />
              <Mail
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
                aria-hidden="true"
              />
            </div>
          </div>

          {/* Password fields (hidden in forgot password mode) */}
          {mode !== 'forgot' && (
            <>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="eyebrow block">
                    Password
                  </label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="text-xs font-medium text-primary-600 hover:text-primary-700 hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting}
                    className="input pl-10 pr-10"
                    placeholder={mode === 'signup' ? 'At least 8 characters' : 'Enter your password'}
                  />
                  <Lock
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
                    aria-hidden="true"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    className="icon-btn absolute right-0 top-1/2 -translate-y-1/2"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {mode === 'signup' && (
                <div>
                  <label htmlFor="confirmPassword" className="eyebrow mb-1.5 block">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isSubmitting}
                      className="input pl-10 pr-10"
                      placeholder="Re-enter your password"
                    />
                    <Lock
                      size={16}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
                      aria-hidden="true"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting || !email || (mode !== 'forgot' && !password)}
            className="btn-primary w-full mt-2"
          >
            {isSubmitting ? (
              <>
                <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
                {mode === 'signin' && 'Signing in...'}
                {mode === 'signup' && 'Creating account...'}
                {mode === 'forgot' && 'Sending reset link...'}
              </>
            ) : (
              <>
                {mode === 'signin' && 'Sign in'}
                {mode === 'signup' && 'Create account'}
                {mode === 'forgot' && 'Send reset link'}
              </>
            )}
          </button>

          {/* Back to sign in link when in forgot password mode */}
          {mode === 'forgot' && (
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className="flex items-center justify-center gap-1.5 w-full text-xs font-semibold text-ink-muted hover:text-ink pt-2 transition"
            >
              <ArrowLeft size={14} /> Back to Sign In
            </button>
          )}
        </form>
      </main>
    </div>
  );
}
