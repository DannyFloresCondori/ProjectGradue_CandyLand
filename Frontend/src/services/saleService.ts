import type { Sale, SaleInput } from '@/types'
import { apiClient, getErrorMessage } from '@/lib/api'

function normalizePaymentType(paymentType: string | undefined): Sale['paymentType'] {
  if (paymentType === 'in_qr' || paymentType === 'qr') return 'qr'
  return 'cash'
}

function normalizeSale(item: any): Sale {
  const orderTypeRaw = item.order?.type ?? item.order?.order_type ?? item.order?.orderType ?? item.orderType ?? null
  const normalizedOrderType = orderTypeRaw === 'scheduled' ? 'scheduled' : orderTypeRaw === 'delivery' ? 'delivery' : null

  return {
    id: item.id,
    userId: item.user?.id ?? item.userId ?? '',
    userName: item.user?.full_name ?? item.user?.fullName ?? item.user?.username ?? item.user?.name ?? item.userName ?? 'Sistema',
    userRole: item.user?.role?.name ?? item.user?.roleName ?? item.userRole ?? item.role ?? null,
    orderId: item.order?.id ?? item.orderId ?? null,
    orderType: normalizedOrderType ?? (item.orderId ? 'delivery' : 'local'),
    deliveryAddress: item.order?.delivery_address ?? item.order?.deliveryAddress ?? item.order?.client?.address ?? item.order?.address ?? null,
    scheduledAt: item.order?.scheduled_at ?? item.order?.scheduledAt ?? item.order?.delivery_date ?? item.order?.deliveryDate ?? null,
    customerId: item.client?.id ?? item.customerId ?? null,
    customerName: item.client?.full_name ?? item.client?.fullName ?? item.customerName ?? null,
    total: Number(item.total ?? 0),
    paymentType: normalizePaymentType(item.payment_method ?? item.paymentType),
    status: item.status === 'canceled' ? 'canceled' : 'delivered',
    cancellationReason: item.cancellation_reason ?? item.cancellationReason ?? item.reason ?? null,
    details: Array.isArray(item.saleDetail ?? item.details) ? (item.saleDetail ?? item.details).map((detail: any) => ({
      id: detail.id,
      saleId: detail.saleId ?? item.id,
      productId: detail.product?.id ?? detail.productId ?? '',
      productName: detail.product?.name ?? detail.productName ?? '',
      quantity: Number(detail.quantity ?? 0),
      unitPrice: Number(detail.priceUnique ?? detail.price_unique ?? detail.unitPrice ?? detail.product?.price ?? 0),
      subtotal: Number(detail.subtotal ?? 0),
      toppings: Array.isArray(detail.toppings) ? detail.toppings.map((topping: any) => ({
        toppingId: topping.topping?.id ?? topping.toppingId ?? topping.id ?? '',
        toppingName: topping.topping?.name ?? topping.name ?? topping.toppingName ?? '',
        price: Number(topping.price ?? topping.topping?.price ?? 0),
      })) : [],
    })) : [],
    createdAt: item.createdAt ?? new Date().toISOString(),
  }
}

export const saleService = {
  async getAll(): Promise<Sale[]> {
    try {
      const { data } = await apiClient.get('/sale')
      const list = Array.isArray(data) ? data : data?.data ?? []
      return list.map(normalizeSale).sort((a: Sale, b: Sale) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  },

  async getById(id: string): Promise<Sale> {
    try {
      const { data } = await apiClient.get(`/sale/${id}`)
      return normalizeSale(data)
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  },

  async getByDateRange(from: Date, to: Date): Promise<Sale[]> {
    try {
      const { data } = await apiClient.get('/sale')
      const list = Array.isArray(data) ? data : data?.data ?? []
      return list.map(normalizeSale).filter((sale: Sale) => {
        const d = new Date(sale.createdAt)
        return d >= from && d <= to && sale.status === 'delivered'
      })
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  },

  async create(input: SaleInput, userId: string): Promise<Sale> {
    try {
      const { data } = await apiClient.post('/sale', {
        userId,
        clientId: input.customerId,
        orderId: input.orderId,
        payment_method: input.paymentType,
        details: input.details.map((d) => ({
          productId: d.productId,
          quantity: d.quantity,
          toppingIds: d.toppingIds ?? [],
        })),
      })
      return normalizeSale(data)
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  },

  async getTicketPdf(id: string): Promise<Blob> {
    try {
      const { data } = await apiClient.get(`/sale/${id}/ticket`, { responseType: 'blob' })
      return data as Blob
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  },

  async cancel(id: string, reason: string): Promise<Sale> {
    try {
      const { data } = await apiClient.delete(`/sale/${id}`, { data: { reason } })
      return normalizeSale(data)
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  },
}
