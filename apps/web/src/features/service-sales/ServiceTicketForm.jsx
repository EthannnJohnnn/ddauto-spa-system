import { useEffect, useMemo, useState } from 'react';
import { centavosToInput, inputToCentavos } from '../catalogs/catalog-formatters.js';

let nextItemKey = 1;

export function ServiceTicketForm({ businessDate, catalogs, editingTicket, onCancel, onSave }) {
  const [vehicleClassId, setVehicleClassId] = useState('');
  const [vehicleDescription, setVehicleDescription] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([emptyItem()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const activeServices = catalogs.services.filter((service) => service.isActive);
  const activeVehicles = catalogs.vehicleClasses.filter((vehicle) => vehicle.isActive);
  const activeWorkers = catalogs.employees.filter(
    (employee) => employee.isActive && employee.receivesLaborShare,
  );
  const specialist = activeWorkers.find((employee) => employee.isSpecialist);
  const priceMap = useMemo(
    () =>
      new Map(
        catalogs.prices.map((price) => [
          `${price.serviceId}:${price.vehicleClassId}`,
          price.amountCentavos,
        ]),
      ),
    [catalogs.prices],
  );

  useEffect(() => {
    if (editingTicket) {
      setVehicleClassId(String(editingTicket.vehicleClassId));
      setVehicleDescription(editingTicket.vehicleDescription);
      setPlateNumber(editingTicket.plateNumber);
      setNotes(editingTicket.notes);
      setItems(
        editingTicket.items.map((item) => ({
          key: nextItemKey++,
          serviceId: String(item.serviceId),
          amountPesos: centavosToInput(item.amountCentavos),
          employeeIds: item.workers.map((worker) => worker.employeeId),
          externalContractorName: item.externalContractorName,
          externalLaborCostPesos: centavosToInput(item.externalLaborCostCentavos),
        })),
      );
    } else {
      resetForm();
    }
    setError('');
  }, [editingTicket, businessDate]);

  function resetForm() {
    setVehicleClassId('');
    setVehicleDescription('');
    setPlateNumber('');
    setNotes('');
    setItems([emptyItem()]);
  }

  function updateItem(key, patch) {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  function selectVehicle(value) {
    setVehicleClassId(value);
    setItems((current) =>
      current.map((item) => {
        if (!item.serviceId || item.amountPesos) return item;
        const price = priceMap.get(`${item.serviceId}:${value}`);
        return { ...item, amountPesos: price === undefined ? '' : centavosToInput(price) };
      }),
    );
  }

  function selectService(item, serviceId) {
    const price = priceMap.get(`${serviceId}:${vehicleClassId}`);
    updateItem(item.key, {
      serviceId,
      amountPesos: price === undefined ? '' : centavosToInput(price),
      employeeIds: [],
      externalContractorName: '',
      externalLaborCostPesos: '0.00',
    });
  }

  function toggleWorker(item, employeeId) {
    const assigned = item.employeeIds.includes(employeeId);
    updateItem(item.key, {
      employeeIds: assigned
        ? item.employeeIds.filter((id) => id !== employeeId)
        : [...item.employeeIds, employeeId],
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onSave({
        businessDate,
        vehicleClassId: Number(vehicleClassId),
        vehicleDescription,
        plateNumber,
        notes,
        items: items.map((item) => {
          const service = catalogs.services.find(
            (candidate) => candidate.id === Number(item.serviceId),
          );
          return {
            serviceId: Number(item.serviceId),
            amountCentavos: inputToCentavos(item.amountPesos),
            employeeIds: service?.laborRule === 'ORDINARY' ? item.employeeIds : [],
            externalContractorName:
              service?.laborRule === 'EXTERNAL' ? item.externalContractorName : '',
            externalLaborCostCentavos:
              service?.laborRule === 'EXTERNAL' ? inputToCentavos(item.externalLaborCostPesos) : 0,
          };
        }),
      });
      if (!editingTicket) resetForm();
    } catch (submissionError) {
      setError(submissionError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="rounded-2xl border border-slate-200 bg-white shadow-sm"
      onSubmit={handleSubmit}
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-teal-700">
            {editingTicket
              ? `Edit transaction #${editingTicket.customerSequence}`
              : 'New transaction'}
          </p>
          <h3 className="mt-1 text-xl font-bold text-slate-950">Vehicle and services</h3>
        </div>
        {editingTicket && (
          <button
            className="text-sm font-semibold text-slate-500 hover:text-slate-900"
            onClick={onCancel}
            type="button"
          >
            Cancel edit
          </button>
        )}
      </div>

      <div className="p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <FieldLabel>Vehicle class</FieldLabel>
            <select
              className={inputClass}
              onChange={(event) => selectVehicle(event.target.value)}
              required
              value={vehicleClassId}
            >
              <option value="">Select class</option>
              {activeVehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <FieldLabel>Vehicle description</FieldLabel>
            <input
              className={inputClass}
              onChange={(event) => setVehicleDescription(event.target.value)}
              placeholder="Example: Toyota Vios"
              value={vehicleDescription}
            />
          </label>
          <label>
            <FieldLabel>Plate number</FieldLabel>
            <input
              className={inputClass}
              onChange={(event) => setPlateNumber(event.target.value)}
              placeholder="Optional"
              value={plateNumber}
            />
          </label>
          <label>
            <FieldLabel>Notes</FieldLabel>
            <input
              className={inputClass}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Optional transaction note"
              value={notes}
            />
          </label>
        </div>

        <div className="mt-6 space-y-4">
          {items.map((item, index) => {
            const service = activeServices.find(
              (candidate) => candidate.id === Number(item.serviceId),
            );
            const selectedIds = new Set(
              items
                .filter((candidate) => candidate.key !== item.key)
                .map((candidate) => candidate.serviceId),
            );
            return (
              <section
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                key={item.key}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-bold text-slate-900">Service {index + 1}</p>
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
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label>
                    <FieldLabel>Service</FieldLabel>
                    <select
                      className={inputClass}
                      onChange={(event) => selectService(item, event.target.value)}
                      required
                      value={item.serviceId}
                    >
                      <option value="">Select service</option>
                      {activeServices.map((candidate) => (
                        <option
                          disabled={selectedIds.has(String(candidate.id))}
                          key={candidate.id}
                          value={candidate.id}
                        >
                          {candidate.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <FieldLabel>Sale amount</FieldLabel>
                    <div className="flex rounded-xl border border-slate-300 bg-white focus-within:border-teal-600">
                      <span className="grid place-items-center border-r border-slate-300 px-3 text-slate-500">
                        ₱
                      </span>
                      <input
                        aria-label={`Service ${index + 1} sale amount`}
                        className="min-w-0 flex-1 rounded-r-xl px-3 py-2.5 outline-none"
                        min="0"
                        onChange={(event) =>
                          updateItem(item.key, { amountPesos: event.target.value })
                        }
                        required
                        step="0.01"
                        type="number"
                        value={item.amountPesos}
                      />
                    </div>
                  </label>
                </div>

                {service?.laborRule === 'ORDINARY' && (
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-slate-700">
                      Employees who performed this job
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {activeWorkers.map((employee) => (
                        <label
                          className={`cursor-pointer rounded-full border px-3 py-2 text-sm font-semibold ${item.employeeIds.includes(employee.id) ? 'border-teal-300 bg-teal-50 text-teal-800' : 'border-slate-300 bg-white text-slate-600'}`}
                          key={employee.id}
                        >
                          <input
                            checked={item.employeeIds.includes(employee.id)}
                            className="sr-only"
                            onChange={() => toggleWorker(item, employee.id)}
                            type="checkbox"
                          />
                          {employee.displayName}
                        </label>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {service.laborRateBasisPoints / 100}% labor is divided equally among only the
                      selected employees.
                    </p>
                  </div>
                )}

                {service?.laborRule === 'SPECIALIST' && (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    <strong>{specialist?.displayName ?? 'No active specialist'}</strong> receives
                    the {service.laborRateBasisPoints / 100}% specialist labor share.
                  </div>
                )}

                {service?.laborRule === 'EXTERNAL' && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label>
                      <FieldLabel>External contractor</FieldLabel>
                      <input
                        className={inputClass}
                        onChange={(event) =>
                          updateItem(item.key, { externalContractorName: event.target.value })
                        }
                        placeholder="Painter's name"
                        required
                        value={item.externalContractorName}
                      />
                    </label>
                    <label>
                      <FieldLabel>Contractor labor cost</FieldLabel>
                      <input
                        className={inputClass}
                        min="0"
                        onChange={(event) =>
                          updateItem(item.key, { externalLaborCostPesos: event.target.value })
                        }
                        required
                        step="0.01"
                        type="number"
                        value={item.externalLaborCostPesos}
                      />
                    </label>
                  </div>
                )}
              </section>
            );
          })}
        </div>

        <button
          className="mt-4 rounded-xl border border-dashed border-teal-300 px-4 py-3 text-sm font-semibold text-teal-700 hover:bg-teal-50"
          onClick={() => setItems((current) => [...current, emptyItem()])}
          type="button"
        >
          + Add another service
        </button>

        {error && <p className="mt-4 text-sm font-medium text-red-600">{error}</p>}
        <button
          className="mt-5 w-full rounded-xl bg-teal-700 px-5 py-3.5 font-bold text-white shadow-sm hover:bg-teal-800 disabled:opacity-60"
          disabled={busy || !catalogs.setupProgress.isComplete}
          type="submit"
        >
          {busy
            ? 'Saving…'
            : editingTicket
              ? 'Save transaction changes'
              : 'Record service transaction'}
        </button>
      </div>
    </form>
  );
}

function emptyItem() {
  return {
    key: nextItemKey++,
    serviceId: '',
    amountPesos: '',
    employeeIds: [],
    externalContractorName: '',
    externalLaborCostPesos: '0.00',
  };
}

function FieldLabel({ children }) {
  return <span className="mb-1.5 block text-sm font-semibold text-slate-700">{children}</span>;
}

const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10';
