import { useState } from 'react';
import { BrandMark } from '../../components/BrandMark.jsx';
import { CatalogSettings } from '../catalogs/CatalogSettings.jsx';
import { ServiceSalesPage } from '../service-sales/ServiceSalesPage.jsx';
import { TireInventoryPage } from '../tire-inventory/TireInventoryPage.jsx';

const modules = [
  'Dashboard',
  'Service sales',
  'Tires & inventory',
  'Canteen',
  'Purchases & expenses',
  'Attendance & payroll',
  'Reports',
  'Daily close',
  'Settings',
];

const summaryCards = [
  { label: "Today's service sales", value: '₱0.00', note: 'No transactions yet' },
  { label: "Today's tire sales", value: '₱0.00', note: 'No transactions yet' },
  { label: "Today's canteen sales", value: '₱0.00', note: 'No transactions yet' },
  { label: "Today's total", value: '₱0.00', note: 'Combined sales' },
];

export function DashboardShell({ user, csrfToken, onLogout }) {
  const [activeModule, setActiveModule] = useState('Dashboard');
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      {menuOpen && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden"
          onClick={() => setMenuOpen(false)}
          type="button"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-slate-200 bg-white p-5 transition-transform lg:translate-x-0 ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <BrandMark />
        <nav className="mt-9 space-y-1" aria-label="Main navigation">
          {modules.map((module) => (
            <button
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
                activeModule === module
                  ? 'bg-teal-50 text-teal-800'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
              }`}
              key={module}
              onClick={() => {
                setActiveModule(module);
                setMenuOpen(false);
              }}
              type="button"
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  activeModule === module ? 'bg-teal-600' : 'bg-slate-300'
                }`}
              />
              {module}
            </button>
          ))}
        </nav>
        <div className="absolute inset-x-5 bottom-5 rounded-2xl bg-slate-950 p-4 text-white">
          <p className="truncate text-sm font-semibold">{user.displayName}</p>
          <p className="mt-1 text-xs text-slate-400">Owner session</p>
          <button
            className="mt-4 text-sm font-semibold text-teal-300 hover:text-teal-200"
            onClick={onLogout}
            type="button"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-200 bg-white/90 px-5 backdrop-blur sm:px-8">
          <div className="flex items-center gap-3">
            <button
              aria-label="Open navigation"
              className="rounded-xl border border-slate-200 px-3 py-2 text-slate-700 lg:hidden"
              onClick={() => setMenuOpen(true)}
              type="button"
            >
              ☰
            </button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                DD Auto Spa
              </p>
              <h1 className="font-bold text-slate-950">{activeModule}</h1>
            </div>
          </div>
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold text-slate-800">{user.displayName}</p>
            <p className="text-xs text-slate-500">@{user.username}</p>
          </div>
        </header>

        <main className="p-5 sm:p-8">
          {activeModule === 'Dashboard' ? (
            <DashboardHome user={user} />
          ) : activeModule === 'Service sales' ? (
            <ServiceSalesPage csrfToken={csrfToken} />
          ) : activeModule === 'Tires & inventory' ? (
            <TireInventoryPage csrfToken={csrfToken} />
          ) : activeModule === 'Settings' ? (
            <CatalogSettings csrfToken={csrfToken} />
          ) : (
            <ModulePlaceholder module={activeModule} />
          )}
        </main>
      </div>
    </div>
  );
}

function DashboardHome({ user }) {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-teal-700">Overview</p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight">Good day, {user.displayName}</h2>
          <p className="mt-2 text-slate-600">The secure system foundation is ready.</p>
        </div>
        <span className="w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700">
          Local system online
        </span>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
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

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="font-bold text-slate-950">Phase 2 foundation</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Login, local database storage, recovery, and audit foundations are active.
            </p>
          </div>
          <span className="w-fit rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600">
            Business modules are next
          </span>
        </div>
      </section>
    </div>
  );
}

function ModulePlaceholder({ module }) {
  return (
    <section className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-14">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-teal-50 text-2xl text-teal-700">
        ◇
      </div>
      <h2 className="mt-5 text-2xl font-bold text-slate-950">{module}</h2>
      <p className="mx-auto mt-3 max-w-lg leading-7 text-slate-600">
        This area is part of the approved architecture and will be implemented in its planned phase.
      </p>
    </section>
  );
}
