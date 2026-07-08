import { cn } from '@/lib/utils'
import type { FC, ReactNode, HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export const Card: FC<CardProps> = ({ children, className, ...props }) => (
  <div className={cn('bg-white rounded-lg border border-gray-200 shadow-sm', className)} {...props}>
    {children}
  </div>
)

interface CardHeaderProps { children: ReactNode; className?: string }
export const CardHeader: FC<CardHeaderProps> = ({ children, className }) => (
  <div className={cn('px-5 py-4 border-b border-gray-100', className)}>{children}</div>
)

interface CardBodyProps { children: ReactNode; className?: string }
export const CardBody: FC<CardBodyProps> = ({ children, className }) => (
  <div className={cn('px-5 py-4', className)}>{children}</div>
)

interface CardFooterProps { children: ReactNode; className?: string }
export const CardFooter: FC<CardFooterProps> = ({ children, className }) => (
  <div className={cn('px-5 py-3 border-t border-gray-100 bg-gray-50 rounded-b-lg', className)}>{children}</div>
)
