import { cn } from '@/lib/utils'
import type { ButtonHTMLAttributes, FC, ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

const buttonVariants = cva(
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:   'bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700',
        secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 active:bg-gray-100',
        ghost:     'text-gray-700 hover:bg-gray-100 active:bg-gray-200',
        danger:    'bg-red-500 text-white hover:bg-red-600 active:bg-red-700',
        link:      'text-primary-600 underline-offset-4 hover:underline',
      },
      size: {
        sm:  'h-8 px-3 text-xs',
        md:  'h-9 px-4',
        lg:  'h-10 px-6',
        icon:'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
)

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  children: ReactNode
  isLoading?: boolean
}

export const Button: FC<ButtonProps> = ({ children, variant, size, isLoading, className, disabled, ...props }) => (
  <button
    className={cn(buttonVariants({ variant, size }), className)}
    disabled={disabled || isLoading}
    {...props}
  >
    {isLoading && (
      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
    )}
    {children}
  </button>
)
