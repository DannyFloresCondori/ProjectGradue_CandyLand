import type { Topping } from '@/types'
import { apiClient, getErrorMessage } from '@/lib/api'

function normalizeTopping(item: any): Topping {
  return {
    id: item.id,
    name: item.name,
    isActive: item.isActive ?? true,
  }
}

export const toppingService = {
  async getAll(): Promise<Topping[]> {
    try {
      const { data } = await apiClient.get('/topping')
      return (Array.isArray(data) ? data : []).map(normalizeTopping)
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  },

  async getActive(): Promise<Topping[]> {
    const toppings = await this.getAll()
    return toppings.filter((t) => t.isActive)
  },

  async create(name: string): Promise<Topping> {
    try {
      const { data } = await apiClient.post('/topping', { name })
      return normalizeTopping(data)
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  },

  async update(id: string, data: { name?: string }): Promise<Topping> {
    try {
      const { data: response } = await apiClient.patch(`/topping/${id}`, data)
      return normalizeTopping(response)
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  },

  async toggleActive(id: string): Promise<Topping> {
    try {
      const { data: current } = await apiClient.get(`/topping/${id}`)
      const { data } = await apiClient.patch(`/topping/${id}`, { isActive: !current.isActive })
      return normalizeTopping(data)
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  },
}
