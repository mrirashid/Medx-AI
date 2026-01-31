import { useMemo } from 'react'
import { FiActivity, FiTrendingUp, FiUsers } from 'react-icons/fi'

type IconKey = 'users' | 'activity' | 'trend'

type StatCardProps = {
  title: string
  value: number | string
  icon?: IconKey | React.ReactNode
  trend?: string
  sparklineData?: number[]
  className?: string
}

function IconForKey({ icon }: { icon: IconKey }) {
  if (icon === 'users') return <FiUsers />
  if (icon === 'activity') return <FiActivity />
  return <FiTrendingUp />
}

export default function StatCard({ title, value, icon = 'trend', trend, sparklineData, className = '' }: StatCardProps) {
  const pathD = useMemo(() => {
    if (!sparklineData || sparklineData.length === 0) return ''
    const w = 120
    const h = 28
    const max = Math.max(...sparklineData, 1)
    const min = Math.min(...sparklineData, 0)
    const range = Math.max(max - min, 1)
    const step = w / (sparklineData.length - 1)
    return sparklineData
      .map((v, i) => {
        const x = i * step
        const y = h - ((v - min) / range) * h
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
      })
      .join(' ')
  }, [sparklineData])

  const renderIcon = () => {
    if (typeof icon === 'string') return <IconForKey icon={icon as IconKey} />
    return icon
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-200 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg ${className}`}
    >
      {/* Watermark removed: decorative background icon intentionally omitted */}

      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="text-sm text-gray-500">{title}</div>
          <div className="text-3xl font-semibold text-gray-900">{value}</div>
          {trend && (
            <div className={`text-sm ${trend.startsWith('-') ? 'text-red-500' : 'text-green-600'}`}>{trend}</div>
          )}
        </div>
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-blue-50 text-blue-600 shadow-sm">
          {renderIcon()}
        </div>
      </div>

      {sparklineData && sparklineData.length > 1 && (
        <div className="mt-4">
          <svg width="120" height="28" viewBox="0 0 120 28" className="overflow-visible">
            <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth="2" />
          </svg>
        </div>
      )}
    </div>
  )
}
