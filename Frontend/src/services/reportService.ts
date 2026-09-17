import type { Sale } from '@/types'
import { apiClient, getErrorMessage } from '@/lib/api'

function normalizeSale(item: any): Sale {
  return {
    id: item.id,
    userId: item.user?.id ?? item.userId ?? '',
    userName: item.user?.full_name ?? item.user?.fullName ?? item.userName ?? 'Sistema',
    orderId: item.order?.id ?? item.orderId ?? null,
    customerId: item.client?.id ?? item.customerId ?? null,
    customerName: item.client?.full_name ?? item.client?.fullName ?? item.customerName ?? null,
    total: Number(item.total ?? 0),
    paymentType: item.payment_method === 'in_qr' || item.paymentType === 'qr' ? 'qr' : 'cash',
    status: item.status === 'canceled' ? 'canceled' : 'delivered',
    cancellationReason: item.cancellation_reason ?? item.cancellationReason ?? item.reason ?? null,
    details: Array.isArray(item.saleDetail ?? item.details) ? (item.saleDetail ?? item.details).map((detail: any) => ({
      id: detail.id,
      saleId: detail.saleId ?? item.id,
      productId: detail.product?.id ?? detail.productId ?? '',
      productName: detail.product?.name ?? detail.productName ?? '',
      quantity: Number(detail.quantity ?? 0),
      unitPrice: Number(detail.price_unique ?? detail.unitPrice ?? 0),
      subtotal: Number(detail.subtotal ?? 0),
    })) : [],
    createdAt: item.createdAt ?? item.created_at ?? new Date().toISOString(),
  }
}

export interface SalesReport {
  from: string
  to: string
  totalSales: number
  totalRevenue: number
  cancelledSales: number
  salesByDay: { date: string; count: number; revenue: number }[]
  salesByPayment: { method: string; count: number; revenue: number }[]
  topProducts: { productId: string; productName: string; quantity: number; revenue: number }[]
  completedSales: Sale[]
}

export const reportService = {
  async getSalesReport(from: Date, to: Date): Promise<SalesReport> {
    try {
      const { data } = await apiClient.get('/sale')
      const list = Array.isArray(data) ? data : data?.data ?? []
      const sales = list.map(normalizeSale)
      const filtered = sales.filter((sale: Sale) => {
        const d = new Date(sale.createdAt)
        return d >= from && d <= to
      })

      const completed = filtered.filter((sale: Sale) => sale.status === 'delivered')
      const totalRevenue = completed.reduce((sum: number, sale: Sale) => sum + sale.total, 0)

      const byDay = new Map<string, { count: number; revenue: number }>()
      completed.forEach((sale: Sale) => {
        const day = sale.createdAt.slice(0, 10)
        const prev = byDay.get(day) ?? { count: 0, revenue: 0 }
        byDay.set(day, { count: prev.count + 1, revenue: prev.revenue + sale.total })
      })
      const salesByDay = Array.from(byDay.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date))

      const cashSales = completed.filter((sale: Sale) => sale.paymentType === 'cash')
      const qrSales = completed.filter((sale: Sale) => sale.paymentType === 'qr')
      const salesByPayment = [
        { method: 'Efectivo', count: cashSales.length, revenue: cashSales.reduce((sum: number, sale: Sale) => sum + sale.total, 0) },
        { method: 'QR', count: qrSales.length, revenue: qrSales.reduce((sum: number, sale: Sale) => sum + sale.total, 0) },
      ]

      const productMap = new Map<string, { productName: string; quantity: number; revenue: number }>()
      completed.forEach((sale: Sale) => {
        sale.details.forEach((detail: Sale['details'][number]) => {
          const prev = productMap.get(detail.productId) ?? { productName: detail.productName, quantity: 0, revenue: 0 }
          productMap.set(detail.productId, {
            productName: detail.productName,
            quantity: prev.quantity + detail.quantity,
            revenue: prev.revenue + detail.subtotal,
          })
        })
      })
      const topProducts = Array.from(productMap.entries())
        .map(([productId, data]) => ({ productId, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)

      return {
        from: from.toISOString(),
        to: to.toISOString(),
        totalSales: completed.length,
        totalRevenue,
        cancelledSales: filtered.filter((sale: Sale) => sale.status === 'canceled').length,
        salesByDay,
        salesByPayment,
        topProducts,
        completedSales: completed,
      }
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  },

  async getDashboardMetrics() {
    try {
      const { data } = await apiClient.get('/sale')
      const list = Array.isArray(data) ? data : data?.data ?? []
      const sales = list.map(normalizeSale)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const todaySales = sales.filter((sale: Sale) => {
        const d = new Date(sale.createdAt)
        return d >= today && d < tomorrow && sale.status === 'delivered'
      })

      return {
        todaySalesCount: todaySales.length,
        todayRevenue: todaySales.reduce((sum: number, sale: Sale) => sum + sale.total, 0),
        lowStockCount: 0,
      }
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  },
}
