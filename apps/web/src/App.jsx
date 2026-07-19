const plannedAreas = ['Service sales', 'Tire inventory', 'Canteen', 'Payroll', 'Reports'];

export function App() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-16 lg:px-8">
        <section className="w-full overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl shadow-teal-950/40">
          <div className="grid gap-12 p-8 md:p-12 lg:grid-cols-[1.25fr_0.75fr] lg:p-16">
            <div>
              <p className="mb-5 inline-flex rounded-full border border-teal-400/30 bg-teal-400/10 px-3 py-1 text-sm font-medium text-teal-300">
                Phase 1 · Foundation
              </p>
              <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                DD Auto Spa management system
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
                The local application foundation is ready. Business features will be added one
                reviewed phase at a time.
              </p>
              <div className="mt-8 flex items-center gap-3 text-sm text-slate-400">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.8)]" />
                Designed to run privately on the owner&apos;s computer
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-6">
              <p className="text-sm font-semibold uppercase tracking-widest text-slate-400">
                Planned modules
              </p>
              <ul className="mt-5 space-y-3">
                {plannedAreas.map((area) => (
                  <li
                    className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-slate-200"
                    key={area}
                  >
                    <span className="text-teal-400">✓</span>
                    {area}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
