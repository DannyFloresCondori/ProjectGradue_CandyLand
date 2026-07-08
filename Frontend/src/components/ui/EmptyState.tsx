import type { FC, ReactNode } from 'react'
import { InboxIcon } from '@heroicons/react/24/outline'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export const EmptyState: FC<EmptyStateProps> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="mb-4 rounded-full bg-gray-100 p-4 text-gray-400">
      {icon ?? <InboxIcon className="h-10 w-10" />}
    </div>
    <h3 className="text-sm font-medium text-gray-900">{title}</h3>
    {description && <p className="mt-1 text-sm text-gray-500 max-w-xs">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
)
