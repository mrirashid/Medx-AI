import type { ReactNode } from 'react'

export function StatsCard({ title, value, icon }: { title: string; value: number | string; icon?: ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="text-sm text-slate-500">{title}</div>
        {icon ? (
          <div className="grid h-8 w-8 place-items-center rounded-md bg-indigo-50 text-indigo-600">{icon}</div>
        ) : null}
      </div>
      <div className="mt-3 text-3xl font-semibold text-slate-900">{value}</div>
    </div>
  )
}
