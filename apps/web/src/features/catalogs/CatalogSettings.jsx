import { useCallback, useEffect, useState } from 'react';
import {
  createEmployee,
  createService,
  createVehicleClass,
  getCatalogs,
  setEmployeeActive,
  setServiceActive,
  setServicePrice,
  setVehicleClassActive,
  updateEmployee,
  updateService,
  updateVehicleClass,
} from './catalogs-api.js';
import { EmployeesPanel } from './EmployeesPanel.jsx';
import { PriceMatrixPanel } from './PriceMatrixPanel.jsx';
import { ReasonDialog } from './ReasonDialog.jsx';
import { ServicesPanel } from './ServicesPanel.jsx';
import { VehicleClassesPanel } from './VehicleClassesPanel.jsx';

const tabs = [
  { id: 'employees', label: 'Employees' },
  { id: 'vehicles', label: 'Vehicle classes' },
  { id: 'services', label: 'Services' },
  { id: 'prices', label: 'Price matrix' },
];

export function CatalogSettings({ csrfToken }) {
  const [catalogs, setCatalogs] = useState(null);
  const [activeTab, setActiveTab] = useState('employees');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusTarget, setStatusTarget] = useState(null);

  const load = useCallback(async ({ showLoading = true } = {}) => {
    if (showLoading) {
      setLoading(true);
    }
    setError('');
    try {
      setCatalogs(await getCatalogs());
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function mutate(operation) {
    await operation;
    await load({ showLoading: false });
  }

  function requestStatus(type, item) {
    setStatusTarget({
      type,
      item,
      isActive: !item.isActive,
      label: item.displayName ?? item.name,
    });
  }

  async function confirmStatus(reason) {
    const { type, item, isActive } = statusTarget;
    const operations = {
      employees: () => setEmployeeActive(item.id, isActive, reason, csrfToken),
      vehicles: () => setVehicleClassActive(item.id, isActive, reason, csrfToken),
      services: () => setServiceActive(item.id, isActive, reason, csrfToken),
    };

    await mutate(operations[type]());
    setStatusTarget(null);
  }

  if (loading) {
    return <CatalogLoading />;
  }

  if (!catalogs) {
    return <CatalogError message={error} onRetry={() => load()} />;
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-semibold text-teal-700">Owner settings</p>
          <h2 className="ui-page-heading mt-1">Business setup</h2>
          <p className="mt-2 max-w-2xl leading-7 text-slate-600">
            Configure the reusable information that sales, attendance, payroll, and reports will
            use.
          </p>
        </div>
        <SetupStatus progress={catalogs.setupProgress} onSelect={setActiveTab} />
      </div>

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="ui-tabs-shell">
        <div className="ui-tabs-row">
          {tabs.map((tab) => (
            <button
              aria-selected={activeTab === tab.id}
              className={`ui-tab ${activeTab === tab.id ? 'ui-tab-active' : 'ui-tab-idle'}`}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              role="tab"
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        {activeTab === 'employees' && (
          <EmployeesPanel
            employees={catalogs.employees}
            onSave={(employeeId, values) =>
              mutate(
                employeeId
                  ? updateEmployee(employeeId, values, csrfToken)
                  : createEmployee(values, csrfToken),
              )
            }
            onStatus={(employee) => requestStatus('employees', employee)}
          />
        )}
        {activeTab === 'vehicles' && (
          <VehicleClassesPanel
            onSave={(vehicleClassId, values) =>
              mutate(
                vehicleClassId
                  ? updateVehicleClass(vehicleClassId, values, csrfToken)
                  : createVehicleClass(values, csrfToken),
              )
            }
            onStatus={(vehicleClass) => requestStatus('vehicles', vehicleClass)}
            vehicleClasses={catalogs.vehicleClasses}
          />
        )}
        {activeTab === 'services' && (
          <ServicesPanel
            onSave={(serviceId, values) =>
              mutate(
                serviceId
                  ? updateService(serviceId, values, csrfToken)
                  : createService(values, csrfToken),
              )
            }
            onStatus={(service) => requestStatus('services', service)}
            services={catalogs.services}
          />
        )}
        {activeTab === 'prices' && (
          <PriceMatrixPanel
            onSave={(values) => mutate(setServicePrice(values, csrfToken))}
            prices={catalogs.prices}
            services={catalogs.services}
            vehicleClasses={catalogs.vehicleClasses}
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

function SetupStatus({ progress, onSelect }) {
  const steps = [
    {
      label: 'Employee',
      complete: progress.activeEmployees > 0,
      tab: 'employees',
    },
    {
      label: 'Vehicle class',
      complete: progress.activeVehicleClasses > 0,
      tab: 'vehicles',
    },
    {
      label: 'Service price',
      complete: progress.configuredActivePrices > 0,
      tab: 'prices',
    },
  ];

  return (
    <section
      className={`rounded-2xl border px-5 py-4 ${progress.isComplete ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}
    >
      <p
        className={`text-sm font-bold ${progress.isComplete ? 'text-emerald-800' : 'text-amber-900'}`}
      >
        {progress.isComplete ? 'Core setup complete' : 'Complete the core setup'}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {steps.map((step) => (
          <button
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${step.complete ? 'bg-emerald-100 text-emerald-800' : 'bg-white text-amber-900 shadow-sm'}`}
            key={step.tab}
            onClick={() => onSelect(step.tab)}
            type="button"
          >
            {step.complete ? '✓' : '○'} {step.label}
          </button>
        ))}
      </div>
    </section>
  );
}

function CatalogLoading() {
  return (
    <div className="grid min-h-80 place-items-center">
      <div className="text-center">
        <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-slate-300 border-t-teal-700" />
        <p className="mt-3 text-sm font-semibold text-slate-500">Loading business setup…</p>
      </div>
    </div>
  );
}

function CatalogError({ message, onRetry }) {
  return (
    <section className="mx-auto max-w-lg rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
      <h2 className="text-xl font-bold text-slate-950">Business setup could not load</h2>
      <p className="mt-2 text-slate-600">{message}</p>
      <button
        className="mt-5 rounded-xl bg-teal-700 px-5 py-3 font-semibold text-white"
        onClick={onRetry}
        type="button"
      >
        Try again
      </button>
    </section>
  );
}
