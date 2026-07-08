import type { FC, KeyboardEvent } from 'react'
import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { MagnifyingGlassIcon, UserCircleIcon, UserPlusIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'
import { customerService } from '@/services/customerService'
import type { Customer } from '@/types'

interface CustomerSearchProps {
  customers: Customer[]
  selected: Customer | null
  onSelect: (c: Customer | null) => void
  onQuickRegister: (prefill?: string) => void
}

/** Smart autocomplete for customer selection. Searches by CI in database or local list. */
export const CustomerSearch: FC<CustomerSearchProps> = ({ customers, selected, onSelect, onQuickRegister }) => {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  // Detect if query is a CI (4+ digits only)
  const isCiInput = query.trim().length >= 4 && /^\d+$/.test(query.trim())
  
  // Search in database for CI matches
  const { data: ciSearchResult, isLoading: ciSearchLoading } = useQuery({
    queryKey: ['customer-by-ci', query.trim()],
    queryFn: () => customerService.searchByCi(query.trim()),
    enabled: isCiInput,
    staleTime: 0,
  })

  // Priority 1: If CI search found in database, use it
  const dbMatch = isCiInput && ciSearchResult ? ciSearchResult : null
  
  // Priority 2: Local matches
  const localMatches = query.trim().length >= 1 && !dbMatch
    ? customers.filter(c =>
        c.ci?.toLowerCase().includes(query.toLowerCase()) ||
        c.fullName?.toLowerCase().includes(query.toLowerCase())
      ).sort((a, b) => {
        const aIsCiMatch = a.ci?.toLowerCase().startsWith(query.toLowerCase())
        const bIsCiMatch = b.ci?.toLowerCase().startsWith(query.toLowerCase())
        if (aIsCiMatch && !bIsCiMatch) return -1
        if (!aIsCiMatch && bIsCiMatch) return 1
        return 0
      }).slice(0, 6)
    : []

  const matches = dbMatch ? [dbMatch] : localMatches

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
        setFocused(-1)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    const total = matches.length + 1
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocused(f => (f + 1) % total) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setFocused(f => (f - 1 + total) % total) }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (focused >= 0 && focused < matches.length) {
        onSelect(matches[focused]); setQuery(''); setOpen(false); setFocused(-1)
      } else if (focused === matches.length) {
        onQuickRegister(query); setOpen(false)
      } else if (matches.length === 1) {
        onSelect(matches[0]); setQuery(''); setOpen(false)
      }
    }
    if (e.key === 'Escape') { setOpen(false); setFocused(-1) }
  }

  if (selected) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-primary-300 bg-primary-50 px-3 py-2">
        <UserCircleIcon className="h-4 w-4 flex-shrink-0 text-primary-500" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-primary-800 truncate">{selected.fullName}</p>
          <p className="text-xs text-primary-500">CI: {selected.ci}</p>
        </div>
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="cursor-pointer flex-shrink-0 rounded p-0.5 text-primary-400 hover:bg-primary-100 hover:text-primary-700 transition-colors"
          aria-label="Quitar cliente"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="relative" ref={wrapRef}>
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); setFocused(-1) }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKey}
          placeholder="CI o nombre del cliente..."
          className="h-9 w-full rounded-md border border-gray-300 bg-white pl-9 pr-3 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 hover:border-gray-400 transition-colors"
          autoComplete="off"
        />
      </div>

      {open && query.trim().length >= 1 && (
        <ul className="absolute left-0 right-0 top-full z-[70] mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {/* Loading state for CI search */}
          {ciSearchLoading && isCiInput && (
            <li className="px-3 py-3 text-center text-sm text-gray-500 bg-blue-50">
              <p className="animate-pulse">Buscando CI {query.trim()} en la base de datos...</p>
            </li>
          )}
          
          {/* Show matches */}
          {matches.map((c, i) => {
            const isCiMatch = c.ci?.toLowerCase().startsWith(query.toLowerCase())
            return (
              <li
                key={c.id}
                className={cn(
                  'flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors border-l-2',
                  focused === i ? 'bg-primary-50 border-primary-400' : 'border-transparent hover:bg-gray-50',
                  isCiMatch && 'border-l-green-500'
                )}
                onMouseEnter={() => setFocused(i)}
                onClick={() => { onSelect(c); setQuery(''); setOpen(false) }}
              >
                <UserCircleIcon className={cn('h-4 w-4 flex-shrink-0', isCiMatch ? 'text-green-600' : 'text-gray-400')} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{c.fullName}</p>
                  <p className={cn('text-xs', isCiMatch ? 'text-green-700 font-medium' : 'text-gray-500')}>
                    CI: {c.ci} {c.phone && `· ${c.phone}`}
                  </p>
                </div>
              </li>
            )
          })}
          
          {/* No results state */}
          {matches.length === 0 && !ciSearchLoading && isCiInput && (
            <li className="px-3 py-2.5 text-center text-sm text-gray-500 bg-gray-50">
              <p>CI <span className="font-medium text-gray-700">{query.trim()}</span> no encontrado</p>
              <p className="text-xs mt-1 text-gray-400">Presiona Enter para registrarlo</p>
            </li>
          )}
          
          {/* Register option */}
          <li
            className={cn(
              'flex cursor-pointer items-center gap-3 border-t border-gray-100 px-3 py-2.5 transition-colors',
              focused === matches.length ? 'bg-green-50' : 'hover:bg-green-50'
            )}
            onMouseEnter={() => setFocused(matches.length)}
            onClick={() => { onQuickRegister(query); setOpen(false) }}
          >
            <UserPlusIcon className="h-4 w-4 flex-shrink-0 text-green-600" />
            <p className="text-sm font-medium text-green-700">
              {isCiInput && !ciSearchLoading ? 'Registrar nuevo cliente' : `Registrar cliente${query ? ` "${query}"` : ''}`}
            </p>
          </li>
        </ul>
      )}
    </div>
  )
}
