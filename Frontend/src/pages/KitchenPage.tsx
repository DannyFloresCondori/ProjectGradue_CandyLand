import { useEffect, useState, type FC } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { orderService } from '@/services/orderService'
import { saleService } from '@/services/saleService'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardBody } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { PageSpinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDateTime, formatElapsedTime, getElapsedMinutes } from '@/lib/utils'
import {
  ClipboardDocumentCheckIcon, ArrowPathIcon,
  ClockIcon, ExclamationTriangleIcon, MapPinIcon, PhoneIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { ordersSocket } from '@/lib/ordersSocket'
import type { Order, OrderStatus, PaymentType } from '@/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<string, string> = {
  delivery:  '🛵',
  scheduled: '📅',
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const getOrderTypeLabel = (orderType: Order['orderType']) => orderType === 'scheduled' ? 'Programado' : 'Domicilio'

const getDeliveryAlert = (order: Order) => {
  if (order.orderType === 'scheduled' && order.scheduledAt) {
    const diffMs = new Date(order.scheduledAt).getTime() - Date.now()
    const diffDays = Math.ceil(diffMs / 86_400_000)

    if (diffDays < 0) {
      return { tone: 'red' as const, text: `Vencido hace ${Math.abs(diffDays)} día${Math.abs(diffDays) === 1 ? '' : 's'}` }
    }
    if (diffDays === 0) {
      return { tone: 'amber' as const, text: 'Entrega hoy' }
    }
    if (diffDays === 1) {
      return { tone: 'amber' as const, text: 'Falta 1 día' }
    }
    return { tone: 'amber' as const, text: `Faltan ${diffDays} días` }
  }

  if (order.orderType === 'delivery') {
    return { tone: 'gray' as const, text: 'Entrega a domicilio' }
  }

  return null
}

const UrgencyBadge: FC<{ createdAt: string }> = ({ createdAt }) => {
  const mins = getElapsedMinutes(createdAt)
  if (mins < 8) return (
    <span className="flex items-center gap-1 text-[10px] font-medium text-gray-400">
      <ClockIcon className="h-3 w-3" />{formatElapsedTime(createdAt)}
    </span>
  )
  if (mins < 15) return (
    <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600">
      <ClockIcon className="h-3 w-3" />{formatElapsedTime(createdAt)}
    </span>
  )
  return (
    <span className="flex items-center gap-1 text-[10px] font-bold text-red-600">
      <ExclamationTriangleIcon className="h-3 w-3" />{formatElapsedTime(createdAt)} — URGENTE
    </span>
  )
}

// ─── KitchenCard ──────────────────────────────────────────────────────────────

const KitchenCard: FC<{
  order: Order
  onUpdate: (id: string, status: OrderStatus) => void
  isUpdating: boolean
  canDeliver: boolean
}> = ({ order, onUpdate, isUpdating, canDeliver }) => {
  const isPreparing = order.status === 'preparing'
  const isPending   = order.status === 'pending'
  const isReady = order.status === 'ready'
  const deliveryAlert = getDeliveryAlert(order)

  return (
    <Card className={cn(
      'border-l-4 transition-shadow hover:shadow-md',
      isPreparing ? 'border-l-amber-400' : 'border-l-gray-300'
    )}>
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <p className="font-bold text-sm text-gray-900">#{order.id.slice(-6).toUpperCase()}</p>
          <span className="text-base">{TYPE_ICONS[order.orderType]}</span>
        </div>
        <UrgencyBadge createdAt={order.createdAt} />
      </div>

      <CardBody className="py-3 space-y-2">
        <div className="flex items-center justify-between gap-2 rounded-md bg-gray-50 px-2 py-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            {getOrderTypeLabel(order.orderType)}
          </span>
          {deliveryAlert && (
            <span className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-semibold',
              deliveryAlert.tone === 'red' ? 'bg-red-100 text-red-700' :
              deliveryAlert.tone === 'amber' ? 'bg-amber-100 text-amber-700' :
              'bg-gray-200 text-gray-700'
            )}>
              {deliveryAlert.text}
            </span>
          )}
        </div>

        {/* Customer */}
        <div className="space-y-1">
          <p className="text-xs text-gray-600 font-medium">👤 {order.customerName ?? 'Cliente general'}</p>
          {order.customerPhone && (
            <p className="flex items-center gap-1 text-[11px] text-gray-500">
              <PhoneIcon className="h-3.5 w-3.5" /> {order.customerPhone}
            </p>
          )}
        </div>

        {/* Scheduled time highlight */}
        {order.orderType === 'scheduled' && order.scheduledAt && (
          <div className="flex items-center gap-1.5 rounded-md bg-amber-50 border border-amber-200 px-2 py-1.5">
            <ClockIcon className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <p className="text-xs font-bold text-amber-700">
              Fecha de entrega: {formatDateTime(order.scheduledAt)}
            </p>
          </div>
        )}

        {/* Delivery address */}
        {order.deliveryAddress && (
          <div className="flex items-start gap-1.5">
            <MapPinIcon className="h-3.5 w-3.5 text-gray-400 shrink-0 mt-0.5" />
            <p className="text-xs text-gray-500 leading-tight">{order.deliveryAddress}</p>
          </div>
        )}

        {/* Notes */}
        {order.notes && (
          <div className="rounded-md bg-amber-50 border border-amber-100 px-2 py-1.5">
            <p className="text-xs text-amber-800">📝 {order.notes}</p>
          </div>
        )}

        {/* Products */}
        <ul className="space-y-1 pt-1">
          {order.details.map(d => (
            <li key={d.id} className="flex items-start gap-2 text-sm">
              <span className="w-6 shrink-0 rounded bg-primary-100 text-center text-xs font-bold text-primary-700 py-0.5">
                {d.quantity}
              </span>
              <div className="min-w-0">
                <span className="font-medium text-gray-900">{d.productName}</span>
                {d.toppings.length > 0 && (
                  <p className="text-xs text-gray-500">
                    + {d.toppings.map(t => t.toppingName).join(', ')}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>

        {/* Action */}
        {isPending && (
          <Button
            className="w-full mt-1"
            variant="secondary"
            size="sm"
            isLoading={isUpdating}
            onClick={() => onUpdate(order.id, 'preparing')}
          >
            ▶ Iniciar preparación
          </Button>
        )}
        {isPreparing && (
          <Button
            className="w-full mt-1"
            size="sm"
            isLoading={isUpdating}
            onClick={() => onUpdate(order.id, 'ready')}
          >
            ✓ Marcar como listo
          </Button>
        )}
        {isReady && (
          canDeliver ? (
            <Button
              className="w-full mt-1"
              variant="primary"
              size="sm"
              isLoading={isUpdating}
              onClick={() => onUpdate(order.id, 'delivered')}
            >
              ✓ Entregar al cliente
            </Button>
          ) : (
            <p className="text-[11px] text-gray-500">Esperando confirmación del cajero</p>
          )
        )}
      </CardBody>
    </Card>
  )
}

// ─── KitchenPage ──────────────────────────────────────────────────────────────

export const KitchenPage: FC = () => {
  const qc = useQueryClient()
  const { user, hasRole } = useAuthStore()
  const canDeliverOrders = hasRole(['admin', 'cajero'])
  const [deliveryDraft, setDeliveryDraft] = useState<{ order: Order | null; paymentType: PaymentType }>({ order: null, paymentType: 'cash' })

  const { data: orders = [], isLoading, isFetching, dataUpdatedAt, error } = useQuery({
    queryKey: ['kitchen-orders'],
    queryFn: async () => {
      const result = await orderService.getPending()
      return Array.isArray(result) ? result : []
    },
    refetchInterval: 60_000,
    retry: 1,
  })

  useEffect(() => {
    const refreshOrders = () => {
      qc.invalidateQueries({ queryKey: ['kitchen-orders'] })
    }

    ordersSocket.on('order.created', refreshOrders)
    ordersSocket.connect()
    ordersSocket.emit('orders.subscribe')

    return () => {
      ordersSocket.off('order.created', refreshOrders)
      ordersSocket.disconnect()
    }
  }, [qc])

  const updateMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) => orderService.updateStatus(id, status),
    onSuccess: (_, { status }) => {
      qc.invalidateQueries({ queryKey: ['kitchen-orders'] })
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['pending-orders'] })
      qc.invalidateQueries({ queryKey: ['alerts'] })
      qc.invalidateQueries({ queryKey: ['active-alerts'] })
      toast.success(status === 'ready' ? '¡Pedido listo para entregar!' : 'Preparación iniciada')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deliverMut = useMutation({
    mutationFn: ({ order, paymentType }: { order: Order; paymentType: PaymentType }) => saleService.create({
      orderId: order.id,
      customerId: order.customerId,
      paymentType,
      details: order.details.map((detail) => ({
        productId: detail.productId,
        quantity: detail.quantity,
        toppingIds: detail.toppings.map((t) => t.toppingId),
      })),
    }, user?.id ?? ''),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kitchen-orders'] })
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['sales'] })
      qc.invalidateQueries({ queryKey: ['dashboard-sales'] })
      qc.invalidateQueries({ queryKey: ['dashboard-metrics'] })
      qc.invalidateQueries({ queryKey: ['pending-orders'] })
      qc.invalidateQueries({ queryKey: ['alerts'] })
      qc.invalidateQueries({ queryKey: ['active-alerts'] })
      setDeliveryDraft({ order: null, paymentType: 'cash' })
      toast.success('Pedido entregado; la venta se registró con la fecha de entrega')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const handleStatusChange = (id: string, status: OrderStatus) => {
    if (status === 'delivered') {
      if (!canDeliverOrders) {
        toast.error('Solo el cajero o el administrador pueden entregar pedidos')
        return
      }

      const targetOrder = orders.find((order) => order.id === id)
      if (targetOrder) {
        setDeliveryDraft({ order: targetOrder, paymentType: 'cash' })
      }
      return
    }

    updateMut.mutate({ id, status })
  }

  const confirmDelivery = () => {
    if (!deliveryDraft.order) return
    if (!user?.id) {
      toast.error('Debe iniciar sesión para registrar la entrega')
      return
    }

    deliverMut.mutate({ order: deliveryDraft.order, paymentType: deliveryDraft.paymentType })
  }

  const pending = orders.filter(o => o.status === 'pending')
  const preparing = orders.filter(o => o.status === 'preparing')
  const ready = orders.filter(o => o.status === 'ready')
  const hasVisibleOrders = orders.length > 0 || pending.length > 0 || preparing.length > 0 || ready.length > 0

  const lastUpdate = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Pantalla de Preparación</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Actualizado: {lastUpdate} · Auto-refresco cada 20 s
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant={orders.length > 0 ? 'warning' : 'success'}
            className="text-sm px-3 py-1"
          >
            {orders.length} pedido{orders.length !== 1 ? 's' : ''} activo{orders.length !== 1 ? 's' : ''}
          </Badge>
          <button
            onClick={() => qc.invalidateQueries({ queryKey: ['kitchen-orders'] })}
            className={cn(
              'cursor-pointer rounded-md p-2 text-gray-500 hover:bg-gray-100 transition-colors',
              isFetching && 'animate-spin text-primary-500'
            )}
            aria-label="Actualizar"
            title="Actualizar ahora"
          >
            <ArrowPathIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          No se pudieron cargar los pedidos: {error instanceof Error ? error.message : 'Error desconocido'}
        </div>
      ) : !hasVisibleOrders ? (
        <EmptyState
          icon={<ClipboardDocumentCheckIcon className="h-12 w-12" />}
          title="Sin pedidos activos"
          description="Todos los pedidos han sido entregados"
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">

          {/* Column: Pendientes */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-3 w-3 rounded-full bg-gray-400" />
              <h2 className="text-sm font-semibold text-gray-700">
                Pendientes
                <span className="ml-1.5 rounded-full bg-gray-200 px-1.5 py-0.5 text-xs text-gray-600">
                  {pending.length}
                </span>
              </h2>
            </div>
            <div className="space-y-3">
              {pending.length === 0 ? (
                <p className="rounded-lg border border-dashed border-gray-200 py-6 text-center text-xs text-gray-400">
                  Sin pedidos pendientes
                </p>
              ) : (
                pending.map(o => (
                  <KitchenCard
                    key={o.id}
                    order={o}
                    onUpdate={handleStatusChange}
                    isUpdating={updateMut.isPending}
                    canDeliver={canDeliverOrders}
                  />
                ))
              )}
            </div>
          </div>

          {/* Column: En preparación */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-3 w-3 rounded-full bg-amber-400" />
              <h2 className="text-sm font-semibold text-gray-700">
                En preparación
                <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">
                  {preparing.length}
                </span>
              </h2>
            </div>
            <div className="space-y-3">
              {preparing.length === 0 ? (
                <p className="rounded-lg border border-dashed border-gray-200 py-6 text-center text-xs text-gray-400">
                  Sin pedidos en preparación
                </p>
              ) : (
                preparing.map(o => (
                  <KitchenCard
                    key={o.id}
                    order={o}
                    onUpdate={handleStatusChange}
                    isUpdating={updateMut.isPending}
                    canDeliver={canDeliverOrders}
                  />
                ))
              )}
            </div>
          </div>

          {/* Column: Listos */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-3 w-3 rounded-full bg-emerald-400" />
              <h2 className="text-sm font-semibold text-gray-700">
                Listos para entregar
                <span className="ml-1.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-700">
                  {ready.length}
                </span>
              </h2>
            </div>
            <div className="space-y-3">
              {ready.length === 0 ? (
                <p className="rounded-lg border border-dashed border-gray-200 py-6 text-center text-xs text-gray-400">
                  Sin pedidos listos
                </p>
              ) : (
                ready.map(o => (
                  <Card key={o.id} className="border-l-4 border-l-emerald-400">
                    <CardBody className="py-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-sm">#{o.id.slice(-6).toUpperCase()}</p>
                        <Badge variant="success">Listo ✓</Badge>
                      </div>
                      {o.customerName && (
                        <p className="text-xs text-gray-500">👤 {o.customerName}</p>
                      )}
                      <div className="space-y-1">
                        {o.details.map(d => (
                          <p key={d.id} className="text-xs text-gray-700">
                            <span className="font-bold text-primary-600">{d.quantity}×</span> {d.productName}
                          </p>
                        ))}
                      </div>
                      <p className="text-[10px] text-gray-400 border-t border-gray-100 pt-1">
                        {TYPE_ICONS[o.orderType]} {o.orderType === 'scheduled' ? 'Programado' : 'Domicilio'}
                        {o.orderType === 'delivery' && o.deliveryAddress && (
                          <span className="text-gray-500 ml-1">· {o.deliveryAddress}</span>
                        )}
                      </p>
                      {canDeliverOrders ? (
                        <Button
                          className="w-full mt-2"
                          variant="primary"
                          size="sm"
                          isLoading={updateMut.isPending}
                          onClick={() => handleStatusChange(o.id, 'delivered')}
                        >
                          ✓ Entregar al cliente
                        </Button>
                      ) : (
                        <p className="text-[10px] text-gray-400">
                          Esperando confirmación del cajero
                        </p>
                      )}
                    </CardBody>
                  </Card>
                ))
              )}
            </div>
          </div>

        </div>
      )}

      <Modal
        isOpen={Boolean(deliveryDraft.order)}
        onClose={() => setDeliveryDraft({ order: null, paymentType: 'cash' })}
        title="Registrar entrega"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Seleccione el método de pago para registrar la venta y cerrar el pedido.
          </p>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Método de pago</label>
            <select
              value={deliveryDraft.paymentType}
              onChange={(event) => setDeliveryDraft((current) => ({ ...current, paymentType: event.target.value as PaymentType }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
            >
              <option value="cash">Efectivo</option>
              <option value="qr">QR</option>
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" size="lg" className="px-8" onClick={() => setDeliveryDraft({ order: null, paymentType: 'cash' })}>
              Cancelar
            </Button>
            <Button variant="primary" size="lg" className="shadow-lg hover:shadow-xl transition-all px-8 font-bold" onClick={confirmDelivery} isLoading={deliverMut.isPending}>
              ✓ Confirmar entrega
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
