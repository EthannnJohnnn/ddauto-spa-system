import { useCallback, useEffect, useState } from 'react';
import { formatPeso } from '../catalogs/catalog-formatters.js';
import { ReasonDialog } from '../catalogs/ReasonDialog.jsx';
import { AttendancePayrollPanel } from '../service-sales/AttendancePayrollPanel.jsx';
import { PayrollClosingPanel } from '../service-sales/PayrollClosingPanel.jsx';
import {
  closeDailyPayroll,
  getDailyPayroll,
  reopenDailyPayroll,
} from '../service-sales/payroll-api.js';
import { getDailyServiceSales, saveAttendance } from '../service-sales/service-sales-api.js';

export function AttendancePayrollPage({ csrfToken }) {
  const [businessDate, setBusinessDate] = useState(todayLocal());
  const [daily, setDaily] = useState(null);
  const [payrollState, setPayrollState] = useState(null);
  const [reopenTarget, setReopenTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [dailyData, payrollData] = await Promise.all([
        getDailyServiceSales(businessDate),
        getDailyPayroll(businessDate),
      ]);
      setDaily(dailyData);
      setPayrollState(payrollData);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [businessDate]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateAttendance(values) {
    await saveAttendance(values, csrfToken);
    await load();
  }

  async function closePayroll(values) {
    await closeDailyPayroll(values, csrfToken);
    await load();
  }

  async function reopenPayroll(reason) {
    await reopenDailyPayroll({ businessDate, reason }, csrfToken);
    setReopenTarget(null);
    await load();
  }

  if (loading && !daily) return <PageMessage title="Loading attendance and payrollâ€¦" />;
  if (!daily || !payrollState) {
    return (
      <PageMessage detail={error} onRetry={load} title="Attendance and payroll could not load" />
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-semibold text-teal-700">Daily workforce</p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
            Attendance & payroll
          </h2>
          <p className="mt-2 max-w-2xl leading-7 text-slate-600">
            Review attendance, meal deductions, job labor, fixed-rate top-ups, and finalized payroll
            from one place.
          </p>
        </div>
        <label className="w-full sm:w-auto">
          <span className="mb-2 block text-sm font-semibold text-slate-600">Business date</span>
          <input
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold outline-none focus:border-teal-600 sm:w-48"
            onChange={(event) => {
              setDaily(null);
              setPayrollState(null);
              setBusinessDate(event.target.value);
            }}
            type="date"
            value={businessDate}
          />
        </label>
      </div>

      {error && <ErrorMessage message={error} />}
      <PayrollSummary daily={daily} payrollState={payrollState} />

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(22rem,0.75fr)]">
        <AttendancePayrollPanel
          attendance={daily.attendance}
          businessDate={businessDate}
          locked={payrollState.isClosed}
          onSave={updateAttendance}
          payroll={daily.payroll}
        />
        <div className="space-y-6">
          <PayrollClosingPanel
            businessDate={businessDate}
            key={businessDate}
            onClose={closePayroll}
            onRequestReopen={() =>
              setReopenTarget({
                isActive: true,
                activeVerb: 'Reopen',
                label: `payroll for ${businessDate}`,
              })
            }
            payrollState={payrollState}
          />
          <PayrollHistory runs={payrollState.runs} />
        </div>
      </div>

      <ReasonDialog
        onCancel={() => setReopenTarget(null)}
        onConfirm={reopenPayroll}
        target={reopenTarget}
      />
    </div>
  );
}

export function PayrollSummary({ daily, payrollState }) {
  const activeRun = payrollState.runs.find((run) => run.status === 'CLOSED');
  const cards = [
    ['Present employees', String(daily.attendance.filter((entry) => entry.isPresent).length)],
    ['Payroll', formatPeso(activeRun?.totalSalaryCentavos ?? daily.summary.totalPayrollCentavos)],
    ['Staff meals', formatPeso(activeRun?.totalMealCentavos ?? daily.summary.mealCostCentavos)],
    ['Status', payrollState.isClosed ? 'Closed' : 'Open'],
  ];
  return (
    <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(([label, value]) => (
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" key={label}>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-2xl font-bold text-slate-950">{value}</p>
        </article>
      ))}
    </div>
  );
}

function PayrollHistory({ runs }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h3 className="font-bold text-slate-950">Payroll history</h3>
        <p className="mt-1 text-sm text-slate-500">Reopened runs remain visible for audit.</p>
      </div>
      {runs.length === 0 ? (
        <p className="p-6 text-center text-sm text-slate-500">No payroll run for this date.</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {runs.map((run) => (
            <article className="p-4" key={run.id}>
              <div className="flex items-center justify-between gap-3">
                <p className="font-bold text-slate-900">Run #{run.id}</p>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                  {run.status === 'CLOSED' ? 'Closed' : 'Reopened'}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                {formatPeso(run.totalSalaryCentavos)} payroll Â· {formatPeso(run.totalMealCentavos)}{' '}
                meals
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

function ErrorMessage({ message }) {
  return (
    <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
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
