import { useEffect, useState } from 'react';
import { centavosToInput, formatPeso, inputToCentavos } from './catalog-formatters.js';

export function PriceMatrixPanel({ prices, services, vehicleClasses, onSave }) {
  const activeServices = services.filter((service) => service.isActive);
  const activeVehicleClasses = vehicleClasses.filter((vehicleClass) => vehicleClass.isActive);
  const priceMap = new Map(
    prices.map((price) => [`${price.serviceId}:${price.vehicleClassId}`, price.amountCentavos]),
  );

  if (activeVehicleClasses.length === 0) {
    return (
      <EmptyMatrix
        title="Add vehicle classes first"
        description="The price matrix needs at least one active vehicle class."
      />
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h3 className="font-bold text-slate-950">Current service-price matrix</h3>
        <p className="mt-1 text-sm text-slate-500">
          Prices auto-fill future service transactions. Historical sales will keep their own
          snapshots.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="sticky left-0 min-w-52 border-b border-r border-slate-200 bg-slate-50 px-5 py-4 font-semibold">
                Service
              </th>
              {activeVehicleClasses.map((vehicleClass) => (
                <th
                  className="min-w-48 border-b border-slate-200 px-4 py-4 font-semibold"
                  key={vehicleClass.id}
                >
                  {vehicleClass.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activeServices.map((service) => (
              <tr className="border-b border-slate-100" key={service.id}>
                <th className="sticky left-0 border-r border-slate-200 bg-white px-5 py-4">
                  <span className="block font-semibold text-slate-950">{service.name}</span>
                  <span className="mt-1 block text-xs font-normal text-slate-500">
                    {service.laborRule === 'SPECIALIST' ? 'Specialist' : 'Ordinary'}
                  </span>
                </th>
                {activeVehicleClasses.map((vehicleClass) => {
                  const amount = priceMap.get(`${service.id}:${vehicleClass.id}`);
                  return (
                    <td className="px-4 py-3" key={vehicleClass.id}>
                      <PriceCell
                        amountCentavos={amount}
                        key={`${service.id}:${vehicleClass.id}:${amount ?? 'unset'}`}
                        onSave={(amountCentavos) =>
                          onSave({
                            serviceId: service.id,
                            vehicleClassId: vehicleClass.id,
                            amountCentavos,
                          })
                        }
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PriceCell({ amountCentavos, onSave }) {
  const [value, setValue] = useState(
    amountCentavos === undefined ? '' : centavosToInput(amountCentavos),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setValue(amountCentavos === undefined ? '' : centavosToInput(amountCentavos));
  }, [amountCentavos]);

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onSave(inputToCentavos(value));
    } catch (submissionError) {
      setError(submissionError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex overflow-hidden rounded-lg border border-slate-300 focus-within:border-teal-600">
        <span className="grid place-items-center border-r border-slate-300 px-2 text-slate-400">
          ₱
        </span>
        <input
          aria-label="Service price"
          className="w-24 min-w-0 px-2 py-2 outline-none"
          min="0"
          onChange={(event) => setValue(event.target.value)}
          placeholder="0.00"
          required
          step="0.01"
          type="number"
          value={value}
        />
        <button
          className="bg-slate-100 px-3 font-semibold text-slate-700 hover:bg-teal-50"
          disabled={busy}
          type="submit"
        >
          {busy ? '…' : 'Save'}
        </button>
      </div>
      {amountCentavos !== undefined && (
        <p className="mt-1 text-xs text-slate-400">Saved {formatPeso(amountCentavos)}</p>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </form>
  );
}

function EmptyMatrix({ title, description }) {
  return (
    <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
      <h3 className="text-xl font-bold text-slate-950">{title}</h3>
      <p className="mt-2 text-slate-500">{description}</p>
    </section>
  );
}
