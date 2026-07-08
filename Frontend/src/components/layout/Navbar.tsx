import type { FC } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { inventoryService } from '@/services/inventoryService'
import { orderService } from '@/services/orderService'
import {
  BellIcon, ChevronDownIcon, XMarkIcon,
  ExclamationTriangleIcon, CalendarDaysIcon, NoSymbolIcon,
  CheckIcon, TrashIcon, ArrowRightIcon,
} from '@heroicons/react/24/outline'
import { cn, formatRelativeTime, formatDateTime } from '@/lib/utils'
import type { Notification } from '@/types'
import LogoImg from '@/assets/Logo.jpeg'

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
}> = ({ notif, onRead, onRemove, onNavigate }) => {
  const Icon = TYPE_ICON[notif.type]

  return (
    <li
      className={cn(
        'border-l-4 px-4 py-3 transition-colors hover:brightness-95',
        notif.isRead ? 'border-l-gray-200 bg-white' : PRIORITY_STYLES[notif.priority]
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          <Icon className={cn('h-4 w-4', notif.isRead ? 'text-gray-400' : 'text-gray-600')} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {!notif.isRead && (
              <span className={cn('inline-block h-1.5 w-1.5 shrink-0 rounded-full', PRIORITY_DOT[notif.priority])} />
            )}
            <p className={cn('text-sm font-medium leading-tight', notif.isRead ? 'text-gray-600' : 'text-gray-900')}>
              {notif.title}
            </p>
          </div>
          <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">{notif.message}</p>
          <p className="mt-1 text-[10px] text-gray-400">{formatRelativeTime(notif.createdAt)}</p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {notif.link && (
            <button
              onClick={() => onNavigate(notif.link, notif.id)}
              className="cursor-pointer rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition-colors"
              title="Ver detalle"
              aria-label="Ir al módulo relacionado"
            >
              <ArrowRightIcon className="h-3.5 w-3.5" />
            </button>
          )}
          {!notif.isRead && (
            <button
              onClick={() => onRead(notif.id)}
              className="cursor-pointer rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-green-600 transition-colors"
              title="Marcar como leída"
              aria-label="Marcar como leída"
            >
              <CheckIcon className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={() => onRemove(notif.id)}
            className="cursor-pointer rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-red-500 transition-colors"
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
    .filter((o) => !removedScheduledIds.includes(o.id))
    .map((o) => ({
      id: `scheduled-${o.id}`,
      type: 'order_scheduled',
      title: `Pedido programado: ${o.customerName ?? 'Cliente General'}`,
      message: o.scheduledAt
        ? `Entrega programada para el ${formatDateTime(o.scheduledAt)}.`
        : 'Pedido programado sin fecha de entrega definida.',
      priority: 'medium',
      isRead: Boolean(readScheduledIds[o.id]),
      createdAt: o.createdAt,
      relatedId: o.id,
      link: '/pedidos',
    }))

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
            <div className="absolute right-0 top-full z-50 mt-2 w-96 rounded-xl border border-gray-200 bg-white shadow-xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900">Notificaciones</p>
                  {unread > 0 && (
                    <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
                      {unread} sin leer
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {unread > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="cursor-pointer rounded px-2 py-1 text-xs text-primary-600 hover:bg-primary-50 transition-colors"
                    >
                      Marcar todas
                    </button>
                  )}
                  <button
                    onClick={() => setNotifsOpen(false)}
                    className="cursor-pointer rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
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
              <ul className="max-h-80 divide-y divide-gray-50 overflow-y-auto">
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
                    />
                  ))
                )}
              </ul>

              {(alertNotifications.length > 0 || scheduledNotifications.length > 0) && (
                <div className="border-t border-gray-100 px-4 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={handleClearAll}
                      className="cursor-pointer text-xs text-gray-400 hover:text-red-500 transition-colors"
                    >
                      Limpiar todas
                    </button>
                    <div className="flex items-center gap-1.5">
                      {scheduledNotifications.length > 0 && (
                        <button
                          onClick={() => { setNotifsOpen(false); navigate('/pedidos') }}
                          className="cursor-pointer rounded bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-100 transition-colors"
                        >
                          Ver pedidos
                        </button>
                      )}
                      {alertNotifications.length > 0 && (
                        <button
                          onClick={() => { setNotifsOpen(false); navigate('/inventario') }}
                          className="cursor-pointer rounded bg-primary-50 px-2 py-1 text-[11px] font-semibold text-primary-700 hover:bg-primary-100 transition-colors"
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
