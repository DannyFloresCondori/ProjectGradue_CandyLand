import type { Category } from '@/types'
import { apiClient, getErrorMessage } from '@/lib/api'

function normalizeCategory(item: any): Category {
  return {
    id: item.id,
    name: item.name,
    isActive: item.isActive ?? true,
  }
}

export const categoryService = {
  async getAll(): Promise<Category[]> {
    try {
      const { data } = await apiClient.get('/categories')
      return (Array.isArray(data) ? data : []).map(normalizeCategory)
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  },

  async getActive(): Promise<Category[]> {
    return categoryService.getAll()
  },

  async create(name: string): Promise<Category> {
    try {
      const { data } = await apiClient.post('/categories', { name })
      return normalizeCategory(data)
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  },

  async update(id: string, name: string): Promise<Category> {
    try {
      const { data } = await apiClient.patch(`/categories/${id}`, { name })
      return normalizeCategory(data)
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  },

  async toggleActive(id: string): Promise<Category> {
    try {
      const { data: current } = await apiClient.get(`/categories/${id}`)
      const { data } = await apiClient.patch(`/categories/${id}`, { isActive: !current.isActive })
      return normalizeCategory(data)
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  },
}
