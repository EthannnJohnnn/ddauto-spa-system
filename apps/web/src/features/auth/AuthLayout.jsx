import { BrandMark } from '../../components/BrandMark.jsx';

export function AuthLayout({ eyebrow, title, description, children }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-100 px-4 py-8 sm:px-6 lg:grid lg:place-items-center lg:py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(13,148,136,0.12),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(37,99,235,0.08),transparent_30%)]" />
      <section className="relative mx-auto grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-300/60 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <BrandMark inverted />
          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-teal-300">
              Local and private
            </p>
            <h2 className="text-4xl font-semibold leading-tight tracking-tight">
              One place for the day-to-day work.
            </h2>
            <p className="mt-5 max-w-sm leading-7 text-slate-300">
              Sales, stock, expenses, payroll, and reports will stay on the owner&apos;s computer.
            </p>
          </div>
          <p className="text-sm text-slate-500">DD Auto Spa · Offline-first system</p>
        </div>

        <div className="p-7 sm:p-10 lg:p-12">
          <div className="mb-10 lg:hidden">
            <BrandMark />
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 max-w-lg leading-7 text-slate-600">{description}</p>
          <div className="mt-8">{children}</div>
        </div>
      </section>
    </main>
  );
}
