import { useEffect, useMemo, useState } from 'react';
import { centavosToInput, inputToCentavos } from '../catalogs/catalog-formatters.js';

export function ExpenseForm({ categories, businessDate, editingExpense, onCancel, onSave }) {
  const selectableCategories = useMemo(
    () =>
      categories.filter(
        (category) => !category.systemCode || category.id === editingExpense?.categoryId,
      ),
    [categories, editingExpense],
  );
  const firstActiveCategoryId = useMemo(
    () => selectableCategories.find((category) => category.isActive)?.id ?? '',
    [selectableCategories],
  );
  const [values, setValues] = useState(() => emptyValues(businessDate, firstActiveCategoryId));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setValues(
      editingExpense
        ? valuesFromExpense(editingExpense)
        : emptyValues(businessDate, firstActiveCategoryId),
    );
    setError('');
  }, [businessDate, editingExpense, firstActiveCategoryId]);

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const amountCentavos = inputToCentavos(values.amountPesos);
      if (amountCentavos < 1) throw new Error('Expense amount must be greater than zero.');
      await onSave(editingExpense?.id, {
        businessDate: values.businessDate,
        categoryId: Number(values.categoryId),
        description: values.description,
        payee: values.payee,
        referenceNumber: values.referenceNumber,
        amountCentavos,
        notes: values.notes,
      });
      setValues(emptyValues(businessDate, firstActiveCategoryId));
    } catch (submissionError) {
      setError(submissionError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      onSubmit={handleSubmit}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-teal-700">
            {editingExpense ? 'Edit expense' : 'New expense'}
          </p>
          <h3 className="mt-1 text-xl font-bold text-slate-950">Expense details</h3>
        </div>
        {editingExpense && (
          <button className="text-sm font-semibold text-slate-500" onClick={onCancel} type="button">
            Cancel
          </button>
        )}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="Business date">
          <input
            className={inputClass}
            onChange={(event) => update('businessDate', event.target.value)}
            required
            type="date"
            value={values.businessDate}
          />
        </Field>
        <Field label="Category">
          <select
            className={inputClass}
            onChange={(event) => update('categoryId', event.target.value)}
            required
            value={values.categoryId}
          >
            <option disabled value="">
              Select category
            </option>
            {selectableCategories.map((category) => (
              <option
                disabled={!category.isActive && Number(values.categoryId) !== category.id}
                key={category.id}
                value={category.id}
              >
                {category.name}
                {category.isActive ? '' : ' (Archived)'}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Description">
          <input
            className={inputClass}
            maxLength="160"
            onChange={(event) => update('description', event.target.value)}
            placeholder="Example: Pressure washer repair"
            value={values.description}
          />
        </Field>
        <Field label="Payee">
          <input
            className={inputClass}
            maxLength="100"
            onChange={(event) => update('payee', event.target.value)}
            placeholder="Optional person or supplier"
            value={values.payee}
          />
        </Field>
        <Field label="Amount">
          <div className="flex rounded-xl border border-slate-300 bg-white focus-within:border-teal-600">
            <span className="grid place-items-center border-r border-slate-300 px-3 text-slate-500">
              ₱
            </span>
            <input
              aria-label="Amount"
              className="min-w-0 flex-1 rounded-r-xl px-3 py-2.5 outline-none"
              min="0.01"
              onChange={(event) => update('amountPesos', event.target.value)}
              required
              step="0.01"
              type="number"
              value={values.amountPesos}
            />
          </div>
        </Field>
        <Field label="Reference number">
          <input
            className={inputClass}
            maxLength="60"
            onChange={(event) => update('referenceNumber', event.target.value)}
            placeholder="Optional receipt or invoice"
            value={values.referenceNumber}
          />
        </Field>
      </div>
      <Field className="mt-4" label="Notes">
        <textarea
          className={`${inputClass} min-h-24 resize-y`}
          maxLength="500"
          onChange={(event) => update('notes', event.target.value)}
          placeholder="Optional details"
          value={values.notes}
        />
      </Field>

      {error && <p className="mt-4 text-sm font-medium text-red-600">{error}</p>}
      <button
        className="mt-5 w-full rounded-xl bg-teal-700 px-4 py-3 font-bold text-white hover:bg-teal-800 disabled:opacity-60"
        disabled={busy || !values.categoryId}
        type="submit"
      >
        {busy ? 'Saving…' : editingExpense ? 'Save expense changes' : 'Record expense'}
      </button>
    </form>
  );
}

function Field({ label, className = '', children }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function emptyValues(businessDate, categoryId) {
  return {
    businessDate,
    categoryId: categoryId ? String(categoryId) : '',
    description: '',
    payee: '',
    amountPesos: '0.00',
    referenceNumber: '',
    notes: '',
  };
}

function valuesFromExpense(expense) {
  return {
    businessDate: expense.businessDate,
    categoryId: String(expense.categoryId),
    description: expense.description,
    payee: expense.payee,
    amountPesos: centavosToInput(expense.amountCentavos),
    referenceNumber: expense.referenceNumber,
    notes: expense.notes,
  };
}

const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10';
