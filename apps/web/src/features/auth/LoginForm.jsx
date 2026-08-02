import { useState } from 'react';
import { AuthLayout } from './AuthLayout.jsx';
import { FormError, FormField, SubmitButton } from './FormField.jsx';

export function LoginForm({ onLogin, onForgotPassword }) {
  const [values, setValues] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      await onLogin(values);
    } catch (submissionError) {
      setError(submissionError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Owner access"
      title="Welcome back"
      description="Sign in to open the DD Auto Spa dashboard."
    >
      <form
        className="rounded-2xl border border-blue-100 bg-blue-50/40 p-5 shadow-sm sm:p-6"
        onSubmit={handleSubmit}
      >
        <div className="mb-5 flex items-center gap-3 border-b border-blue-100 pb-4">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-100 text-blue-700">
            <svg
              aria-hidden="true"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <rect height="11" rx="2" width="14" x="5" y="10" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
          </span>
          <div>
            <p className="text-sm font-bold text-blue-950">Secure local session</p>
            <p className="text-xs text-slate-500">Your business data stays on this computer.</p>
          </div>
        </div>
        <div className="space-y-5">
          <FormError message={error} />
          <FormField
            autoComplete="username"
            label="Username"
            name="username"
            onChange={(event) => setValues({ ...values, username: event.target.value })}
            placeholder="Enter username"
            required
            value={values.username}
          />
          <FormField
            autoComplete="current-password"
            label="Password"
            maxLength="8"
            name="password"
            onChange={(event) => setValues({ ...values, password: event.target.value })}
            placeholder="Enter password"
            required
            type="password"
            value={values.password}
          />
          <div className="flex justify-end">
            <button
              className="text-sm font-semibold text-teal-700 hover:text-teal-900"
              onClick={onForgotPassword}
              type="button"
            >
              Use recovery code
            </button>
          </div>
          <SubmitButton busy={busy}>Sign in</SubmitButton>
        </div>
      </form>
    </AuthLayout>
  );
}
