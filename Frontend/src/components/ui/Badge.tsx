import { cn } from '@/lib/utils'
import type { FC, ReactNode } from 'react'

type Variant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'pink'

interface BadgeProps {
  children: ReactNode
  variant?: Variant
  className?: string
}

const variants: Record<Variant, string> = {
  default: 'bg-gray-100 text-gray-700',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  error:   'bg-red-50 text-red-700',
  info:    'bg-blue-50 text-blue-700',
  pink:    'bg-primary-50 text-primary-700',
}

export const Badge: FC<BadgeProps> = ({ children, variant = 'default', className }) => (
  <span className={cn(
    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
    variants[variant], className
  )}>
    {children}
  </span>
)
