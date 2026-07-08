import { cn } from '@/lib/utils'
import type { FC } from 'react'

interface SpinnerProps { size?: 'sm' | 'md' | 'lg'; className?: string }

const sizes = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' }

export const Spinner: FC<SpinnerProps> = ({ size = 'md', className }) => (
  <svg
    className={cn('animate-spin text-primary-500', sizes[size], className)}
    viewBox="0 0 24 24" fill="none" aria-label="Cargando"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
  </svg>
)

export const PageSpinner: FC = () => (
  <div className="flex h-64 items-center justify-center">
    <Spinner size="lg" />
  </div>
)
