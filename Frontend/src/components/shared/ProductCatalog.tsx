import type { FC } from 'react'
import { useState } from 'react'
import { MagnifyingGlassIcon, TagIcon } from '@heroicons/react/24/outline'
import { cn, formatCurrency } from '@/lib/utils'
import type { Product, Category } from '@/types'

interface ProductCatalogProps {
  products: Product[]
  categories: Category[]
  onAddProduct: (productId: string) => void
}

/** Reusable left panel for POS modals: category pills + search + product grid. */
export const ProductCatalog: FC<ProductCatalogProps> = ({ products, categories, onAddProduct }) => {
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  const filtered = products.filter(p => {
    const matchCat = categoryFilter === 'all' || p.categoryId === categoryFilter
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  return (
    <div className="flex w-[58%] flex-col border-r border-gray-100 min-h-0">
      {/* Search + Category filters */}
      <div className="border-b border-gray-100 px-4 pt-3 pb-2 space-y-2 flex-shrink-0">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar producto..."
            className="h-8 w-full rounded-md border border-gray-300 bg-white pl-9 pr-3 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={cn(
              'cursor-pointer flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors',
              categoryFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            Todos
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryFilter(cat.id)}
              className={cn(
                'cursor-pointer flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                categoryFilter === cat.id
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Product grid */}
      <div className="flex-1 overflow-y-auto px-4 py-3 min-h-0">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <TagIcon className="h-10 w-10 mb-2 opacity-40" />
            <p className="text-sm">Sin resultados</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-3">
            {filtered.map(p => {
              const outOfStock = p.stock === 0
              const lowStock = p.stock > 0 && p.stock <= p.minStock
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={outOfStock}
                  onClick={() => onAddProduct(p.id)}
                  className={cn(
                    'group relative cursor-pointer rounded-lg border p-3 text-left transition-all min-h-[94px]',
                    outOfStock
                      ? 'cursor-not-allowed border-gray-200 bg-gray-50 opacity-50'
                      : 'border-gray-200 hover:border-primary-400 hover:bg-primary-50 hover:shadow-sm active:scale-[0.98]'
                  )}
                >
                  {lowStock && !outOfStock && (
                    <span className="absolute right-2 top-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">
                      POCO
                    </span>
                  )}
                  {outOfStock && (
                    <span className="absolute right-2 top-2 rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-600">
                      AGOTADO
                    </span>
                  )}
                  <p className="font-medium text-sm text-gray-900 leading-tight truncate pr-10">{p.name}</p>
                  <p className="mt-1 text-xs font-bold text-primary-600">{formatCurrency(p.price)}</p>
                  <p className="mt-0.5 text-[10px] text-gray-400">Stock: {p.stock}</p>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
