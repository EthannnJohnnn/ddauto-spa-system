export function BrandMark({ compact = false, inverted = false }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-teal-600 text-lg font-black text-white shadow-lg shadow-teal-600/20">
        DD
      </div>
      {!compact && (
        <div>
          <p className={`font-bold tracking-tight ${inverted ? 'text-white' : 'text-slate-950'}`}>
            DD Auto Spa
          </p>
          <p className={`text-xs font-medium ${inverted ? 'text-slate-400' : 'text-slate-500'}`}>
            Management System
          </p>
        </div>
      )}
    </div>
  );
}
