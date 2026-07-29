import { useEffect, useState } from 'react';
import { AppIcon } from '../../components/AppIcon.jsx';
import {
  archiveDashboardNote,
  createDashboardNote,
  getDashboardNotes,
  updateDashboardNote,
} from './dashboard-api.js';

const emptyForm = { title: '', body: '' };

export function DashboardNotes({ csrfToken }) {
  const [notes, setNotes] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getDashboardNotes()
      .then((data) => active && setNotes(Array.isArray(data) ? data : []))
      .catch((loadError) => active && setError(loadError.message));
    return () => {
      active = false;
    };
  }, []);

  function openNewNote() {
    setForm(emptyForm);
    setEditingId(null);
    setError('');
    setFormOpen(true);
  }

  function openEdit(note) {
    setForm({ title: note.title, body: note.body });
    setEditingId(note.id);
    setError('');
    setFormOpen(true);
  }

  function closeForm() {
    setForm(emptyForm);
    setEditingId(null);
    setFormOpen(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const saved = editingId
        ? await updateDashboardNote(editingId, form, csrfToken)
        : await createDashboardNote(form, csrfToken);
      setNotes((current) => [saved, ...current.filter((note) => note.id !== saved.id)]);
      closeForm();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(note) {
    if (!window.confirm(`Remove “${note.title}” from the dashboard?`)) return;
    setSaving(true);
    setError('');
    try {
      await archiveDashboardNote(note.id, csrfToken);
      setNotes((current) => current.filter((entry) => entry.id !== note.id));
      if (editingId === note.id) closeForm();
    } catch (archiveError) {
      setError(archiveError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-50 text-amber-700">
              <AppIcon className="h-[1.1rem] w-[1.1rem]" name="note" />
            </span>
            <div>
              <h3 className="font-bold tracking-tight text-blue-950">Owner notes</h3>
              <p className="mt-0.5 text-sm text-slate-500">
                Keep reminders and follow-ups visible on this computer.
              </p>
            </div>
          </div>
        </div>
        <button
          className="flex w-fit items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          onClick={openNewNote}
          type="button"
        >
          <AppIcon className="h-4 w-4" name="plus" /> Add note
        </button>
      </div>

      {formOpen && (
        <form
          className="mt-5 grid gap-4 rounded-2xl border border-blue-100 bg-blue-50/55 p-4 lg:grid-cols-[minmax(12rem,0.7fr)_minmax(18rem,1.3fr)_auto] lg:items-end"
          onSubmit={handleSubmit}
        >
          <label className="text-sm font-semibold text-slate-700">
            Title
            <input
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 font-normal text-slate-950"
              maxLength="100"
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="Example: Call tire supplier"
              required
              value={form.title}
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Note
            <textarea
              className="mt-2 min-h-11 w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 font-normal text-slate-950"
              maxLength="1000"
              onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
              placeholder="Write the reminder or follow-up here"
              required
              rows="1"
              value={form.body}
            />
          </label>
          <div className="flex gap-2">
            <button
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              disabled={saving}
              type="submit"
            >
              {saving ? 'Saving…' : editingId ? 'Update' : 'Save'}
            </button>
            <button
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              onClick={closeForm}
              type="button"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {notes.length > 0 ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {notes.slice(0, 6).map((note) => (
            <article
              className="group rounded-2xl border border-slate-200 bg-[#fffdf7] p-4"
              key={note.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="truncate font-bold text-slate-900">{note.title}</h4>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                    {note.body}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1 opacity-70 transition group-hover:opacity-100">
                  <button
                    aria-label={`Edit ${note.title}`}
                    className="grid h-8 w-8 place-items-center rounded-lg text-blue-700 hover:bg-blue-50"
                    onClick={() => openEdit(note)}
                    type="button"
                  >
                    <AppIcon className="h-4 w-4" name="edit" />
                  </button>
                  <button
                    aria-label={`Remove ${note.title}`}
                    className="grid h-8 w-8 place-items-center rounded-lg text-red-600 hover:bg-red-50"
                    disabled={saving}
                    onClick={() => handleArchive(note)}
                    type="button"
                  >
                    <AppIcon className="h-4 w-4" name="trash" />
                  </button>
                </div>
              </div>
              <p className="mt-4 text-xs font-medium text-slate-400">
                Updated {formatNoteDate(note.updatedAt)}
              </p>
            </article>
          ))}
        </div>
      ) : (
        !formOpen && (
          <button
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-blue-200 bg-blue-50/45 px-4 py-7 text-sm font-semibold text-blue-600 hover:bg-blue-50"
            onClick={openNewNote}
            type="button"
          >
            <AppIcon className="h-4 w-4" name="plus" /> Add the first owner note
          </button>
        )
      )}
    </section>
  );
}

function formatNoteDate(value) {
  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}
