import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser } from '@/types'
import { authService } from '@/services/authService'

interface AuthState {
  user: AuthUser | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  hasRole: (role: AuthUser['role'] | AuthUser['role'][]) => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: authService.getSession(),
      isLoading: false,

      login: async (username, password) => {
        set({ isLoading: true })
        try {
          const user = await authService.login({ username, password })
          set({ user, isLoading: false })
        } catch (err) {
          set({ isLoading: false })
          throw err
        }
      },

      logout: () => {
        authService.logout()
        set({ user: null })
      },

      hasRole: (role) => {
        const user = get().user
        if (!user) return false

        const normalizedRole = user.role?.toLowerCase() ?? ''
        const isAdmin = normalizedRole === 'admin' || normalizedRole.includes('administrador')
        if (isAdmin) return true

        const requestedRoles = Array.isArray(role) ? role : [role]
        return requestedRoles.some((item) => item?.toLowerCase() === normalizedRole)
      },
    }),
    {
      name: 'candyland-auth',
      partialize: (state) => ({ user: state.user }),
    }
  )
)
