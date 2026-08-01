import { useEffect, useState } from 'react';
import { centavosToInput, formatPeso, inputToCentavos } from '../catalogs/catalog-formatters.js';

let nextLineKey = 1;

export function CanteenDocumentForm({
  documentType,
  products,
  businessDate,
  editingDocument,
  onSave,
  onCancel,
}) {
  const [date, setDate] = useState(businessDate);
  const [counterpartyName, setCounterpartyName] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([emptyLine()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingDocument) {
      setDate(editingDocument.businessDate);
      setCounterpartyName(editingDocument.counterpartyName);
      setReferenceNumber(editingDocument.referenceNumber);
      setNotes(editingDocument.notes);
      setItems(
        editingDocument.items.map((item) => ({
          key: nextLineKey++,
          productId: String(item.productId),
          quantity: String(
            editingDocument.documentType === 'ADJUSTMENT' ? item.stockDelta : item.quantity,
          ),
          unitCostPesos: centavosToInput(item.unitCostCentavos),
          unitPricePesos: centavosToInput(item.unitPriceCentavos),
        })),
      );
    } else {
      resetForm();
    }
    setError('');
  }, [editingDocument, documentType, businessDate]);

  function resetForm() {
    setDate(businessDate);
    setCounterpartyName('');
    setReferenceNumber('');
    setNotes('');
    setItems([emptyLine()]);
  }

  function updateItem(key, patch) {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  function selectProduct(item, productId) {
    const product = products.find((candidate) => candidate.id === Number(productId));
    updateItem(item.key, {
      productId,
      unitCostPesos: product ? centavosToInput(product.currentCostCentavos) : '0.00',
      unitPricePesos: product ? centavosToInput(product.sellingPriceCentavos) : '0.00',
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onSave(editingDocument?.id, {
        documentType,
        businessDate: date,
        counterpartyName,
        referenceNumber,
        notes,
        items: items.map((item) => ({
          productId: Number(item.productId),
          quantity: Number(item.quantity),
          unitCostCentavos: inputToCentavos(item.unitCostPesos),
          unitPriceCentavos: inputToCentavos(item.unitPricePesos),
        })),
      });
      if (!editingDocument) resetForm();
    } catch (submissionError) {
      setError(submissionError.message);
    } finally {
      setBusy(false);
    }
  }

  const activeProducts = products.filter(
    (product) => product.isActive || items.some((item) => Number(item.productId) === product.id),
  );
  const isSale = documentType === 'SALE';
  const isPurchase = documentType === 'PURCHASE';
  const isAdjustment = documentType === 'ADJUSTMENT';

  return (
    <form
      className="rounded-2xl border border-slate-200 bg-white shadow-sm"
      onSubmit={handleSubmit}
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-teal-700">
            {editingDocument
              ? `Edit ${documentTypeLabel(documentType).toLowerCase()} #${editingDocument.documentSequence}`
              : 'Inventory document'}
          </p>
          <h3 className="mt-1 text-xl font-bold text-slate-950">
            {documentTypeTitle(documentType)}
          </h3>
        </div>
        {editingDocument && (
          <button className="text-sm font-semibold text-slate-500" onClick={onCancel} type="button">
            Cancel edit
          </button>
        )}
      </div>

      <div className="p-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <label>
            <FieldLabel>Business date</FieldLabel>
            <input
              className={inputClass}
              onChange={(event) => setDate(event.target.value)}
              required
              type="date"
              value={date}
            />
          </label>
          {(isSale || isPurchase) && (
            <label>
              <FieldLabel>{isSale ? 'Customer' : 'Supplier'}</FieldLabel>
              <input
                className={inputClass}
                onChange={(event) => setCounterpartyName(event.target.value)}
                placeholder={isSale ? 'Optional customer name' : 'Optional supplier'}
                value={counterpartyName}
              />
            </label>
          )}
          {(isPurchase || documentType === 'BEGINNING') && (
            <label>
              <FieldLabel>Reference number</FieldLabel>
              <input
                className={inputClass}
                onChange={(event) => setReferenceNumber(event.target.value)}
                placeholder="Receipt or invoice (optional)"
                value={referenceNumber}
              />
            </label>
          )}
        </div>

        <div className="mt-5 space-y-3">
          {items.map((item, index) => {
            const selectedByOthers = new Set(
              items
                .filter((candidate) => candidate.key !== item.key)
                .map((candidate) => candidate.productId),
            );
            const selectedProduct = products.find(
              (product) => product.id === Number(item.productId),
            );
            return (
              <section
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                key={item.key}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-bold text-slate-900">Item {index + 1}</p>
                  {items.length > 1 && (
                    <button
                      className="text-sm font-semibold text-red-600"
                      onClick={() =>
                        setItems((current) =>
                          current.filter((candidate) => candidate.key !== item.key),
                        )
                      }
                      type="button"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <label className="xl:col-span-2">
                    <FieldLabel>Canteen product</FieldLabel>
                    <select
                      className={inputClass}
                      onChange={(event) => selectProduct(item, event.target.value)}
                      required
                      value={item.productId}
                    >
                      <option value="">Select product</option>
                      {activeProducts.map((product) => (
                        <option
                          disabled={selectedByOthers.has(String(product.id))}
                          key={product.id}
                          value={product.id}
                        >
                          {product.name} · {product.stockQuantity} in stock
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <FieldLabel>{isAdjustment ? 'Quantity change (+/−)' : 'Quantity'}</FieldLabel>
                    <input
                      aria-label={`Item ${index + 1} quantity`}
                      className={inputClass}
                      max={isSale && selectedProduct ? selectedProduct.stockQuantity : undefined}
                      min={isAdjustment ? undefined : '1'}
                      onChange={(event) => updateItem(item.key, { quantity: event.target.value })}
                      required
                      step="1"
                      type="number"
                      value={item.quantity}
                    />
                  </label>
                  {(isPurchase || documentType === 'BEGINNING') && (
                    <MoneyField
                      label="Unit cost"
                      onChange={(value) => updateItem(item.key, { unitCostPesos: value })}
                      value={item.unitCostPesos}
                    />
                  )}
                  {isSale && (
                    <MoneyField
                      label="Selling price"
                      onChange={(value) => updateItem(item.key, { unitPricePesos: value })}
                      value={item.unitPricePesos}
                    />
                  )}
                </div>
                {!isAdjustment && item.productId && (
                  <p className="mt-3 text-right text-sm font-semibold text-slate-600">
                    Line total {formatPeso(lineTotal(documentType, item))}
                  </p>
                )}
              </section>
            );
          })}
        </div>

        <button
          className="mt-4 rounded-xl border border-dashed border-teal-300 px-4 py-3 text-sm font-semibold text-teal-700 hover:bg-teal-50"
          onClick={() => setItems((current) => [...current, emptyLine()])}
          type="button"
        >
          + Add another item
        </button>

        <label className="mt-4 block">
          <FieldLabel>Notes (optional)</FieldLabel>
          <textarea
            className="min-h-20 w-full resize-none rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-teal-600"
            maxLength="300"
            onChange={(event) => setNotes(event.target.value)}
            placeholder={
              isAdjustment
                ? 'Required: explain the physical count, damage, or correction'
                : 'Optional note'
            }
            value={notes}
          />
        </label>

        {error && <p className="mt-4 text-sm font-medium text-red-600">{error}</p>}
        <button
          className="mt-5 w-full rounded-xl bg-teal-700 px-5 py-3.5 font-bold text-white shadow-sm hover:bg-teal-800 disabled:opacity-60"
          disabled={busy || activeProducts.length === 0}
          type="submit"
        >
          {busy
            ? 'Saving…'
            : editingDocument
              ? 'Save document changes'
              : documentTypeAction(documentType)}
        </button>
      </div>
    </form>
  );
}

function MoneyField({ label, value, onChange }) {
  return (
    <label>
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

function emptyLine() {
  return {
    key: nextLineKey++,
    productId: '',
    quantity: '1',
    unitCostPesos: '0.00',
    unitPricePesos: '0.00',
  };
}

function lineTotal(documentType, item) {
  const quantity = Math.max(0, Number(item.quantity) || 0);
  const pesos = documentType === 'SALE' ? item.unitPricePesos : item.unitCostPesos;
  return quantity * inputToCentavos(pesos);
}

function documentTypeTitle(type) {
  return {
    SALE: 'Record canteen sale',
    PURCHASE: 'Record canteen purchase',
    BEGINNING: 'Add beginning inventory',
    ADJUSTMENT: 'Adjust physical stock',
  }[type];
}

function documentTypeAction(type) {
  return {
    SALE: 'Record canteen sale',
    PURCHASE: 'Add purchased stock',
    BEGINNING: 'Add beginning stock',
    ADJUSTMENT: 'Save stock adjustment',
  }[type];
}

function documentTypeLabel(type) {
  return {
    SALE: 'Sale',
    PURCHASE: 'Purchase',
    BEGINNING: 'Beginning inventory',
    ADJUSTMENT: 'Adjustment',
  }[type];
}

const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10';
