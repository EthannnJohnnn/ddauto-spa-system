import { useEffect, useState } from 'react';
import { AppIcon } from '../../components/AppIcon.jsx';
import { BrandMark } from '../../components/BrandMark.jsx';
import { CatalogSettings } from '../catalogs/CatalogSettings.jsx';
import { formatPeso } from '../catalogs/catalog-formatters.js';
import { ServiceSalesPage } from '../service-sales/ServiceSalesPage.jsx';
import { TireInventoryPage } from '../tire-inventory/TireInventoryPage.jsx';
import { CanteenInventoryPage } from '../canteen-inventory/CanteenInventoryPage.jsx';
import { PurchasesExpensesPage } from '../purchases-expenses/PurchasesExpensesPage.jsx';
import { ReportsPage } from '../reports/ReportsPage.jsx';
import { getReportsOverview } from '../reports/reports-api.js';
import { AttendancePayrollPage } from '../attendance-payroll/AttendancePayrollPage.jsx';
import { SalaryPaymentsPage } from '../period-close/PeriodClosePage.jsx';
import { EquipmentPage } from '../equipment/EquipmentPage.jsx';
import { DashboardNotes } from './DashboardNotes.jsx';

const navigation = [
  { label: 'Overview', items: [{ name: 'Dashboard', icon: 'dashboard' }] },
  {
    label: 'Operations',
    items: [
      { name: 'Service sales', icon: 'services' },
      { name: 'Tires & inventory', icon: 'tires' },
      { name: 'Canteen', icon: 'canteen' },
      { name: 'Equipment', icon: 'equipment' },
      { name: 'Purchases & expenses', icon: 'expenses' },
    ],
  },
  {
    label: 'Management',
    items: [
      { name: 'Attendance', icon: 'payroll' },
      { name: 'Reports', icon: 'reports' },
      { name: 'Salary Payments', icon: 'close' },
      { name: 'Settings', icon: 'settings' },
    ],
  },
];

export function DashboardShell({ user, csrfToken, onLogout }) {
  const [activeModule, setActiveModule] = useState('Dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const activeItem = findNavigationItem(activeModule);

  useEffect(() => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [activeModule]);

  return (
    <div className="min-h-screen bg-[#f3f6f8] text-slate-950">
      {menuOpen && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-slate-950/55 backdrop-blur-sm lg:hidden"
          onClick={() => setMenuOpen(false)}
          type="button"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col overflow-hidden border-r border-blue-100 bg-white text-slate-950 shadow-xl shadow-blue-950/5 transition-transform duration-300 lg:translate-x-0 ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="border-b border-blue-100 px-5 py-5">
          <BrandMark />
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-500 opacity-40" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-600" />
            </span>
            Local workspace online
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-4 py-5" aria-label="Main navigation">
          {navigation.map((section) => (
            <div className="mb-6" key={section.label}>
              <p className="mb-2 px-3 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-blue-400">
                {section.label}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <button
                    aria-current={activeModule === item.name ? 'page' : undefined}
                    className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                      activeModule === item.name
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200/80'
                        : 'text-slate-600 hover:bg-blue-50 hover:text-blue-800'
                    }`}
                    key={item.name}
                    onClick={() => {
                      setActiveModule(item.name);
                      setMenuOpen(false);
                    }}
                    type="button"
                  >
                    <span
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                        activeModule === item.name
                          ? 'bg-white/15 text-white'
                          : 'bg-blue-50 text-blue-500 group-hover:bg-blue-100 group-hover:text-blue-700'
                      }`}
                    >
                      <AppIcon className="h-[1.1rem] w-[1.1rem]" name={item.icon} />
                    </span>
                    <span className="min-w-0 flex-1 truncate">{item.name}</span>
                    {activeModule === item.name && <AppIcon className="h-4 w-4" name="arrow" />}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="m-4 mt-0 rounded-2xl border border-blue-100 bg-blue-50/80 p-3.5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-600 font-black text-white shadow-md shadow-blue-200">
              {initials(user.displayName)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user.displayName}</p>
              <p className="mt-0.5 truncate text-xs text-slate-500">Owner · @{user.username}</p>
            </div>
          </div>
          <button
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-700 shadow-sm hover:border-blue-300 hover:bg-blue-100"
            onClick={onLogout}
            type="button"
          >
            <AppIcon className="h-4 w-4" name="logout" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 flex min-h-[5.25rem] items-center justify-between border-b border-blue-100 bg-white/92 px-5 shadow-sm shadow-blue-950/5 backdrop-blur-xl sm:px-8">
          <div className="flex items-center gap-3.5">
            <button
              aria-label="Open navigation"
              className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm lg:hidden"
              onClick={() => setMenuOpen(true)}
              type="button"
            >
              <AppIcon className="h-5 w-5" name="menu" />
            </button>
            <span className="hidden h-11 w-11 place-items-center rounded-xl border border-blue-100 bg-blue-50 text-blue-700 sm:grid">
              <AppIcon className="h-5 w-5" name={activeItem.icon} />
            </span>
            <div>
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-blue-500">
                Workspace / {activeItem.section}
              </p>
              <h1 className="mt-0.5 text-xl font-bold tracking-tight text-blue-950">
                {activeModule}
              </h1>
            </div>
          </div>
          <div className="hidden items-center gap-3 sm:flex">
            <span className="hidden items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 xl:flex">
              <span className="h-2 w-2 rounded-full bg-blue-500" /> Offline on this PC
            </span>
            <div className="border-l border-blue-100 pl-4 text-right">
              <p className="text-sm font-semibold text-blue-950">{user.displayName}</p>
              <p className="text-xs text-slate-500">{formatHeaderDate(new Date())}</p>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-700 text-xs font-black text-white shadow-md shadow-blue-200">
              {initials(user.displayName)}
            </span>
          </div>
        </header>

        <main className="relative p-5 sm:p-8 lg:p-10">
          {activeModule === 'Dashboard' ? (
            <DashboardHome csrfToken={csrfToken} onNavigate={setActiveModule} user={user} />
          ) : activeModule === 'Service sales' ? (
            <ServiceSalesPage csrfToken={csrfToken} />
          ) : activeModule === 'Tires & inventory' ? (
            <TireInventoryPage csrfToken={csrfToken} />
          ) : activeModule === 'Canteen' ? (
            <CanteenInventoryPage csrfToken={csrfToken} />
          ) : activeModule === 'Equipment' ? (
            <EquipmentPage csrfToken={csrfToken} />
          ) : activeModule === 'Purchases & expenses' ? (
            <PurchasesExpensesPage csrfToken={csrfToken} onNavigate={setActiveModule} />
          ) : activeModule === 'Attendance' ? (
            <AttendancePayrollPage csrfToken={csrfToken} />
          ) : activeModule === 'Reports' ? (
            <ReportsPage />
          ) : activeModule === 'Salary Payments' ? (
            <SalaryPaymentsPage csrfToken={csrfToken} onNavigate={setActiveModule} />
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

function DashboardHome({ user, csrfToken, onNavigate }) {
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const today = todayLocal();
    const period = currentMonthRange(today);
    let active = true;
    getReportsOverview(period.start, period.end)
      .then((data) => active && setReport(data))
      .catch((loadError) => active && setError(loadError.message));
    return () => {
      active = false;
    };
  }, []);

  const summaryCards = dashboardCards(report?.summary);

  return (
    <div className="mx-auto max-w-7xl">
      <section className="relative overflow-hidden rounded-3xl border border-blue-100 bg-white px-6 py-7 shadow-sm sm:px-8 sm:py-9">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-1.5 bg-blue-600" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-blue-50" />
        <div className="pointer-events-none absolute right-20 top-8 h-16 w-16 rounded-full border-[12px] border-blue-100/70" />
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold text-blue-600">Business overview</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-blue-950 sm:text-4xl">
              Good day, {user.displayName}
            </h2>
            <p className="mt-3 max-w-2xl text-slate-600">
              This month’s sales, costs, popular services, and inventory performance in one view.
            </p>
          </div>
          <span className="flex w-fit items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3.5 py-2 text-sm font-semibold text-blue-700">
            <AppIcon className="h-4 w-4" name="check" /> Current month
          </span>
        </div>
      </section>

      {error && (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Dashboard totals could not load: {error}
        </p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <article
            className="group relative overflow-hidden rounded-2xl border border-blue-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-100/80"
            key={card.label}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold text-slate-500">{card.label}</p>
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-700 transition group-hover:bg-blue-100">
                <AppIcon className="h-[1.1rem] w-[1.1rem]" name={card.icon} />
              </span>
            </div>
            <p className="mt-4 text-2xl font-bold tracking-tight text-slate-950">{card.value}</p>
            <p className="mt-2 text-xs font-medium text-slate-400">{card.note}</p>
            <span className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-blue-700 to-blue-400 opacity-0 transition group-hover:opacity-100" />
          </article>
        ))}
      </div>

      {report?.transactions && <DashboardAnalytics onNavigate={onNavigate} report={report} />}
      <DashboardNotes csrfToken={csrfToken} />
    </div>
  );
}

function dashboardCards(summary) {
  if (!summary) {
    return [
      ['Monthly sales', '—', 'Loading combined sales'],
      ['Monthly purchases', '—', 'Loading inventory purchases'],
      ['Monthly expenses', '—', 'Loading operating expenses'],
      ['Estimated net', '—', 'Loading monthly result'],
    ].map(([label, value, note], index) => ({
      label,
      value,
      note,
      icon: ['trend', 'expenses', 'reports', 'peso'][index],
    }));
  }
  return [
    {
      label: 'Monthly sales',
      value: formatPeso(summary.totalSalesCentavos),
      note: `${summary.serviceTransactionCount + summary.tireTransactionCount + summary.canteenTransactionCount} transaction(s)`,
      icon: 'trend',
    },
    {
      label: 'Monthly purchases',
      value: formatPeso(summary.purchaseCentavos),
      note: 'Tire and canteen stock',
      icon: 'expenses',
    },
    {
      label: 'Monthly expenses',
      value: formatPeso(summary.expenseCentavos),
      note: 'Including finalized payroll',
      icon: 'reports',
    },
    {
      label: 'Estimated net',
      value: formatPeso(summary.estimatedNetCentavos),
      note: 'Gross profit less expenses',
      icon: 'peso',
    },
  ];
}

function DashboardAnalytics({ report, onNavigate }) {
  const serviceLeaders = rankTransactionItems(report.transactions.serviceSales, false);
  const tireLeaders = rankTransactionItems(report.transactions.tireSales, true);
  const canteenLeaders = rankTransactionItems(report.transactions.canteenSales, true);
  const expenseLeaders = rankExpenses(report.expenses);
  const operationalAlerts = report.operationalAlerts ?? {
    equipmentAttention: [],
    tireLowStock: [],
    canteenLowStock: [],
  };

  return (
    <div className="mt-6 grid gap-6 xl:grid-cols-12">
      <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm xl:col-span-8 sm:p-6">
        <SectionHeading
          detail="Daily sales, purchases, and operating expenses for the current month."
          title="Monthly cash activity"
        />
        <TrendChart days={report.dailyBreakdown} />
      </section>

      <section className="self-start rounded-2xl border border-blue-100 bg-white p-5 shadow-sm xl:col-span-4 sm:p-6">
        <SectionHeading detail="Where this month’s revenue came from." title="Sales mix" />
        <SalesMix summary={report.summary} />
      </section>

      <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm xl:col-span-3 sm:p-6">
        <SectionHeading detail="Ranked by recorded sales value." title="Top 5 services" />
        <RankingList emptyLabel="No service sales this month" items={serviceLeaders} />
      </section>

      <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm xl:col-span-3 sm:p-6">
        <SectionHeading detail="Ranked by units sold, then sales value." title="Top 5 tires" />
        <RankingList emptyLabel="No tire sales this month" items={tireLeaders} showUnits />
      </section>

      <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm xl:col-span-3 sm:p-6">
        <SectionHeading detail="Best-selling snacks and drinks this month." title="Top 5 canteen" />
        <RankingList emptyLabel="No canteen sales this month" items={canteenLeaders} showUnits />
      </section>

      <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm xl:col-span-3 sm:p-6">
        <SectionHeading detail="Largest operating-expense categories." title="Expense breakdown" />
        <RankingList emptyLabel="No expenses this month" items={expenseLeaders} />
      </section>

      <OperationalCard
        detail="Damaged, under repair, or needing attention."
        emptyLabel="All active equipment is in good condition"
        icon="equipment"
        items={operationalAlerts.equipmentAttention}
        onView={() => onNavigate('Equipment')}
        title="Equipment needing attention"
        type="equipment"
      />
      <OperationalCard
        detail="Products at or below their alert level."
        emptyLabel="No tires are currently low in stock"
        icon="tires"
        items={operationalAlerts.tireLowStock}
        onView={() => onNavigate('Tires & inventory')}
        title="Low-stock tires"
        type="stock"
      />
      <OperationalCard
        detail="Canteen products ready for restocking."
        emptyLabel="No canteen products are currently low"
        icon="canteen"
        items={operationalAlerts.canteenLowStock}
        onView={() => onNavigate('Canteen')}
        title="Low-stock canteen"
        type="stock"
      />
    </div>
  );
}

function OperationalCard({ title, detail, icon, items, emptyLabel, type, onView }) {
  return (
    <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm xl:col-span-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700">
          <AppIcon className="h-[1.1rem] w-[1.1rem]" name={icon} />
        </span>
        <button
          className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-50"
          onClick={onView}
          type="button"
        >
          View all
        </button>
      </div>
      <div className="mt-3">
        <SectionHeading detail={detail} title={title} />
      </div>
      {items.length > 0 ? (
        <div className="mt-5 divide-y divide-slate-100">
          {items.slice(0, 5).map((item, index) => (
            <div
              className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              key={item.id}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">
                  <span className="mr-2 text-slate-300">{index + 1}</span>
                  {item.name}
                  {item.size ? ` · ${item.size}` : ''}
                </p>
                <p className="mt-1 truncate text-xs text-slate-400">
                  {type === 'equipment'
                    ? `${item.assetCode} · ${item.categoryName}`
                    : item.category}
                </p>
              </div>
              {type === 'equipment' ? (
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[0.68rem] font-bold ${conditionTone(item.condition)}`}
                >
                  {formatCondition(item.condition)}
                </span>
              ) : (
                <div className="shrink-0 text-right">
                  <p
                    className={`text-sm font-bold ${item.stockQuantity === 0 ? 'text-red-600' : 'text-amber-700'}`}
                  >
                    {item.stockQuantity} left
                  </p>
                  <p className="mt-0.5 text-[0.68rem] text-slate-400">
                    Alert at {item.lowStockThreshold}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-emerald-200 bg-emerald-50 px-4 py-7 text-center text-sm font-medium text-emerald-700">
          <AppIcon className="mx-auto mb-2 h-5 w-5" name="check" />
          {emptyLabel}
        </div>
      )}
    </section>
  );
}

function SectionHeading({ title, detail }) {
  return (
    <div>
      <h3 className="font-bold tracking-tight text-blue-950">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-500">{detail}</p>
    </div>
  );
}

function TrendChart({ days }) {
  const entries = [...days].reverse().slice(-14);
  const fields = [
    ['totalSalesCentavos', 'Sales', '#0870bd'],
    ['purchaseCentavos', 'Purchases', '#059669'],
    ['expenseCentavos', 'Expenses', '#d97706'],
  ];
  const maxValue = Math.max(1, ...entries.flatMap((day) => fields.map(([field]) => day[field])));
  const chartWidth = 720;
  const left = 72;
  const top = 16;
  const right = 16;
  const usableWidth = chartWidth - left - right;
  const usableHeight = 180;
  const bottom = top + usableHeight;
  const plotPoints = (field) =>
    entries.map((day, index) => {
      const x = left + (index * usableWidth) / Math.max(entries.length - 1, 1);
      const y = top + usableHeight - (day[field] / maxValue) * usableHeight;
      return { ...day, x, y };
    });
  const pointString = (field) =>
    plotPoints(field)
      .map(({ x, y }) => `${x},${y}`)
      .join(' ');
  const salesArea = `${left},${bottom} ${pointString('totalSalesCentavos')} ${chartWidth - right},${bottom}`;

  return (
    <div className="mt-5">
      <div className="flex flex-wrap gap-2">
        {fields.map(([field, label, color]) => (
          <span
            className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50/70 px-3 py-2 text-xs font-semibold text-slate-600"
            key={label}
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
            {label}
            <strong className="text-blue-950">
              {formatCompactPeso(entries.reduce((total, day) => total + day[field], 0))}
            </strong>
          </span>
        ))}
      </div>
      <div className="mt-4 overflow-hidden rounded-xl border border-blue-100 bg-gradient-to-b from-white to-blue-50/70 p-2">
        <svg aria-label="Monthly sales, purchases, and expenses trend" viewBox="0 0 720 250">
          <defs>
            <linearGradient id="sales-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#38a8f8" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#dbeeff" stopOpacity="0.04" />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3].map((line) => {
            const y = top + (line * usableHeight) / 3;
            const value = maxValue * (1 - line / 3);
            return (
              <g key={line}>
                <text fill="#7c8c9c" fontSize="11" textAnchor="end" x={left - 12} y={y + 4}>
                  {formatCompactPeso(Math.round(value))}
                </text>
                <line
                  stroke="#b9ddff"
                  strokeDasharray="4 7"
                  strokeWidth="1"
                  x1={left}
                  x2={chartWidth - right}
                  y1={y}
                  y2={y}
                />
              </g>
            );
          })}
          <polygon fill="url(#sales-area)" points={salesArea} />
          {fields.map(([field, label, color]) => (
            <polyline
              fill="none"
              key={field}
              points={pointString(field)}
              stroke={color}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={label === 'Sales' ? 3.5 : 2.5}
            />
          ))}
          {fields.flatMap(([field, label, color]) =>
            plotPoints(field).map((point) => (
              <circle
                cx={point.x}
                cy={point.y}
                fill="white"
                key={`${field}-${point.businessDate}`}
                r={label === 'Sales' ? 3.5 : 2.5}
                stroke={color}
                strokeWidth="2"
              >
                <title>{`${label} · ${formatChartDate(point.businessDate)} · ${formatPeso(point[field])}`}</title>
              </circle>
            )),
          )}
          {entries.map((day, index) => {
            if (index % 3 !== 0 && index !== entries.length - 1) return null;
            const x = left + (index * usableWidth) / Math.max(entries.length - 1, 1);
            return (
              <text
                fill="#7c8c9c"
                fontSize="11"
                key={day.businessDate}
                textAnchor="middle"
                x={x}
                y={225}
              >
                {formatChartDate(day.businessDate)}
              </text>
            );
          })}
        </svg>
      </div>
      <p className="mt-2 text-xs text-slate-400">
        Showing the latest 14 days in the current month.
      </p>
    </div>
  );
}

function SalesMix({ summary }) {
  const sources = [
    ['Services', summary.serviceSalesCentavos, '#0870bd'],
    ['Tires', summary.tireSalesCentavos, '#7c3aed'],
    ['Canteen', summary.canteenSalesCentavos, '#f59e0b'],
  ];
  const total = summary.totalSalesCentavos;
  const safeTotal = Math.max(total, 1);
  const serviceEnd = (sources[0][1] / safeTotal) * 100;
  const tireEnd = serviceEnd + (sources[1][1] / safeTotal) * 100;
  const background = total
    ? `conic-gradient(${sources[0][2]} 0 ${serviceEnd}%, ${sources[1][2]} ${serviceEnd}% ${tireEnd}%, ${sources[2][2]} ${tireEnd}% 100%)`
    : '#dbeeff';

  return (
    <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row xl:flex-col 2xl:flex-row">
      <div className="relative h-40 w-40 shrink-0 rounded-full" style={{ background }}>
        <div className="absolute inset-5 grid place-items-center rounded-full bg-white text-center shadow-inner">
          <div>
            <p className="text-xs font-semibold text-slate-400">Total sales</p>
            <p className="mt-1 text-lg font-bold text-blue-950">
              {formatCompactPeso(summary.totalSalesCentavos)}
            </p>
          </div>
        </div>
      </div>
      <div className="w-full space-y-3">
        {sources.map(([label, value, color]) => (
          <div className="flex items-center justify-between gap-3 text-sm" key={label}>
            <span className="flex items-center gap-2 font-medium text-slate-600">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
              {label}
            </span>
            <span className="font-bold text-blue-950">{formatPeso(value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RankingList({ items, emptyLabel, showUnits = false }) {
  const max = Math.max(1, ...items.map((item) => item.valueCentavos));
  if (items.length === 0) {
    return (
      <div className="mt-5 rounded-xl border border-dashed border-blue-200 bg-blue-50/60 px-4 py-8 text-center text-sm font-medium text-blue-500">
        {emptyLabel}
      </div>
    );
  }
  return (
    <div className="mt-5 space-y-4">
      {items.map((item, index) => (
        <div key={item.name}>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-semibold text-slate-700">
              <span className="mr-2 text-blue-400">{index + 1}</span>
              {item.name}
            </span>
            <span className="shrink-0 font-bold text-blue-950">
              {showUnits ? `${item.units} sold · ` : ''}
              {formatPeso(item.valueCentavos)}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-blue-50">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-700 to-blue-400"
              style={{ width: `${Math.max(8, (item.valueCentavos / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function rankTransactionItems(transactions, prioritizeUnits) {
  const totals = new Map();
  for (const transaction of transactions.filter((entry) => entry.status === 'ACTIVE')) {
    for (const item of transaction.items) {
      const current = totals.get(item.name) ?? { name: item.name, units: 0, valueCentavos: 0 };
      current.units += item.quantity ?? 1;
      current.valueCentavos += item.amountCentavos;
      totals.set(item.name, current);
    }
  }
  return [...totals.values()]
    .sort((leftItem, rightItem) =>
      prioritizeUnits
        ? rightItem.units - leftItem.units || rightItem.valueCentavos - leftItem.valueCentavos
        : rightItem.valueCentavos - leftItem.valueCentavos,
    )
    .slice(0, 5);
}

function rankExpenses(expenses) {
  const totals = new Map();
  for (const expense of expenses.filter((entry) => entry.status === 'ACTIVE')) {
    const current = totals.get(expense.categoryName) ?? {
      name: expense.categoryName,
      valueCentavos: 0,
    };
    current.valueCentavos += expense.amountCentavos;
    totals.set(expense.categoryName, current);
  }
  return [...totals.values()]
    .sort((leftItem, rightItem) => rightItem.valueCentavos - leftItem.valueCentavos)
    .slice(0, 5);
}

function formatCondition(condition) {
  return (
    {
      DAMAGED: 'Damaged',
      UNDER_REPAIR: 'Under repair',
      NEEDS_ATTENTION: 'Needs attention',
    }[condition] ?? condition
  );
}

function conditionTone(condition) {
  if (condition === 'DAMAGED') return 'bg-red-50 text-red-700';
  if (condition === 'UNDER_REPAIR') return 'bg-violet-50 text-violet-700';
  return 'bg-amber-50 text-amber-700';
}

function currentMonthRange(dateValue) {
  const [year, month] = dateValue.split('-').map(Number);
  const end = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  return { start: `${year}-${String(month).padStart(2, '0')}-01`, end };
}

function formatChartDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function formatCompactPeso(centavos) {
  const pesos = centavos / 100;
  return `₱${new Intl.NumberFormat('en-PH', { notation: 'compact', maximumFractionDigits: 1 }).format(pesos)}`;
}

function todayLocal() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.valueOf() - offset).toISOString().slice(0, 10);
}

function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function findNavigationItem(moduleName) {
  for (const section of navigation) {
    const item = section.items.find((entry) => entry.name === moduleName);
    if (item) return { ...item, section: section.label };
  }
  return { name: moduleName, icon: 'dashboard', section: 'Workspace' };
}

function formatHeaderDate(date) {
  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
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
