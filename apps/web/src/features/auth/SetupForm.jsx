import { useState } from 'react';
import { AuthLayout } from './AuthLayout.jsx';
import { FormError, FormField, SubmitButton } from './FormField.jsx';

export function SetupForm({ onSetup }) {
  const [values, setValues] = useState({
    displayName: '',
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (values.password !== values.confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      await onSetup({
        displayName: values.displayName || 'Owner',
        username: values.username,
        password: values.password,
      });
    } catch (submissionError) {
      setError(submissionError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="First-time setup"
      title="Create the owner account"
      description="This account controls sensitive reports, corrections, payroll, settings, and backups."
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <FormError message={error} />
        <FormField
          autoComplete="name"
          label="Owner name"
          onChange={(event) => update('displayName', event.target.value)}
          placeholder="Business owner"
          value={values.displayName}
        />
        <FormField
          autoComplete="username"
          label="Username"
          onChange={(event) => update('username', event.target.value)}
          placeholder="Choose a username"
          required
          value={values.username}
        />
        <FormField
          autoComplete="new-password"
          label="Password"
          minLength="12"
          onChange={(event) => update('password', event.target.value)}
          placeholder="At least 12 characters"
          required
          type="password"
          value={values.password}
        />
        <FormField
          autoComplete="new-password"
          label="Confirm password"
          minLength="12"
          onChange={(event) => update('confirmPassword', event.target.value)}
          placeholder="Repeat the password"
          required
          type="password"
          value={values.confirmPassword}
        />
        <p className="text-sm leading-6 text-slate-500">
          Use at least 12 characters with uppercase, lowercase, and a number.
        </p>
        <SubmitButton busy={busy}>Create owner account</SubmitButton>
      </form>
    </AuthLayout>
  );
}
