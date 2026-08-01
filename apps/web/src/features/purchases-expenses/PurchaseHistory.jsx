import { formatPeso } from '../catalogs/catalog-formatters.js';

export function PurchaseHistory({ purchases, purchaseSource, onSourceChange, onManage, onStatus }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center">
        <h3 className="font-bold text-slate-950">Purchase history</h3>
        <div
          className="flex rounded-xl border border-blue-200 bg-blue-50 p-1"
          aria-label="Purchase source"
        >
          {[
            ['ALL', 'All'],
            ['TIRE', 'Tires'],
            ['CANTEEN', 'Canteen'],
          ].map(([value, label]) => (
            <button
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${purchaseSource === value ? 'bg-blue-700 text-white shadow-sm' : 'text-slate-600 hover:bg-white hover:text-blue-800'}`}
              key={value}
              onClick={() => onSourceChange(value)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {purchases.length === 0 ? (
        <div className="p-10 text-center">
          <p className="font-semibold text-slate-700">No purchases in this period</p>
          <p className="mt-1 text-sm text-slate-500">
            Record stock from the tire or canteen inventory section.
          </p>
        </div>
      ) : (
        <div
          aria-label="Purchase history list"
          className="ui-scroll-list divide-y divide-slate-100"
          role="region"
          tabIndex="0"
        >
          {purchases.map((purchase) => (
            <article
              className={`p-5 ${purchase.status === 'VOIDED' ? 'bg-slate-50 opacity-65' : ''}`}
              key={purchase.id}
            >
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <SourceBadge source={purchase.source} />
                    <span className="text-sm font-bold text-slate-700">
                      Purchase #{purchase.documentSequence}
                    </span>
                    <span className="text-sm text-slate-500">
                      {formatDate(purchase.businessDate)}
                    </span>
                    {purchase.status === 'VOIDED' && (
                      <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                        Deleted
                      </span>
                    )}
                  </div>
                  {purchase.supplier && (
                    <p className="mt-2 font-semibold text-slate-800">{purchase.supplier}</p>
                  )}
                  {purchase.referenceNumber && (
                    <p className="mt-1 text-sm text-slate-500">Ref: {purchase.referenceNumber}</p>
                  )}
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {purchase.items.map((item) => (
                      <div
                        className="rounded-xl border border-slate-200 bg-white p-3"
                        key={item.id}
                      >
                        <div className="flex justify-between gap-3">
                          <p className="font-semibold text-slate-900">{item.productName}</p>
                          <p className="font-bold text-slate-700">×{item.quantity}</p>
                        </div>
                        {item.size && <p className="mt-1 text-xs text-slate-500">{item.size}</p>}
                        <p className="mt-2 text-xs font-semibold text-slate-600">
                          {formatPeso(item.unitCostCentavos)} each ·{' '}
                          {formatPeso(item.lineTotalCentavos)}
                        </p>
                      </div>
                    ))}
                  </div>
                  {purchase.notes && (
                    <p className="mt-3 text-sm text-slate-500">{purchase.notes}</p>
                  )}
                  {purchase.voidReason && (
                    <p className="mt-2 text-sm font-medium text-red-600">
                      Delete reason: {purchase.voidReason}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between gap-4 lg:block lg:text-right">
                  <p className="text-xl font-bold text-slate-950">
                    {formatPeso(purchase.totalCentavos)}
                  </p>
                  <div className="mt-2 flex gap-2">
                    {purchase.status === 'ACTIVE' && (
                      <button
                        className={buttonClass}
                        onClick={() => onManage(purchase)}
                        type="button"
                      >
                        Edit
                      </button>
                    )}
                    <button
                      className={buttonClass}
                      onClick={() => onStatus(purchase)}
                      type="button"
                    >
                      {purchase.status === 'ACTIVE' ? 'Delete' : 'Restore'}
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

function SourceBadge({ source }) {
  const isTire = source === 'TIRE';
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${isTire ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}
    >
      {isTire ? 'Tires' : 'Canteen'}
    </span>
  );
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeZone: 'UTC' }).format(
    new Date(`${value}T00:00:00.000Z`),
  );
}

const buttonClass =
  'rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50';
