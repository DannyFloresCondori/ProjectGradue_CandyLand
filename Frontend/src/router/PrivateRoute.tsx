import type { FC } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export const PrivateRoute: FC = () => {
  const { user } = useAuthStore()
  return user ? <Outlet /> : <Navigate to="/login" replace />
}
