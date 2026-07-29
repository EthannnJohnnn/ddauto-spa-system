import { BrandMark } from '../../components/BrandMark.jsx';

export function AuthLayout({ eyebrow, title, description, children }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f1f5f8] px-4 py-8 sm:px-6 lg:grid lg:place-items-center lg:py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(95,130,164,0.13),transparent_28%),radial-gradient(circle_at_88%_80%,rgba(167,189,210,0.2),transparent_28%)]" />
      <section className="relative mx-auto grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-blue-100 bg-white shadow-2xl shadow-blue-950/10 lg:grid-cols-[1fr_1fr]">
        <div className="relative hidden overflow-hidden border-r border-blue-100 bg-blue-50 p-11 lg:flex lg:flex-col lg:justify-between">
          <span className="pointer-events-none absolute -left-10 top-28 h-28 w-28 rounded-full border-[18px] border-blue-100/70" />
          <span className="pointer-events-none absolute right-10 top-14 h-12 w-12 rounded-full border-[10px] border-white" />
          <span className="pointer-events-none absolute -bottom-12 right-4 h-44 w-44 rounded-full border-[28px] border-blue-100/70" />
          <div className="relative">
            <img
              alt="DD Auto Spa"
              className="h-28 w-56 object-contain object-left"
              src="/dd-auto-spa-logo.png"
            />
            <span className="mt-3 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-3 py-1.5 text-xs font-bold text-blue-700 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-blue-500" /> Local owner workspace
            </span>
          </div>
          <div className="relative my-12">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
              Wash. Track. Grow.
            </p>
            <h2 className="mt-4 max-w-sm text-4xl font-bold leading-tight tracking-tight text-blue-950">
              The day’s work, clearly organized.
            </h2>
            <p className="mt-5 max-w-sm leading-7 text-slate-600">
              Sales, inventory, expenses, payroll, and reports stay securely on this computer.
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              {['Sales', 'Inventory', 'Payroll', 'Reports'].map((label) => (
                <span
                  className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700"
                  key={label}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
          <p className="relative text-xs font-medium text-slate-500">
            Offline-first · Private by design
          </p>
        </div>

        <div className="relative p-7 sm:p-10 lg:p-12">
          <div className="mb-10 lg:hidden">
            <BrandMark />
          </div>
          <div className="mb-10 flex items-center justify-between gap-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">{eyebrow}</p>
            <span className="hidden rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 sm:inline-flex">
              Owner only
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-blue-950 sm:text-4xl">{title}</h1>
          <p className="mt-3 max-w-lg leading-7 text-slate-600">{description}</p>
          <div className="mt-8">{children}</div>
        </div>
      </section>
    </main>
  );
}
