import React, { useState, useEffect } from 'react';
import { useAuth, signOut } from './hooks/useAuth';
import { getMe } from './api/auth';
import { AppShell } from './components/layout/AppShell';
import { SignInPage } from './pages/SignInPage';
import { ToastProvider } from './hooks/useToast';
import { LoadingSkeleton } from './components/common/LoadingSkeleton';

function AuthGate({ children }) {
  const { token } = useAuth();
  const [sessionCheck, setSessionCheck] = useState(null);

  useEffect(() => {
    if (!token) {
      setSessionCheck(null);
      return;
    }

    let isCancelled = false;

    getMe()
      .then(() => {
        if (!isCancelled) {
          setSessionCheck({ token, status: 'ok' });
        }
      })
      .catch((err) => {
        if (!isCancelled && err?.name !== 'AuthError') {
          setSessionCheck({ token, status: 'failed' });
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [token]);

  if (!token) {
    return <SignInPage />;
  }

  if (sessionCheck?.token === token && sessionCheck.status === 'ok') {
    return children;
  }

  if (sessionCheck?.token === token && sessionCheck.status === 'failed') {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-canvas px-4">
        <div className="card w-full max-w-sm space-y-4 p-6 text-center">
          <div role="alert" className="alert-error">
            Could not reach the server. Check your connection and try again.
          </div>
          <div className="flex justify-center gap-2">
            <button
              type="button"
              className="btn-primary"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => signOut()}
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-[100dvh] bg-canvas p-4"
      role="status"
      aria-busy="true"
      aria-label="Checking session"
    >
      <div className="mx-auto max-w-4xl pt-6">
        <LoadingSkeleton label="Verifying session" rows={4} />
      </div>
    </div>
  );
}

export function App() {
  return (
    <AuthGate>
      <ToastProvider>
        <AppShell />
      </ToastProvider>
    </AuthGate>
  );
}
