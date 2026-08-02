import { useEffect, useState } from 'react';
import { inputToCentavos, centavosToInput, formatPeso } from './catalog-formatters.js';
import { useEditNavigation } from '../../hooks/useEditNavigation.js';

const emptyForm = {
  displayName: '',
  fixedDailyRatePesos: '0.00',
  receivesLaborShare: true,
  isSpecialist: false,
};

export function EmployeesPanel({ employees, onSave, onStatus }) {
  const [editing, setEditing] = useState(null);
  const [values, setValues] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const editRegionRef = useEditNavigation(editing);

  useEffect(() => {
    if (editing) {
      setValues({
        displayName: editing.displayName,
        fixedDailyRatePesos: centavosToInput(editing.fixedDailyRateCentavos),
        receivesLaborShare: editing.receivesLaborShare,
        isSpecialist: editing.isSpecialist,
      });
    } else {
      setValues(emptyForm);
    }
  }, [editing]);

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onSave(editing?.id, {
        displayName: values.displayName,
        fixedDailyRateCentavos: inputToCentavos(values.fixedDailyRatePesos),
        receivesLaborShare: values.receivesLaborShare,
        isSpecialist: values.isSpecialist,
      });
      setEditing(null);
      setValues(emptyForm);
    } catch (submissionError) {
      setError(submissionError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[22rem_1fr]">
      <form
        className="h-fit scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        onSubmit={handleSubmit}
        ref={editRegionRef}
      >
        <p className="text-sm font-semibold text-teal-700">
          {editing ? 'Edit employee' : 'Add employee'}
        </p>
        <h3 className="mt-1 text-xl font-bold text-slate-950">
          {editing ? editing.displayName : 'Employee details'}
        </h3>
        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Name</span>
            <input
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10"
              onChange={(event) => update('displayName', event.target.value)}
              placeholder="Example: Orlan"
              required
              value={values.displayName}
            />
          </label>
          <div className="block">
            <label
              className="mb-2 block text-sm font-semibold text-slate-700"
              htmlFor="employee-fixed-daily-rate"
            >
              Fixed full-day rate
            </label>
            <div className="flex rounded-xl border border-slate-300 focus-within:border-teal-600 focus-within:ring-4 focus-within:ring-teal-600/10">
              <span className="grid place-items-center border-r border-slate-300 px-3 text-slate-500">
                ₱
              </span>
              <input
                className="min-w-0 flex-1 rounded-r-xl px-4 py-3 outline-none"
                id="employee-fixed-daily-rate"
                min="0"
                onChange={(event) => update('fixedDailyRatePesos', event.target.value)}
                required
                step="0.01"
                type="number"
                value={values.fixedDailyRatePesos}
              />
            </div>
          </div>
          <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
            <input
              checked={values.receivesLaborShare}
              className="mt-1 h-4 w-4 accent-teal-700"
              onChange={(event) => update('receivesLaborShare', event.target.checked)}
              type="checkbox"
            />
            <span>
              <strong className="block text-slate-900">Receives labor share</strong>
              Include this employee when dividing eligible service labor.
            </span>
          </label>
          <label className="flex items-start gap-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
            <input
              checked={values.isSpecialist}
              className="mt-1 h-4 w-4 accent-amber-600"
              onChange={(event) => update('isSpecialist', event.target.checked)}
              type="checkbox"
            />
            <span>
              <strong className="block">Graphene/detailing specialist</strong>
              Only one active employee can hold this role.
            </span>
          </label>
        </div>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        <div className="mt-5 grid grid-cols-2 gap-3">
          {editing && (
            <button
              className="rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-700"
              onClick={() => setEditing(null)}
              type="button"
            >
              Cancel
            </button>
          )}
          <button
            className={`${editing ? '' : 'col-span-2'} rounded-xl bg-teal-700 px-4 py-3 font-semibold text-white hover:bg-teal-800 disabled:opacity-60`}
            disabled={busy}
            type="submit"
          >
            {busy ? 'Saving…' : editing ? 'Save changes' : 'Add employee'}
          </button>
        </div>
      </form>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="font-bold text-slate-950">Employee catalog</h3>
          <p className="mt-1 text-sm text-slate-500">
            Active and archived employees remain visible.
          </p>
        </div>
        {employees.length === 0 ? (
          <EmptyState message="Add Orlan and the other employees to begin." />
        ) : (
          <div className="divide-y divide-slate-100">
            {employees.map((employee) => (
              <article
                className={`p-5 ${employee.isActive ? '' : 'bg-slate-50 opacity-70'}`}
                key={employee.id}
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold text-slate-950">{employee.displayName}</h4>
                      {!employee.isActive && <Tag tone="slate">Archived</Tag>}
                      {employee.isSpecialist && <Tag tone="amber">Specialist</Tag>}
                      {employee.receivesLaborShare && <Tag tone="teal">Labor share</Tag>}
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      Fixed full-day rate: {formatPeso(employee.fixedDailyRateCentavos)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      onClick={() => setEditing(employee)}
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      onClick={() => onStatus(employee)}
                      type="button"
                    >
                      {employee.isActive ? 'Archive' : 'Restore'}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Tag({ children, tone }) {
  const colors = {
    amber: 'bg-amber-100 text-amber-800',
    slate: 'bg-slate-200 text-slate-700',
    teal: 'bg-teal-100 text-teal-800',
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${colors[tone]}`}>
      {children}
    </span>
  );
}

function EmptyState({ message }) {
  return <p className="p-8 text-center text-sm text-slate-500">{message}</p>;
}
