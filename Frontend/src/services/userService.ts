import type { User, UserInput } from '@/types'
import { apiClient, getErrorMessage } from '@/lib/api'

function normalizeUser(item: any): User {
  return {
    id: item.id,
    roleId: item.role?.id ?? item.roleId ?? '',
    role: item.role ? { id: item.role.id, name: item.role.name, description: item.role.description ?? '', createdAt: item.role.createdAt ?? new Date().toISOString() } : { id: '', name: 'cajero', description: '', createdAt: new Date().toISOString() },
    fullName: item.name ?? item.full_name ?? item.fullName ?? '',
    username: item.username ?? '',
    email: item.email ?? '',
    phone: item.phone ?? '',
    password: '••••••••',
    isActive: item.isActive ?? true,
    createdAt: item.createdAt ?? new Date().toISOString(),
    updatedAt: item.updatedAt ?? item.updated_at ?? undefined,
    salesCount: Number(item.salesCount ?? item.sales_count ?? 0),
  }
}

export const userService = {
  async getAll(): Promise<User[]> {
    try {
      const { data } = await apiClient.get('/users')
      return (Array.isArray(data) ? data : []).map(normalizeUser)
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  },

  async create(input: UserInput): Promise<User> {
    try {
      const payload: Record<string, unknown> = {
        name: input.name,
        password: input.password,
        roleId: input.roleId,
      }

      if (input.email?.trim()) payload.email = input.email.trim()
      if (input.phone?.trim()) payload.phone = input.phone.trim()

      const { data } = await apiClient.post('/users', payload)
      return normalizeUser(data)
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  },

  async update(id: string, input: Partial<UserInput>): Promise<User> {
    try {
      const payload: Record<string, unknown> = {
        roleId: input.roleId,
      }

      if (input.name) payload.name = input.name
      if (input.password) payload.password = input.password
      if (input.email?.trim()) payload.email = input.email.trim()
      if (input.phone?.trim()) payload.phone = input.phone.trim()

      const { data } = await apiClient.patch(`/users/${id}`, payload)
      return normalizeUser(data)
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  },

  async toggleActive(id: string): Promise<User> {
    try {
      const current = await this.getAll().then((list) => list.find((item) => item.id === id))
      const { data } = await apiClient.patch(`/users/${id}`, { isActive: !(current?.isActive ?? true) })
      return normalizeUser(data)
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  },

  async getRoles() {
    try {
      const { data } = await apiClient.get('/roles')
      return Array.isArray(data) ? data : []
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  },
}
