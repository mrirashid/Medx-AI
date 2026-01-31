import type { TooltipProps } from 'recharts'
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    LabelList,
    ResponsiveContainer,
    Tooltip as RTooltip,
    XAxis,
    YAxis,
} from 'recharts'
import { useLanguage } from '../../i18n/LanguageProvider'

type Props = {
  values: number[]
  labels: string[]
  onBarClick?: (index: number, label: string, value: number) => void
}

export default function AgeDistributionChart({ values, labels, onBarClick }: Props) {
  const { t } = useLanguage()
  const data = labels.map((label, i) => ({ label, value: values[i] ?? 0 }))
  const total = data.reduce((s, d) => s + (d.value || 0), 0)

  if (total === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-slate-200 bg-white">
        <div className="text-sm text-slate-500">{t('No data available')}</div>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="label"
          tick={{ fill: '#64748b', fontSize: 12 }}
          interval={0}
          height={40}
          tickLine={false}
          axisLine={{ stroke: '#e6edf3' } as any}
          label={{ value: t('Age Group'), position: 'insideBottom', offset: -10, style: { fill: '#475569', fontSize: 13 } }}
        />
        <YAxis
          tick={{ fill: '#64748b', fontSize: 12 }}
          allowDecimals={false}
          axisLine={{ stroke: '#e6edf3' } as any}
          label={{ value: t('Total'), angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#475569', fontSize: 13 } }}
        />
        <RTooltip
          cursor={{ fill: 'rgba(59,130,246,0.08)' }}
          content={(props: TooltipProps<number, string>) => {
            const { active, payload } = props as any
            if (!active || !payload || !payload.length) return null
            const p = payload[0]
            const label = String((p.payload as any).label)
            const value = p.value as number
            return (
              <div className="rounded-md border border-slate-200 bg-white px-3 py-2 shadow-md">
                <div className="text-[11px] text-slate-500">{label}</div>
                <div className="text-sm font-semibold text-slate-900">{value}</div>
              </div>
            )
          }}
        />
        <Bar
          dataKey="value"
          name={t('Patients') ?? 'Patients'}
          fill="#3b82f6"
          radius={[6, 6, 0, 0]}
          isAnimationActive
          animationDuration={600}
        >
          {data.map((entry, index) => (
            <Cell
              key={`bar-${index}`}
              fill="#3b82f6"
              className={onBarClick ? 'cursor-pointer' : undefined}
              onClick={() => onBarClick?.(index, entry.label, entry.value)}
            />
          ))}
          <LabelList
            dataKey="value"
            position="top"
            formatter={(val: any) => (val > 0 ? String(val) : '')}
            style={{ fill: '#0f172a', fontSize: 12, fontWeight: 700 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
