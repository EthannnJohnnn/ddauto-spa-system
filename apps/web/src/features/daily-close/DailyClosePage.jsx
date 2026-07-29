import { useCallback, useEffect, useState } from 'react';
import { formatPeso } from '../catalogs/catalog-formatters.js';
import { ReasonDialog } from '../catalogs/ReasonDialog.jsx';
import { closeBusinessDate, getDailyClose, reopenBusinessDate } from './daily-close-api.js';

export function DailyClosePage({ csrfToken, onNavigate }) {
  const [businessDate, setBusinessDate] = useState(todayLocal());
  const [dailyClose, setDailyClose] = useState(null);
  const [closeNote, setCloseNote] = useState('');
  const [reopenTarget, setReopenTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setDailyClose(await getDailyClose(businessDate));
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [businessDate]);

  useEffect(() => {
    load();
  }, [load]);

  async function closeDay() {
    setBusy(true);
    setError('');
    try {
      setDailyClose(
        await closeBusinessDate({ businessDate, closeNote: closeNote.trim() }, csrfToken),
      );
      setCloseNote('');
    } catch (closeError) {
      setError(closeError.message);
    } finally {
      setBusy(false);
    }
  }

  async function reopenDay(reason) {
    setDailyClose(await reopenBusinessDate({ businessDate, reason }, csrfToken));
    setReopenTarget(null);
  }

  if (loading && !dailyClose) return <PageMessage title="Loading Daily Close…" />;
  if (!dailyClose)
    return <PageMessage detail={error} onRetry={load} title="Daily Close could not load" />;

  const activeRun = dailyClose.runs.find((run) => run.status === 'CLOSED');
  const summary = activeRun?.summary ?? dailyClose.preview.summary;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-semibold text-teal-700">Daily reconciliation</p>
          <h2 className="ui-page-heading mt-1">Daily Close</h2>
          <p className="mt-2 max-w-3xl leading-7 text-slate-600">
            Review all sales and outflows, finalize the day, and preserve an auditable snapshot.
          </p>
        </div>
        <label className="w-full sm:w-auto">
          <span className="mb-2 block text-sm font-semibold text-slate-600">Business date</span>
          <input
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold outline-none focus:border-teal-600 sm:w-48"
            onChange={(event) => {
              setDailyClose(null);
              setBusinessDate(event.target.value);
            }}
            type="date"
            value={businessDate}
          />
        </label>
      </div>

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <CloseSummary summary={summary} />

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.65fr)]">
        <Breakdown summary={summary} />
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-bold text-slate-950">Closing status</h3>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-bold ${dailyClose.isClosed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}
              >
                {dailyClose.isClosed ? 'Closed' : 'Open'}
              </span>
            </div>
          </div>
          {activeRun ? (
            <div className="p-5">
              <p className="text-sm leading-6 text-slate-600">
                This snapshot is locked. Reopen the date before correcting its transactions,
                attendance, payroll, purchases, or expenses.
              </p>
              {activeRun.closeNote && (
                <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                  {activeRun.closeNote}
                </p>
              )}
              <button
                className="mt-4 w-full rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 font-bold text-amber-900 hover:bg-amber-100"
                onClick={() =>
                  setReopenTarget({
                    isActive: true,
                    activeVerb: 'Reopen',
                    label: `Daily Close for ${businessDate}`,
                  })
                }
                type="button"
              >
                Reopen this day
              </button>
            </div>
          ) : (
            <div className="p-5">
              {dailyClose.payroll.hasEmployees && !dailyClose.payroll.isClosed && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <p className="font-bold">Payroll is still open</p>
                  <p className="mt-1">Finalize attendance and payroll before closing this day.</p>
                  <button
                    className="mt-3 font-bold underline"
                    onClick={() => onNavigate('Attendance & payroll')}
                    type="button"
                  >
                    Open Attendance & payroll
                  </button>
                </div>
              )}
              <label className="mt-4 block">
                <span className="mb-1 block text-xs font-semibold text-slate-600">
                  Closing note (optional)
                </span>
                <textarea
                  className="min-h-24 w-full resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600"
                  maxLength="300"
                  onChange={(event) => setCloseNote(event.target.value)}
                  placeholder="Example: Owner checked all transactions"
                  value={closeNote}
                />
              </label>
              <button
                className="mt-3 w-full rounded-xl bg-teal-700 px-4 py-3 font-bold text-white hover:bg-teal-800 disabled:opacity-60"
                disabled={busy || (dailyClose.payroll.hasEmployees && !dailyClose.payroll.isClosed)}
                onClick={closeDay}
                type="button"
              >
                {busy ? 'Closing…' : 'Finalize Daily Close'}
              </button>
            </div>
          )}
        </section>
      </div>

      <CloseHistory runs={dailyClose.runs} />
      <ReasonDialog
        onCancel={() => setReopenTarget(null)}
        onConfirm={reopenDay}
        target={reopenTarget}
      />
    </div>
  );
}

export function CloseSummary({ summary }) {
  const cards = [
    ['Combined sales', summary.totalSalesCentavos],
    ['Purchases', summary.purchaseCentavos],
    ['Operating expenses', summary.expenseCentavos],
    ['Cash movement', summary.cashMovementCentavos],
  ];
  return (
    <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(([label, value]) => (
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" key={label}>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-2xl font-bold text-slate-950">{formatPeso(value)}</p>
        </article>
      ))}
    </div>
  );
}

function Breakdown({ summary }) {
  const rows = [
    ['Service sales', summary.serviceSalesCentavos],
    ['Tire sales', summary.tireSalesCentavos],
    ['Canteen sales', summary.canteenSalesCentavos],
    ['Product cost', summary.productCostCentavos],
    ['Outside labor', summary.externalLaborCentavos],
    ['Estimated gross profit', summary.estimatedGrossProfitCentavos],
    ['Estimated net', summary.estimatedNetCentavos],
  ];
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h3 className="font-bold text-slate-950">Final breakdown</h3>
        <p className="mt-1 text-sm text-slate-500">
          Amounts come directly from their original ledgers.
        </p>
      </div>
      <dl className="divide-y divide-slate-100">
        {rows.map(([label, value]) => (
          <div className="flex items-center justify-between gap-4 px-5 py-3" key={label}>
            <dt className="text-sm text-slate-600">{label}</dt>
            <dd className="font-bold text-slate-950">{formatPeso(value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function CloseHistory({ runs }) {
  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h3 className="font-bold text-slate-950">Closing history</h3>
        <p className="mt-1 text-sm text-slate-500">
          Original snapshots remain available after reopening.
        </p>
      </div>
      {runs.length === 0 ? (
        <p className="p-6 text-center text-sm text-slate-500">This date has not been closed.</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {runs.map((run) => (
            <article className="p-5" key={run.id}>
              <div className="flex items-center justify-between gap-3">
                <p className="font-bold text-slate-900">Close #{run.id}</p>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                  {run.status === 'CLOSED' ? 'Closed' : 'Reopened'}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Sales {formatPeso(run.summary.totalSalesCentavos)} · Cash movement{' '}
                {formatPeso(run.summary.cashMovementCentavos)}
              </p>
              {run.reopenReason && (
                <p className="mt-2 text-xs text-amber-700">Reason: {run.reopenReason}</p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function PageMessage({ title, detail, onRetry }) {
  return (
    <section className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
      <h2 className="text-xl font-bold">{title}</h2>
      {detail && <p className="mt-2 text-slate-600">{detail}</p>}
      {onRetry && (
        <button
          className="mt-5 rounded-xl bg-teal-700 px-5 py-3 font-semibold text-white"
          onClick={onRetry}
          type="button"
        >
          Try again
        </button>
      )}
    </section>
  );
}

function todayLocal() {
  const now = new Date();
  return new Date(now.valueOf() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}
