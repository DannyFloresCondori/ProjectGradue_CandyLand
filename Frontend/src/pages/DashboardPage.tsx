import type { FC } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportService } from '@/services/reportService'
import { inventoryService } from '@/services/inventoryService'
import { orderService } from '@/services/orderService'
import { saleService } from '@/services/saleService'
import { StatCard } from '@/components/ui/StatCard'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { PageSpinner } from '@/components/ui/Spinner'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import {
  ShoppingCartIcon, CurrencyDollarIcon,
  ClipboardDocumentListIcon, ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, BarChart, Bar, Legend,
} from 'recharts'

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export const DashboardPage: FC = () => {
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: () => reportService.getDashboardMetrics(),
  })

  const { data: alerts } = useQuery({
    queryKey: ['active-alerts'],
    queryFn: () => inventoryService.getActiveAlerts(),
  })

  const { data: pending } = useQuery({
    queryKey: ['pending-orders'],
    queryFn: () => orderService.getPending(),
  })

  const { data: sales = [], isLoading: salesLoading } = useQuery({
    queryKey: ['dashboard-sales'],
    queryFn: () => saleService.getAll(),
  })

  if (metricsLoading || salesLoading) return <PageSpinner />

  const completedSales = sales.filter((sale) => sale.status === 'delivered')
  const weeklyData = (() => {
    const today = new Date()
    const days = Array.from({ length: 7 }, (_, index) => {
      const day = new Date(today)
      day.setDate(today.getDate() - (6 - index))
      return day
    })

    return days.map((day) => {
      const dayKey = day.toISOString().slice(0, 10)
      const revenue = completedSales
        .filter((sale) => sale.createdAt.slice(0, 10) === dayKey)
        .reduce((sum, sale) => sum + sale.total, 0)
      const dayIndex = day.getDay() === 0 ? 6 : day.getDay() - 1
      return { day: DAYS[dayIndex], revenue }
    })
  })()

  const topProducts = (() => {
    const productMap = new Map<string, { name: string; ventas: number; ingresos: number }>()

    completedSales.forEach((sale) => {
      sale.details.forEach((detail) => {
        const prev = productMap.get(detail.productId) ?? { name: detail.productName, ventas: 0, ingresos: 0 }
        productMap.set(detail.productId, {
          name: detail.productName,
          ventas: prev.ventas + detail.quantity,
          ingresos: prev.ingresos + detail.subtotal,
        })
      })
    })

    return Array.from(productMap.values())
      .sort((a, b) => b.ventas - a.ventas)
      .slice(0, 5)
  })()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Resumen del día — Heladería Candyland</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="Ventas hoy"
          value={metrics?.todaySalesCount ?? 0}
          icon={<ShoppingCartIcon className="h-5 w-5" />}
          subtitle="Ventas completadas"
        />
        <StatCard
          title="Ingresos hoy"
          value={formatCurrency(metrics?.todayRevenue ?? 0)}
          icon={<CurrencyDollarIcon className="h-5 w-5" />}
          iconBg="bg-emerald-50"
        />
        <StatCard
          title="Pedidos pendientes"
          value={pending?.length ?? 0}
          icon={<ClipboardDocumentListIcon className="h-5 w-5" />}
          iconBg="bg-amber-50"
        />
        <StatCard
          title="Alertas de stock"
          value={alerts?.length ?? 0}
          icon={<ExclamationTriangleIcon className="h-5 w-5" />}
          iconBg="bg-red-50"
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Weekly revenue */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <h3 className="text-sm font-medium text-gray-900">Ingresos — Últimos 7 días</h3>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={weeklyData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E75480" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#E75480" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={v => `Bs.${v}`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [formatCurrency(v as number), 'Ingresos']} />
                <Area
                  type="monotone" dataKey="revenue"
                  stroke="#E75480" strokeWidth={2}
                  fill="url(#colorRevenue)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        {/* Alerts */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-medium text-gray-900">Alertas de stock</h3>
          </CardHeader>
          <CardBody className="p-0">
            {!alerts || alerts.length === 0 ? (
              <p className="px-5 py-4 text-sm text-gray-500">Sin alertas activas</p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {alerts.map(alert => (
                  <li key={alert.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800 truncate max-w-40">{alert.productName}</p>
                      <p className="text-xs text-gray-400">Stock: {alert.currentStock} / Mín: {alert.minStock}</p>
                    </div>
                    <Badge variant="error">Bajo</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Top products */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h3 className="text-sm font-medium text-gray-900">Productos más vendidos</h3>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topProducts} layout="vertical" margin={{ left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                <Tooltip />
                <Legend />
                <Bar dataKey="ventas" fill="#E75480" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        {/* Recent sales */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-medium text-gray-900">Ventas recientes</h3>
          </CardHeader>
          <CardBody className="p-0">
            <ul className="divide-y divide-gray-50">
              {completedSales.slice(0, 5).map(s => (
                <li key={s.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {s.customerName ?? 'Cliente general'}
                    </p>
                    <p className="text-xs text-gray-400">{formatDateTime(s.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(s.total)}</p>
                    <Badge variant={s.paymentType === 'cash' ? 'default' : 'pink'}>
                      {s.paymentType === 'cash' ? 'Efectivo' : 'QR'}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
