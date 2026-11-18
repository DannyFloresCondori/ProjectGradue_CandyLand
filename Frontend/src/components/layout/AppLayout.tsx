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
    const refreshOrderData = () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['kitchen-orders'] })
      qc.invalidateQueries({ queryKey: ['pending-orders'] })
      qc.invalidateQueries({ queryKey: ['sales'] })
      qc.invalidateQueries({ queryKey: ['dashboard-sales'] })
      qc.invalidateQueries({ queryKey: ['dashboard-metrics'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['products-active'] })
      qc.invalidateQueries({ queryKey: ['low-stock'] })
      qc.invalidateQueries({ queryKey: ['alerts'] })
      qc.invalidateQueries({ queryKey: ['active-alerts'] })
    }

    ordersSocket.on('order.created', refreshOrderData)
    ordersSocket.on('order.updated', refreshOrderData)
    ordersSocket.connect()
    ordersSocket.emit('orders.subscribe')

    return () => {
      ordersSocket.off('order.created', refreshOrderData)
      ordersSocket.off('order.updated', refreshOrderData)
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
