import { useCallback, useEffect, useState } from 'react';
import { formatPeso } from '../catalogs/catalog-formatters.js';
import { ReasonDialog } from '../catalogs/ReasonDialog.jsx';
import {
  getSalaryPaymentHistory,
  getSalaryPaymentPreview,
  paySalaries,
  voidSalaryPayment,
} from './period-close-api.js';

export function SalaryPaymentsPage({ csrfToken, onNavigate }) {
  const today = todayLocal();
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const [preview, setPreview] = useState(null);
  const [history, setHistory] = useState({ periods: [], legacyDailyCloses: [] });
  const [note, setNote] = useState('');
  const [voidTarget, setVoidTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const historyData = await getSalaryPaymentHistory();
      setHistory(historyData);
      try {
        setPreview(await getSalaryPaymentPreview(start, end));
      } catch (previewError) {
        setPreview(null);
        setError(previewError.message);
      }
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [end, start]);

  useEffect(() => {
    load();
  }, [load]);

  async function handlePay() {
    setBusy(true);
    setError('');
    try {
      await paySalaries({ start, end, note: note.trim() }, csrfToken);
      setNote('');
      await load();
    } catch (paymentError) {
      setError(paymentError.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleVoid(reason) {
    await voidSalaryPayment(voidTarget.id, reason, csrfToken);
    setVoidTarget(null);
    await load();
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <p className="text-sm font-semibold text-blue-600">Payroll</p>
        <h2 className="ui-page-heading mt-1">Salary Payments</h2>
      </header>

      <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
          <DateInput label="Start date" max={today} onChange={setStart} value={start} />
          <DateInput label="End date" max={today} min={start} onChange={setEnd} value={end} />
          <button
            className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 font-bold text-blue-700"
            onClick={load}
            type="button"
          >
            Refresh preview
          </button>
        </div>
      </section>

      {error && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </p>
      )}
      {loading && !preview && <p className="text-sm text-slate-500">Loading…</p>}

      {preview && (
        <>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
            <SummaryCard label="Sales" value={formatPeso(preview.summary.totalSalesCentavos)} />
            <SummaryCard label="Purchases" value={formatPeso(preview.summary.purchaseCentavos)} />
            <SummaryCard
              label="Expenses after payment"
              value={formatPeso(preview.summary.expenseAfterPaymentCentavos)}
            />
            <SummaryCard
              label="Salary due"
              value={formatPeso(preview.summary.totalSalaryCentavos)}
            />
            <SummaryCard label="Meals" value={formatPeso(preview.summary.totalMealCentavos)} />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(20rem,0.7fr)]">
            <DailyBreakdown days={preview.days} />
            <div className="space-y-6">
              <EmployeeTotals employees={preview.employeeTotals} />
              <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-bold">Payment</h3>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${preview.canPay ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}
                  >
                    {preview.canPay ? 'Ready' : 'Not ready'}
                  </span>
                </div>
                {preview.unreviewedDates.length > 0 && (
                  <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
                    <p>{preview.unreviewedDates.length} day(s) still need review.</p>
                    <button
                      className="mt-2 font-bold underline"
                      onClick={() => onNavigate('Attendance')}
                      type="button"
                    >
                      Open Attendance
                    </button>
                  </div>
                )}
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-semibold text-blue-700">
                    Add note (optional)
                  </summary>
                  <textarea
                    className="mt-3 min-h-20 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    maxLength="500"
                    onChange={(event) => setNote(event.target.value)}
                    value={note}
                  />
                </details>
                <button
                  className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-3 font-bold text-white disabled:opacity-50"
                  disabled={busy || !preview.canPay}
                  onClick={handlePay}
                  type="button"
                >
                  {busy ? 'Paying…' : `Pay ${preview.payableDayCount} day(s)`}
                </button>
              </section>
            </div>
          </div>
        </>
      )}

      <PaymentHistory history={history} onVoid={setVoidTarget} />
      <ReasonDialog
        onCancel={() => setVoidTarget(null)}
        onConfirm={handleVoid}
        target={
          voidTarget
            ? {
                ...voidTarget,
                isActive: true,
                activeVerb: 'Void payment',
                label: `${voidTarget.start} to ${voidTarget.end}`,
              }
            : null
        }
      />
    </div>
  );
}

function DailyBreakdown({ days }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
      <div className="border-b border-blue-100 px-5 py-4">
        <h3 className="font-bold">Daily breakdown</h3>
      </div>
      <div
        aria-label="Salary payment daily breakdown"
        className="ui-scroll-list divide-y divide-slate-100"
        role="region"
        tabIndex="0"
      >
        {days.map((day) => (
          <details className="group p-4" key={day.businessDate}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
              <div>
                <strong>{day.businessDate}</strong>
                <p className="mt-1 text-xs text-slate-500">
                  {day.presentEmployeeCount} present ·{' '}
                  {day.alreadyPaid
                    ? 'Paid'
                    : day.reviewed
                      ? 'Reviewed'
                      : day.requiresReview
                        ? 'Needs review'
                        : 'No review needed'}
                </p>
              </div>
              <div className="text-right">
                <strong>{formatPeso(day.totalSalesCentavos)}</strong>
                <p className="text-xs text-slate-500">Salary {formatPeso(day.salaryCentavos)}</p>
              </div>
            </summary>
            <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm">
              <Metric label="Services" value={day.serviceSalesCentavos} />
              <Metric label="Tires" value={day.tireSalesCentavos} />
              <Metric label="Canteen" value={day.canteenSalesCentavos} />
              <Metric label="Purchases" value={day.purchaseCentavos} />
              <Metric label="Expenses after payment" value={day.expenseAfterPaymentCentavos} />
              <Metric label="Meals" value={day.mealCentavos} />
            </dl>
          </details>
        ))}
      </div>
    </section>
  );
}

function EmployeeTotals({ employees }) {
  return (
    <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
      <h3 className="font-bold">Employee totals</h3>
      <div className="mt-3 divide-y divide-slate-100">
        {employees.map((employee) => (
          <div className="flex justify-between gap-3 py-3 text-sm" key={employee.employeeId}>
            <span>
              {employee.employeeName} · {employee.dayCount} day(s)
            </span>
            <strong>{formatPeso(employee.salaryCentavos)}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function PaymentHistory({ history, onVoid }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
      <div className="border-b border-blue-100 px-5 py-4">
        <h3 className="font-bold">Payment history</h3>
      </div>
      {history.periods.length === 0 && history.legacyDailyCloses.length === 0 ? (
        <p className="p-6 text-sm text-slate-500">No salary payments yet.</p>
      ) : (
        <div
          aria-label="Salary payment history list"
          className="ui-scroll-list divide-y divide-slate-100"
          role="region"
          tabIndex="0"
        >
          {history.periods.map((run) => (
            <article className="p-5" key={run.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <strong>
                    {run.start} to {run.end}
                  </strong>
                  <p className="mt-1 text-sm text-slate-500">
                    Salary {formatPeso(run.totalSalaryCentavos)} · Meals{' '}
                    {formatPeso(run.totalMealCentavos)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold">
                    {run.status}
                  </span>
                  {run.status === 'PAID' && (
                    <button
                      className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800"
                      onClick={() => onVoid(run)}
                      type="button"
                    >
                      Void payment
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
          {history.legacyDailyCloses.map((run) => (
            <article className="bg-slate-50 p-5" key={`legacy-${run.id}`}>
              <strong>{run.start}</strong>
              <p className="mt-1 text-sm text-slate-500">Legacy Daily Close · {run.status}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function DateInput({ label, onChange, ...props }) {
  return (
    <label>
      <span className="mb-1 block text-xs font-semibold text-slate-500">{label}</span>
      <input
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold outline-none focus:border-blue-500"
        onChange={(event) => onChange(event.target.value)}
        type="date"
        {...props}
      />
    </label>
  );
}
function SummaryCard({ label, value }) {
  return (
    <article className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm sm:p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-bold text-blue-950">{value}</p>
    </article>
  );
}
function Metric({ label, value }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 font-semibold">{formatPeso(value)}</dd>
    </div>
  );
}
function todayLocal() {
  const now = new Date();
  return new Date(now.valueOf() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}
