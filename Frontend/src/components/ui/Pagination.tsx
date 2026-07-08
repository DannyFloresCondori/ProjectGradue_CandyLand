import type { FC } from 'react'
import { Button } from './Button'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

interface PaginationProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

export const Pagination: FC<PaginationProps> = ({ page, pageSize, total, onPageChange }) => {
  const totalPages = Math.ceil(total / pageSize)
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  if (total === 0) return null

  return (
    <div className="flex items-center justify-between px-1 py-3">
      <p className="text-sm text-gray-500">
        Mostrando <span className="font-medium">{from}–{to}</span> de <span className="font-medium">{total}</span> resultados
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="secondary" size="icon"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Página anterior"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </Button>
        <span className="px-3 text-sm text-gray-700">
          {page} / {totalPages}
        </span>
        <Button
          variant="secondary" size="icon"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Página siguiente"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
