import { cn } from '@/lib/utils'
import type { FC, ReactNode } from 'react'
import { useEffect, useRef } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

const openModals: { token: object; close: () => void }[] = []

const handleModalKeyDown = (event: KeyboardEvent) => {
  if (event.key !== 'Escape') return

  openModals.at(-1)?.close()
}

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}

const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl', '2xl': 'max-w-6xl' }

export const Modal: FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  const modalToken = useRef({}).current
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!isOpen) return

    openModals.push({
      token: modalToken,
      close: () => onCloseRef.current(),
    })
    if (openModals.length === 1) {
      document.addEventListener('keydown', handleModalKeyDown)
    }

    return () => {
      const index = openModals.findLastIndex((modal) => modal.token === modalToken)
      if (index !== -1) openModals.splice(index, 1)
      if (openModals.length === 0) {
        document.removeEventListener('keydown', handleModalKeyDown)
      }
    }
  }, [isOpen, modalToken])

  if (!isOpen) return null

  const titleText = typeof title === 'string' ? title : undefined

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-2 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" onClick={onClose} aria-hidden="true" />
      <div
        className={cn('relative w-full max-w-full rounded-xl bg-white shadow-xl max-h-[95vh] flex flex-col overflow-hidden', sizes[size])}
        role="dialog" aria-modal="true" aria-label={titleText}
      >
        {title && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4 border-b border-gray-100 shrink-0">
            <div className="min-w-0 flex-1">
              {typeof title === 'string' ? <h2 className="text-base font-semibold text-gray-900">{title}</h2> : title}
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
              aria-label="Cerrar"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="flex-1 min-h-0 overflow-x-hidden overflow-y-auto p-4 sm:p-5">{children}</div>
      </div>
    </div>
  )
}
