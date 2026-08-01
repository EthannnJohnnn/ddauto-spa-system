import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatPeso } from '../catalogs/catalog-formatters.js';
import { AttendancePayrollPanel } from '../service-sales/AttendancePayrollPanel.jsx';
import { getDailyServiceSales, saveAttendance } from '../service-sales/service-sales-api.js';
import { getOpenAttendance, setAttendanceReviewed } from './attendance-api.js';

export function AttendancePayrollPage({ csrfToken }) {
  const [through, setThrough] = useState(todayLocal());
  const [businessDate, setBusinessDate] = useState(todayLocal());
  const [overview, setOverview] = useState(null);
  const [daily, setDaily] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [overviewData, dailyData] = await Promise.all([
        getOpenAttendance(through),
        getDailyServiceSales(businessDate),
      ]);
      setOverview(overviewData);
      setDaily(dailyData);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [businessDate, through]);

  useEffect(() => {
    load();
  }, [load]);

  const selectedDay = useMemo(
    () => overview?.days.find((day) => day.businessDate === businessDate),
    [businessDate, overview],
  );

  async function updateAttendance(values) {
    await saveAttendance(values, csrfToken);
    await load();
  }

  async function toggleReview() {
    setBusy(true);
    setError('');
    try {
      await setAttendanceReviewed(businessDate, !selectedDay?.reviewed, csrfToken);
      await load();
    } catch (reviewError) {
      setError(reviewError.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading && !overview) return <PageMessage title="Loading attendance…" />;
  if (!overview || !daily) {
    return <PageMessage detail={error} onRetry={load} title="Attendance could not load" />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-semibold text-blue-600">Workforce</p>
          <h2 className="ui-page-heading mt-1">Attendance</h2>
        </div>
        <label>
          <span className="mb-1 block text-xs font-semibold text-slate-500">Show through</span>
          <input
            className="rounded-xl border border-blue-100 bg-white px-4 py-3 font-semibold outline-none focus:border-blue-500"
            max={todayLocal()}
            onChange={(event) => {
              setThrough(event.target.value);
              setBusinessDate(event.target.value);
            }}
            type="date"
            value={through}
          />
        </label>
      </header>

      {error && <ErrorMessage message={error} />}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Unpaid salary" value={formatPeso(overview.unpaidSalaryCentavos)} />
        <SummaryCard label="Open meals" value={formatPeso(overview.unpaidMealCentavos)} />
        <SummaryCard label="Employees" value={String(overview.employeeTotals.length)} />
        <SummaryCard label="Earliest unpaid" value={overview.earliestUnpaidDate ?? 'None'} />
      </div>

      <section className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
        <div className="border-b border-blue-100 px-5 py-4">
          <h3 className="font-bold text-slate-950">Daily review</h3>
        </div>
        <div className="max-h-72 overflow-auto">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead className="sticky top-0 bg-blue-50 text-xs uppercase tracking-wide text-blue-700">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Present</th>
                <th className="px-4 py-3">Salary</th>
                <th className="px-4 py-3">Meals</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...overview.days].reverse().map((day) => (
                <tr
                  className={`cursor-pointer hover:bg-blue-50 ${day.businessDate === businessDate ? 'bg-blue-50/80' : ''}`}
                  key={day.businessDate}
                  onClick={() => setBusinessDate(day.businessDate)}
                >
                  <td className="px-4 py-3 font-semibold">{day.businessDate}</td>
                  <td className="px-4 py-3">{day.presentEmployeeCount}</td>
                  <td className="px-4 py-3 font-semibold">{formatPeso(day.salaryCentavos)}</td>
                  <td className="px-4 py-3">{formatPeso(day.mealCentavos)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge day={day} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
        <AttendancePayrollPanel
          attendance={daily.attendance}
          businessDate={businessDate}
          locked={selectedDay?.status === 'PAID'}
          onSave={updateAttendance}
          payroll={daily.payroll}
        />
        <aside className="space-y-5">
          <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-bold">{businessDate}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Salary {formatPeso(selectedDay?.salaryCentavos ?? 0)}
                </p>
              </div>
              {selectedDay && <StatusBadge day={selectedDay} />}
            </div>
            {selectedDay?.status === 'OPEN' && selectedDay.requiresReview && (
              <button
                className={`mt-5 w-full rounded-xl px-4 py-3 font-bold ${selectedDay.reviewed ? 'border border-blue-200 bg-white text-blue-700' : 'bg-blue-600 text-white'}`}
                disabled={busy}
                onClick={toggleReview}
                type="button"
              >
                {selectedDay.reviewed ? 'Clear review' : 'Mark Reviewed'}
              </button>
            )}
            {selectedDay?.status === 'PAID' && (
              <p className="mt-4 text-sm text-slate-600">
                Included in a closed period. Reopen it to make changes.
              </p>
            )}
          </section>
          <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
            <h3 className="font-bold">Running unpaid totals</h3>
            <div className="mt-3 divide-y divide-slate-100">
              {overview.employeeTotals.map((employee) => (
                <div className="flex justify-between gap-3 py-3 text-sm" key={employee.employeeId}>
                  <span>
                    {employee.employeeName} · {employee.dayCount} day(s)
                  </span>
                  <strong>{formatPeso(employee.unpaidSalaryCentavos)}</strong>
                </div>
              ))}
              {overview.employeeTotals.length === 0 && (
                <p className="py-4 text-sm text-slate-500">No unpaid salary.</p>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

export function StatusBadge({ day }) {
  const label =
    day.status === 'PAID'
      ? 'Paid'
      : day.reviewed
        ? 'Reviewed'
        : day.requiresReview
          ? 'Needs review'
          : 'No activity';
  const color =
    day.status === 'PAID'
      ? 'bg-emerald-100 text-emerald-800'
      : day.reviewed
        ? 'bg-blue-100 text-blue-800'
        : day.requiresReview
          ? 'bg-amber-100 text-amber-800'
          : 'bg-slate-100 text-slate-500';
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${color}`}>{label}</span>;
}

function SummaryCard({ label, value }) {
  return (
    <article className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-bold text-blue-950">{value}</p>
    </article>
  );
}

function ErrorMessage({ message }) {
  return (
    <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </p>
  );
}

function PageMessage({ title, detail, onRetry }) {
  return (
    <section className="mx-auto max-w-lg rounded-2xl border border-blue-100 bg-white p-10 text-center shadow-sm">
      <h2 className="text-xl font-bold">{title}</h2>
      {detail && <p className="mt-2 text-slate-600">{detail}</p>}
      {onRetry && (
        <button
          className="mt-5 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white"
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
