import type { Order, OrderInput, OrderStatus } from '@/types'
import { apiClient, getErrorMessage } from '@/lib/api'

function normalizeOrder(item: any): Order {
  const type = item.type ?? item.order_type ?? item.orderType ?? 'delivery'
  const customerName = item.client?.full_name ?? item.client?.fullName ?? item.customerName ?? item.customer?.full_name ?? item.customer?.fullName ?? null
  const customerPhone = item.client?.phone ?? item.customerPhone ?? item.customer?.phone ?? null
  const deliveryAddress = item.delivery_address ?? item.deliveryAddress ?? item.client?.address ?? item.client?.direction ?? item.address ?? null
  const scheduledAt = item.scheduled_at ?? item.scheduledAt ?? item.delivery_date ?? item.deliveryDate ?? null
  const normalizedStatus = String(item.status ?? 'pending').toLowerCase()
  const safeStatus: Order['status'] = ['pending', 'preparing', 'ready', 'delivered', 'cancelled'].includes(normalizedStatus)
    ? normalizedStatus as Order['status']
    : 'pending'

  return {
    id: item.id,
    userId: item.user?.id ?? item.userId ?? '',
    userName: item.user?.full_name ?? item.user?.fullName ?? item.userName ?? 'Sistema',
    customerId: item.client?.id ?? item.customerId ?? null,
    customerName,
    customerPhone,
    orderType: type === 'scheduled' ? 'scheduled' : 'delivery',
    status: safeStatus,
    deliveryAddress,
    scheduledAt,
    total: Number(item.total ?? 0),
    notes: item.notes ?? null,
    cancellationReason: item.cancellation_reason ?? item.cancellationReason ?? null,
    details: Array.isArray(item.details) ? item.details.map((detail: any) => ({
      id: detail.id ?? `${item.id}-${Math.random().toString(36).slice(2,8)}`,
      orderId: detail.orderId ?? item.id,
      productId: detail.product?.id ?? detail.productId ?? '',
      productName: detail.product?.name ?? detail.productName ?? detail.name ?? '',
      quantity: Number(detail.quantity ?? 0),
      unitPrice: Number(detail.price_unique ?? detail.priceUnique ?? detail.unitPrice ?? 0),
      subtotal: Number(detail.subtotal ?? detail.price_unique ?? detail.priceUnique ?? 0),
      toppings: Array.isArray(detail.toppings) ? detail.toppings.map((t: any) => ({
        toppingId: t.topping?.id ?? t.toppingId ?? t.id ?? '',
        toppingName: t.topping?.name ?? t.name ?? t.toppingName ?? '',
        price: Number(t.price ?? t.topping?.price ?? 0),
      })) : [],
    })) : [],
    createdAt: item.createdAt ?? item.created_at ?? new Date().toISOString(),
  }
}

export const orderService = {
  async getAll(): Promise<Order[]> {
    try {
      const { data } = await apiClient.get('/orders')
      const rawList = Array.isArray(data) ? data : (data?.data ?? data?.orders ?? [])
      const list = Array.isArray(rawList) ? rawList : []
      return list.map(normalizeOrder).filter((order) => Boolean(order.id)).sort((a: Order, b: Order) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  },

  async getPending(): Promise<Order[]> {
    const orders = await this.getAll()
    return orders.filter((o) => ['pending', 'preparing', 'ready'].includes(o.status))
  },

  async getById(id: string): Promise<Order> {
    try {
      const { data } = await apiClient.get(`/orders/${id}`)
      return normalizeOrder(data)
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  },

  async create(input: OrderInput, userId: string): Promise<Order> {
    try {
      const payload = {
        userId,
        clientId: input.customerId,
        type: input.orderType,
        orderType: input.orderType,
        order_type: input.orderType,
        programed: input.orderType === 'scheduled',
        deliveryAddress: input.deliveryAddress,
        delivery_address: input.deliveryAddress,
        scheduledAt: input.scheduledAt,
        scheduled_at: input.scheduledAt,
        notes: input.notes,
        details: input.details.map((d) => ({
          productId: d.productId,
          quantity: d.quantity,
          toppingIds: d.toppingIds,
          toppings: d.toppingIds,
        })),
      }
      const { data } = await apiClient.post('/orders', payload)
      return normalizeOrder(data)
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  },

  async update(id: string, input: OrderInput): Promise<Order> {
    try {
      const customer = input.customerId ? {
        id: input.customerId,
        full_name: undefined,
        phone: undefined,
        direction: input.deliveryAddress ?? undefined,
      } : undefined

      const payload = {
        client: customer,
        type: input.orderType,
        orderType: input.orderType,
        order_type: input.orderType,
        programed: input.orderType === 'scheduled',
        deliveryAddress: input.deliveryAddress,
        delivery_address: input.deliveryAddress,
        scheduledAt: input.scheduledAt,
        scheduled_at: input.scheduledAt,
        notes: input.notes,
        details: input.details.map((d) => ({
          productId: d.productId,
          quantity: d.quantity,
          toppingIds: d.toppingIds,
          toppings: d.toppingIds,
        })),
      }
      const { data } = await apiClient.patch(`/orders/${id}`, payload)
      return normalizeOrder(data)
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  },

  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    try {
      const { data } = await apiClient.patch(`/orders/${id}`, { status })
      return normalizeOrder(data)
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  },

  async cancel(id: string): Promise<any> {
    try {
      const { data } = await apiClient.delete(`/orders/${id}`)
      return data
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  },
}
