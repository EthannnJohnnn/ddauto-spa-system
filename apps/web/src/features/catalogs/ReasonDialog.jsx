import { useEffect, useState } from 'react';

export function ReasonDialog({ target, onCancel, onConfirm }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setReason('');
    setBusy(false);
    setError('');
  }, [target]);

  if (!target) {
    return null;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (reason.trim().length < 3) {
      setError('Please enter a short reason.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      await onConfirm(reason.trim());
    } catch (submissionError) {
      setError(submissionError.message);
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <form
        aria-labelledby="reason-dialog-title"
        aria-modal="true"
        className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl"
        onSubmit={handleSubmit}
        role="dialog"
      >
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
          Audit record
        </p>
        <h2 className="mt-2 text-2xl font-bold text-slate-950" id="reason-dialog-title">
          {target.isActive ? 'Restore' : 'Archive'} {target.label}?
        </h2>
        <p className="mt-3 leading-6 text-slate-600">
          The item will remain in history. Explain why its status is changing.
        </p>
        <label className="mt-5 block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">Reason</span>
          <textarea
            autoFocus
            className="min-h-24 w-full resize-none rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10"
            maxLength="200"
            onChange={(event) => setReason(event.target.value)}
            placeholder="Example: No longer offered"
            value={reason}
          />
        </label>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            className="rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50"
            disabled={busy}
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded-xl bg-teal-700 px-4 py-3 font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
            disabled={busy}
            type="submit"
          >
            {busy ? 'Saving…' : 'Confirm'}
          </button>
        </div>
      </form>
    </div>
  );
}
