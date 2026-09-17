import type { FC } from 'react'
import type { Product } from '@/types'

interface PromotionBadgeProps {
  promotion?: Product['promotion']
  compact?: boolean
}

export const PromotionBadge: FC<PromotionBadgeProps> = ({ promotion, compact = false }) => {
  if (!promotion?.isActive) return null

  const discountPercent = Number(promotion.discountPercent ?? 0)
  const benefit = promotion.type === 'buy_one_get_one'
    ? '2x1'
    : discountPercent > 0
      ? `-${discountPercent}%`
      : 'Oferta'

  return (
    <span className={`inline-flex max-w-full items-center gap-1 rounded-md bg-emerald-50 font-semibold text-emerald-700 ${compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-1 text-[10px]'}`}>
      <span className="shrink-0">PROMO</span>
      <span className="truncate font-medium">{promotion.name}</span>
      <span className="shrink-0 text-emerald-600">· {benefit}</span>
    </span>
  )
}