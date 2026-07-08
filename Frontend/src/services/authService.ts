import type { AuthUser, LoginInput } from '@/types'
import { apiClient, getErrorMessage } from '@/lib/api'

const SESSION_KEY = 'candyland_session'

function normalizeRoleName(roleValue: unknown): AuthUser['role'] {
  if (typeof roleValue === 'string') {
    const trimmed = roleValue.trim()
    if (!trimmed) return 'cajero'

    const normalized = trimmed.toLowerCase()
    if (normalized === 'admin' || normalized.includes('administrador')) return 'admin'
    if (normalized === 'inventario') return 'inventario'
    if (normalized === 'cajero' || normalized.includes('cajero')) return 'cajero'

    return trimmed as AuthUser['role']
  }

  if (typeof roleValue === 'object' && roleValue !== null) {
    const candidate = (roleValue as { name?: unknown; role?: unknown }).name
      ?? (roleValue as { role?: unknown }).role
    return normalizeRoleName(candidate)
  }

  return 'cajero'
}

function normalizeAuthUser(item: any): AuthUser {
  const payload = item?.user ?? item
  const roleValue = payload?.role ?? payload?.roleName ?? payload?.roleData?.name ?? 'cajero'

  return {
    id: payload?.id ?? item?.id ?? '',
    fullName: payload?.fullName ?? payload?.full_name ?? item?.fullName ?? item?.full_name ?? '',
    username: payload?.username ?? payload?.name ?? item?.username ?? item?.name ?? '',
    email: payload?.email ?? item?.email ?? '',
    role: normalizeRoleName(roleValue),
    token: payload?.token ?? item?.token ?? '',
  }
}

export const authService = {
  async login(input: LoginInput): Promise<AuthUser> {
    try {
      const { data } = await apiClient.post('/auth/login', {
        username: input.username,
        password: input.password,
      })
      const authUser = normalizeAuthUser(data)
      localStorage.setItem(SESSION_KEY, JSON.stringify(authUser))
      return authUser
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  },

  logout(): void {
    localStorage.removeItem(SESSION_KEY)
  },

  getSession(): AuthUser | null {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw)
      return normalizeAuthUser(parsed)
    } catch {
      return null
    }
  },

  isAuthenticated(): boolean {
    return this.getSession() !== null
  },
}
