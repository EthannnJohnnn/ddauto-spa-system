import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatPeso } from '../catalogs/catalog-formatters.js';
import { ReasonDialog } from '../catalogs/ReasonDialog.jsx';
import { setCanteenDocumentActive } from '../canteen-inventory/canteen-inventory-api.js';
import { setTireDocumentActive } from '../tire-inventory/tire-inventory-api.js';
import { ExpenseCategoriesPanel } from './ExpenseCategoriesPanel.jsx';
import { ExpenseForm } from './ExpenseForm.jsx';
import { ExpenseHistory } from './ExpenseHistory.jsx';
import { PurchaseHistory } from './PurchaseHistory.jsx';
import {
  createExpense,
  createExpenseCategory,
  getPurchasesExpensesOverview,
  setExpenseActive,
  setExpenseCategoryActive,
  updateExpense,
  updateExpenseCategory,
} from './purchases-expenses-api.js';

const tabs = [
  ['purchases', 'Purchases'],
  ['expenses', 'Expenses'],
  ['categories', 'Categories'],
];

export function PurchasesExpensesPage({ csrfToken, onNavigate }) {
  const [anchorDate, setAnchorDate] = useState(todayLocal());
  const [periodMode, setPeriodMode] = useState('MONTHLY');
  const [purchaseSource, setPurchaseSource] = useState('ALL');
  const [activeTab, setActiveTab] = useState('purchases');
  const [editingExpense, setEditingExpense] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const period = useMemo(() => periodRange(periodMode, anchorDate), [periodMode, anchorDate]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setOverview(await getPurchasesExpensesOverview(period.start, period.end, purchaseSource));
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [period.end, period.start, purchaseSource]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveExpense(expenseId, values) {
    if (expenseId) await updateExpense(expenseId, values, csrfToken);
    else await createExpense(values, csrfToken);
    setEditingExpense(null);
    await load();
  }

  async function saveCategory(categoryId, values) {
    if (categoryId) await updateExpenseCategory(categoryId, values, csrfToken);
    else await createExpenseCategory(values, csrfToken);
    await load();
  }

  function requestExpenseStatus(expense) {
    setStatusTarget({
      kind: 'expense',
      item: expense,
      isActive: expense.status === 'VOIDED',
      label: `expense “${expense.description || expense.categoryName}”`,
      inactiveVerb: 'Delete',
    });
  }

  function requestCategoryStatus(category) {
    setStatusTarget({
      kind: 'category',
      item: category,
      isActive: !category.isActive,
      label: `category “${category.name}”`,
      inactiveVerb: 'Delete',
    });
  }

  function requestPurchaseStatus(purchase) {
    setStatusTarget({
      kind: 'purchase',
      item: purchase,
      isActive: purchase.status === 'VOIDED',
      label: `${purchase.source === 'TIRE' ? 'tire' : 'canteen'} purchase #${purchase.documentSequence}`,
      inactiveVerb: 'Delete',
    });
  }

  async function confirmStatus(reason) {
    if (statusTarget.kind === 'expense') {
      await setExpenseActive(statusTarget.item.id, statusTarget.isActive, reason, csrfToken);
    } else if (statusTarget.kind === 'category') {
      await setExpenseCategoryActive(
        statusTarget.item.id,
        statusTarget.isActive,
        reason,
        csrfToken,
      );
    } else if (statusTarget.item.source === 'TIRE') {
      await setTireDocumentActive(
        statusTarget.item.documentId,
        statusTarget.isActive,
        reason,
        csrfToken,
      );
    } else {
      await setCanteenDocumentActive(
        statusTarget.item.documentId,
        statusTarget.isActive,
        reason,
        csrfToken,
      );
    }
    setStatusTarget(null);
    await load();
  }

  if (loading && !overview) return <PageMessage title="Loading purchases and expenses…" />;
  if (!overview) {
    return (
      <PageMessage detail={error} onRetry={load} title="Purchases and expenses could not load" />
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <p className="text-sm font-semibold text-teal-700">Business outflows</p>
          <h2 className="ui-page-heading mt-1">Purchases & expenses</h2>
          <p className="mt-2 max-w-2xl leading-7 text-slate-600">
            Review tire and canteen stock purchases separately or together, then manage operating
            expenses without losing deleted history.
          </p>
        </div>
        <PeriodControls
          anchorDate={anchorDate}
          onDateChange={(value) => {
            setAnchorDate(value);
            setEditingExpense(null);
          }}
          onModeChange={(mode) => {
            setPeriodMode(mode);
            setEditingExpense(null);
          }}
          periodMode={periodMode}
        />
      </div>

      <p className="mt-3 text-sm font-medium text-slate-500">
        Showing {formatPeriod(period.start, period.end)}
      </p>
      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <SummaryCards purchaseSource={purchaseSource} summary={overview.summary} />

      <div className="ui-tabs-shell">
        <div className="ui-tabs-row">
          {tabs.map(([value, label]) => (
            <button
              className={`ui-tab ${activeTab === value ? 'ui-tab-active' : 'ui-tab-idle'}`}
              key={value}
              onClick={() => {
                setActiveTab(value);
                setEditingExpense(null);
              }}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        {activeTab === 'purchases' && (
          <PurchaseHistory
            onManage={(purchase) =>
              onNavigate(purchase.source === 'TIRE' ? 'Tires & inventory' : 'Canteen')
            }
            onSourceChange={setPurchaseSource}
            onStatus={requestPurchaseStatus}
            purchaseSource={purchaseSource}
            purchases={overview.purchases}
          />
        )}
        {activeTab === 'expenses' && (
          <div>
            <div className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm leading-6 text-blue-900">
              Expenses recorded with this form are manual. Finalized Salary and Staff Meal entries
              are generated and protected by the payroll workflow so amounts are never counted
              twice.
            </div>
            <div className="grid gap-6 xl:grid-cols-[24rem_minmax(0,1fr)]">
              <ExpenseForm
                businessDate={anchorDate}
                categories={overview.categories}
                editingExpense={editingExpense}
                onCancel={() => setEditingExpense(null)}
                onSave={saveExpense}
              />
              <ExpenseHistory
                expenses={overview.expenses}
                onEdit={setEditingExpense}
                onStatus={requestExpenseStatus}
              />
            </div>
          </div>
        )}
        {activeTab === 'categories' && (
          <ExpenseCategoriesPanel
            categories={overview.categories}
            onSave={saveCategory}
            onStatus={requestCategoryStatus}
          />
        )}
      </div>

      <ReasonDialog
        onCancel={() => setStatusTarget(null)}
        onConfirm={confirmStatus}
        target={statusTarget}
      />
    </div>
  );
}

function PeriodControls({ periodMode, anchorDate, onModeChange, onDateChange }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div>
        <span className="mb-2 block text-sm font-semibold text-slate-600">View</span>
        <div className="ui-segmented">
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

function SummaryCards({ summary, purchaseSource }) {
  const sourceLabel = {
    ALL: 'All purchases',
    TIRE: 'Tire purchases',
    CANTEEN: 'Canteen purchases',
  }[purchaseSource];
  const cards = [
    {
      label: sourceLabel,
      value: formatPeso(summary.purchaseTotalCentavos),
      note: `${summary.activePurchaseCount} active records`,
    },
    {
      label: 'Operating expenses',
      value: formatPeso(summary.expenseTotalCentavos),
      note: `${summary.activeExpenseCount} active entries`,
    },
    {
      label: 'Combined outflow',
      value: formatPeso(summary.combinedOutflowCentavos),
      note: 'Purchases plus expenses',
    },
    {
      label: 'Tires / Canteen',
      value: `${formatPeso(summary.tirePurchaseTotalCentavos)} / ${formatPeso(summary.canteenPurchaseTotalCentavos)}`,
      note: 'Filtered purchase split',
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
          <p className="mt-3 text-xl font-bold tracking-tight text-slate-950">{card.value}</p>
          <p className="mt-2 text-xs text-slate-400">{card.note}</p>
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

function periodRange(mode, anchor) {
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
