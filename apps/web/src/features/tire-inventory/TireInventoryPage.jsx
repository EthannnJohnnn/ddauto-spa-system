import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatPeso } from '../catalogs/catalog-formatters.js';
import { ReasonDialog } from '../catalogs/ReasonDialog.jsx';
import { TireDocumentForm } from './TireDocumentForm.jsx';
import { TireDocumentHistory } from './TireDocumentHistory.jsx';
import { TireProductsPanel } from './TireProductsPanel.jsx';
import {
  createTireDocument,
  createTireProduct,
  getTireInventoryOverview,
  setTireDocumentActive,
  setTireProductActive,
  updateTireDocument,
  updateTireProduct,
} from './tire-inventory-api.js';

const tabs = [
  ['inventory', 'Inventory'],
  ['sale', 'Record sale'],
  ['stock', 'Stock in & adjust'],
  ['history', 'History'],
];

const stockTypes = [
  ['PURCHASE', 'Purchase'],
  ['BEGINNING', 'Beginning inventory'],
  ['ADJUSTMENT', 'Stock adjustment'],
];

export function TireInventoryPage({ csrfToken }) {
  const [anchorDate, setAnchorDate] = useState(todayLocal());
  const [periodMode, setPeriodMode] = useState('MONTHLY');
  const [activeTab, setActiveTab] = useState('inventory');
  const [stockType, setStockType] = useState('PURCHASE');
  const [editingDocument, setEditingDocument] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const period = useMemo(() => periodRange(periodMode, anchorDate), [periodMode, anchorDate]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setOverview(await getTireInventoryOverview(period.start, period.end));
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [period.end, period.start]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveProduct(productId, values) {
    if (productId) await updateTireProduct(productId, values, csrfToken);
    else await createTireProduct(values, csrfToken);
    await load();
  }

  async function saveDocument(documentId, values) {
    if (documentId) await updateTireDocument(documentId, values, csrfToken);
    else await createTireDocument(values, csrfToken);
    setEditingDocument(null);
    await load();
  }

  function editDocument(document) {
    setEditingDocument(document);
    if (document.documentType === 'SALE') setActiveTab('sale');
    else {
      setStockType(document.documentType);
      setActiveTab('stock');
    }
  }

  function requestProductStatus(product) {
    setStatusTarget({
      kind: 'product',
      item: product,
      isActive: !product.isActive,
      label: product.name,
      inactiveVerb: 'Archive',
    });
  }

  function requestDocumentStatus(document) {
    setStatusTarget({
      kind: 'document',
      item: document,
      isActive: document.status === 'VOIDED',
      label: `${documentTypeLabel(document.documentType).toLowerCase()} #${document.documentSequence}`,
      inactiveVerb: 'Void',
    });
  }

  async function confirmStatus(reason) {
    if (statusTarget.kind === 'product') {
      await setTireProductActive(statusTarget.item.id, statusTarget.isActive, reason, csrfToken);
    } else {
      await setTireDocumentActive(statusTarget.item.id, statusTarget.isActive, reason, csrfToken);
    }
    setStatusTarget(null);
    await load();
  }

  if (loading && !overview) return <PageMessage title="Loading tire inventory…" />;
  if (!overview) {
    return <PageMessage detail={error} onRetry={load} title="Tire inventory could not load" />;
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <p className="text-sm font-semibold text-teal-700">Shop operations</p>
          <h2 className="ui-page-heading mt-1">Tires & inventory</h2>
          <p className="mt-2 max-w-2xl leading-7 text-slate-600">
            Track beginning stock, purchases, tire sales, physical adjustments, and current
            balances.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div>
            <span className="mb-2 block text-sm font-semibold text-slate-600">View</span>
            <div className="ui-segmented">
              {['DAILY', 'WEEKLY', 'MONTHLY'].map((mode) => (
                <button
                  className={`rounded-lg px-3 py-2 text-sm font-semibold ${periodMode === mode ? 'bg-teal-700 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                  key={mode}
                  onClick={() => {
                    setPeriodMode(mode);
                    setEditingDocument(null);
                  }}
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
              onChange={(event) => {
                if (event.target.value) {
                  setAnchorDate(event.target.value);
                  setEditingDocument(null);
                }
              }}
              required
              type="date"
              value={anchorDate}
            />
          </label>
        </div>
      </div>

      <p className="mt-3 text-sm font-medium text-slate-500">
        Showing {formatPeriod(period.start, period.end)} · stock as of {formatShortDate(period.end)}
      </p>
      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <SummaryCards summary={overview.summary} />

      <div className="ui-tabs-shell">
        <div className="ui-tabs-row">
          {tabs.map(([value, label]) => (
            <button
              className={`ui-tab ${activeTab === value ? 'ui-tab-active' : 'ui-tab-idle'}`}
              key={value}
              onClick={() => {
                setActiveTab(value);
                setEditingDocument(null);
              }}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        {activeTab === 'inventory' && (
          <TireProductsPanel
            businessDate={anchorDate}
            onSave={saveProduct}
            onStatus={requestProductStatus}
            products={overview.products}
          />
        )}
        {activeTab === 'sale' && (
          <TireDocumentForm
            businessDate={anchorDate}
            documentType="SALE"
            editingDocument={editingDocument}
            onCancel={() => setEditingDocument(null)}
            onSave={saveDocument}
            products={overview.products}
          />
        )}
        {activeTab === 'stock' && (
          <div>
            <div className="mb-4 flex flex-wrap gap-2">
              {stockTypes.map(([value, label]) => (
                <button
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${stockType === value ? 'bg-blue-700 text-white shadow-sm' : 'border border-blue-200 bg-white text-slate-600 hover:bg-blue-50'}`}
                  disabled={Boolean(editingDocument)}
                  key={value}
                  onClick={() => setStockType(value)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
            <TireDocumentForm
              businessDate={anchorDate}
              documentType={stockType}
              editingDocument={editingDocument}
              onCancel={() => setEditingDocument(null)}
              onSave={saveDocument}
              products={overview.products}
            />
          </div>
        )}
        {activeTab === 'history' && (
          <TireDocumentHistory
            documents={overview.documents}
            onEdit={editDocument}
            onStatus={requestDocumentStatus}
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

function SummaryCards({ summary }) {
  const cards = [
    {
      label: 'Tire sales',
      value: formatPeso(summary.tireSalesCentavos),
      note: `${summary.tireUnitsSold} units sold`,
    },
    {
      label: 'Estimated gross profit',
      value: formatPeso(summary.estimatedGrossProfitCentavos),
      note: 'Sales less recorded unit cost',
    },
    {
      label: 'Purchases',
      value: formatPeso(summary.purchaseCostCentavos),
      note: `${summary.purchasedUnits} units added`,
    },
    {
      label: 'Inventory value',
      value: formatPeso(summary.inventoryCostValueCentavos),
      note: `${summary.inventoryUnits} units on hand`,
    },
    {
      label: 'Stock alerts',
      value: String(summary.lowStockProductCount + summary.outOfStockProductCount),
      note: `${summary.outOfStockProductCount} out · ${summary.lowStockProductCount} low`,
    },
  ];
  return (
    <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => (
        <article
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          key={card.label}
        >
          <p className="text-sm font-medium text-slate-500">{card.label}</p>
          <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">{card.value}</p>
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

function documentTypeLabel(type) {
  return {
    SALE: 'Sale',
    PURCHASE: 'Purchase',
    BEGINNING: 'Beginning inventory',
    ADJUSTMENT: 'Adjustment',
  }[type];
}
