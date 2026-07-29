export function BrandMark({ compact = false, inverted = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid h-14 w-24 shrink-0 place-items-center overflow-hidden rounded-xl bg-white">
        <img
          alt="DD Auto Spa"
          className="h-full w-full scale-110 object-contain"
          src="/dd-auto-spa-logo.png"
        />
      </div>
      {!compact && (
        <div>
          <p
            className={`text-sm font-bold tracking-tight ${inverted ? 'text-white' : 'text-blue-950'}`}
          >
            Management
          </p>
          <p className={`text-xs font-medium ${inverted ? 'text-blue-100' : 'text-slate-500'}`}>
            Business System
          </p>
        </div>
      )}
    </div>
  );
}
