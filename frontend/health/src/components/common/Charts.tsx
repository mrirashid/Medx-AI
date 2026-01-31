import { useMemo, useState } from 'react'
import type { TooltipProps } from 'recharts'
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Legend as RLegend,
    Tooltip as RTooltip,
    XAxis,
    YAxis,
} from 'recharts'
import { useLanguage } from '../../i18n/LanguageProvider'

type BarChartMiniProps = {
  values: number[]
  labels: string[]
  onBarClick?: (index: number, label: string, value: number) => void
}

export function BarChartMini({ values, labels, onBarClick }: BarChartMiniProps) {
  const { t } = useLanguage()
  const data = useMemo(() => labels.map((label, i) => ({ label, value: values[i] ?? 0 })), [labels, values])
  const total = useMemo(() => data.reduce((s, d) => s + (d.value || 0), 0), [data])
  const hasData = total > 0

  return (
    <div className="h-64 w-full">
      {!hasData ? (
        <div className="flex h-full items-center justify-center rounded-md border border-slate-200 bg-white">
          <div className="text-sm text-slate-500">{t('No data available')}</div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 12 }} interval={0} height={32}>
              {/* x-axis label via Tailwind overlay */}
            </XAxis>
            <YAxis tick={{ fill: '#64748b', fontSize: 12 }} allowDecimals={false}>
            </YAxis>
            <RTooltip
              cursor={{ fill: 'rgba(99,102,241,0.08)' }}
              content={(props: TooltipProps<number, string>) => {
                const { active, payload } = props as any
                if (!active || !payload || !payload.length) return null
                const p = payload[0]
                const label = String((p.payload as any).label)
                const value = p.value as number
                return (
                  <div className="rounded-md border border-slate-200 bg-white px-3 py-2 shadow-sm">
                    <div className="text-[11px] text-slate-500">{label}</div>
                    <div className="text-sm font-semibold text-slate-900">{value}</div>
                  </div>
                )
              }}
            />
            <RLegend verticalAlign="top" height={24} formatter={() => t('Patients') ?? 'Patients'} wrapperStyle={{ color: '#475569', fontSize: 12 }} />
            <Bar dataKey="value" name={t('Patients') ?? 'Patients'} fill="#6366F1" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={600}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill="#6366F1"
                  onClick={() => onBarClick?.(index, entry.label, entry.value)}
                  className={onBarClick ? 'cursor-pointer' : undefined}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
      {/* Axis labels overlay for clarity */}
      <div className="pointer-events-none mt-1 flex items-center justify-between text-xs text-slate-500">
        <span className="sr-only">{t('Patients')}</span>
        <span className="mx-auto">{t('Age Group')}</span>
      </div>
    </div>
  )
}

export function DonutChart({ value, total, color = '#10b981' }: { value: number; total: number; color?: string }) {
  const { t } = useLanguage()
  const hasData = total > 0
  const data = [
    { label: 'Value', value },
    { label: 'Remaining', value: Math.max(0, total - value) },
  ]
  return (
    <div className="flex h-64 w-full items-center justify-center">
      {!hasData ? (
        <div className="flex h-48 w-48 items-center justify-center rounded-full border border-slate-200 bg-white">
          <div className="text-sm text-slate-500">{t('No data')}</div>
        </div>
      ) : (
        <PieChart width={192} height={192}>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            cx={96}
            cy={96}
            innerRadius={60}
            outerRadius={90}
            startAngle={90}
            endAngle={-270}
            isAnimationActive
            animationDuration={600}
          >
            <Cell fill={color} />
            <Cell fill="#e5e7eb" />
          </Pie>
        </PieChart>
      )}
    </div>
  )
}

type StatusDonutProps = {
  values: number[]
  colors?: string[]
  labels?: string[]
  hoverIndex?: number | null
  onHoverIndexChange?: (i: number | null) => void
}

export function StatusDonut({ values, colors, labels = ['Critical', 'Observation', 'Stable'], hoverIndex, onHoverIndexChange, }: StatusDonutProps) {
  const { t } = useLanguage()
  const defaultColors = ['#ef4444', '#f59e0b', '#10b981']
  const cols = (colors && colors.length === values.length ? colors : defaultColors).slice(0, values.length)
  const data = useMemo(() => labels.map((label, i) => ({ label, value: values[i] ?? 0, color: cols[i] })), [labels, values, cols])
  const total = useMemo(() => data.reduce((s, d) => s + (d.value || 0), 0), [data])
  const hasData = total > 0
  const [internalActive, setInternalActive] = useState<number | null>(null)
  const controlled = hoverIndex !== undefined
  const activeIndex = controlled ? hoverIndex : internalActive
  const centerTitle = activeIndex != null && hasData ? data[activeIndex].label : t('Total')
  const centerValue = activeIndex != null && hasData
    ? `${data[activeIndex].value} • ${Math.round((data[activeIndex].value / total) * 100)}%`
    : String(total)

  return (
    <div className="relative mx-auto flex h-64 w-full max-w-[22rem] items-center justify-center">
      {!hasData ? (
        <div className="flex h-48 w-48 items-center justify-center rounded-full border border-slate-200 bg-white">
          <div className="text-sm text-slate-500">{t('No data')}</div>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={256}>
            <PieChart>
              <RTooltip
                content={(props: TooltipProps<number, string>) => {
                  const { active, payload } = props as any
                  if (!active || !payload || !payload.length) return null
                  const p = payload[0]
                  const d = p.payload as { label: string; value: number }
                  return (
                    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 shadow-sm">
                      <div className="text-[11px] text-slate-500">{d.label}</div>
                      <div className="text-sm font-semibold text-slate-900">{d.value} ({Math.round((d.value / Math.max(1, total)) * 100)}%)</div>
                    </div>
                  )
                }}
              />
              <RLegend verticalAlign="bottom" height={28} formatter={(_: string, _entry: unknown, idx?: number) => (
                // Keep legend compact; Dashboard also renders a custom list
                `${labels[idx ?? 0]}`
              )} wrapperStyle={{ color: '#475569', fontSize: 12 }} />
              <Pie
                data={data}
                dataKey="value"
                nameKey="label"
                innerRadius={70}
                outerRadius={100}
                paddingAngle={2}
                startAngle={90}
                endAngle={-270}
                isAnimationActive
                animationDuration={650}
                onMouseEnter={(_slice: any, idx: number) => {
                  if (!controlled) setInternalActive(idx)
                  onHoverIndexChange?.(idx)
                }}
                onMouseLeave={() => {
                  if (!controlled) setInternalActive(null)
                  onHoverIndexChange?.(null)
                }}
              >
                {data.map((d) => (
                  <Cell key={d.label} fill={d.color} stroke="#ffffff" strokeWidth={1} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          {/* center overlay */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-white text-center shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]">
              <div className="text-[11px] font-medium text-slate-500">{centerTitle}</div>
              <div className="text-lg font-semibold text-slate-900">{centerValue}</div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
