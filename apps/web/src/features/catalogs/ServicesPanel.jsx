import { useEffect, useState } from 'react';
import { useEditNavigation } from '../../hooks/useEditNavigation.js';

export function ServicesPanel({ services, onSave, onStatus }) {
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState('');
  const [laborRule, setLaborRule] = useState('ORDINARY');
  const [laborRatePercent, setLaborRatePercent] = useState('40');
  const [sortOrder, setSortOrder] = useState('0');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const editRegionRef = useEditNavigation(editing);

  useEffect(() => {
    setName(editing?.name ?? '');
    setLaborRule(editing?.laborRule ?? 'ORDINARY');
    setLaborRatePercent(String((editing?.laborRateBasisPoints ?? 4000) / 100));
    setSortOrder(String(editing?.sortOrder ?? 0));
  }, [editing]);

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onSave(editing?.id, {
        name,
        laborRule,
        laborRateBasisPoints:
          laborRule === 'EXTERNAL' ? 0 : Math.round(Number(laborRatePercent) * 100),
        sortOrder: Number(sortOrder),
      });
      setEditing(null);
      setName('');
      setLaborRule('ORDINARY');
      setLaborRatePercent('40');
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
          {editing ? 'Edit service' : 'Add service'}
        </p>
        <h3 className="mt-1 text-xl font-bold text-slate-950">Service details</h3>
        <label className="mt-5 block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">Name</span>
          <input
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10"
            onChange={(event) => setName(event.target.value)}
            placeholder="Example: Engine wash"
            required
            value={name}
          />
        </label>
        <label className="mt-4 block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">Labor rule</span>
          <select
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-teal-600"
            onChange={(event) => setLaborRule(event.target.value)}
            value={laborRule}
          >
            <option value="ORDINARY">Ordinary service labor pool</option>
            <option value="SPECIALIST">Graphene/detailing specialist only</option>
            <option value="EXTERNAL">External contractor (manual labor cost)</option>
          </select>
        </label>
        {laborRule !== 'EXTERNAL' && (
          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Labor percentage
            </span>
            <div className="flex rounded-xl border border-slate-300 focus-within:border-teal-600">
              <input
                className="min-w-0 flex-1 rounded-l-xl px-4 py-3 outline-none"
                max="100"
                min="0"
                onChange={(event) => setLaborRatePercent(event.target.value)}
                required
                step="0.01"
                type="number"
                value={laborRatePercent}
              />
              <span className="grid place-items-center border-l border-slate-300 px-4 text-slate-500">
                %
              </span>
            </div>
          </label>
        )}
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
            {busy ? 'Saving…' : editing ? 'Save changes' : 'Add service'}
          </button>
        </div>
      </form>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="font-bold text-slate-950">Service catalog</h3>
          <p className="mt-1 text-sm text-slate-500">
            Workbook categories are provided as editable starting values.
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {services.map((service) => (
            <article
              className={`flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center ${service.isActive ? '' : 'bg-slate-50 opacity-70'}`}
              key={service.id}
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-bold text-slate-950">{service.name}</h4>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${service.laborRule === 'SPECIALIST' ? 'bg-amber-100 text-amber-800' : 'bg-teal-100 text-teal-800'}`}
                  >
                    {laborPolicyLabel(service)}
                  </span>
                  {!service.isActive && (
                    <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      Archived
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-slate-500">Display order {service.sortOrder}</p>
              </div>
              <div className="flex gap-2">
                <button
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold"
                  onClick={() => setEditing(service)}
                  type="button"
                >
                  Edit
                </button>
                <button
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold"
                  onClick={() => onStatus(service)}
                  type="button"
                >
                  {service.isActive ? 'Archive' : 'Restore'}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function laborPolicyLabel(service) {
  if (service.laborRule === 'EXTERNAL') {
    return 'External contractor';
  }

  const label = service.laborRule === 'SPECIALIST' ? 'Specialist only' : 'Ordinary labor';
  return `${label} · ${service.laborRateBasisPoints / 100}%`;
}
