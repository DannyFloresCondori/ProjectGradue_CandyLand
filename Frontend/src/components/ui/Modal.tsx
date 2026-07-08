import { cn } from '@/lib/utils'
import type { FC, ReactNode } from 'react'
import { useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}

const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl', '2xl': 'max-w-6xl' }

export const Modal: FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (isOpen) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const titleText = typeof title === 'string' ? title : undefined

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" onClick={onClose} aria-hidden="true" />
      <div
        className={cn('relative bg-white rounded-xl shadow-xl w-full max-h-[95vh] flex flex-col overflow-hidden', sizes[size])}
        role="dialog" aria-modal="true" aria-label={titleText}
      >
        {title && (
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 flex-shrink-0">
            <div className="min-w-0 flex-1">
              {typeof title === 'string' ? <h2 className="text-base font-semibold text-gray-900">{title}</h2> : title}
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
              aria-label="Cerrar"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="flex-1 min-h-0 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  )
}
