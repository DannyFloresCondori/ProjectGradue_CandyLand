import type { FC, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  icon: ReactNode
  trend?: { value: string; positive: boolean }
  subtitle?: string
  iconBg?: string
}

export const StatCard: FC<StatCardProps> = ({ title, value, icon, trend, subtitle, iconBg }) => (
  <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
    <div className="flex items-start justify-between">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500 truncate">{title}</p>
        <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
        {trend && (
          <p className={cn('mt-1 text-xs', trend.positive ? 'text-emerald-600' : 'text-red-600')}>
            {trend.positive ? '↑' : '↓'} {trend.value}
          </p>
        )}
        {subtitle && <p className="mt-1 text-xs text-gray-400">{subtitle}</p>}
      </div>
      <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', iconBg ?? 'bg-primary-50')}>
        <span className="text-primary-600">{icon}</span>
      </div>
    </div>
  </div>
)
