import { useEffect, useMemo, useState } from 'react';
import { centavosToInput, formatPeso, inputToCentavos } from '../catalogs/catalog-formatters.js';
import { useEditNavigation } from '../../hooks/useEditNavigation.js';

export function TireProductsPanel({ products, businessDate, onSave, onStatus }) {
  const [editing, setEditing] = useState(null);
  const [values, setValues] = useState(emptyValues(businessDate));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const editRegionRef = useEditNavigation(editing);
  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return products;
    return products.filter((product) =>
      [product.name, product.tireType, product.size, categoryLabel(product.category)]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query)),
    );
  }, [products, search]);

  useEffect(() => {
    setValues(editing ? valuesFromProduct(editing, businessDate) : emptyValues(businessDate));
    setError('');
  }, [editing, businessDate]);

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const payload = {
        name: values.name,
        category: values.category,
        tireType: values.tireType,
        size: values.size,
        currentCostCentavos: inputToCentavos(values.currentCostPesos),
        sellingPriceCentavos: inputToCentavos(values.sellingPricePesos),
        lowStockThreshold: Number(values.lowStockThreshold),
      };
      if (!editing && values.includeBeginning) {
        payload.beginningInventory = {
          businessDate: values.beginningDate,
          quantity: Number(values.beginningQuantity),
          unitCostCentavos: inputToCentavos(values.beginningCostPesos),
        };
      }
      await onSave(editing?.id, payload);
      setEditing(null);
      setValues(emptyValues(businessDate));
    } catch (submissionError) {
      setError(submissionError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[23rem_minmax(0,1fr)]">
      <form
        className="h-fit scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        onSubmit={handleSubmit}
        ref={editRegionRef}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-teal-700">
              {editing ? 'Edit tire product' : 'New tire product'}
            </p>
            <h3 className="mt-1 text-xl font-bold text-slate-950">Product details</h3>
          </div>
          {editing && (
            <button
              className="text-sm font-semibold text-slate-500"
              onClick={() => setEditing(null)}
              type="button"
            >
              Cancel
            </button>
          )}
        </div>

        <div className="mt-5 space-y-4">
          <TextField
            label="Tire name"
            onChange={(value) => update('name', value)}
            placeholder="Example: RoadSafe Touring"
            required
            value={values.name}
          />
          <label className="block">
            <FieldLabel>Category</FieldLabel>
            <select
              className={inputClass}
              onChange={(event) => update('category', event.target.value)}
              value={values.category}
            >
              <option value="FOUR_WHEEL">Four-wheel tire</option>
              <option value="MOTORCYCLE">Motorcycle tire</option>
              <option value="OTHER">Other tire product</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Type"
              onChange={(value) => update('tireType', value)}
              placeholder="Tubeless"
              value={values.tireType}
            />
            <TextField
              label="Size"
              onChange={(value) => update('size', value)}
              placeholder="155/70R13"
              value={values.size}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <MoneyField
              label="Current unit cost"
              onChange={(value) => update('currentCostPesos', value)}
              value={values.currentCostPesos}
            />
            <MoneyField
              label="Selling price"
              onChange={(value) => update('sellingPricePesos', value)}
              value={values.sellingPricePesos}
            />
          </div>
          <label className="block">
            <FieldLabel>Low-stock alert at</FieldLabel>
            <input
              className={inputClass}
              min="0"
              onChange={(event) => update('lowStockThreshold', event.target.value)}
              required
              step="1"
              type="number"
              value={values.lowStockThreshold}
            />
          </label>

          {!editing && (
            <div className="rounded-xl border border-teal-200 bg-teal-50 p-4">
              <label className="flex items-center gap-3 font-semibold text-teal-900">
                <input
                  checked={values.includeBeginning}
                  className="h-4 w-4 accent-teal-700"
                  onChange={(event) => update('includeBeginning', event.target.checked)}
                  type="checkbox"
                />
                Add beginning inventory
              </label>
              {values.includeBeginning && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <label>
                    <FieldLabel>Date</FieldLabel>
                    <input
                      className={inputClass}
                      onChange={(event) => update('beginningDate', event.target.value)}
                      required
                      type="date"
                      value={values.beginningDate}
                    />
                  </label>
                  <label>
                    <FieldLabel>Beginning quantity</FieldLabel>
                    <input
                      className={inputClass}
                      min="1"
                      onChange={(event) => update('beginningQuantity', event.target.value)}
                      required
                      step="1"
                      type="number"
                      value={values.beginningQuantity}
                    />
                  </label>
                  <MoneyField
                    label="Beginning unit cost"
                    onChange={(value) => update('beginningCostPesos', value)}
                    value={values.beginningCostPesos}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {error && <p className="mt-4 text-sm font-medium text-red-600">{error}</p>}
        <button
          className="mt-5 w-full rounded-xl bg-teal-700 px-4 py-3 font-bold text-white hover:bg-teal-800 disabled:opacity-60"
          disabled={busy}
          type="submit"
        >
          {busy ? 'Saving…' : editing ? 'Save product changes' : 'Add tire product'}
        </button>
      </form>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h3 className="font-bold text-slate-950">Tire inventory</h3>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
            {visibleProducts.length === products.length
              ? `${products.length} products`
              : `${visibleProducts.length} of ${products.length} products`}
          </span>
        </div>
        {products.length > 0 && (
          <div className="border-b border-slate-100 bg-slate-50/60 p-3">
            <label>
              <span className="sr-only">Search tire inventory</span>
              <input
                className="ui-list-search"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search tires"
                type="search"
                value={search}
              />
            </label>
          </div>
        )}
        {products.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-semibold text-slate-700">No tire products yet</p>
            <p className="mt-1 text-sm text-slate-500">Add your first product.</p>
          </div>
        ) : visibleProducts.length === 0 ? (
          <p className="p-8 text-center text-slate-500">No tires match your search.</p>
        ) : (
          <div
            aria-label="Tire inventory list"
            className="ui-scroll-list divide-y divide-slate-100"
            role="region"
            tabIndex="0"
          >
            {visibleProducts.map((product) => (
              <article
                className={`p-5 ${product.isActive ? '' : 'bg-slate-50 opacity-65'}`}
                key={product.id}
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold text-slate-950">{product.name}</h4>
                      <StockBadge product={product} />
                      {!product.isActive && <Badge label="Archived" tone="slate" />}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {[categoryLabel(product.category), product.tireType, product.size]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600">
                      <span>Cost {formatPeso(product.currentCostCentavos)}</span>
                      <span>Sell {formatPeso(product.sellingPriceCentavos)}</span>
                      <span>
                        Stock value{' '}
                        {formatPeso(product.stockQuantity * product.currentCostCentavos)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
                      onClick={() => setEditing(product)}
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
                      onClick={() => onStatus(product)}
                      type="button"
                    >
                      {product.isActive ? 'Archive' : 'Restore'}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StockBadge({ product }) {
  if (product.stockQuantity === 0) return <Badge label="Out of stock" tone="red" />;
  if (product.stockQuantity <= product.lowStockThreshold) {
    return <Badge label={`${product.stockQuantity} left · Low`} tone="amber" />;
  }
  return <Badge label={`${product.stockQuantity} in stock`} tone="green" />;
}

function Badge({ label, tone }) {
  const tones = {
    red: 'bg-red-100 text-red-700',
    amber: 'bg-amber-100 text-amber-800',
    green: 'bg-emerald-100 text-emerald-800',
    slate: 'bg-slate-200 text-slate-700',
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>{label}</span>
  );
}

function TextField({ label, value, onChange, placeholder, required = false }) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      <input
        className={inputClass}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        value={value}
      />
    </label>
  );
}

function MoneyField({ label, value, onChange }) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      <div className="flex rounded-xl border border-slate-300 bg-white focus-within:border-teal-600">
        <span className="grid place-items-center border-r border-slate-300 px-3 text-slate-500">
          ₱
        </span>
        <input
          aria-label={label}
          className="min-w-0 flex-1 rounded-r-xl px-3 py-2.5 outline-none"
          min="0"
          onChange={(event) => onChange(event.target.value)}
          required
          step="0.01"
          type="number"
          value={value}
        />
      </div>
    </label>
  );
}

function FieldLabel({ children }) {
  return <span className="mb-1.5 block text-sm font-semibold text-slate-700">{children}</span>;
}

function emptyValues(businessDate) {
  return {
    name: '',
    category: 'FOUR_WHEEL',
    tireType: '',
    size: '',
    currentCostPesos: '0.00',
    sellingPricePesos: '0.00',
    lowStockThreshold: '1',
    includeBeginning: false,
    beginningDate: businessDate,
    beginningQuantity: '1',
    beginningCostPesos: '0.00',
  };
}

function valuesFromProduct(product, businessDate) {
  return {
    ...emptyValues(businessDate),
    name: product.name,
    category: product.category,
    tireType: product.tireType,
    size: product.size,
    currentCostPesos: centavosToInput(product.currentCostCentavos),
    sellingPricePesos: centavosToInput(product.sellingPriceCentavos),
    lowStockThreshold: String(product.lowStockThreshold),
  };
}

function categoryLabel(category) {
  return { FOUR_WHEEL: 'Four-wheel', MOTORCYCLE: 'Motorcycle', OTHER: 'Other' }[category];
}

const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10';
