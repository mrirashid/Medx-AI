import type { TooltipProps } from 'recharts'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RTooltip } from 'recharts'

type Props = {
  values: number[]
  labels?: string[]
  colors?: string[]
  hoverIndex?: number | null
  onHoverIndexChange?: (i: number | null) => void
}

const DEFAULT_LABELS = ['Critical', 'Observation', 'Stable']
const DEFAULT_COLORS = ['#EF4444', '#F59E0B', '#10B981']

export default function PatientStatusDonut({ values, labels = DEFAULT_LABELS, colors = DEFAULT_COLORS, hoverIndex, onHoverIndexChange, }: Props) {
  const cols = (colors.length === values.length ? colors : DEFAULT_COLORS).slice(0, values.length)
  const data = labels.map((label, i) => ({ label, value: values[i] ?? 0, color: cols[i] }))
  const total = data.reduce((s, d) => s + (d.value || 0), 0)
  const hasData = total > 0

  const centerTitle = hoverIndex != null && hasData ? data[hoverIndex].label : 'Total'
  const centerValue = hoverIndex != null && hasData
    ? `${data[hoverIndex].value} • ${Math.round((data[hoverIndex].value / Math.max(1, total)) * 100)}%`
    : String(total)

  return (
    <div className="relative mx-auto flex h-full w-full max-w-[24rem] items-center justify-center">
      {!hasData ? (
        <div className="flex h-48 w-48 items-center justify-center rounded-full border border-slate-200 bg-white">
          <div className="text-sm text-slate-500">No data</div>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <RTooltip
                content={(props: TooltipProps<number, string>) => {
                  const { active, payload } = props as any
                  if (!active || !payload || !payload.length) return null
                  const p = payload[0]
                  const d = p.payload as { label: string; value: number }
                  const pct = Math.round((d.value / Math.max(1, total)) * 100)
                  return (
                    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-md">
                      <div className="text-[11px] text-slate-500">{d.label}</div>
                      <div className="font-semibold text-slate-900">{d.value} ({pct}%)</div>
                    </div>
                  )
                }}
              />
              <Pie
                data={data}
                dataKey="value"
                nameKey="label"
                innerRadius={60}
                outerRadius={96}
                paddingAngle={2}
                startAngle={90}
                endAngle={-270}
                isAnimationActive
                animationDuration={700}
                onMouseEnter={(_, idx) => onHoverIndexChange?.(idx)}
                onMouseLeave={() => onHoverIndexChange?.(null)}
              >
                {data.map((d) => (
                  <Cell key={d.label} fill={d.color} stroke="#ffffff" strokeWidth={1} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="flex h-22 w-22 flex-col items-center justify-center rounded-full bg-white/95 text-center shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]">
              <div className="text-[12px] font-medium text-slate-500">{centerTitle}</div>
              <div className="text-xl font-semibold text-slate-900">{centerValue}</div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
