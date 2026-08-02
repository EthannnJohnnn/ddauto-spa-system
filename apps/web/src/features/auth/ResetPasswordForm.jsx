import { useState } from 'react';
import { AuthLayout } from './AuthLayout.jsx';
import { FormError, FormField, SubmitButton } from './FormField.jsx';

export function ResetPasswordForm({ onCancel, onReset }) {
  const [values, setValues] = useState({
    username: '',
    recoveryCode: '',
    newPassword: '',
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

    if (values.newPassword !== values.confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      await onReset({
        username: values.username,
        recoveryCode: values.recoveryCode,
        newPassword: values.newPassword,
      });
    } catch (submissionError) {
      setError(submissionError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Account recovery"
      title="Reset the owner password"
      description="Enter the one-time recovery code printed during setup or the previous reset."
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <FormError message={error} />
        <FormField
          autoComplete="username"
          label="Username"
          onChange={(event) => update('username', event.target.value)}
          required
          value={values.username}
        />
        <FormField
          autoCapitalize="characters"
          label="Recovery code"
          onChange={(event) => update('recoveryCode', event.target.value)}
          placeholder="XXXXX-XXXXX-..."
          required
          value={values.recoveryCode}
        />
        <FormField
          autoComplete="new-password"
          label="New password"
          maxLength="8"
          onChange={(event) => update('newPassword', event.target.value)}
          required
          type="password"
          value={values.newPassword}
        />
        <FormField
          autoComplete="new-password"
          label="Confirm new password"
          maxLength="8"
          onChange={(event) => update('confirmPassword', event.target.value)}
          required
          type="password"
          value={values.confirmPassword}
        />
        <SubmitButton busy={busy}>Reset password</SubmitButton>
        <button
          className="w-full rounded-xl px-4 py-3 font-semibold text-slate-600 hover:bg-slate-100"
          onClick={onCancel}
          type="button"
        >
          Back to sign in
        </button>
      </form>
    </AuthLayout>
  );
}
