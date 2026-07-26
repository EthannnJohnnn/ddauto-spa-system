import { formatPeso } from '../catalogs/catalog-formatters.js';

export function DailyTransactions({ tickets, onEdit, onStatus, locked = false, className = '' }) {
  return (
    <section
      className={`${className} overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm`}
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div>
          <h3 className="font-bold text-slate-950">Daily transactions</h3>
          <p className="mt-1 text-sm text-slate-500">
            Customer numbers restart for each business date.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
          {tickets.length} recorded
        </span>
      </div>
      {tickets.length === 0 ? (
        <div className="p-10 text-center">
          <p className="font-semibold text-slate-700">No service transactions for this date</p>
          <p className="mt-1 text-sm text-slate-500">
            Use the form above to record the first vehicle.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {tickets.map((ticket) => (
            <article
              className={`p-5 ${ticket.status === 'VOIDED' ? 'bg-slate-50 opacity-65' : ''}`}
              key={ticket.id}
            >
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-teal-50 px-2.5 py-1 text-sm font-bold text-teal-800">
                      #{ticket.customerSequence}
                    </span>
                    <h4 className="font-bold text-slate-950">
                      {ticket.vehicleDescription || ticket.vehicleClassName}
                    </h4>
                    <span className="text-sm text-slate-500">{ticket.vehicleClassName}</span>
                    {ticket.plateNumber && (
                      <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                        {ticket.plateNumber}
                      </span>
                    )}
                    {ticket.status === 'VOIDED' && (
                      <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                        Voided
                      </span>
                    )}
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {ticket.items.map((item) => (
                      <div
                        className="rounded-xl border border-slate-200 bg-white p-3"
                        key={item.id}
                      >
                        <div className="flex justify-between gap-3">
                          <p className="font-semibold text-slate-900">{item.serviceName}</p>
                          <p className="font-semibold text-slate-700">
                            {formatPeso(item.amountCentavos)}
                          </p>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{laborDescription(item)}</p>
                      </div>
                    ))}
                  </div>
                  {ticket.notes && <p className="mt-3 text-sm text-slate-500">{ticket.notes}</p>}
                  {ticket.voidReason && (
                    <p className="mt-2 text-sm text-red-600">Reason: {ticket.voidReason}</p>
                  )}
                </div>
                <div className="flex items-center justify-between gap-4 lg:block lg:text-right">
                  <p className="text-xl font-bold text-slate-950">
                    {formatPeso(ticket.totalCentavos)}
                  </p>
                  <div className="mt-2 flex gap-2">
                    {ticket.status === 'ACTIVE' && !locked && (
                      <button
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
                        onClick={() => onEdit(ticket)}
                        type="button"
                      >
                        Edit
                      </button>
                    )}
                    {!locked && (
                      <button
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
                        onClick={() => onStatus(ticket)}
                        type="button"
                      >
                        {ticket.status === 'ACTIVE' ? 'Void' : 'Restore'}
                      </button>
                    )}
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

function laborDescription(item) {
  if (item.laborPolicy === 'EXTERNAL') {
    return `${item.externalContractorName} · ${formatPeso(item.externalLaborCostCentavos)} contractor labor`;
  }
  if (item.workers.length === 0) return 'No worker assignment';
  return item.workers
    .map((worker) => `${worker.employeeName} ${formatPeso(worker.laborShareCentavos)}`)
    .join(' · ');
}
