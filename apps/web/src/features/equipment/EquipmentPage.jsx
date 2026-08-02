import { useCallback, useEffect, useState } from 'react';
import { centavosToInput, formatPeso, inputToCentavos } from '../catalogs/catalog-formatters.js';
import { ReasonDialog } from '../catalogs/ReasonDialog.jsx';
import { useEditNavigation } from '../../hooks/useEditNavigation.js';
import {
  createEquipmentBatch,
  createEquipmentCategory,
  createEquipmentRepair,
  getEquipmentOverview,
  setEquipmentCategoryActive,
  setEquipmentItemActive,
  setEquipmentRepairActive,
  updateEquipmentBatch,
  updateEquipmentCategory,
  updateEquipmentItem,
  updateEquipmentRepair,
} from './equipment-api.js';

const CONDITIONS = [
  ['GOOD', 'Good'],
  ['NEEDS_ATTENTION', 'Needs Attention'],
  ['UNDER_REPAIR', 'Under Repair'],
  ['DAMAGED', 'Damaged'],
];

export function EquipmentPage({ csrfToken }) {
  const [overview, setOverview] = useState(null);
  const [tab, setTab] = useState('EQUIPMENT');
  const [filters, setFilters] = useState({
    search: '',
    categoryId: '',
    condition: '',
    includeArchived: false,
  });
  const [editingItem, setEditingItem] = useState(null);
  const [editingBatch, setEditingBatch] = useState(null);
  const [repairTarget, setRepairTarget] = useState(null);
  const [editingRepair, setEditingRepair] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [reasonTarget, setReasonTarget] = useState(null);
  const [error, setError] = useState('');
  const editRegionRef = useEditNavigation(editingItem || editingBatch || editingRepair);

  const load = useCallback(async () => {
    try {
      setError('');
      setOverview(await getEquipmentOverview(filters));
    } catch (loadError) {
      setError(loadError.message);
    }
  }, [filters]);
  useEffect(() => {
    load();
  }, [load]);

  async function refresh(action) {
    await action();
    setEditingItem(null);
    setEditingBatch(null);
    setRepairTarget(null);
    setEditingRepair(null);
    await load();
  }
  async function confirmReason(reason) {
    const target = reasonTarget;
    if (target.kind === 'item')
      await setEquipmentItemActive(target.id, target.makeActive, reason, csrfToken);
    if (target.kind === 'category')
      await setEquipmentCategoryActive(target.id, target.makeActive, reason, csrfToken);
    if (target.kind === 'repair')
      await setEquipmentRepairActive(target.id, target.makeActive, reason, csrfToken);
    setReasonTarget(null);
    await load();
  }

  if (!overview) return <PageMessage title="Loading equipment…" detail={error} />;
  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-teal-700">Reusable asset register</p>
          <h2 className="ui-page-heading mt-1">Equipment</h2>
        </div>
        {tab === 'EQUIPMENT' && (
          <button
            className="rounded-xl bg-teal-700 px-5 py-3 font-bold text-white"
            onClick={() => setShowAddForm((current) => !current)}
            type="button"
          >
            {showAddForm ? 'Close form' : 'Add equipment'}
          </button>
        )}
      </div>
      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <Summary summary={overview.summary} />
      <div className="ui-tabs-shell flex gap-1">
        {[
          ['EQUIPMENT', 'Equipment'],
          ['CATEGORIES', 'Categories'],
          ['REPAIRS', 'Repair costs'],
        ].map(([value, label]) => (
          <button
            className={`ui-tab ${tab === value ? 'ui-tab-active' : 'ui-tab-idle'}`}
            key={value}
            onClick={() => {
              setTab(value);
              if (value !== 'EQUIPMENT') setShowAddForm(false);
            }}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'EQUIPMENT' && (
        <div className="mt-6 space-y-6">
          {showAddForm && (
            <BatchForm
              categories={overview.categories}
              onCancel={() => setShowAddForm(false)}
              onSave={async (values) => {
                await refresh(() => createEquipmentBatch(values, csrfToken));
                setShowAddForm(false);
              }}
            />
          )}
          <div className="scroll-mt-28 space-y-6" ref={editRegionRef}>
            {editingItem && (
              <ItemForm
                categories={overview.categories}
                item={editingItem}
                onCancel={() => setEditingItem(null)}
                onSave={(values) =>
                  refresh(() => updateEquipmentItem(editingItem.id, values, csrfToken))
                }
              />
            )}
            {editingBatch && (
              <BatchEditForm
                item={editingBatch}
                onCancel={() => setEditingBatch(null)}
                onSave={(values) =>
                  refresh(() =>
                    updateEquipmentBatch(editingBatch.purchaseBatchId, values, csrfToken),
                  )
                }
              />
            )}
            {(repairTarget || editingRepair) && (
              <RepairForm
                item={repairTarget}
                repair={editingRepair}
                onCancel={() => {
                  setRepairTarget(null);
                  setEditingRepair(null);
                }}
                onSave={(values) =>
                  refresh(() =>
                    editingRepair
                      ? updateEquipmentRepair(editingRepair.id, values, csrfToken)
                      : createEquipmentRepair(repairTarget.id, values, csrfToken),
                  )
                }
              />
            )}
          </div>
          <Filters categories={overview.categories} filters={filters} onChange={setFilters} />
          <EquipmentList
            items={overview.items}
            onArchive={(item) =>
              setReasonTarget({
                kind: 'item',
                id: item.id,
                makeActive: !item.isActive,
                isActive: !item.isActive,
                activeVerb: 'Restore',
                inactiveVerb: 'Delete',
                label: item.assetCode,
              })
            }
            onEdit={(item) => {
              setShowAddForm(false);
              setEditingItem(item);
            }}
            onEditBatch={(item) => {
              setShowAddForm(false);
              setEditingBatch(item);
            }}
            onRepair={setRepairTarget}
          />
        </div>
      )}
      {tab === 'CATEGORIES' && (
        <CategoryPanel
          categories={overview.categories}
          onCreate={(values) => refresh(() => createEquipmentCategory(values, csrfToken))}
          onEdit={(id, values) => refresh(() => updateEquipmentCategory(id, values, csrfToken))}
          onStatus={(category) =>
            setReasonTarget({
              kind: 'category',
              id: category.id,
              makeActive: !category.isActive,
              isActive: !category.isActive,
              activeVerb: 'Restore',
              inactiveVerb: 'Delete',
              label: category.name,
            })
          }
        />
      )}
      {tab === 'REPAIRS' && (
        <RepairList
          repairs={overview.repairs}
          onEdit={(repair) => {
            setShowAddForm(false);
            setEditingRepair(repair);
            setTab('EQUIPMENT');
          }}
          onStatus={(repair) =>
            setReasonTarget({
              kind: 'repair',
              id: repair.id,
              makeActive: repair.status === 'VOIDED',
              isActive: repair.status === 'VOIDED',
              activeVerb: 'Restore',
              inactiveVerb: 'Delete',
              label: `repair #${repair.id}`,
            })
          }
        />
      )}
      <ReasonDialog
        target={reasonTarget}
        onCancel={() => setReasonTarget(null)}
        onConfirm={confirmReason}
      />
    </div>
  );
}

export function Summary({ summary }) {
  const cards = [
    ['Active equipment', summary.activeCount],
    ['Good condition', summary.goodCount],
    ['Needs action', summary.needsAttentionCount + summary.underRepairCount + summary.damagedCount],
    ['Acquisition value', formatPeso(summary.acquisitionValueCentavos)],
  ];
  return (
    <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(([label, value]) => (
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" key={label}>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-3 text-2xl font-bold text-slate-950">{value}</p>
        </article>
      ))}
    </div>
  );
}

export function BatchForm({ categories, onSave, onCancel }) {
  const today = todayLocal();
  const defaultCategoryId = categories.find((category) => category.isActive)?.id;
  const [form, setForm] = useState({
    businessDate: today,
    categoryId: defaultCategoryId ? String(defaultCategoryId) : '',
    name: '',
    quantity: '1',
    assetCodePrefix: '',
    description: '',
    condition: 'GOOD',
    conditionCheckedOn: today,
    unitCost: '0.00',
    supplier: '',
    referenceNumber: '',
    notes: '',
  });
  return (
    <FormCard
      title="Add equipment"
      onCancel={onCancel}
      onSubmit={() =>
        onSave({
          ...form,
          categoryId: Number(form.categoryId),
          quantity: Number(form.quantity),
          unitCostCentavos: inputToCentavos(form.unitCost),
          unitCost: undefined,
        })
      }
    >
      <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
      <Select
        label="Category"
        value={form.categoryId}
        onChange={(v) => setForm({ ...form, categoryId: v })}
        options={categories.filter((c) => c.isActive).map((c) => [String(c.id), c.name])}
      />
      <Field
        label="Quantity"
        type="number"
        value={form.quantity}
        onChange={(v) => setForm({ ...form, quantity: v })}
      />
      <Field
        label="Code prefix"
        value={form.assetCodePrefix}
        onChange={(v) => setForm({ ...form, assetCodePrefix: v })}
      />
      <Field
        label="Purchase date"
        type="date"
        value={form.businessDate}
        onChange={(v) => setForm({ ...form, businessDate: v, conditionCheckedOn: v })}
      />
      <Field
        label="Unit cost"
        type="number"
        value={form.unitCost}
        onChange={(v) => setForm({ ...form, unitCost: v })}
      />
      <Select
        label="Condition"
        value={form.condition}
        onChange={(v) => setForm({ ...form, condition: v })}
        options={CONDITIONS}
      />
      <Field
        label="Supplier"
        value={form.supplier}
        onChange={(v) => setForm({ ...form, supplier: v })}
      />
      <Field
        label="Reference"
        value={form.referenceNumber}
        onChange={(v) => setForm({ ...form, referenceNumber: v })}
      />
      <Field
        label="Description"
        value={form.description}
        onChange={(v) => setForm({ ...form, description: v })}
      />
      <Field label="Notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
    </FormCard>
  );
}

function ItemForm({ item, categories, onSave, onCancel }) {
  const [form, setForm] = useState({
    categoryId: String(item.categoryId),
    name: item.name,
    assetCode: item.assetCode,
    description: item.description,
    condition: item.condition,
    conditionCheckedOn: item.conditionCheckedOn,
    notes: item.notes,
  });
  return (
    <FormCard
      title={`Edit ${item.assetCode}`}
      onCancel={onCancel}
      onSubmit={() => onSave({ ...form, categoryId: Number(form.categoryId) })}
    >
      <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
      <Field
        label="Asset code"
        value={form.assetCode}
        onChange={(v) => setForm({ ...form, assetCode: v })}
      />
      <Select
        label="Category"
        value={form.categoryId}
        onChange={(v) => setForm({ ...form, categoryId: v })}
        options={categories.map((c) => [String(c.id), c.name])}
      />
      <Select
        label="Condition"
        value={form.condition}
        onChange={(v) => setForm({ ...form, condition: v })}
        options={CONDITIONS}
      />
      <Field
        label="Condition checked"
        type="date"
        value={form.conditionCheckedOn}
        onChange={(v) => setForm({ ...form, conditionCheckedOn: v })}
      />
      <Field
        label="Description"
        value={form.description}
        onChange={(v) => setForm({ ...form, description: v })}
      />
      <Field label="Notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
    </FormCard>
  );
}
function BatchEditForm({ item, onSave, onCancel }) {
  const [form, setForm] = useState({
    businessDate: item.purchaseDate,
    unitCost: centavosToInput(item.unitCostCentavos),
    supplier: item.supplier,
    referenceNumber: item.referenceNumber,
    notes: '',
  });
  return (
    <FormCard
      title={`Correct purchase batch #${item.purchaseBatchId}`}
      onCancel={onCancel}
      onSubmit={() =>
        onSave({ ...form, unitCostCentavos: inputToCentavos(form.unitCost), unitCost: undefined })
      }
    >
      <Field
        label="Purchase date"
        type="date"
        value={form.businessDate}
        onChange={(v) => setForm({ ...form, businessDate: v })}
      />
      <Field
        label="Unit cost"
        type="number"
        value={form.unitCost}
        onChange={(v) => setForm({ ...form, unitCost: v })}
      />
      <Field
        label="Supplier"
        value={form.supplier}
        onChange={(v) => setForm({ ...form, supplier: v })}
      />
      <Field
        label="Reference"
        value={form.referenceNumber}
        onChange={(v) => setForm({ ...form, referenceNumber: v })}
      />
      <Field label="Notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
    </FormCard>
  );
}
function RepairForm({ item, repair, onSave, onCancel }) {
  const [form, setForm] = useState({
    businessDate: repair?.businessDate ?? todayLocal(),
    amount: centavosToInput(repair?.amountCentavos ?? 0),
    description: repair?.description ?? '',
    payee: repair?.payee ?? '',
    referenceNumber: repair?.referenceNumber ?? '',
    notes: repair?.notes ?? '',
    resultingCondition: repair?.resultingCondition ?? 'GOOD',
  });
  return (
    <FormCard
      title={repair ? `Edit repair #${repair.id}` : `Record repair for ${item.assetCode}`}
      onCancel={onCancel}
      onSubmit={() =>
        onSave({ ...form, amountCentavos: inputToCentavos(form.amount), amount: undefined })
      }
    >
      <Field
        label="Date"
        type="date"
        value={form.businessDate}
        onChange={(v) => setForm({ ...form, businessDate: v })}
      />
      <Field
        label="Cost"
        type="number"
        value={form.amount}
        onChange={(v) => setForm({ ...form, amount: v })}
      />
      <Field
        label="Repair description"
        value={form.description}
        onChange={(v) => setForm({ ...form, description: v })}
      />
      <Field label="Payee" value={form.payee} onChange={(v) => setForm({ ...form, payee: v })} />
      <Field
        label="Reference"
        value={form.referenceNumber}
        onChange={(v) => setForm({ ...form, referenceNumber: v })}
      />
      <Select
        label="Resulting condition"
        value={form.resultingCondition}
        onChange={(v) => setForm({ ...form, resultingCondition: v })}
        options={CONDITIONS}
      />
      <Field label="Notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
    </FormCard>
  );
}

function Filters({ filters, onChange, categories }) {
  return (
    <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-4">
      <Field
        label="Search"
        value={filters.search}
        onChange={(v) => onChange({ ...filters, search: v })}
      />
      <Select
        label="Category"
        value={filters.categoryId}
        onChange={(v) => onChange({ ...filters, categoryId: v })}
        options={[['', 'All categories'], ...categories.map((c) => [String(c.id), c.name])]}
      />
      <Select
        label="Condition"
        value={filters.condition}
        onChange={(v) => onChange({ ...filters, condition: v })}
        options={[['', 'All conditions'], ...CONDITIONS]}
      />
      <label className="flex items-end gap-2 pb-3 text-sm font-semibold text-slate-700">
        <input
          checked={filters.includeArchived}
          onChange={(e) => onChange({ ...filters, includeArchived: e.target.checked })}
          type="checkbox"
        />
        Show deleted
      </label>
    </section>
  );
}
function EquipmentList({ items, onEdit, onEditBatch, onRepair, onArchive }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <h3 className="font-bold">Equipment register</h3>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
          {items.length} items
        </span>
      </div>
      {items.length === 0 ? (
        <p className="p-8 text-center text-slate-500">No equipment matches these filters.</p>
      ) : (
        <div
          aria-label="Equipment register list"
          className="ui-scroll-list divide-y divide-slate-100"
          role="region"
          tabIndex="0"
        >
          {items.map((item) => (
            <article
              className={`p-5 ${item.isActive ? '' : 'bg-slate-50 opacity-70'}`}
              key={item.id}
            >
              <div className="flex flex-col justify-between gap-3 lg:flex-row">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-bold text-slate-950">{item.name}</h4>
                    <Badge text={item.assetCode} />
                    <Badge
                      text={conditionLabel(item.condition)}
                      tone={item.condition === 'GOOD' ? 'green' : 'amber'}
                    />
                    {!item.isActive && <Badge text="Deleted" />}
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    {item.categoryName} · Purchased {item.purchaseDate} ·{' '}
                    {formatPeso(item.unitCostCentavos)}
                  </p>
                  {item.notes && <p className="mt-2 text-sm text-slate-600">{item.notes}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Action onClick={() => onEdit(item)}>Edit</Action>
                  <Action onClick={() => onEditBatch(item)}>Purchase</Action>
                  {item.isActive && <Action onClick={() => onRepair(item)}>Repair</Action>}
                  <Action onClick={() => onArchive(item)}>
                    {item.isActive ? 'Delete' : 'Restore'}
                  </Action>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
function CategoryPanel({ categories, onCreate, onEdit, onStatus }) {
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(null);
  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <form
        className="flex gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (editing) await onEdit(editing.id, { name });
          else await onCreate({ name });
          setName('');
          setEditing(null);
        }}
      >
        <input
          className="flex-1 rounded-xl border border-slate-300 px-4 py-3"
          onChange={(e) => setName(e.target.value)}
          placeholder={editing ? 'Edit category name' : 'New category'}
          required
          value={name}
        />
        {editing && (
          <button
            className="rounded-xl border border-slate-300 px-4 font-bold text-slate-700"
            onClick={() => {
              setEditing(null);
              setName('');
            }}
            type="button"
          >
            Cancel
          </button>
        )}
        <button className="rounded-xl bg-teal-700 px-5 font-bold text-white">
          {editing ? 'Save' : 'Add'}
        </button>
      </form>
      <div
        aria-label="Equipment categories list"
        className="ui-scroll-list mt-5 divide-y divide-slate-100"
        role="region"
        tabIndex="0"
      >
        {categories.map((c) => (
          <div className="flex items-center justify-between py-3" key={c.id}>
            <span className={c.isActive ? 'font-semibold' : 'text-slate-400'}>{c.name}</span>
            <div className="flex gap-2">
              <Action
                onClick={() => {
                  setEditing(c);
                  setName(c.name);
                }}
              >
                Edit
              </Action>
              <Action onClick={() => onStatus(c)}>{c.isActive ? 'Delete' : 'Restore'}</Action>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
function RepairList({ repairs, onEdit, onStatus }) {
  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold">Repair costs</h3>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
            {repairs.length} records
          </span>
        </div>
      </div>
      {repairs.length === 0 ? (
        <p className="p-8 text-center text-slate-500">No repairs recorded.</p>
      ) : (
        <div
          aria-label="Equipment repair history"
          className="ui-scroll-list divide-y divide-slate-100"
          role="region"
          tabIndex="0"
        >
          {repairs.map((r) => (
            <article className="flex flex-col justify-between gap-3 p-5 sm:flex-row" key={r.id}>
              <div>
                <p className="font-bold">
                  {r.equipmentName} ({r.assetCode})
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {r.businessDate} · {r.description} · {formatPeso(r.amountCentavos)}
                </p>
                {r.status === 'VOIDED' && (
                  <p className="mt-1 text-xs text-amber-700">Deleted: {r.voidReason}</p>
                )}
              </div>
              <div className="flex gap-2">
                {r.status === 'ACTIVE' && <Action onClick={() => onEdit(r)}>Edit</Action>}
                <Action onClick={() => onStatus(r)}>
                  {r.status === 'ACTIVE' ? 'Delete' : 'Restore'}
                </Action>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function FormCard({ title, children, onSubmit, onCancel }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <form
      className="rounded-2xl border border-teal-200 bg-white p-5 shadow-sm"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
          await onSubmit();
        } catch (err) {
          setError(err.message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3 className="font-bold text-slate-950">{title}</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      <div className="mt-4 flex gap-3">
        {onCancel && (
          <button
            className="rounded-xl border border-slate-300 px-5 py-3 font-bold"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
        )}
        <button
          className="rounded-xl bg-teal-700 px-5 py-3 font-bold text-white disabled:opacity-60"
          disabled={busy}
          type="submit"
        >
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}
function Field({ label, value, onChange, type = 'text' }) {
  return (
    <label>
      <span className="mb-1 block text-xs font-semibold text-slate-600">{label}</span>
      <input
        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-teal-600"
        min={type === 'number' ? '0' : undefined}
        onChange={(e) => onChange(e.target.value)}
        required={[
          'Name',
          'Quantity',
          'Purchase date',
          'Date',
          'Repair description',
          'Asset code',
        ].includes(label)}
        step={type === 'number' ? '0.01' : undefined}
        type={type}
        value={value}
      />
    </label>
  );
}
function Select({ label, value, onChange, options }) {
  return (
    <label>
      <span className="mb-1 block text-xs font-semibold text-slate-600">{label}</span>
      <select
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"
        onChange={(e) => onChange(e.target.value)}
        required
        value={value}
      >
        {options.map(([v, l]) => (
          <option key={`${v}-${l}`} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}
function Action({ children, onClick }) {
  return (
    <button
      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
function Badge({ text, tone = 'slate' }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-bold ${tone === 'green' ? 'bg-emerald-100 text-emerald-800' : tone === 'amber' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}
    >
      {text}
    </span>
  );
}
function conditionLabel(value) {
  return CONDITIONS.find(([key]) => key === value)?.[1] ?? value;
}
function PageMessage({ title, detail }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
      <h2 className="text-xl font-bold">{title}</h2>
      {detail && <p className="mt-2 text-red-600">{detail}</p>}
    </section>
  );
}
function todayLocal() {
  const now = new Date();
  return new Date(now.valueOf() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
