import type { FC } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export const PrivateRoute: FC = () => {
  const { user } = useAuthStore()
  const location = useLocation()
  const normalizedRole = user?.role?.toLowerCase() ?? ''
  const isKitchenRole = normalizedRole.includes('cocina') || normalizedRole.includes('cocinero')

  if (isKitchenRole && location.pathname !== '/dashboard' && location.pathname !== '/cocina') {
    return <Navigate to="/dashboard" replace />
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />
}
