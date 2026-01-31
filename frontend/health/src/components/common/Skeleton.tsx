export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-200 ${className}`}>
      <div className="mb-4 h-4 w-24 rounded bg-slate-200" />
      <div className="h-8 w-36 rounded bg-slate-200" />
    </div>
  )
}

export function ChartSkeleton({ className = '', heightClass = 'h-[420px]' }: { className?: string; heightClass?: string }) {
  return (
    <div className={`animate-pulse rounded-2xl bg-white shadow-md ring-1 ring-slate-200 ${className}`}>
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <div className="h-5 w-40 rounded bg-slate-200" />
        <div className="h-9 w-24 rounded bg-slate-200" />
      </div>
      <div className={`p-6 ${heightClass}`}>
        <div className="h-full w-full rounded-xl bg-slate-100" />
      </div>
    </div>
  )
}
