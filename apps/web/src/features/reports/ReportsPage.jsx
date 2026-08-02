import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatPeso } from '../catalogs/catalog-formatters.js';
import { downloadReportsExcel, getReportsOverview } from './reports-api.js';

const tabs = [
  ['OVERVIEW', 'Daily summary'],
  ['SERVICE', 'Services'],
  ['TIRE', 'Tires'],
  ['CANTEEN', 'Canteen'],
];

export function ReportsPage() {
  const [periodMode, setPeriodMode] = useState('MONTHLY');
  const [anchorDate, setAnchorDate] = useState(todayLocal());
  const initialMonth = periodRange('MONTHLY', todayLocal());
  const [customStart, setCustomStart] = useState(initialMonth.start);
  const [customEnd, setCustomEnd] = useState(initialMonth.end);
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const period = useMemo(
    () =>
      periodMode === 'CUSTOM'
        ? { start: customStart, end: customEnd }
        : periodRange(periodMode, anchorDate),
    [anchorDate, customEnd, customStart, periodMode],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setReport(await getReportsOverview(period.start, period.end));
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [period.end, period.start, periodMode]);

  useEffect(() => {
    load();
  }, [load]);

  const exportExcel = async () => {
    setExporting(true);
    setError('');
    try {
      await downloadReportsExcel(period.start, period.end);
    } catch (exportError) {
      setError(exportError.message);
    } finally {
      setExporting(false);
    }
  };

  if (loading && !report) return <PageMessage title="Loading reports…" />;
  if (!report) return <PageMessage detail={error} onRetry={load} title="Reports could not load" />;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <p className="text-sm font-semibold text-teal-700">Owner reporting</p>
          <h2 className="ui-page-heading mt-1">Combined business reports</h2>
        </div>
        <div className="flex flex-col gap-3">
          <PeriodControls
            anchorDate={anchorDate}
            onDateChange={(value) => {
              setReport(null);
              setAnchorDate(value);
            }}
            onModeChange={(mode) => {
              setReport(null);
              setPeriodMode(mode);
            }}
            customEnd={customEnd}
            customStart={customStart}
            onCustomEndChange={(value) => {
              setReport(null);
              setCustomEnd(value);
            }}
            onCustomStartChange={(value) => {
              setReport(null);
              setCustomStart(value);
            }}
            periodMode={periodMode}
          />
          <button
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-wait disabled:opacity-65"
            disabled={exporting}
            onClick={exportExcel}
            type="button"
          >
            <DownloadIcon />
            {exporting ? 'Making Excel report…' : 'Download selected report'}
          </button>
        </div>
      </div>

      <p className="mt-3 text-sm font-medium text-slate-500">
        Showing {formatPeriod(period.start, period.end)} · {report.activityDayCount} day(s) with
        activity
      </p>
      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <ReportBoard board={report.reportBoard} />

      <div className="ui-tabs-shell">
        <div className="ui-tabs-row">
          {tabs.map(([value, label]) => (
            <button
              className={`ui-tab ${activeTab === value ? 'ui-tab-active' : 'ui-tab-idle'}`}
              key={value}
              onClick={() => setActiveTab(value)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        {activeTab === 'OVERVIEW' ? (
          <DailyBreakdownTable days={report.dailyBreakdown} />
        ) : (
          <TransactionList
            source={activeTab}
            transactions={transactionsFor(report.transactions, activeTab)}
          />
        )}
      </div>
    </div>
  );
}

function ReportBoard({ board }) {
  const totals = board.totals;
  return (
    <section className="mt-7 overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-blue-950 px-5 py-4 text-white">
        <h3 className="text-lg font-bold">Business summary</h3>
        <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">
          {board.totalServiced} serviced
        </span>
      </div>

      <div className="grid items-start gap-0 xl:grid-cols-[minmax(0,1.35fr)_minmax(17rem,0.65fr)]">
        <div className="min-w-0 border-b border-blue-100 xl:border-b-0 xl:border-r">
          <BreakdownStrip title="Sales income" rows={board.incomeBreakdown} />
          <div className="grid border-t border-blue-100 sm:grid-cols-3">
            <BoardTotal label="Total sales income" value={totals.totalSalesCentavos} />
            <BoardTotal label="Operating expenses" value={totals.expenseCentavos} tone="amber" />
            <BoardTotal
              label="Profit"
              note={`${formatPercent(totals.profitRateBasisPoints)} of sales`}
              value={totals.operatingProfitCentavos}
              tone="profit"
            />
          </div>
          <div className="grid border-t border-blue-100 sm:grid-cols-3">
            <BoardTotal label="Purchases" value={board.purchasesCentavos} compact />
            <BoardTotal label="Product costs" value={board.directProductCostCentavos} compact />
            <BoardTotal
              label="Outside labor"
              value={board.externalContractorCostCentavos}
              compact
            />
          </div>
        </div>

        <div className="grid min-w-0 md:grid-cols-2 xl:grid-cols-1">
          <BreakdownList title="Expense breakdown" rows={board.expenseBreakdown} />
          <SalaryBreakdown rows={board.employeeSalaryBreakdown} />
        </div>
      </div>
    </section>
  );
}

function BreakdownStrip({ title, rows }) {
  return (
    <div className="p-5">
      <h4 className="text-xs font-bold uppercase tracking-[0.16em] text-blue-500">{title}</h4>
      <div className="mt-3 overflow-x-auto pb-1">
        <div className="grid min-w-max auto-cols-[10rem] grid-flow-col gap-2">
          {rows.map((row) => (
            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3" key={row.key}>
              <p className="truncate text-xs font-semibold text-slate-600" title={row.label}>
                {row.label}
              </p>
              <p className="mt-1 font-bold text-blue-950">{formatPeso(row.amountCentavos)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BoardTotal({ label, value, note, tone = 'blue', compact = false }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-950',
    amber: 'bg-amber-50 text-amber-950',
    profit: value >= 0 ? 'bg-emerald-50 text-emerald-950' : 'bg-red-50 text-red-900',
  };
  return (
    <div className={`border-r border-blue-100 p-4 last:border-r-0 ${tones[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className={`${compact ? 'text-lg' : 'text-xl'} mt-1 font-black`}>{formatPeso(value)}</p>
      {note && <p className="mt-1 text-xs font-semibold opacity-70">{note}</p>}
    </div>
  );
}

function BreakdownList({ title, rows }) {
  return (
    <div className="border-b border-blue-100 p-5 md:border-b-0 md:border-r xl:border-b xl:border-r-0">
      <h4 className="font-bold text-blue-950">{title}</h4>
      <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">No expenses.</p>
        ) : (
          rows.map((row) => (
            <div className="flex justify-between gap-3 text-sm" key={row.label}>
              <span className="min-w-0 truncate text-slate-600">{row.label}</span>
              <strong>{formatPeso(row.amountCentavos)}</strong>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function SalaryBreakdown({ rows }) {
  return (
    <div className="p-5">
      <h4 className="font-bold text-blue-950">Earned salary</h4>
      <div className="mt-3 max-h-56 overflow-y-auto pr-1">
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">No salary recorded.</p>
        ) : (
          rows.map((row) => (
            <div className="border-b border-slate-100 py-2 last:border-0" key={row.employeeId}>
              <div className="flex justify-between gap-3 text-sm">
                <span className="font-semibold">{row.employeeName}</span>
                <strong>{formatPeso(row.earnedSalaryCentavos)}</strong>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Paid {formatPeso(row.paidSalaryCentavos)} · Unpaid{' '}
                {formatPeso(row.unpaidSalaryCentavos)}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function DailyBreakdownTable({ days }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h3 className="font-bold text-slate-950">Daily combined summary</h3>
      </div>
      <div
        aria-label="Daily combined report"
        className="ui-scroll-list overflow-x-auto"
        role="region"
        tabIndex="0"
      >
        <table className="min-w-full text-left text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 shadow-[0_1px_0_0_#e2e8f0]">
            <tr>
              {[
                'Date',
                'Services',
                'Tires',
                'Canteen',
                'Total sales',
                'Present',
                'Earned salary',
                'Paid salary',
                'Unpaid salary',
                'Meals',
                'Salary status',
                'Expenses',
                'Est. net',
              ].map((heading) => (
                <th className="whitespace-nowrap px-4 py-3 font-semibold" key={heading}>
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {days.map((day) => (
              <tr
                className={day.hasActivity ? 'text-slate-800' : 'bg-slate-50/60 text-slate-400'}
                key={day.businessDate}
              >
                <td className="whitespace-nowrap px-4 py-3 font-semibold">
                  {formatShortDate(day.businessDate)}
                </td>
                <MoneyCell value={day.serviceSalesCentavos} />
                <MoneyCell value={day.tireSalesCentavos} />
                <MoneyCell value={day.canteenSalesCentavos} />
                <MoneyCell bold value={day.totalSalesCentavos} />
                <td className="whitespace-nowrap px-4 py-3">{day.presentEmployeeCount}</td>
                <MoneyCell value={day.earnedSalaryCentavos} />
                <MoneyCell value={day.paidSalaryCentavos} />
                <MoneyCell value={day.unpaidSalaryCentavos} />
                <MoneyCell value={day.mealCentavos} />
                <td className="whitespace-nowrap px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-bold ${day.salaryPaymentStatus === 'OPEN' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}
                  >
                    {day.salaryPaymentStatus}
                  </span>
                </td>
                <MoneyCell value={day.expenseCentavos} />
                <MoneyCell bold value={day.estimatedNetCentavos} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MoneyCell({ value, bold = false }) {
  return (
    <td className={`whitespace-nowrap px-4 py-3 ${bold ? 'font-bold' : ''}`}>
      {formatPeso(value)}
    </td>
  );
}

export function TransactionList({ transactions, source }) {
  const label = { SERVICE: 'service', TIRE: 'tire', CANTEEN: 'canteen' }[source];
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <h3 className="font-bold capitalize text-slate-950">{label} transactions</h3>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
          {transactions.length} recorded
        </span>
      </div>
      {transactions.length === 0 ? (
        <p className="p-10 text-center text-sm text-slate-500">No {label} sales in this period.</p>
      ) : (
        <div
          aria-label={`${label} transactions list`}
          className="ui-scroll-list divide-y divide-slate-100"
          role="region"
          tabIndex="0"
        >
          {transactions.map((transaction) => (
            <article
              className={`p-5 ${transaction.status === 'VOIDED' ? 'bg-slate-50 opacity-65' : ''}`}
              key={`${transaction.source}:${transaction.id}`}
            >
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-800">
                      #{transaction.sequence}
                    </span>
                    <span className="text-sm font-semibold text-slate-600">
                      {formatShortDate(transaction.businessDate)}
                    </span>
                    {transaction.status === 'VOIDED' && (
                      <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
                        Voided
                      </span>
                    )}
                  </div>
                  <p className="mt-2 font-bold text-slate-950">{transaction.description}</p>
                  {transaction.secondaryDescription && (
                    <p className="mt-1 text-sm text-slate-500">
                      {transaction.secondaryDescription}
                    </p>
                  )}
                  <p className="mt-2 text-sm text-slate-500">
                    {transaction.items
                      .map((item) => `${item.name}${item.quantity ? ` × ${item.quantity}` : ''}`)
                      .join(' · ')}
                  </p>
                  {transaction.voidReason && (
                    <p className="mt-2 text-sm text-red-600">Reason: {transaction.voidReason}</p>
                  )}
                </div>
                <p className="text-xl font-bold text-slate-950">
                  {formatPeso(transaction.totalCentavos)}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function PeriodControls({
  periodMode,
  anchorDate,
  customStart,
  customEnd,
  onModeChange,
  onDateChange,
  onCustomStartChange,
  onCustomEndChange,
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div>
        <span className="mb-2 block text-sm font-semibold text-slate-600">View</span>
        <div className="ui-segmented">
          {['DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM'].map((mode) => (
            <button
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${periodMode === mode ? 'bg-teal-700 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              key={mode}
              onClick={() => onModeChange(mode)}
              type="button"
            >
              {titleCase(mode)}
            </button>
          ))}
        </div>
      </div>
      {periodMode === 'CUSTOM' ? (
        <div className="grid grid-cols-2 gap-2">
          <DateControl label="Start" onChange={onCustomStartChange} value={customStart} />
          <DateControl
            label="End"
            min={customStart}
            onChange={onCustomEndChange}
            value={customEnd}
          />
        </div>
      ) : (
        <DateControl label="Reference date" onChange={onDateChange} value={anchorDate} />
      )}
    </div>
  );
}

function DateControl({ label, onChange, ...props }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-semibold text-slate-600">{label}</span>
      <input
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 font-semibold outline-none focus:border-blue-600"
        onChange={(event) => event.target.value && onChange(event.target.value)}
        required
        type="date"
        {...props}
      />
    </label>
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

function transactionsFor(transactions, source) {
  return {
    SERVICE: transactions.serviceSales,
    TIRE: transactions.tireSales,
    CANTEEN: transactions.canteenSales,
  }[source];
}

export function periodRange(mode, anchor) {
  if (mode === 'DAILY') return { start: anchor, end: anchor };
  const date = new Date(`${anchor}T00:00:00`);
  if (mode === 'WEEKLY') {
    const day = date.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const start = new Date(date);
    start.setDate(date.getDate() + mondayOffset);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start: localDate(start), end: localDate(end) };
  }
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start: localDate(start), end: localDate(end) };
}

export function last30DaysRange(anchor) {
  const end = new Date(`${anchor}T00:00:00`);
  const start = new Date(end);
  start.setDate(end.getDate() - 29);
  return { start: localDate(start), end: localDate(end) };
}

function localDate(date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.valueOf() - offset).toISOString().slice(0, 10);
}

function todayLocal() {
  return localDate(new Date());
}

function formatPeriod(start, end) {
  return start === end
    ? formatShortDate(start)
    : `${formatShortDate(start)} – ${formatShortDate(end)}`;
}

function formatShortDate(value) {
  return new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeZone: 'UTC' }).format(
    new Date(`${value}T00:00:00.000Z`),
  );
}

function titleCase(value) {
  return value[0] + value.slice(1).toLowerCase();
}

function formatPercent(basisPoints) {
  return `${(basisPoints / 100).toFixed(basisPoints % 100 === 0 ? 0 : 1)}%`;
}

function DownloadIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 3v12m0 0 4-4m-4 4-4-4M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
