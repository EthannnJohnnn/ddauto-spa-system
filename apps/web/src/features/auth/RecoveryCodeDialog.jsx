export function RecoveryCodeDialog({ code, onContinue }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <section
        aria-labelledby="recovery-code-title"
        aria-modal="true"
        className="w-full max-w-xl rounded-3xl bg-white p-7 shadow-2xl sm:p-9"
        role="dialog"
      >
        <div className="print-hide">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-700">
            Save this now
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950" id="recovery-code-title">
            One-time recovery code
          </h2>
          <p className="mt-3 leading-7 text-slate-600">
            This code is shown only once. Print it and keep it somewhere private—not beside the
            computer.
          </p>
        </div>

        <div className="recovery-code-print mt-6 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-5 text-center">
          <p className="hidden text-lg font-bold print:block">DD Auto Spa password recovery</p>
          <code className="break-all text-lg font-bold tracking-wider text-slate-950 sm:text-xl">
            {code}
          </code>
          <p className="mt-3 hidden text-sm print:block">
            Keep this code private. It can reset the owner password once.
          </p>
        </div>

        <div className="print-hide mt-7 grid gap-3 sm:grid-cols-2">
          <button
            className="rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50"
            onClick={() => window.print()}
            type="button"
          >
            Print recovery code
          </button>
          <button
            className="rounded-xl bg-teal-700 px-4 py-3 font-semibold text-white hover:bg-teal-800"
            onClick={onContinue}
            type="button"
          >
            I saved the code
          </button>
        </div>
      </section>
    </div>
  );
}
