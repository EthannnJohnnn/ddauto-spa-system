import { useCallback, useEffect, useState } from 'react';
import { getCatalogs } from '../catalogs/catalogs-api.js';
import { formatPeso } from '../catalogs/catalog-formatters.js';
import { ReasonDialog } from '../catalogs/ReasonDialog.jsx';
import { AttendancePayrollPanel } from './AttendancePayrollPanel.jsx';
import { DailyTransactions } from './DailyTransactions.jsx';
import { ServiceTicketForm } from './ServiceTicketForm.jsx';
import {
  createServiceTicket,
  getDailyServiceSales,
  saveAttendance,
  setServiceTicketActive,
  updateServiceTicket,
} from './service-sales-api.js';

export function ServiceSalesPage({ csrfToken }) {
  const [businessDate, setBusinessDate] = useState(todayLocal());
  const [catalogs, setCatalogs] = useState(null);
  const [daily, setDaily] = useState(null);
  const [editingTicket, setEditingTicket] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [catalogData, dailyData] = await Promise.all([
        getCatalogs(),
        getDailyServiceSales(businessDate),
      ]);
      setCatalogs(catalogData);
      setDaily(dailyData);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [businessDate]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveTicket(values) {
    if (editingTicket) {
      await updateServiceTicket(editingTicket.id, values, csrfToken);
    } else {
      await createServiceTicket(values, csrfToken);
    }
    setEditingTicket(null);
    await load();
  }

  async function updateAttendance(values) {
    const nextDaily = await saveAttendance(values, csrfToken);
    setDaily(nextDaily);
  }

  function requestStatus(ticket) {
    setStatusTarget({
      ticket,
      isActive: ticket.status === 'VOIDED',
      label: `transaction #${ticket.customerSequence}`,
    });
  }

  async function confirmStatus(reason) {
    await setServiceTicketActive(statusTarget.ticket.id, statusTarget.isActive, reason, csrfToken);
    setStatusTarget(null);
    await load();
  }

  if (loading && !daily) {
    return <PageMessage title="Loading service sales…" />;
  }

  if (!daily || !catalogs) {
    return <PageMessage title="Service sales could not load" detail={error} onRetry={load} />;
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-semibold text-teal-700">Daily operations</p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Service sales</h2>
          <p className="mt-2 max-w-2xl leading-7 text-slate-600">
            Record each vehicle, its services, and the employees who performed the work.
          </p>
        </div>
        <label className="w-full sm:w-auto">
          <span className="mb-2 block text-sm font-semibold text-slate-600">Business date</span>
          <input
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold outline-none focus:border-teal-600 sm:w-48"
            onChange={(event) => {
              setEditingTicket(null);
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

      <SummaryCards summary={daily.summary} />

      {!catalogs.setupProgress.isComplete && (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
          <p className="font-bold">Complete Business setup first</p>
          <p className="mt-1 text-sm">
            Add an employee, vehicle class, and service price under Settings before recording a
            sale.
          </p>
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(22rem,0.75fr)]">
        <ServiceTicketForm
          businessDate={businessDate}
          catalogs={catalogs}
          editingTicket={editingTicket}
          onCancel={() => setEditingTicket(null)}
          onSave={saveTicket}
        />
        <AttendancePayrollPanel
          attendance={daily.attendance}
          businessDate={businessDate}
          onSave={updateAttendance}
          payroll={daily.payroll}
        />
      </div>

      <DailyTransactions
        className="mt-6"
        onEdit={setEditingTicket}
        onStatus={requestStatus}
        tickets={daily.tickets}
      />

      <ReasonDialog
        onCancel={() => setStatusTarget(null)}
        onConfirm={confirmStatus}
        target={statusTarget}
      />
    </div>
  );
}

function SummaryCards({ summary }) {
  const cards = [
    { label: 'Service sales', value: formatPeso(summary.totalSalesCentavos) },
    { label: 'Active transactions', value: String(summary.activeTicketCount) },
    { label: 'Employee payroll', value: formatPeso(summary.totalPayrollCentavos) },
    {
      label: 'After labor & meals',
      value: formatPeso(summary.remainingAfterRecordedLaborAndMealsCentavos),
    },
  ];
  return (
    <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <article
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          key={card.label}
        >
          <p className="text-sm font-medium text-slate-500">{card.label}</p>
          <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">{card.value}</p>
        </article>
      ))}
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
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.valueOf() - offset).toISOString().slice(0, 10);
}
