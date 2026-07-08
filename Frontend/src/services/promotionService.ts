import type { Promotion, PromotionInput } from '@/types'
import { apiClient, getErrorMessage } from '@/lib/api'

function normalizePromotion(item: any): Promotion {
  const products = Array.isArray(item.products) ? item.products : []

  return {
    id: item.id,
    name: item.name,
    description: item.description ?? '',
    discountPercent: Number(item.discount_percent ?? item.value ?? item.discountPercent ?? 0),
    startDate: item.start_date ?? item.startDate ?? '',
    endDate: item.end_date ?? item.endDate ?? '',
    isActive: item.isActive ?? item.is_active ?? true,
    productIds: products.map((product: any) => product?.id ?? product?.productId).filter(Boolean),
  }
}

export const promotionService = {
  async getAll(): Promise<Promotion[]> {
    try {
      const { data } = await apiClient.get('/promotions')
      const list = Array.isArray(data) ? data : data?.data ?? []
      return list.map(normalizePromotion)
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  },

  async getActive(): Promise<Promotion[]> {
    const promos = await this.getAll()
    const today = new Date().toISOString().slice(0, 10)
    return promos.filter((p) => p.isActive && p.startDate <= today && p.endDate >= today)
  },

  async create(input: PromotionInput): Promise<Promotion> {
    try {
      const selectedProductIds = input.productIds?.length ? input.productIds : []

      if (!selectedProductIds.length) {
        throw new Error('Selecciona al menos un producto para la promoción')
      }

      const { data } = await apiClient.post('/promotions', {
        name: input.name,
        description: input.description,
        type: 'discount',
        value: input.discountPercent,
        end_date: input.endDate,
        isActive: true,
        productIds: selectedProductIds,
      })
      return normalizePromotion(data)
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  },

  async update(id: string, input: Partial<PromotionInput>): Promise<Promotion> {
    try {
      const payload: Record<string, unknown> = {}
      if (input.name !== undefined) payload.name = input.name
      if (input.description !== undefined) payload.description = input.description
      if (input.discountPercent !== undefined) payload.value = input.discountPercent
      if (input.endDate !== undefined) payload.end_date = input.endDate
      if (input.productIds !== undefined) payload.productIds = input.productIds
      const { data } = await apiClient.patch(`/promotions/${id}`, payload)
      return normalizePromotion(data)
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  },

  async toggleActive(id: string): Promise<Promotion> {
    try {
      const current = await this.getAll().then((list) => list.find((item) => item.id === id))
      const { data } = await apiClient.patch(`/promotions/${id}`, { isActive: !(current?.isActive ?? true) })
      return normalizePromotion(data)
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  },
}
