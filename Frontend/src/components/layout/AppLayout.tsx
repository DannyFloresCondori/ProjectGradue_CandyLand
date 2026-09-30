import type { FC } from 'react'
import { Outlet } from 'react-router-dom'
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Sidebar } from './Sidebar'
import { Navbar } from './Navbar'
import { ordersSocket } from '@/lib/ordersSocket'

export const AppLayout: FC = () => {
  const qc = useQueryClient()

  useEffect(() => {
    const refreshOrders = () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['kitchen-orders'] })
      qc.invalidateQueries({ queryKey: ['pending-orders'] })
      qc.invalidateQueries({ queryKey: ['dashboard-metrics'] })
    }

    ordersSocket.on('order.created', refreshOrders)
    ordersSocket.on('order.updated', refreshOrders)
    ordersSocket.connect()
    ordersSocket.emit('orders.subscribe')

    return () => {
      ordersSocket.off('order.created', refreshOrders)
      ordersSocket.off('order.updated', refreshOrders)
      ordersSocket.disconnect()
    }
  }, [qc])

  return (
    <div className="flex h-screen min-w-0 overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Navbar />
        <main className="relative min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
