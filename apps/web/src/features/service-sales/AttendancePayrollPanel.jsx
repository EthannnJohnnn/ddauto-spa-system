import { useEffect, useState } from 'react';
import { centavosToInput, formatPeso, inputToCentavos } from '../catalogs/catalog-formatters.js';

export function AttendancePayrollPanel({
  attendance,
  businessDate,
  payroll,
  onSave,
  locked = false,
}) {
  const [mealInputs, setMealInputs] = useState({});
  const [salaryInputs, setSalaryInputs] = useState({});
  const [busyEmployeeId, setBusyEmployeeId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setMealInputs(
      Object.fromEntries(
        attendance.map((entry) => [
          entry.employeeId,
          centavosToInput(entry.isPresent ? entry.mealCostCentavos : 5_000),
        ]),
      ),
    );
    setSalaryInputs(
      Object.fromEntries(
        attendance.map((entry) => [
          entry.employeeId,
          entry.salaryOverrideCentavos == null ? '' : centavosToInput(entry.salaryOverrideCentavos),
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
        salaryOverrideCentavos:
          (salaryInputs[entry.employeeId] ?? '') === ''
            ? null
            : inputToCentavos(salaryInputs[entry.employeeId]),
      });
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusyEmployeeId(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-blue-100 bg-white shadow-sm">
        <div className="border-b border-blue-100 px-5 py-4">
          <h3 className="font-bold text-slate-950">Attendance</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {attendance.map((entry) => (
            <div className="p-4" key={entry.employeeId}>
              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-3 font-semibold text-slate-900">
                  <input
                    checked={entry.isPresent}
                    className="h-4 w-4 accent-blue-600"
                    disabled={locked || busyEmployeeId === entry.employeeId}
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
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label>
                    <span className="mb-1 block text-xs font-semibold text-slate-500">
                      Meal cost
                    </span>
                    <input
                      aria-label={`${entry.employeeName} meal cost`}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
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
                  <label>
                    <span className="mb-1 block text-xs font-semibold text-slate-500">
                      Final salary override (optional)
                    </span>
                    <input
                      aria-label={`${entry.employeeName} salary override`}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                      min="0"
                      onChange={(event) =>
                        setSalaryInputs((current) => ({
                          ...current,
                          [entry.employeeId]: event.target.value,
                        }))
                      }
                      placeholder="Use calculated salary"
                      step="0.01"
                      type="number"
                      value={salaryInputs[entry.employeeId] ?? ''}
                    />
                  </label>
                  <button
                    className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white sm:col-span-2"
                    disabled={locked || busyEmployeeId === entry.employeeId}
                    onClick={() => save(entry)}
                    type="button"
                  >
                    Save attendance & salary
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

      <section className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
        <div className="border-b border-blue-100 px-5 py-4">
          <h3 className="font-bold text-slate-950">Daily salary</h3>
        </div>
        {payroll.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500">No present employees.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {payroll.map((entry) => (
              <article className="p-4" key={entry.employeeId}>
                <div className="flex items-center justify-between gap-3">
                  <h4 className="font-bold text-slate-900">{entry.employeeName}</h4>
                  <p className="font-bold text-blue-800">{formatPeso(entry.totalPayCentavos)}</p>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500">
                  <span>Job labor: {formatPeso(entry.laborEarnedCentavos)}</span>
                  <span>Fixed top-up: {formatPeso(entry.fixedTopUpCentavos)}</span>
                  <span>Calculated: {formatPeso(entry.calculatedSalaryCentavos)}</span>
                  <span>
                    {entry.salaryOverrideCentavos === null
                      ? 'No adjustment'
                      : `Adjusted: ${formatPeso(entry.salaryOverrideCentavos)}`}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
