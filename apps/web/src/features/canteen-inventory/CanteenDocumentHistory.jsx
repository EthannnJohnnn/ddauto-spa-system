import { formatPeso } from '../catalogs/catalog-formatters.js';

export function CanteenDocumentHistory({ documents, onEdit, onStatus }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div>
          <h3 className="font-bold text-slate-950">Inventory document history</h3>
          <p className="mt-1 text-sm text-slate-500">
            Purchases, sales, beginning stock, and adjustments for the selected period.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
          {documents.length} documents
        </span>
      </div>

      {documents.length === 0 ? (
        <div className="p-10 text-center">
          <p className="font-semibold text-slate-700">No canteen activity in this period</p>
          <p className="mt-1 text-sm text-slate-500">
            Change the period or record a beginning balance, purchase, sale, or adjustment.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {documents.map((document) => (
            <article
              className={`p-5 ${document.status === 'VOIDED' ? 'bg-slate-50 opacity-65' : ''}`}
              key={document.id}
            >
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <DocumentBadge type={document.documentType} />
                    <span className="text-sm font-bold text-slate-700">
                      #{document.documentSequence}
                    </span>
                    <span className="text-sm text-slate-500">
                      {formatDate(document.businessDate)}
                    </span>
                    {document.status === 'VOIDED' && (
                      <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                        Voided
                      </span>
                    )}
                  </div>
                  {document.counterpartyName && (
                    <p className="mt-2 font-semibold text-slate-800">{document.counterpartyName}</p>
                  )}
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {document.items.map((item) => (
                      <div
                        className="rounded-xl border border-slate-200 bg-white p-3"
                        key={item.id}
                      >
                        <div className="flex justify-between gap-3">
                          <p className="font-semibold text-slate-900">{item.productName}</p>
                          <p
                            className={`font-bold ${item.stockDelta < 0 ? 'text-red-600' : 'text-emerald-700'}`}
                          >
                            {item.stockDelta > 0 ? '+' : ''}
                            {item.stockDelta}
                          </p>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {categoryLabel(item.category)}
                        </p>
                        {document.documentType !== 'ADJUSTMENT' && (
                          <p className="mt-2 text-xs font-semibold text-slate-600">
                            {formatPeso(item.lineTotalCentavos)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                  {document.notes && (
                    <p className="mt-3 text-sm text-slate-500">{document.notes}</p>
                  )}
                  {document.voidReason && (
                    <p className="mt-2 text-sm text-red-600">Reason: {document.voidReason}</p>
                  )}
                </div>
                <div className="flex items-center justify-between gap-4 lg:block lg:text-right">
                  {document.documentType !== 'ADJUSTMENT' && (
                    <p className="text-xl font-bold text-slate-950">
                      {formatPeso(document.totalCentavos)}
                    </p>
                  )}
                  <div className="mt-2 flex gap-2">
                    {document.status === 'ACTIVE' && (
                      <button
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
                        onClick={() => onEdit(document)}
                        type="button"
                      >
                        Edit
                      </button>
                    )}
                    <button
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
                      onClick={() => onStatus(document)}
                      type="button"
                    >
                      {document.status === 'ACTIVE' ? 'Void' : 'Restore'}
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function DocumentBadge({ type }) {
  const settings = {
    SALE: ['Sale', 'bg-blue-100 text-blue-800'],
    PURCHASE: ['Purchase', 'bg-violet-100 text-violet-800'],
    BEGINNING: ['Beginning', 'bg-teal-100 text-teal-800'],
    ADJUSTMENT: ['Adjustment', 'bg-amber-100 text-amber-800'],
  }[type];
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${settings[1]}`}>
      {settings[0]}
    </span>
  );
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeZone: 'UTC' }).format(
    new Date(`${value}T00:00:00.000Z`),
  );
}

function categoryLabel(category) {
  return { DRINK: 'Drink', SNACK: 'Snack', OTHER: 'Other' }[category];
}
