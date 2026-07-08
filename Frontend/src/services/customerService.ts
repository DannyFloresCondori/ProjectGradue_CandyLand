import type { Customer, CustomerInput } from '@/types'
import { apiClient, getErrorMessage } from '@/lib/api'

function normalizeCustomer(item: any): Customer {
  return {
    id: item.id,
    ci: item.ci ?? '',
    fullName: item.full_name ?? item.fullName ?? '',
    phone: item.phone ?? '',
    address: item.direction ?? item.address ?? '',
    isActive: item.isActive ?? true,
    createdAt: item.createdAt ?? new Date().toISOString(),
  }
}

export const customerService = {
  async getAll(): Promise<Customer[]> {
    try {
      const { data } = await apiClient.get('/client')
      return (Array.isArray(data) ? data : []).map(normalizeCustomer)
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  },

  async searchByCi(ci: string): Promise<Customer | null> {
    try {
      const { data } = await apiClient.get('/client', { params: { ci } })
      const customers = (Array.isArray(data) ? data : []).map(normalizeCustomer)
      return customers.length > 0 ? customers[0] : null
    } catch (error) {
      // Return null instead of throwing when CI not found
      return null
    }
  },

  async getActive(): Promise<Customer[]> {
    return this.getAll()
  },

  async getById(id: string): Promise<Customer> {
    try {
      const { data } = await apiClient.get(`/client/${id}`)
      return normalizeCustomer(data)
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  },

  async create(input: CustomerInput): Promise<Customer> {
    try {
      const payload: Record<string, unknown> = { full_name: input.fullName }
      if (input.ci) payload.ci = input.ci
      if (input.phone) payload.phone = input.phone
      if (input.address) payload.direction = input.address

      const { data } = await apiClient.post('/client', payload)
      return normalizeCustomer(data)
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  },

  async update(id: string, input: Partial<CustomerInput>): Promise<Customer> {
    try {
      const { data } = await apiClient.patch(`/client/${id}`, {
        full_name: input.fullName,
        ci: input.ci,
        phone: input.phone,
        direction: input.address,
      })
      return normalizeCustomer(data)
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  },

  async toggleActive(id: string): Promise<Customer> {
    try {
      const current = await this.getById(id)
      const { data } = await apiClient.patch(`/client/${id}`, { isActive: !current.isActive })
      return normalizeCustomer(data)
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  },
}
