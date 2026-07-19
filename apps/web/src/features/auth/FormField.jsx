export function FormField({ label, error, ...inputProps }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
      <input
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10"
        aria-invalid={Boolean(error)}
        {...inputProps}
      />
      {error && <span className="mt-1.5 block text-sm text-red-600">{error}</span>}
    </label>
  );
}

export function FormError({ message }) {
  if (!message) {
    return null;
  }

  return (
    <div
      className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
      role="alert"
    >
      {message}
    </div>
  );
}

export function SubmitButton({ busy, children }) {
  return (
    <button
      className="w-full rounded-xl bg-teal-700 px-4 py-3 font-semibold text-white shadow-lg shadow-teal-700/15 transition hover:bg-teal-800 focus:outline-none focus:ring-4 focus:ring-teal-600/20 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={busy}
      type="submit"
    >
      {busy ? 'Please wait…' : children}
    </button>
  );
}
