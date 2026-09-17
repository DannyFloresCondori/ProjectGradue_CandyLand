import type { FC } from 'react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportService } from '@/services/reportService'
import { saleService } from '@/services/saleService'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatCard } from '@/components/ui/StatCard'
import { PageSpinner } from '@/components/ui/Spinner'
import { Modal } from '@/components/ui/Modal'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { CurrencyDollarIcon, ShoppingCartIcon, XCircleIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import LogoImg from '@/assets/Logo.jpeg'

const COLORS = ['#E75480', '#111827']

const presets = [
  { label: 'Hoy', days: 1 },
  { label: 'Esta semana', days: 7 },
  { label: 'Este mes', days: 30 },
]

function formatDateInput(date: Date) {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy.toISOString().slice(0, 10)
}

function parseLocalDate(date: string) {
  return new Date(`${date}T00:00:00`)
}

function getRangeForPreset(end: Date, presetIndex: number) {
  const from = new Date(end)
  from.setHours(0, 0, 0, 0)
  if (presets[presetIndex].days > 1) {
    from.setDate(from.getDate() - (presets[presetIndex].days - 1))
  }
  return { from, to: end }
}

export const ReportsPage: FC = () => {
  const [preset, setPreset] = useState(0)
  const [toDate, setToDate] = useState(() => formatDateInput(new Date()))
  const [fromDate, setFromDate] = useState(() => {
    const { from } = getRangeForPreset(new Date(), 0)
    return formatDateInput(from)
  })

  const { data, isLoading } = useQuery({
    queryKey: ['report', fromDate, toDate],
    queryFn: () => {
      const from = parseLocalDate(fromDate)
      const to = new Date(parseLocalDate(toDate))
      to.setHours(23, 59, 59, 999)
      return reportService.getSalesReport(from, to)
    },
  })

  const handlePreset = (index: number) => {
    setPreset(index)
    const now = new Date()
    const { from, to } = getRangeForPreset(now, index)
    setFromDate(formatDateInput(from))
    setToDate(formatDateInput(to))
  }

  const handleShiftBackward = () => {
    if (preset < 0) return
    const shiftDays = presets[preset].days || 1
    const currentTo = parseLocalDate(toDate)
    currentTo.setDate(currentTo.getDate() - shiftDays)
    const { from, to } = getRangeForPreset(currentTo, preset)
    setFromDate(formatDateInput(from))
    setToDate(formatDateInput(to))
  }

  const handleShiftForward = () => {
    if (preset < 0) return
    const shiftDays = presets[preset].days || 1
    const currentTo = parseLocalDate(toDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const candidate = new Date(currentTo)
    candidate.setDate(candidate.getDate() + shiftDays)
    const finalTo = candidate > today ? today : candidate
    const { from, to } = getRangeForPreset(finalTo, preset)
    setFromDate(formatDateInput(from))
    setToDate(formatDateInput(to))
  }

  const rangeLabel = preset === 0
    ? `Hoy: ${formatDate(new Date(fromDate))}`
    : `Del ${formatDate(new Date(fromDate))} al ${formatDate(new Date(toDate))}`

  const todayStr = formatDateInput(new Date())
  const forwardDisabled = parseLocalDate(toDate) >= parseLocalDate(todayStr)
  const [showCancelled, setShowCancelled] = useState(false)
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null)

  const { data: cancelledList, isLoading: loadingCancelled } = useQuery({
    queryKey: ['cancelled-sales', fromDate, toDate],
    queryFn: async () => {
      const from = parseLocalDate(fromDate)
      const to = new Date(parseLocalDate(toDate))
      to.setHours(23, 59, 59, 999)
      const all = await saleService.getAll()
      return all.filter((s) => {
        const d = new Date(s.createdAt)
        return d >= from && d <= to && s.status === 'canceled'
      })
    },
    enabled: showCancelled,
  })

  const { data: selectedSale, isLoading: loadingSelectedSale } = useQuery({
    queryKey: ['sale', selectedSaleId],
    queryFn: () => (selectedSaleId ? saleService.getById(selectedSaleId) : Promise.resolve(null)),
    enabled: !!selectedSaleId,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-4">
          <img src={LogoImg} alt="Logo" className="h-12 w-12 object-contain" />
          <div>
            <h1 className="text-lg font-semibold">Reportes de ventas</h1>
            <p className="text-sm text-gray-500">Seleccione la fecha de reportes</p>
          </div>
        </div>
      </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between w-full">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-600">Desde</label>
              <input
                type="date"
                value={fromDate}
                max={toDate}
                onChange={(e) => { setFromDate(e.target.value); setPreset(-1) }}
                className="rounded border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1 sm:ml-4">
              <label className="text-xs font-semibold text-gray-600">Hasta</label>
              <input
                type="date"
                value={toDate}
                min={fromDate}
                onChange={(e) => { setToDate(e.target.value); setPreset(-1) }}
                className="rounded border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col items-center w-full">
            <div className="flex flex-wrap gap-2 justify-center">
              {presets.map((p, i) => (
                <Button
                  key={p.label}
                  variant={preset === i ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => handlePreset(i)}
                >
                  {p.label}
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-2 mt-2">
              <Button variant="ghost" size="sm" onClick={handleShiftBackward} disabled={preset < 0}>
                <ChevronLeftIcon className="h-4 w-4" />
              </Button>

              <div className="text-sm text-gray-500 text-center py-2 px-3 border border-gray-200 rounded-md bg-white shadow-sm">
                {rangeLabel}
              </div>

              {!forwardDisabled && (
                <Button variant="ghost" size="sm" onClick={handleShiftForward}>
                  <ChevronRightIcon className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

      {isLoading && <PageSpinner />}
      {!isLoading && data && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <StatCard title="Ventas completadas" value={data.totalSales} icon={<ShoppingCartIcon className="h-5 w-5" />} />
            <StatCard title="Ingresos totales" value={formatCurrency(data.totalRevenue)} icon={<CurrencyDollarIcon className="h-5 w-5" />} iconBg="bg-emerald-50" />
            <div role="button" tabIndex={0} onClick={() => setShowCancelled(true)} onKeyDown={(e) => { if (e.key === 'Enter') setShowCancelled(true) }} className="cursor-pointer hover:shadow-md transition-shadow">
              <StatCard title="Ventas anuladas" value={data.cancelledSales} icon={<XCircleIcon className="h-5 w-5" />} iconBg="bg-red-50" />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {/* Daily sales chart */}
            <Card className="lg:col-span-2">
              <CardHeader><h3 className="text-sm font-medium">Ventas por día</h3></CardHeader>
              <CardBody>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.salesByDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="date" tickFormatter={d => formatDate(d).slice(0, 5)} tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" orientation="left" tickFormatter={v => `Bs.${v}`} tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v, name) => [name === 'revenue' ? formatCurrency(v as number) : v, name === 'revenue' ? 'Ingresos' : 'Ventas']} />
                    <Bar yAxisId="left" dataKey="revenue" fill="#E75480" radius={[4, 4, 0, 0]} name="revenue" />
                    <Bar yAxisId="right" dataKey="count" fill="#e5e7eb" radius={[4, 4, 0, 0]} name="count" />
                  </BarChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>

            {/* Payment breakdown */}
            <Card>
              <CardHeader><h3 className="text-sm font-medium">Método de pago</h3></CardHeader>
              <CardBody>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={data.salesByPayment} dataKey="count" nameKey="method" cx="50%" cy="50%" outerRadius={70} label={({ method, percent }) => `${method} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                      {data.salesByPayment.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => [v, '']} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 space-y-1">
                  {data.salesByPayment.map((p, i) => (
                    <div key={p.method} className="flex justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                        <span>{p.method}</span>
                      </div>
                      <span className="font-medium">{formatCurrency(p.revenue)}</span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Cancelled sales modal */}
          <Modal isOpen={showCancelled} onClose={() => { setShowCancelled(false); setSelectedSaleId(null) }} title={`Ventas anuladas (${data.cancelledSales})`} size="xl">
            {loadingCancelled ? (
              <PageSpinner />
            ) : (
              <div>
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-100 bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Venta</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Fecha</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Cliente</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Total</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Razón</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(cancelledList ?? []).map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs">#{s.id.slice(-6).toUpperCase()}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">{formatDate(new Date(s.createdAt))}</td>
                        <td className="px-4 py-3 text-gray-600">{s.customerName ?? 'General'}</td>
                        <td className="px-4 py-3 font-semibold text-primary-600">{formatCurrency(s.total)}</td>
                        <td className="px-4 py-3 text-sm text-red-600">{s.cancellationReason ?? '—'}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setSelectedSaleId(s.id)}>Ver detalles</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {(cancelledList ?? []).length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-400">No hay ventas anuladas en el período seleccionado</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Modal>

          {/* Selected sale detail modal */}
          <Modal isOpen={!!selectedSaleId} onClose={() => setSelectedSaleId(null)} title={`Venta #${selectedSaleId ? selectedSaleId.slice(-6).toUpperCase() : ''}`} size="md">
            {loadingSelectedSale || !selectedSale ? (
              <PageSpinner />
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Estado</p>
                    <p className="font-medium text-red-700">Anulada</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Fecha</p>
                    <p className="font-medium">{formatDateTime(selectedSale.createdAt)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500">Cliente</p>
                    <p className="font-medium">{selectedSale.customerName ?? 'General'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500">Razón de anulación</p>
                    <p className="font-medium text-red-700">{selectedSale.cancellationReason ?? '—'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Productos</p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-500">
                        <th className="text-left pb-1">Producto</th>
                        <th className="text-center pb-1">Cant.</th>
                        <th className="text-right pb-1">P.U.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {selectedSale.details.map(d => (
                        <tr key={d.id}>
                          <td className="py-1">{d.productName}</td>
                          <td className="py-1 text-center">{d.quantity}</td>
                          <td className="py-1 text-right">{formatCurrency(d.unitPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2 mt-2 font-bold">
                  <span>Total</span>
                  <span className="text-primary-600">{formatCurrency(selectedSale.total)}</span>
                </div>
              </div>
            )}
          </Modal>

          {/* Top products */}
          <Card>
            <CardHeader><h3 className="text-sm font-medium">Productos más vendidos</h3></CardHeader>
            <CardBody className="p-0">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100 bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Producto</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Unidades</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Ingresos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.topProducts.map((p, i) => (
                    <tr key={p.productId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 flex items-center gap-2">
                        <span className={`text-xs font-bold w-5 text-center ${i === 0 ? 'text-amber-500' : 'text-gray-400'}`}>#{i + 1}</span>
                        {p.productName}
                      </td>
                      <td className="px-4 py-3 font-medium">{p.quantity}</td>
                      <td className="px-4 py-3 font-semibold text-primary-600">{formatCurrency(p.revenue)}</td>
                    </tr>
                  ))}
                  {data.topProducts.length === 0 && (
                    <tr><td colSpan={3} className="px-4 py-6 text-center text-sm text-gray-400">Sin datos en el período seleccionado</td></tr>
                  )}
                </tbody>
              </table>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  )
}
