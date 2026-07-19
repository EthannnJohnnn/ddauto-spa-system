import { useEffect, useState } from 'react';
import { DashboardShell } from './features/dashboard/DashboardShell.jsx';
import { LoginForm } from './features/auth/LoginForm.jsx';
import { RecoveryCodeDialog } from './features/auth/RecoveryCodeDialog.jsx';
import { ResetPasswordForm } from './features/auth/ResetPasswordForm.jsx';
import { SetupForm } from './features/auth/SetupForm.jsx';
import {
  getAuthStatus,
  login,
  logout,
  resetPassword,
  setupOwner,
} from './features/auth/auth-api.js';

export function App() {
  const [auth, setAuth] = useState({
    loading: true,
    needsSetup: false,
    user: null,
    csrfToken: null,
  });
  const [bootError, setBootError] = useState('');
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');

  useEffect(() => {
    let active = true;

    getAuthStatus()
      .then((status) => {
        if (active) {
          setAuth({ loading: false, ...status });
        }
      })
      .catch((error) => {
        if (active) {
          setBootError(error.message);
          setAuth((current) => ({ ...current, loading: false }));
        }
      });

    return () => {
      active = false;
    };
  }, []);

  function acceptAuthentication(result) {
    setAuth({
      loading: false,
      needsSetup: false,
      user: result.user,
      csrfToken: result.csrfToken,
    });
    setRecoveryMode(false);
    if (result.recoveryCode) {
      setRecoveryCode(result.recoveryCode);
    }
  }

  async function handleLogout() {
    await logout(auth.csrfToken);
    setAuth({ loading: false, needsSetup: false, user: null, csrfToken: null });
  }

  if (auth.loading) {
    return <LoadingScreen />;
  }

  if (bootError) {
    return <ConnectionError message={bootError} />;
  }

  if (auth.needsSetup) {
    return (
      <>
        <SetupForm onSetup={async (values) => acceptAuthentication(await setupOwner(values))} />
        {recoveryCode && (
          <RecoveryCodeDialog code={recoveryCode} onContinue={() => setRecoveryCode('')} />
        )}
      </>
    );
  }

  if (!auth.user) {
    return recoveryMode ? (
      <>
        <ResetPasswordForm
          onCancel={() => setRecoveryMode(false)}
          onReset={async (values) => acceptAuthentication(await resetPassword(values))}
        />
        {recoveryCode && (
          <RecoveryCodeDialog code={recoveryCode} onContinue={() => setRecoveryCode('')} />
        )}
      </>
    ) : (
      <LoginForm
        onForgotPassword={() => setRecoveryMode(true)}
        onLogin={async (values) => acceptAuthentication(await login(values))}
      />
    );
  }

  return (
    <>
      <DashboardShell user={auth.user} onLogout={handleLogout} />
      {recoveryCode && (
        <RecoveryCodeDialog code={recoveryCode} onContinue={() => setRecoveryCode('')} />
      )}
    </>
  );
}

function LoadingScreen() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-100">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-300 border-t-teal-700" />
        <p className="mt-4 font-semibold text-slate-600">Opening DD Auto Spa…</p>
      </div>
    </main>
  );
}

function ConnectionError({ message }) {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 p-6">
      <section className="max-w-md rounded-3xl border border-red-200 bg-white p-8 text-center shadow-xl">
        <h1 className="text-2xl font-bold text-slate-950">The local server is unavailable</h1>
        <p className="mt-3 leading-7 text-slate-600">{message}</p>
        <button
          className="mt-6 rounded-xl bg-teal-700 px-5 py-3 font-semibold text-white"
          onClick={() => window.location.reload()}
          type="button"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
