import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatPeso } from '../catalogs/catalog-formatters.js';
import { getReportsOverview } from './reports-api.js';

const tabs = [
  ['OVERVIEW', 'Daily summary'],
  ['SERVICE', 'Services'],
  ['TIRE', 'Tires'],
  ['CANTEEN', 'Canteen'],
];

export function ReportsPage() {
  const [periodMode, setPeriodMode] = useState('MONTHLY');
  const [anchorDate, setAnchorDate] = useState(todayLocal());
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const period = useMemo(() => periodRange(periodMode, anchorDate), [periodMode, anchorDate]);

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
  }, [period.end, period.start]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !report) return <PageMessage title="Loading reports…" />;
  if (!report) return <PageMessage detail={error} onRetry={load} title="Reports could not load" />;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <p className="text-sm font-semibold text-teal-700">Owner reporting</p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
            Combined business reports
          </h2>
          <p className="mt-2 max-w-3xl leading-7 text-slate-600">
            Compare services, tire sales, and canteen sales separately, then review the combined
            totals without duplicating purchases or payroll expenses.
          </p>
        </div>
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
          periodMode={periodMode}
        />
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

      <PrimarySummary summary={report.summary} />
      <SourceSummary summary={report.summary} />
      <CashSummary summary={report.summary} />

      <section className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm leading-6 text-blue-950">
        <p className="font-bold">How the totals are calculated</p>
        <p className="mt-1">
          Estimated net subtracts product costs, outside-contractor labor, and operating expenses
          from sales. Cash movement uses stock purchases instead of product costs. Purchases are not
          subtracted from estimated net because sold-item costs are already included there.
        </p>
      </section>

      <div className="mt-6 overflow-x-auto border-b border-slate-200">
        <div className="flex min-w-max gap-2">
          {tabs.map(([value, label]) => (
            <button
              className={`border-b-2 px-4 py-3 text-sm font-semibold ${activeTab === value ? 'border-teal-700 text-teal-800' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
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

function PrimarySummary({ summary }) {
  const cards = [
    ['Combined sales', formatPeso(summary.totalSalesCentavos), 'All three sales sources'],
    [
      'Estimated gross profit',
      formatPeso(summary.estimatedGrossProfitCentavos),
      'After product and contractor costs',
    ],
    ['Operating expenses', formatPeso(summary.expenseCentavos), 'Includes finalized payroll'],
    ['Estimated net', formatPeso(summary.estimatedNetCentavos), 'Gross profit less expenses'],
  ];
  return <CardGrid cards={cards} className="mt-7" />;
}

function SourceSummary({ summary }) {
  const cards = [
    [
      'Service sales',
      formatPeso(summary.serviceSalesCentavos),
      `${summary.serviceTransactionCount} transaction(s)`,
    ],
    [
      'Tire sales',
      formatPeso(summary.tireSalesCentavos),
      `${summary.tireTransactionCount} transaction(s)`,
    ],
    [
      'Canteen sales',
      formatPeso(summary.canteenSalesCentavos),
      `${summary.canteenTransactionCount} transaction(s)`,
    ],
    [
      'Direct sale costs',
      formatPeso(summary.productCostCentavos + summary.externalLaborCentavos),
      `${formatPeso(summary.productCostCentavos)} products · ${formatPeso(summary.externalLaborCentavos)} outside labor`,
    ],
  ];
  return <CardGrid cards={cards} className="mt-4" muted />;
}

function CashSummary({ summary }) {
  return (
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-medium text-slate-500">Stock purchases paid</p>
        <p className="mt-2 text-xl font-bold text-slate-950">
          {formatPeso(summary.purchaseCentavos)}
        </p>
        <p className="mt-1 text-xs text-slate-500">Tire and canteen purchases from their ledgers</p>
      </article>
      <article className="rounded-2xl border border-teal-200 bg-teal-50 p-5 shadow-sm">
        <p className="text-sm font-medium text-teal-800">Cash movement</p>
        <p className="mt-2 text-xl font-bold text-teal-950">
          {formatPeso(summary.cashMovementCentavos)}
        </p>
        <p className="mt-1 text-xs text-teal-800">
          Sales less purchases, expenses, and outside labor
        </p>
      </article>
    </div>
  );
}

function CardGrid({ cards, className, muted = false }) {
  return (
    <div className={`${className} grid gap-4 sm:grid-cols-2 xl:grid-cols-4`}>
      {cards.map(([label, value, note]) => (
        <article
          className={`rounded-2xl border p-5 shadow-sm ${muted ? 'border-slate-200 bg-slate-50' : 'border-slate-200 bg-white'}`}
          key={label}
        >
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">{value}</p>
          <p className="mt-2 text-xs text-slate-500">{note}</p>
        </article>
      ))}
    </div>
  );
}

export function DailyBreakdownTable({ days }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h3 className="font-bold text-slate-950">Daily combined summary</h3>
        <p className="mt-1 text-sm text-slate-500">
          Every day in the selected period remains visible, including days with no activity.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {['Date', 'Services', 'Tires', 'Canteen', 'Total sales', 'Expenses', 'Est. net'].map(
                (heading) => (
                  <th className="whitespace-nowrap px-4 py-3 font-semibold" key={heading}>
                    {heading}
                  </th>
                ),
              )}
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
        <div>
          <h3 className="font-bold capitalize text-slate-950">{label} transactions</h3>
          <p className="mt-1 text-sm text-slate-500">Individual records for the selected period.</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
          {transactions.length} recorded
        </span>
      </div>
      {transactions.length === 0 ? (
        <p className="p-10 text-center text-sm text-slate-500">No {label} sales in this period.</p>
      ) : (
        <div className="divide-y divide-slate-100">
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

function PeriodControls({ periodMode, anchorDate, onModeChange, onDateChange }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div>
        <span className="mb-2 block text-sm font-semibold text-slate-600">View</span>
        <div className="flex rounded-xl border border-slate-300 bg-white p-1">
          {['DAILY', 'WEEKLY', 'MONTHLY'].map((mode) => (
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
      <label>
        <span className="mb-2 block text-sm font-semibold text-slate-600">Reference date</span>
        <input
          className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold outline-none focus:border-teal-600"
          onChange={(event) => event.target.value && onDateChange(event.target.value)}
          required
          type="date"
          value={anchorDate}
        />
      </label>
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
