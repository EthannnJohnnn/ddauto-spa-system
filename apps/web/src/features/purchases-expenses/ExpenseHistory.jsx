import { formatPeso } from '../catalogs/catalog-formatters.js';

export function ExpenseHistory({ expenses, onEdit, onStatus }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <h3 className="font-bold text-slate-950">Expense history</h3>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
          {expenses.length} entries
        </span>
      </div>
      {expenses.length === 0 ? (
        <EmptyState />
      ) : (
        <div
          aria-label="Expense history list"
          className="ui-scroll-list divide-y divide-slate-100"
          role="region"
          tabIndex="0"
        >
          {expenses.map((expense) => (
            <article
              className={`p-5 ${expense.status === 'VOIDED' ? 'bg-slate-50 opacity-65' : ''}`}
              key={expense.id}
            >
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-800">
                      {expense.categoryName}
                    </span>
                    <span className="text-sm text-slate-500">
                      {formatDate(expense.businessDate)}
                    </span>
                    {expense.status === 'VOIDED' && (
                      <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                        Deleted
                      </span>
                    )}
                  </div>
                  <p className="mt-2 font-bold text-slate-900">
                    {expense.description || expense.categoryName}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                    {expense.payee && <span>Paid to {expense.payee}</span>}
                    {expense.referenceNumber && <span>Ref: {expense.referenceNumber}</span>}
                  </div>
                  {expense.notes && <p className="mt-2 text-sm text-slate-500">{expense.notes}</p>}
                  {expense.voidReason && (
                    <p className="mt-2 text-sm font-medium text-red-600">
                      Delete reason: {expense.voidReason}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between gap-4 sm:block sm:text-right">
                  <p className="text-xl font-bold text-slate-950">
                    {formatPeso(expense.amountCentavos)}
                  </p>
                  {expense.sourceType === 'MANUAL' ? (
                    <div className="mt-2 flex gap-2">
                      {expense.status === 'ACTIVE' && (
                        <button
                          className={buttonClass}
                          onClick={() => onEdit(expense)}
                          type="button"
                        >
                          Edit
                        </button>
                      )}
                      <button
                        className={buttonClass}
                        onClick={() => onStatus(expense)}
                        type="button"
                      >
                        {expense.status === 'ACTIVE' ? 'Delete' : 'Restore'}
                      </button>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs font-semibold text-slate-400">
                      Managed by{' '}
                      {expense.sourceType.startsWith('EQUIPMENT_') ? 'equipment' : 'payroll'}
                    </p>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function EmptyState() {
  return (
    <div className="p-10 text-center">
      <p className="font-semibold text-slate-700">No expenses in this period</p>
      <p className="mt-1 text-sm text-slate-500">Record an expense or choose another date range.</p>
    </div>
  );
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeZone: 'UTC' }).format(
    new Date(`${value}T00:00:00.000Z`),
  );
}

const buttonClass =
  'rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50';
