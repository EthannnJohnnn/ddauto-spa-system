import { useEffect, useState } from 'react';
import { centavosToInput, formatPeso, inputToCentavos } from '../catalogs/catalog-formatters.js';

export function AttendancePayrollPanel({ attendance, businessDate, payroll, onSave }) {
  const [mealInputs, setMealInputs] = useState({});
  const [busyEmployeeId, setBusyEmployeeId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setMealInputs(
      Object.fromEntries(
        attendance.map((entry) => [
          entry.employeeId,
          centavosToInput(entry.mealCostCentavos ?? 5_000),
        ]),
      ),
    );
  }, [attendance]);

  async function save(entry, isPresent = entry.isPresent) {
    setBusyEmployeeId(entry.employeeId);
    setError('');
    try {
      await onSave({
        businessDate,
        employeeId: entry.employeeId,
        isPresent,
        mealCostCentavos: isPresent ? inputToCentavos(mealInputs[entry.employeeId] ?? '50.00') : 0,
      });
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusyEmployeeId(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="font-bold text-slate-950">Attendance & meals</h3>
          <p className="mt-1 text-sm text-slate-500">
            Assigned workers become present automatically. The default meal is ₱50 each.
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {attendance.map((entry) => (
            <div className="p-4" key={entry.employeeId}>
              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-3 font-semibold text-slate-900">
                  <input
                    checked={entry.isPresent}
                    className="h-4 w-4 accent-teal-700"
                    disabled={busyEmployeeId === entry.employeeId}
                    onChange={(event) => save(entry, event.target.checked)}
                    type="checkbox"
                  />
                  {entry.employeeName}
                </label>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${entry.isPresent ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}
                >
                  {entry.isPresent ? 'Present' : 'Absent'}
                </span>
              </div>
              {entry.isPresent && (
                <div className="mt-3 flex items-end gap-2">
                  <label className="min-w-0 flex-1">
                    <span className="mb-1 block text-xs font-semibold text-slate-500">
                      Meal cost
                    </span>
                    <input
                      aria-label={`${entry.employeeName} meal cost`}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600"
                      min="0"
                      onChange={(event) =>
                        setMealInputs((current) => ({
                          ...current,
                          [entry.employeeId]: event.target.value,
                        }))
                      }
                      step="0.01"
                      type="number"
                      value={mealInputs[entry.employeeId] ?? '50.00'}
                    />
                  </label>
                  <button
                    className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700"
                    disabled={busyEmployeeId === entry.employeeId}
                    onClick={() => save(entry)}
                    type="button"
                  >
                    Save
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        {error && (
          <p className="border-t border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="font-bold text-slate-950">Daily payroll preview</h3>
          <p className="mt-1 text-sm text-slate-500">
            Orlan’s fixed rate appears only as a top-up when labor is below ₱400.
          </p>
        </div>
        {payroll.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500">No present employees yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {payroll.map((entry) => (
              <article className="p-4" key={entry.employeeId}>
                <div className="flex items-center justify-between gap-3">
                  <h4 className="font-bold text-slate-900">{entry.employeeName}</h4>
                  <p className="font-bold text-teal-800">{formatPeso(entry.totalPayCentavos)}</p>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500">
                  <span>Job labor: {formatPeso(entry.laborEarnedCentavos)}</span>
                  <span>Fixed top-up: {formatPeso(entry.fixedTopUpCentavos)}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
