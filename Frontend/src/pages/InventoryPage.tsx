import type { FC } from 'react'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inventoryService } from '@/services/inventoryService'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { PageSpinner } from '@/components/ui/Spinner'
import { Pagination } from '@/components/ui/Pagination'
import { formatDate } from '@/lib/utils'
import { PencilSquareIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import type { Product } from '@/types'

export const InventoryPage: FC = () => {
  const qc = useQueryClient()
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [stockIncrease, setStockIncrease] = useState('')
  const [newMinStock, setNewMinStock] = useState('')
  const [lowStockPage, setLowStockPage] = useState(1)
  const [alertsPage, setAlertsPage] = useState(1)
  const pageSize = 8

  const { data: lowStock = [], isLoading: loadingLow } = useQuery({
    queryKey: ['low-stock'], queryFn: inventoryService.getLowStockProducts,
  })
  const { data: alerts = [], isLoading: loadingAlerts } = useQuery({
    queryKey: ['alerts'], queryFn: inventoryService.getAlerts,
  })

  const updateStockMut = useMutation({
    mutationFn: async ({ id, stock, increase }: { id: string; stock: number; increase: number }) => {
      const product = await inventoryService.updateStock(id, stock)
      const alert = alerts.find((item) => item.productId === id && !item.isResolved)
      if (alert && increase > 0) {
        await inventoryService.recordStockIncrease(alert.id, increase, stock)
      }
      return product
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['low-stock'] })
      qc.invalidateQueries({ queryKey: ['alerts'] })
      qc.invalidateQueries({ queryKey: ['active-alerts'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      toast.success('Stock actualizado')
      setEditingProduct(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const resolveAlertMut = useMutation({
    mutationFn: (id: string) => inventoryService.resolveAlert(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] })
      qc.invalidateQueries({ queryKey: ['active-alerts'] })
      toast.success('Alerta resuelta')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const handleSave = () => {
    if (!editingProduct) return
    const increase = parseInt(stockIncrease)
    if (isNaN(increase) || increase < 1) { toast.error('La cantidad a aumentar debe ser mayor que 0'); return }
    updateStockMut.mutate({ id: editingProduct.id, stock: editingProduct.stock + increase, increase })
  }

  if (loadingLow || loadingAlerts) return <PageSpinner />

  const paginatedLowStock = lowStock.slice((lowStockPage - 1) * pageSize, lowStockPage * pageSize)
  const paginatedAlerts = alerts.slice((alertsPage - 1) * pageSize, alertsPage * pageSize)

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Control de Inventario</h1>

      {/* Low stock products */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Productos con stock bajo</h2>
            {lowStock.length > 0 && <Badge variant="error">{lowStock.length}</Badge>}
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {lowStock.length === 0 ? (
            <p className="px-5 py-4 text-sm text-gray-500">✓ Todos los productos tienen stock suficiente</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Producto</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Categoría</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Stock actual</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Stock mínimo</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginatedLowStock.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 bg-red-50/30">
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3 text-gray-500">{p.category.name}</td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-red-600">{p.stock}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.minStock}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="secondary" size="sm" onClick={() => { setEditingProduct(p); setStockIncrease(''); setNewMinStock(String(p.minStock)) }}>
                        <PencilSquareIcon className="h-4 w-4" />Actualizar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="px-4 border-t border-gray-100">
            <Pagination page={lowStockPage} pageSize={pageSize} total={lowStock.length} onPageChange={setLowStockPage} />
          </div>
        </CardBody>
      </Card>

      {/* Alert history */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">Historial de alertas</h2>
        </CardHeader>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Producto</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Stock</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Mínimo</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Stock aumentado</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Estado</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Fecha alerta</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedAlerts.map(a => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">
                    <div>{a.productName}</div>
                    {a.message && (
                      <div className="text-xs text-gray-500 mt-1 truncate max-w-md">{a.message}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-red-600 font-bold">{a.currentStock}</td>
                  <td className="px-4 py-3 text-gray-600">{a.minStock}</td>
                  <td className="px-4 py-3 font-semibold text-emerald-700">+{a.stockQuantity}</td>
                  <td className="px-4 py-3">
                    <Badge variant={a.isResolved ? 'success' : 'error'}>{a.isResolved ? 'Resuelta' : 'Activa'}</Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(a.alertedAt)}</td>
                  <td className="px-4 py-3 text-right">
                    {!a.isResolved && (
                      <Button variant="ghost" size="sm" onClick={() => resolveAlertMut.mutate(a.id)}>
                        <CheckCircleIcon className="h-4 w-4 text-emerald-500" />Resolver
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
            <div className="px-4 border-t border-gray-100">
              <Pagination page={alertsPage} pageSize={pageSize} total={alerts.length} onPageChange={setAlertsPage} />
            </div>
        </CardBody>
      </Card>

      <Modal isOpen={!!editingProduct} onClose={() => setEditingProduct(null)} title="Actualizar stock" size="sm">
        {editingProduct && (
          <div className="space-y-4">
            <p className="text-sm font-medium">{editingProduct.name}</p>
            <Input label="Cantidad a aumentar" type="number" min="1" value={stockIncrease} onChange={e => setStockIncrease(e.target.value)} />
            <p className="text-sm text-gray-500">Stock actual: <span className="font-semibold text-gray-900">{editingProduct.stock}</span>. Nuevo stock: <span className="font-semibold text-emerald-700">{editingProduct.stock + (parseInt(stockIncrease) || 0)}</span></p>
            <Input label="Stock mínimo" type="number" min="1" value={newMinStock} onChange={e => setNewMinStock(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditingProduct(null)}>Cancelar</Button>
              <Button isLoading={updateStockMut.isPending} onClick={handleSave}>Guardar</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
