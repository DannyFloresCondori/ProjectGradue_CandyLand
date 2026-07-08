import type { FC } from 'react'
import type { Topping } from '@/types'
import { cn } from '@/lib/utils'

interface ToppingSelectorProps {
  availableToppings: Topping[]
  selectedToppingIds: string[]
  onToggle: (toppingId: string) => void
  maxSelections?: number
}

export const ToppingSelector: FC<ToppingSelectorProps> = ({
  availableToppings,
  selectedToppingIds,
  onToggle,
  maxSelections = 2,
}) => {
  if (availableToppings.length === 0) return null

  return (
    <div className="mt-2 space-y-1">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
        Toppings {selectedToppingIds.length}/{maxSelections}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {availableToppings.map((topping) => {
          const isSelected = selectedToppingIds.includes(topping.id)
          const isDisabled = !isSelected && selectedToppingIds.length >= maxSelections

          return (
            <button
              key={topping.id}
              type="button"
              onClick={() => onToggle(topping.id)}
              disabled={isDisabled}
              className={cn(
                'cursor-pointer rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors',
                isSelected
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-primary-300 hover:bg-primary-50',
                isDisabled && 'cursor-not-allowed opacity-50',
              )}
            >
              {topping.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
