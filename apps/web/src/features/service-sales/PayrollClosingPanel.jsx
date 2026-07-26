import { useState } from 'react';
import { formatPeso } from '../catalogs/catalog-formatters.js';

export function PayrollClosingPanel({ businessDate, payrollState, onClose, onRequestReopen }) {
  const [closeNote, setCloseNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const activeRun = payrollState.runs.find((run) => run.status === 'CLOSED');

  async function closePayroll() {
    setBusy(true);
    setError('');
    try {
      await onClose({ businessDate, closeNote: closeNote.trim() });
      setCloseNote('');
    } catch (closeError) {
      setError(closeError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-950">Payroll closing</h3>
            <p className="mt-1 text-sm text-slate-500">Finalize salary and meal expenses.</p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-bold ${payrollState.isClosed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}
          >
            {payrollState.isClosed ? 'Closed' : 'Open'}
          </span>
        </div>
      </div>

      {activeRun ? (
        <div className="p-5">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-slate-500">Salary expense</dt>
              <dd className="mt-1 font-bold text-slate-950">
                {formatPeso(activeRun.totalSalaryCentavos)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Staff meals</dt>
              <dd className="mt-1 font-bold text-slate-950">
                {formatPeso(activeRun.totalMealCentavos)}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            Service transactions and attendance for this date are locked. Reopen payroll before
            making corrections.
          </p>
          <button
            className="mt-4 w-full rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 font-bold text-amber-900 hover:bg-amber-100"
            onClick={onRequestReopen}
            type="button"
          >
            Reopen payroll
          </button>
        </div>
      ) : (
        <div className="p-5">
          <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            Closing creates protected Salary and Staff Meal expense entries using the current
            payroll preview.
          </div>
          <label className="mt-4 block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">
              Closing note (optional)
            </span>
            <textarea
              className="min-h-20 w-full resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600"
              maxLength="300"
              onChange={(event) => setCloseNote(event.target.value)}
              placeholder="Example: Payroll checked and paid"
              value={closeNote}
            />
          </label>
          <button
            className="mt-3 w-full rounded-xl bg-teal-700 px-4 py-3 font-bold text-white hover:bg-teal-800 disabled:opacity-60"
            disabled={busy || payrollState.preview.payroll.length === 0}
            onClick={closePayroll}
            type="button"
          >
            {busy ? 'Closing…' : 'Close payroll for this day'}
          </button>
          {payrollState.preview.payroll.length === 0 && (
            <p className="mt-2 text-xs text-amber-700">Mark an employee present before closing.</p>
          )}
        </div>
      )}
      {error && (
        <p className="border-t border-red-100 bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}
    </section>
  );
}
