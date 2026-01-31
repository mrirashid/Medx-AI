import type { ReactNode } from 'react'

const colorMap: Record<string, string> = {
  Stable: 'bg-green-50 text-green-700 ring-green-600/20',
  Observation: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  Critical: 'bg-red-50 text-red-700 ring-red-600/20',
}

export default function Badge({ children }: { children: ReactNode }) {
  const cls = typeof children === 'string' ? colorMap[children] || 'bg-slate-100 text-slate-700 ring-slate-600/20' : 'bg-slate-100 text-slate-700 ring-slate-600/20'
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}>{children}</span>
}
