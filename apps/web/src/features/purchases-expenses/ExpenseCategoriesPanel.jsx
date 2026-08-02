import { useEffect, useState } from 'react';
import { useEditNavigation } from '../../hooks/useEditNavigation.js';

export function ExpenseCategoriesPanel({ categories, onSave, onStatus }) {
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const editRegionRef = useEditNavigation(editing);

  useEffect(() => {
    setName(editing?.name ?? '');
    setError('');
  }, [editing]);

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onSave(editing?.id, { name });
      setEditing(null);
      setName('');
    } catch (submissionError) {
      setError(submissionError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
      <form
        className="h-fit scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        onSubmit={handleSubmit}
        ref={editRegionRef}
      >
        <p className="text-sm font-semibold text-teal-700">
          {editing ? 'Edit category' : 'New category'}
        </p>
        <h3 className="mt-1 text-xl font-bold text-slate-950">Expense category</h3>
        <label className="mt-5 block">
          <span className="mb-1.5 block text-sm font-semibold text-slate-700">Category name</span>
          <input
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-teal-600"
            maxLength="80"
            onChange={(event) => setName(event.target.value)}
            placeholder="Example: Insurance"
            required
            value={name}
          />
        </label>
        {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}
        <button
          className="mt-5 w-full rounded-xl bg-teal-700 px-4 py-3 font-bold text-white disabled:opacity-60"
          disabled={busy}
          type="submit"
        >
          {busy ? 'Saving…' : editing ? 'Save category changes' : 'Add category'}
        </button>
        {editing && (
          <button
            className="mt-3 w-full text-sm font-semibold text-slate-500"
            onClick={() => setEditing(null)}
            type="button"
          >
            Cancel editing
          </button>
        )}
      </form>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="font-bold text-slate-950">Available categories</h3>
            <p className="mt-1 text-sm text-slate-500">Archived categories remain in history.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
            {categories.length} categories
          </span>
        </div>
        <div className="divide-y divide-slate-100">
          {categories.map((category) => (
            <article
              className={`flex flex-col justify-between gap-3 p-5 sm:flex-row sm:items-center ${category.isActive ? '' : 'bg-slate-50 opacity-65'}`}
              key={category.id}
            >
              <div className="flex items-center gap-2">
                <p className="font-semibold text-slate-900">{category.name}</p>
                {!category.isActive && (
                  <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    Archived
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                {category.isActive && (
                  <button
                    className={buttonClass}
                    onClick={() => setEditing(category)}
                    type="button"
                  >
                    Edit
                  </button>
                )}
                <button className={buttonClass} onClick={() => onStatus(category)} type="button">
                  {category.isActive ? 'Delete' : 'Restore'}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

const buttonClass =
  'rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50';
