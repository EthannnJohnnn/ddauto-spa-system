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
      <form className="space-y-5" onSubmit={handleSubmit}>
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
      </form>
    </AuthLayout>
  );
}
