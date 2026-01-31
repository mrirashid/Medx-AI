import { useState } from 'react'
import { useLanguage } from '../../i18n/LanguageProvider'

type Option = { label: string; value: string }

type ChartContainerProps = {
  title: string
  children: React.ReactNode
  options?: Option[]
  defaultRange?: string
  value?: string
  onRangeChange?: (value: string) => void
  className?: string
  heightClass?: string
  rightSlot?: React.ReactNode
}

export default function ChartContainer({
  title,
  children,
  options,
  defaultRange = 'month',
  value,
  onRangeChange,
  className = '',
  heightClass = 'h-[420px]',
  rightSlot,
}: ChartContainerProps) {
  const { t } = useLanguage()
  const defaultOptions: Option[] = [
    { label: t('Today'), value: 'today' },
    { label: t('Week'), value: 'week' },
    { label: t('Month'), value: 'month' },
    { label: t('Year'), value: 'year' },
  ]

  options = options ?? defaultOptions

  const [range, setRange] = useState(defaultRange)
  const current = typeof (value as any) === 'string' ? (value as string) : range

  return (
    <div className={`flex flex-col rounded-2xl bg-white shadow-md ring-1 ring-slate-200 transition-all duration-200 ${className}`}>
      <div className="flex items-center justify-between gap-4 rounded-t-2xl border-b border-slate-200 px-6 py-4">
        <div className="text-xl font-semibold text-gray-800">{title}</div>
        <div className="flex items-center gap-3">
          {rightSlot}
          {options.length > 0 && (
            <select
              value={current}
              onChange={(e) => {
                setRange(e.target.value)
                onRangeChange?.(e.target.value)
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none transition-all hover:border-slate-400 focus:ring-2 focus:ring-blue-500"
            >
              {options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
      <div className={`relative ${heightClass} p-6`}>{children}</div>
    </div>
  )
}
