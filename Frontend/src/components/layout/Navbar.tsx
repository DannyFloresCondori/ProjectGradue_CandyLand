import type { FC } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { inventoryService } from '@/services/inventoryService'
import { orderService } from '@/services/orderService'
import {
  BellIcon, ChevronDownIcon, XMarkIcon,
  Bars3Icon,
  ExclamationTriangleIcon, CalendarDaysIcon, NoSymbolIcon,
  CheckIcon, TrashIcon, ArrowRightIcon,
} from '@heroicons/react/24/outline'
import { cn, formatRelativeTime, formatDateTime } from '@/lib/utils'
import { formatStockReturnMessage } from '@/lib/stockMessage'
import { confirmAction, showSuccessAlert } from '@/lib/alerts'
import type { Notification, Order } from '@/types'
import LogoImg from '@/assets/Logo.jpeg'
import toast from 'react-hot-toast'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  cajero: 'Cajero',
  inventario: 'Inventario',
}

const PRIORITY_STYLES: Record<string, string> = {
  high:   'border-l-red-500 bg-red-50',
  medium: 'border-l-amber-500 bg-amber-50',
  low:    'border-l-blue-400 bg-blue-50',
}

const PRIORITY_DOT: Record<string, string> = {
  high:   'bg-red-500',
  medium: 'bg-amber-500',
  low:    'bg-blue-400',
}

const TYPE_ICON: Record<Notification['type'], FC<{ className?: string }>> = {
  stock_alert:     ({ className }) => <ExclamationTriangleIcon className={className} />,
  order_scheduled: ({ className }) => <CalendarDaysIcon className={className} />,
  sale_cancelled:  ({ className }) => <NoSymbolIcon className={className} />,
}

type FilterTab = 'all' | 'unread'

const NotificationItem: FC<{
  notif: Notification
  onRead: (id: string) => void
  onRemove: (id: string) => void
  onNavigate: (link: string | null, id: string) => void
  onStartPreparation?: (id: string) => void
  onCancelOrder?: (id: string) => void
}> = ({ notif, onRead, onRemove, onNavigate, onStartPreparation, onCancelOrder }) => {
  const Icon = TYPE_ICON[notif.type]

  return (
    <li
      className={cn(
        'min-w-0 border-l-4 px-3 py-3 transition-colors hover:brightness-95 sm:px-4',
        notif.isRead ? 'border-l-gray-200 bg-white' : PRIORITY_STYLES[notif.priority]
      )}
    >
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
        <div className="mt-0.5 shrink-0">
          <Icon className={cn('h-4 w-4', notif.isRead ? 'text-gray-400' : 'text-gray-600')} />
        </div>

        <div className="min-w-0 w-full flex-1">
          <div className="flex min-w-0 items-start gap-2">
            {!notif.isRead && (
              <span className={cn('inline-block h-1.5 w-1.5 shrink-0 rounded-full', PRIORITY_DOT[notif.priority])} />
            )}
            <p className={cn('min-w-0 whitespace-normal wrap-break-word text-sm font-medium leading-tight', notif.isRead ? 'text-gray-600' : 'text-gray-900')}>
              {notif.title}
            </p>
          </div>
          <p className="mt-0.5 whitespace-normal wrap-break-word text-xs leading-relaxed text-gray-500">{notif.message}</p>
          <p className="mt-1 text-[10px] text-gray-400">{formatRelativeTime(notif.createdAt)}</p>
          {notif.id.startsWith('scheduled-due-') && onStartPreparation && onCancelOrder && (
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                onClick={() => onStartPreparation(notif.relatedId ?? '')}
                className="min-h-10 cursor-pointer rounded bg-primary-500 px-3 py-2 text-[10px] font-semibold text-white hover:bg-primary-600 sm:min-h-0 sm:py-1"
              >
                Iniciar preparación
              </button>
              <button
                onClick={() => onCancelOrder(notif.relatedId ?? '')}
                className="min-h-10 cursor-pointer rounded border border-red-200 px-3 py-2 text-[10px] font-semibold text-red-600 hover:bg-red-50 sm:min-h-0 sm:py-1"
              >
                Cancelar
              </button>
            </div>
          )}
          {notif.id.startsWith('scheduled-expired-') && onCancelOrder && (
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                onClick={() => onCancelOrder(notif.relatedId ?? '')}
                className="min-h-10 cursor-pointer rounded bg-red-500 px-3 py-2 text-[10px] font-semibold text-white hover:bg-red-600 sm:min-h-0 sm:py-1"
              >
                Sí, cancelar
              </button>
              <button
                onClick={() => onRead(notif.id)}
                className="min-h-10 cursor-pointer rounded border border-gray-200 px-3 py-2 text-[10px] font-semibold text-gray-600 hover:bg-gray-50 sm:min-h-0 sm:py-1"
              >
                No
              </button>
            </div>
          )}
        </div>

        <div className="flex shrink-0 self-end items-center gap-1 sm:self-start">
          {notif.link && (
            <button
              onClick={() => onNavigate(notif.link, notif.id)}
              className="cursor-pointer rounded p-2 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700 sm:p-1"
              title="Ver detalle"
              aria-label="Ir al módulo relacionado"
            >
              <ArrowRightIcon className="h-3.5 w-3.5" />
            </button>
          )}
          {!notif.isRead && (
            <button
              onClick={() => onRead(notif.id)}
              className="cursor-pointer rounded p-2 text-gray-400 transition-colors hover:bg-gray-200 hover:text-green-600 sm:p-1"
              title="Marcar como leída"
              aria-label="Marcar como leída"
            >
              <CheckIcon className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={() => onRemove(notif.id)}
            className="cursor-pointer rounded p-2 text-gray-400 transition-colors hover:bg-gray-200 hover:text-red-500 sm:p-1"
            title="Eliminar"
            aria-label="Eliminar notificación"
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </li>
  )
}

export const Navbar: FC = () => {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { toggleMobileSidebar } = useUIStore()

  const [menuOpen, setMenuOpen] = useState(false)
  const [notifsOpen, setNotifsOpen] = useState(false)
  const [filter, setFilter] = useState<FilterTab>('all')
  const [readAlertIds, setReadAlertIds] = useState<Record<string, boolean>>({})
  const [removedAlertIds, setRemovedAlertIds] = useState<string[]>([])
  const [readScheduledIds, setReadScheduledIds] = useState<Record<string, boolean>>({})
  const [removedScheduledIds, setRemovedScheduledIds] = useState<string[]>([])

  const bellRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const { data: activeAlerts = [] } = useQuery({
    queryKey: ['active-alerts'],
    queryFn: inventoryService.getActiveAlerts,
    // poll frequently so server-created alerts appear promptly in the Navbar
    refetchInterval: 3_000,
    staleTime: 1000 * 5,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  })

  const { data: allOrders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: orderService.getAll,
    refetchInterval: 30_000,
    staleTime: 1000 * 15,
    refetchOnWindowFocus: true,
  })

  const unresolvedAlerts = activeAlerts.filter((alert) => !alert.isResolved)
  const alertNotifications: Notification[] = unresolvedAlerts
    .filter((alert) => !removedAlertIds.includes(alert.id))
    .map((alert) => ({
      id: `alert-${alert.id}`,
      type: 'stock_alert',
      title: `Stock crítico: ${alert.productName}`,
      message: alert.message || `El stock actual es ${alert.currentStock} y el mínimo es ${alert.minStock}.`,
      priority: 'high',
      isRead: Boolean(readAlertIds[alert.id]),
      createdAt: alert.alertedAt,
      relatedId: alert.productId,
      link: '/inventario',
    }))

  // solo pedidos programados que aún están activos (no entregados ni cancelados)
  const scheduledOrders = allOrders.filter(
    (o) => o.orderType === 'scheduled' && ['pending', 'preparing', 'ready'].includes(o.status)
  )

  const scheduledNotifications: Notification[] = scheduledOrders
    .filter((o) => !removedScheduledIds.includes(o.id) && o.scheduledAt)
    .flatMap((o): Notification[] => {
      const minutesUntilDelivery = (new Date(o.scheduledAt!).getTime() - Date.now()) / 60_000
      if (o.status === 'pending' && minutesUntilDelivery > 0 && minutesUntilDelivery <= 120) {
        const remaining = Math.max(1, Math.ceil(minutesUntilDelivery))
        const timeLabel = remaining >= 60
          ? `${Math.floor(remaining / 60)} h ${remaining % 60} min`
          : `${remaining} min`
        return [{
          id: `scheduled-due-${o.id}`,
          type: 'order_scheduled' as const,
          title: `Pedido programado: ${o.customerName ?? 'Cliente General'}`,
          message: `Faltan ${timeLabel} para la entrega. ¿Desea comenzar la preparación?`,
          priority: 'medium' as const,
          isRead: Boolean(readScheduledIds[`due-${o.id}`]),
          createdAt: o.createdAt,
          relatedId: o.id,
          link: '/pedidos',
        }]
      }
      if (o.status === 'pending' && minutesUntilDelivery <= 0) {
        return [{
          id: `scheduled-expired-${o.id}`,
          type: 'order_scheduled' as const,
          title: `Pedido programado vencido: ${o.customerName ?? 'Cliente General'}`,
          message: `El pedido de ${o.customerName ?? 'Cliente General'} ya pasó la fecha de entrega. ¿Desea cancelarlo?`,
          priority: 'high' as const,
          isRead: Boolean(readScheduledIds[`expired-${o.id}`]),
          createdAt: o.createdAt,
          relatedId: o.id,
          link: '/pedidos',
        }]
      }
      return []
    })

  const allNotifications = [...alertNotifications, ...scheduledNotifications]
  const unread =
    alertNotifications.filter((n) => !n.isRead).length +
    scheduledNotifications.filter((n) => !n.isRead).length

  const displayed = filter === 'unread'
    ? allNotifications.filter((n) => !n.isRead)
    : allNotifications

  const handleMarkRead = (id: string) => {
    if (id.startsWith('alert-')) {
      const alertId = id.replace('alert-', '')
      setReadAlertIds((prev) => ({ ...prev, [alertId]: true }))
    } else if (id.startsWith('scheduled-')) {
      const orderId = id.replace('scheduled-', '')
      setReadScheduledIds((prev) => ({ ...prev, [orderId]: true }))
    }
  }

  const handleRemoveNotification = (id: string) => {
    if (id.startsWith('alert-')) {
      const alertId = id.replace('alert-', '')
      setRemovedAlertIds((prev) => [...prev, alertId])
    } else if (id.startsWith('scheduled-')) {
      const orderId = id.replace('scheduled-', '')
      setRemovedScheduledIds((prev) => [...prev, orderId])
    }
  }

  const handleMarkAllRead = () => {
    setReadAlertIds((prev) => {
      const next = { ...prev }
      activeAlerts.forEach((alert) => { next[alert.id] = true })
      return next
    })
    setReadScheduledIds((prev) => {
      const next = { ...prev }
      scheduledOrders.forEach((o) => { next[o.id] = true })
      return next
    })
  }

  const handleClearAll = () => {
    setRemovedAlertIds(activeAlerts.map((alert) => alert.id))
    setRemovedScheduledIds(scheduledOrders.map((o) => o.id))
  }

  const handleNavigate = (link: string | null, id: string) => {
    handleMarkRead(id)
    setNotifsOpen(false)
    if (link) navigate(link)
  }

  const startPreparationMut = useMutation({
    mutationFn: (id: string) => orderService.updateStatus(id, 'preparing'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['kitchen-orders'] })
      toast.success('Preparación iniciada')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const cancelOrderMut = useMutation({
    mutationFn: (order: Order) => orderService.cancel(order.id),
    onSuccess: (_, order) => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['kitchen-orders'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['products-active'] })
      qc.invalidateQueries({ queryKey: ['low-stock'] })
      showSuccessAlert('Pedido cancelado correctamente', formatStockReturnMessage(order.details))
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const handleStartPreparation = (id: string) => {
    if (id) startPreparationMut.mutate(id)
  }

  const handleCancelOrder = async (id: string) => {
    if (!id) return
    const order = scheduledOrders.find((item) => item.id === id)
    if (!order) return
    const confirmed = await confirmAction(
      '¿Cancelar pedido programado?',
      `¿Está seguro de cancelar el pedido #${id.slice(-6).toUpperCase()}?`,
      'Sí, cancelar pedido',
    )
    if (confirmed) cancelOrderMut.mutate(order)
  }

  // Close panels on click-outside and Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setNotifsOpen(false); setMenuOpen(false) }
    }
    const handleClick = (e: MouseEvent) => {
      if (notifsOpen && bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setNotifsOpen(false)
      }
      if (menuOpen && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('keydown', handleKey)
    document.addEventListener('mousedown', handleClick)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [notifsOpen, menuOpen])

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 md:px-6">
      <div className="hidden md:flex items-center gap-3">
        <img src={LogoImg} alt="Logo" className="h-7 w-7 object-contain" />
        <h1 className="text-sm font-medium text-gray-500">Sistema de Gestión — Heladería Candyland</h1>
      </div>

      <div className="ml-auto flex items-center gap-2">

        <button
          type="button"
          onClick={toggleMobileSidebar}
          className="rounded-md p-2 text-gray-500 hover:bg-gray-100 md:hidden"
          aria-label="Abrir menú"
        >
          <Bars3Icon className="h-5 w-5" />
        </button>

        {/* Notifications */}
        <div className="relative" ref={bellRef}>
          <button
            onClick={() => { setNotifsOpen(v => !v); setMenuOpen(false) }}
            className={cn(
              'relative cursor-pointer rounded-md p-2 transition-colors',
              notifsOpen ? 'bg-gray-100 text-gray-700' : 'text-gray-500 hover:bg-gray-100'
            )}
            aria-label="Notificaciones"
          >
            <BellIcon className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {notifsOpen && (
            <div className="fixed left-2 right-2 top-14 z-50 mt-2 flex max-h-[calc(100dvh-4.5rem)] min-w-0 w-auto max-w-none flex-col overflow-x-hidden overflow-y-hidden rounded-xl border border-gray-200 bg-white shadow-xl sm:absolute sm:left-auto sm:right-0 sm:top-full sm:w-[calc(100vw-1rem)] sm:max-w-96">
              {/* Header */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-gray-100 px-3 py-3 sm:flex-nowrap sm:justify-between sm:px-4">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <p className="whitespace-normal text-sm font-semibold text-gray-900">Notificaciones</p>
                  {unread > 0 && (
                    <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
                      {unread} sin leer
                    </span>
                  )}
                </div>
                <div className="flex w-full items-center justify-end gap-1 sm:w-auto">
                  {unread > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="min-h-10 cursor-pointer rounded px-2 py-2 text-xs text-primary-600 transition-colors hover:bg-primary-50 sm:min-h-0 sm:py-1"
                    >
                      Marcar todas
                    </button>
                  )}
                  <button
                    onClick={() => setNotifsOpen(false)}
                    className="cursor-pointer rounded p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 sm:p-1"
                    aria-label="Cerrar"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Filter tabs */}
              <div className="flex border-b border-gray-100 px-4">
                {(['all', 'unread'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setFilter(tab)}
                    className={cn(
                      'cursor-pointer border-b-2 py-2 pr-4 text-xs font-medium transition-colors',
                      filter === tab
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    )}
                  >
                    {tab === 'all' ? 'Todas' : `Sin leer${unread > 0 ? ` (${unread})` : ''}`}
                  </button>
                ))}
              </div>

              {/* List */}
              <ul className="min-h-0 flex-1 divide-y divide-gray-50 overflow-x-hidden overflow-y-auto sm:max-h-80">
                {displayed.length === 0 ? (
                  <li className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                    <BellIcon className="h-8 w-8 text-gray-300" />
                    <p className="text-sm text-gray-400">
                      {filter === 'unread' ? 'No hay notificaciones sin leer' : 'No hay notificaciones'}
                    </p>
                  </li>
                ) : (
                  displayed.map(n => (
                    <NotificationItem
                      key={n.id}
                      notif={n}
                      onRead={handleMarkRead}
                      onRemove={handleRemoveNotification}
                      onNavigate={handleNavigate}
                      onStartPreparation={handleStartPreparation}
                      onCancelOrder={handleCancelOrder}
                    />
                  ))
                )}
              </ul>

              {(alertNotifications.length > 0 || scheduledNotifications.length > 0) && (
                <div className="shrink-0 border-t border-gray-100 px-3 py-3 sm:px-4 sm:py-2">
                  <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      onClick={handleClearAll}
                      className="cursor-pointer self-start text-xs text-gray-400 transition-colors hover:text-red-500 sm:self-auto"
                    >
                      Limpiar todas
                    </button>
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-1.5">
                      {scheduledNotifications.length > 0 && (
                        <button
                          onClick={() => { setNotifsOpen(false); navigate('/pedidos') }}
                          className="min-h-10 w-full cursor-pointer rounded bg-amber-50 px-3 py-2 text-center text-[11px] font-semibold text-amber-700 transition-colors hover:bg-amber-100 sm:min-h-0 sm:w-auto sm:py-1"
                        >
                          Ver pedidos
                        </button>
                      )}
                      {alertNotifications.length > 0 && (
                        <button
                          onClick={() => { setNotifsOpen(false); navigate('/inventario') }}
                          className="min-h-10 w-full cursor-pointer rounded bg-primary-50 px-3 py-2 text-center text-[11px] font-semibold text-primary-700 transition-colors hover:bg-primary-100 sm:min-h-0 sm:w-auto sm:py-1"
                        >
                          Ir a inventario
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => { setMenuOpen(v => !v); setNotifsOpen(false) }}
            className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <div className="h-7 w-7 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-xs font-bold text-primary-700">
                {user?.fullName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium leading-none">{user?.fullName}</p>
              <p className="text-xs text-gray-400 mt-0.5">{ROLE_LABELS[user?.role ?? ''] ?? user?.role}</p>
            </div>
            <ChevronDownIcon className={cn('h-4 w-4 text-gray-400 transition-transform', menuOpen && 'rotate-180')} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-gray-200 bg-white shadow-lg">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-medium">{user?.fullName}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <button
                onClick={logout}
                className="w-full cursor-pointer px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
