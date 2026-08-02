import { useEffect, useState } from 'react';
import { useEditNavigation } from '../../hooks/useEditNavigation.js';

export function VehicleClassesPanel({ vehicleClasses, onSave, onStatus }) {
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const editRegionRef = useEditNavigation(editing);

  useEffect(() => {
    setName(editing?.name ?? '');
    setSortOrder(String(editing?.sortOrder ?? 0));
  }, [editing]);

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onSave(editing?.id, { name, sortOrder: Number(sortOrder) });
      setEditing(null);
      setName('');
      setSortOrder('0');
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
          {editing ? 'Edit class' : 'Add class'}
        </p>
        <h3 className="mt-1 text-xl font-bold text-slate-950">Vehicle class</h3>
        <label className="mt-5 block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">Name</span>
          <input
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10"
            onChange={(event) => setName(event.target.value)}
            placeholder="Example: Sedan"
            required
            value={name}
          />
        </label>
        <label className="mt-4 block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">Display order</span>
          <input
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-teal-600"
            min="0"
            onChange={(event) => setSortOrder(event.target.value)}
            required
            type="number"
            value={sortOrder}
          />
        </label>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        <div className="mt-5 grid grid-cols-2 gap-3">
          {editing && (
            <button
              className="rounded-xl border border-slate-300 px-4 py-3 font-semibold"
              onClick={() => setEditing(null)}
              type="button"
            >
              Cancel
            </button>
          )}
          <button
            className={`${editing ? '' : 'col-span-2'} rounded-xl bg-teal-700 px-4 py-3 font-semibold text-white disabled:opacity-60`}
            disabled={busy}
            type="submit"
          >
            {busy ? 'Saving…' : editing ? 'Save changes' : 'Add vehicle class'}
          </button>
        </div>
      </form>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="font-bold text-slate-950">Vehicle classes</h3>
          <p className="mt-1 text-sm text-slate-500">
            These become the columns of the service-price matrix.
          </p>
        </div>
        {vehicleClasses.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">
            Add the vehicle categories used by the carwash.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {vehicleClasses.map((vehicleClass) => (
              <article
                className={`flex items-center justify-between gap-4 p-5 ${vehicleClass.isActive ? '' : 'bg-slate-50 opacity-70'}`}
                key={vehicleClass.id}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-950">{vehicleClass.name}</h4>
                    {!vehicleClass.isActive && (
                      <span className="rounded-full bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-700">
                        Archived
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    Display order {vehicleClass.sortOrder}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold"
                    onClick={() => setEditing(vehicleClass)}
                    type="button"
                  >
                    Edit
                  </button>
                  <button
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold"
                    onClick={() => onStatus(vehicleClass)}
                    type="button"
                  >
                    {vehicleClass.isActive ? 'Archive' : 'Restore'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
