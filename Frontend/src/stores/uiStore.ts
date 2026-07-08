import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { notifications as seedNotifications } from '@/mock/database'
import type { Notification } from '@/types'

interface UIState {
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (val: boolean) => void

  notifications: Notification[]
  unreadCount: () => number
  markRead: (id: string) => void
  markAllRead: () => void
  removeNotification: (id: string) => void
  addNotification: (n: Notification) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (val) => set({ sidebarCollapsed: val }),

      notifications: seedNotifications,

      unreadCount: () => get().notifications.filter(n => !n.isRead).length,

      markRead: (id) =>
        set(s => ({
          notifications: s.notifications.map(n =>
            n.id === id ? { ...n, isRead: true } : n
          ),
        })),

      markAllRead: () =>
        set(s => ({
          notifications: s.notifications.map(n => ({ ...n, isRead: true })),
        })),

      removeNotification: (id) =>
        set(s => ({
          notifications: s.notifications.filter(n => n.id !== id),
        })),

      addNotification: (n) =>
        set(s => ({ notifications: [n, ...s.notifications] })),
    }),
    {
      name: 'candyland-ui',
      partialize: (s) => ({
        sidebarCollapsed: s.sidebarCollapsed,
        notifications: s.notifications,
      }),
    }
  )
)
