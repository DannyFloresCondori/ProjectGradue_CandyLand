import type { FC } from 'react'
import { useMemo, useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { saleService } from '@/services/saleService'
import { productService } from '@/services/productService'
import { customerService } from '@/services/customerService'
import { promotionService } from '@/services/promotionService'
import { toppingService } from '@/services/toppingService'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Card, CardBody } from '@/components/ui/Card'
import { PageSpinner } from '@/components/ui/Spinner'
import { CustomerSearch } from '@/components/shared/CustomerSearch'
import { QuickCustomerModal } from '@/components/shared/QuickCustomerModal'
import { ProductCatalog } from '@/components/shared/ProductCatalog'
import { QuantityControl } from '@/components/shared/QuantityControl'
import { ToppingSelector } from '@/components/shared/ToppingSelector'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { PlusIcon, PrinterIcon, XMarkIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import type { Sale, SaleDetailInput, PaymentType, Customer, Promotion, Product, Category } from '@/types'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CartItem {
  productId: string
  productName: string
  unitPrice: number
  quantity: number
  toppingIds: string[]
}

// ─── Ticket ───────────────────────────────────────────────────────────────────

const Ticket: FC<{ sale: Sale; onClose: () => void; onPrintTicket?: (sale: Sale) => void }> = ({ sale, onClose, onPrintTicket }) => (
  <div className="space-y-4">
    <div className="text-center border-b border-dashed border-gray-300 pb-3">
      <p className="font-bold text-lg">🍦 CandyLand</p>
      <p className="text-xs text-gray-500">Heladería Artesanal</p>
      <p className="text-xs text-gray-400">Cochabamba, Bolivia</p>
    </div>
    <div className="text-xs text-gray-600 space-y-1">
      <p><span className="font-medium">Ticket:</span> #{sale.id.slice(-6).toUpperCase()}</p>
      <p><span className="font-medium">Fecha:</span> {formatDateTime(sale.createdAt)}</p>
      <p><span className="font-medium">Registrado por:</span> {sale.userName}</p>
      <p><span className="font-medium">Confirmado por:</span> {sale.userName}{sale.userRole ? ` · ${sale.userRole}` : ''}</p>
      {sale.customerName && <p><span className="font-medium">Cliente:</span> {sale.customerName}</p>}
      <p>
        <span className="font-medium">Tipo:</span>{' '}
        {sale.orderType === 'scheduled' ? 'Programado'
          : sale.orderType === 'delivery' ? 'Domicilio'
          : 'Local'}
      </p>
      {sale.scheduledAt && <p><span className="font-medium">Entrega programada:</span> {formatDateTime(sale.scheduledAt)}</p>}
      {sale.deliveryAddress && <p><span className="font-medium">Dirección:</span> {sale.deliveryAddress}</p>}
    </div>
    <div className="border-t border-dashed border-gray-300 pt-3">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-500">
            <th className="text-left pb-1">Producto</th>
            <th className="text-center pb-1">Cant.</th>
            <th className="text-right pb-1">P.U.</th>
            <th className="text-right pb-1">Subtotal</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {sale.details.map(d => (
            <tr key={d.id}>
              <td className="py-1">
                <div>{d.productName}</div>
                {d.toppings.length > 0 && (
                  <div className="text-[10px] text-gray-500">+ {d.toppings.map((topping) => topping.toppingName).join(', ')}</div>
                )}
              </td>
              <td className="py-1 text-center">{d.quantity}</td>
              <td className="py-1 text-right">{formatCurrency(d.unitPrice)}</td>
              <td className="py-1 text-right">{formatCurrency(d.subtotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <div className="border-t border-gray-300 pt-2 flex justify-between items-center font-bold">
      <span>TOTAL</span><span>{formatCurrency(sale.total)}</span>
    </div>
    <div className="text-xs text-gray-500 text-center">
      Pago: <span className="font-medium">{sale.paymentType === 'cash' ? 'Efectivo' : 'QR'}</span>
    </div>
    <div className="text-center text-xs text-gray-400 border-t border-dashed border-gray-300 pt-2">
      ¡Gracias por su compra!
    </div>
    <div className="flex gap-2">
      <Button variant="secondary" size="sm" className="flex-1" onClick={() => onPrintTicket?.(sale)}>
        <PrinterIcon className="h-4 w-4" />Imprimir
      </Button>
      <Button size="sm" className="flex-1" onClick={onClose}>Cerrar</Button>
    </div>
  </div>
)

const SaleStatusBadge: FC<{ status: Sale['status'] }> = ({ status }) => {
  const map: Record<string, { variant: 'success' | 'error'; label: string }> = {
    delivered: { variant: 'success', label: 'Entregada' },
    canceled: { variant: 'error', label: 'Cancelada' },
  }
  const config = map[status] ?? { variant: 'default', label: status ?? 'Desconocido' }
  return <Badge variant={config.variant as any}>{config.label}</Badge>
}

// ─── SalesPage ────────────────────────────────────────────────────────────────

export const SalesPage: FC = () => {
  const qc = useQueryClient()
  const { user } = useAuthStore()

  const [isNewOpen, setIsNewOpen] = useState(false)
  const [ticketSale, setTicketSale] = useState<Sale | null>(null)
  const [cancelModal, setCancelModal] = useState<{ sale: Sale; reason: string } | null>(null)

  const [cart, setCart] = useState<CartItem[]>([])
  const [paymentType, setPaymentType] = useState<PaymentType>('cash')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [isGeneralClient, setIsGeneralClient] = useState(false)
  const [stockMap, setStockMap] = useState<Record<string, number>>({})

  const [quickCustomerOpen, setQuickCustomerOpen] = useState(false)
  const [quickPrefill, setQuickPrefill] = useState('')

  const { data: sales = [], isLoading } = useQuery({ queryKey: ['sales'], queryFn: saleService.getAll })
  const { data: products = [] } = useQuery({ queryKey: ['products-active'], queryFn: productService.getActive })
  const { data: toppings = [] } = useQuery({ queryKey: ['toppings'], queryFn: toppingService.getActive })
  const { data: customers = [] } = useQuery({ queryKey: ['customers-active'], queryFn: customerService.getActive })

  const categories: Category[] = Array.from(
    new Map(products.map((p: Product) => [p.categoryId, p.category])).values()
  )

  useEffect(() => {
    setStockMap(() => Object.fromEntries(products.map((product) => [product.id, product.stock])))
  }, [products])

  const catalogProducts = useMemo(
    () =>
      products.map((product) => ({
        ...product,
        stock: stockMap[product.id] ?? product.stock,
      })),
    [products, stockMap],
  )

  const getDisplayStock = (productId: string) => {
    const product = products.find((p: Product) => p.id === productId)
    if (!product) return 0
    return stockMap[product.id] ?? product.stock
  }

  const adjustStock = (productId: string, delta: number) => {
    const product = products.find((p: Product) => p.id === productId)
    if (!product) return
    setStockMap((prev) => ({
      ...prev,
      [productId]: Math.max(0, (prev[productId] ?? product.stock) + delta),
    }))
  }

  const resetStockMap = (baseProducts: Product[] = products) => {
    setStockMap(Object.fromEntries(baseProducts.map((product) => [product.id, product.stock])))
  }

  const groupedSales = useMemo(() => {
    const sortedSales = [...sales].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    const groups = new Map<string, { key: string; label: string; total: number; sales: Sale[] }>()

    sortedSales.forEach((sale) => {
      const saleDate = new Date(sale.createdAt)
      const dayKey = saleDate.toISOString().split('T')[0]
      const existing = groups.get(dayKey)

      if (existing) {
        existing.total += sale.total
        existing.sales.push(sale)
        return
      }

      groups.set(dayKey, {
        key: dayKey,
        label: saleDate.toLocaleDateString('es-BO', {
          weekday: 'long',
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        }),
        total: sale.total,
        sales: [sale],
      })
    })

    return Array.from(groups.values())
  }, [sales])

  const addToCart = (productId: string) => {
    const prod = products.find((p: Product) => p.id === productId)
    if (!prod) return
    const availableStock = getDisplayStock(productId)
    if (availableStock <= 0) { toast.error(`"${prod.name}" sin stock`); return }
    const existing = cart.find(i => i.productId === productId)
    if (existing) {
      if (existing.quantity >= availableStock) { toast.error(`Stock insuficiente (máx: ${availableStock})`); return }
      adjustStock(productId, -1)
      setCart(c => c.map(i => i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i))
    } else {
      adjustStock(productId, -1)
      setCart(c => [...c, { productId, productName: prod.name, unitPrice: prod.price, quantity: 1, toppingIds: [] }])
    }
  }

  const toggleTopping = (productId: string, toppingId: string) => {
    setCart((current) =>
      current.map((item) => {
        if (item.productId !== productId) return item

        const isSelected = item.toppingIds.includes(toppingId)
        if (isSelected) {
          return { ...item, toppingIds: item.toppingIds.filter((id) => id !== toppingId) }
        }

        if (item.toppingIds.length >= 2) {
          toast.error('Solo puedes elegir máximo 2 toppings por producto')
          return item
        }

        return { ...item, toppingIds: [...item.toppingIds, toppingId] }
      }),
    )
  }

  const removeFromCart = (productId: string) => {
    const item = cart.find(i => i.productId === productId)
    if (item) adjustStock(productId, item.quantity)
    setCart(c => c.filter(i => i.productId !== productId))
  }

  const updateQty = (productId: string, qty: number) => {
    const currentItem = cart.find(i => i.productId === productId)
    const currentQty = currentItem?.quantity ?? 0
    if (qty < 1) { removeFromCart(productId); return }
    const delta = qty - currentQty
    if (delta > 0) {
      const availableStock = getDisplayStock(productId)
      if (availableStock < delta) { toast.error(`Stock insuficiente (máx: ${availableStock})`); return }
      adjustStock(productId, -delta)
    } else if (delta < 0) {
      adjustStock(productId, -delta)
    }
    setCart(c => c.map(i => i.productId === productId ? { ...i, quantity: qty } : i))
  }

  const cartSubtotal = cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
  const cartTotal = cart.reduce((sum, item) => {
    const product = products.find((p: Product) => p.id === item.productId)
    if (!product) return sum
    const promotion = product.promotion
    if (!promotion || !promotion.isActive) return sum + item.unitPrice * item.quantity
    const discountPercent = Number(promotion.discountPercent ?? 0)
    if (promotion.type === 'discount') {
      const unitDiscounted = item.unitPrice * (1 - discountPercent / 100)
      return sum + unitDiscounted * item.quantity
    }
    if (promotion.type === 'buy_one_get_one') {
      const paidUnits = Math.ceil(item.quantity / 2)
      return sum + item.unitPrice * paidUnits
    }
    return sum + item.unitPrice * item.quantity
  }, 0)

  const resetSale = () => {
    setCart([]); setSelectedCustomer(null); setIsGeneralClient(false)
    setPaymentType('cash')
    resetStockMap()
  }

  const handlePrintTicket = async (sale: Sale) => {
    try {
      const blob = await saleService.getTicketPdf(sale.id)
      const url = window.URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener,noreferrer')
      toast.success('Vista previa abierta del ticket')
    } catch (error) {
      toast.error('No se pudo abrir la vista previa del ticket')
    }
  }

  const createMut = useMutation({
    mutationFn: (input: { details: SaleDetailInput[]; paymentType: PaymentType; customerId: string | null; orderId: null }) =>
      saleService.create(input, user!.id),
    onSuccess: (sale) => {
      qc.invalidateQueries({ queryKey: ['sales'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['products-active'] })
      qc.invalidateQueries({ queryKey: ['dashboard-sales'] })
      qc.invalidateQueries({ queryKey: ['dashboard-metrics'] })
      qc.invalidateQueries({ queryKey: ['alerts'] })
      qc.invalidateQueries({ queryKey: ['active-alerts'] })
      toast.success('Venta registrada')
      setIsNewOpen(false); resetSale(); setTicketSale(sale)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const cancelMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => saleService.cancel(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['dashboard-sales'] })
      qc.invalidateQueries({ queryKey: ['dashboard-metrics'] })
      qc.invalidateQueries({ queryKey: ['alerts'] })
      qc.invalidateQueries({ queryKey: ['active-alerts'] })
      toast.success('Venta anulada'); setCancelModal(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const handleCreateSale = () => {
    if (cart.length === 0) { toast.error('Agrega al menos un producto'); return }
    if (!selectedCustomer && !isGeneralClient) { toast.error('Selecciona un cliente o usa Cliente General'); return }
    createMut.mutate({
      details: cart.map(i => ({ productId: i.productId, quantity: i.quantity, toppingIds: i.toppingIds })),
      paymentType, customerId: selectedCustomer?.id ?? null, orderId: null,
    })
  }

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Ventas</h1>
        <Button onClick={() => { resetStockMap(); setIsNewOpen(true) }} size="sm"><PlusIcon className="h-4 w-4" />Nueva venta</Button>
      </div>

      <div className="space-y-4">
        {groupedSales.map((group) => (
          <Card key={group.key}>
            <CardBody className="p-0">
              <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold capitalize text-gray-900">{group.label}</p>
                  <p className="text-xs text-gray-500">{group.sales.length} venta{group.sales.length === 1 ? '' : 's'}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Total</p>
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(group.total)}</p>
                </div>
              </div>

              <div className="divide-y divide-gray-50">
                {group.sales.map((sale) => (
                  <div key={sale.id} className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-gray-50 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-gray-500">#{sale.id.slice(-6).toUpperCase()}</span>
                        <Badge variant={sale.paymentType === 'cash' ? 'default' : 'pink'}>
                          {sale.paymentType === 'cash' ? 'Efectivo' : 'QR'}
                        </Badge>
                        <SaleStatusBadge status={sale.status} />
                      </div>
                      <p className="mt-1 text-sm text-gray-700">
                        {sale.customerName ?? <span className="italic text-gray-400">General</span>}
                      </p>
                      <p className="text-xs text-gray-500">
                        <span className="font-medium text-gray-600">Fecha de venta:</span> {formatDateTime(sale.createdAt)}
                      </p>
                      <div className="mt-2 space-y-1">
                        {sale.details.map((detail) => (
                          <div key={detail.id} className="text-xs text-gray-600">
                            <span className="font-medium">{detail.productName}</span> x{detail.quantity}
                            {detail.toppings.length > 0 && (
                              <span className="text-gray-500"> · {detail.toppings.map((topping) => topping.toppingName).join(', ')}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 md:justify-end">
                      <div className="text-right">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Monto</p>
                        <p className="text-sm font-semibold text-gray-900">{formatCurrency(sale.total)}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setTicketSale(sale)}><PrinterIcon className="h-4 w-4" /></Button>
                        {sale.status === 'delivered' && (
                          <Button variant="ghost" size="sm" onClick={() => setCancelModal({ sale, reason: '' })}>
                            <XMarkIcon className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        ))}

        {groupedSales.length === 0 && (
          <Card>
            <CardBody className="py-8 text-center text-sm text-gray-500">
              No hay ventas registradas aún.
            </CardBody>
          </Card>
        )}
      </div>

      {/* ─── POS Modal ─────────────────────────────────────────────────────── */}
      <Modal isOpen={isNewOpen} onClose={() => { setIsNewOpen(false); resetSale() }} title="Registrar venta" size="2xl">
        <div className="flex h-[70vh] gap-0 -mx-5 -mb-5 overflow-hidden">

          <ProductCatalog
            products={catalogProducts}
            categories={categories}
            onAddProduct={addToCart}
          />

          {/* RIGHT — Order panel */}
          <div className="flex w-[42%] flex-col">
            <div className="border-b border-gray-100 px-4 py-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Cliente</p>
                {!selectedCustomer && customers.length > 0 && (
                  <p className="text-[9px] text-gray-400">Busca por CI del cliente</p>
                )}
              </div>
              {!selectedCustomer && (
                <button
                  type="button"
                  onClick={() => { setIsGeneralClient(true); setSelectedCustomer(null) }}
                  className={cn(
                    'cursor-pointer w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                    isGeneralClient
                      ? 'border-gray-400 bg-gray-900 text-white'
                      : 'border-dashed border-gray-300 text-gray-500 hover:border-gray-400 hover:bg-gray-50'
                  )}
                >
                  {isGeneralClient ? '✓ Cliente General seleccionado' : 'Cliente General (sin registro)'}
                </button>
              )}
              {!isGeneralClient && (
                <CustomerSearch
                  customers={customers}
                  selected={selectedCustomer}
                  onSelect={(c) => { setSelectedCustomer(c); if (c) setIsGeneralClient(false) }}
                  onQuickRegister={(pf = '') => { setQuickPrefill(pf); setQuickCustomerOpen(true) }}
                />
              )}
              {isGeneralClient && (
                <button type="button" onClick={() => setIsGeneralClient(false)}
                  className="cursor-pointer text-xs text-gray-400 hover:text-gray-600 underline transition-colors">
                  Cambiar a cliente registrado
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
                Orden ({cart.length} {cart.length === 1 ? 'ítem' : 'ítems'})
              </p>
              {cart.length === 0 ? (
                <div className="flex items-center justify-center h-20 text-gray-300">
                  <p className="text-xs">Selecciona productos del catálogo</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {cart.map(item => {
                    const product = products.find((p: Product) => p.id === item.productId)
                    const availableToppings = product?.toppings ?? []
                    const selectedToppingNames = availableToppings
                      .filter((topping) => item.toppingIds.includes(topping.id))
                      .map((topping) => topping.name)

                    return (
                      <li key={item.productId} className="flex items-center gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-gray-800 truncate">{item.productName}</p>
                          <p className="text-[10px] text-gray-400">{formatCurrency(item.unitPrice)} c/u</p>
                          {selectedToppingNames.length > 0 && (
                            <p className="text-[10px] text-primary-600">+ {selectedToppingNames.join(', ')}</p>
                          )}
                          {availableToppings.length > 0 && (
                            <ToppingSelector
                              availableToppings={availableToppings}
                              selectedToppingIds={item.toppingIds}
                              onToggle={(toppingId) => toggleTopping(item.productId, toppingId)}
                            />
                          )}
                        </div>
                        <QuantityControl
                          value={item.quantity}
                          onDecrease={() => updateQty(item.productId, item.quantity - 1)}
                          onIncrease={() => updateQty(item.productId, item.quantity + 1)}
                          onChange={v => updateQty(item.productId, v)}
                        />
                        <span className="w-16 text-right text-xs font-semibold text-gray-700">
                          {formatCurrency(item.unitPrice * item.quantity)}
                        </span>
                        <button type="button" onClick={() => removeFromCart(item.productId)}
                          className="cursor-pointer shrink-0 rounded p-1 text-gray-300 hover:bg-red-50 hover:text-red-400 transition-colors">
                          <XMarkIcon className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            <div className="border-t border-gray-100 px-4 py-3 space-y-3">
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span><span>{formatCurrency(cartSubtotal)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-100 pt-1 font-bold text-base">
                  <span>Total</span>
                  <span className="text-primary-600">{formatCurrency(cartTotal)}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setPaymentType('cash')}
                  className={cn('flex-1 cursor-pointer rounded-md py-2 text-sm font-medium border transition-colors',
                    paymentType === 'cash' ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-300 text-gray-600 hover:bg-gray-50')}>
                  💵 Efectivo
                </button>
                <button type="button" onClick={() => setPaymentType('qr')}
                  className={cn('flex-1 cursor-pointer rounded-md py-2 text-sm font-medium border transition-colors',
                    paymentType === 'qr' ? 'bg-primary-500 text-white border-primary-500' : 'border-gray-300 text-gray-600 hover:bg-gray-50')}>
                  📱 QR
                </button>
              </div>
              <Button className="w-full shadow-lg hover:shadow-xl transition-all py-4 text-base font-bold" variant="primary" size="lg" onClick={handleCreateSale} isLoading={createMut.isPending}
                disabled={cart.length === 0 || (!selectedCustomer && !isGeneralClient)}>
                ✓ Confirmar venta · {formatCurrency(cartTotal)}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      <QuickCustomerModal
        isOpen={quickCustomerOpen}
        prefill={quickPrefill}
        onClose={() => setQuickCustomerOpen(false)}
        onCreated={(c) => { setSelectedCustomer(c); setIsGeneralClient(false); setQuickCustomerOpen(false) }}
      />

      <Modal isOpen={!!ticketSale} onClose={() => setTicketSale(null)} title="Ticket de venta" size="sm">
        {ticketSale && <Ticket sale={ticketSale} onClose={() => setTicketSale(null)} onPrintTicket={handlePrintTicket} />}
      </Modal>

      <Modal isOpen={!!cancelModal} onClose={() => setCancelModal(null)} title="Anular venta" size="sm">
        {cancelModal && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Esta acción anulará la venta <span className="font-mono font-semibold">#{cancelModal.sale.id.slice(-6).toUpperCase()}</span> y restituirá el inventario.
            </p>
            <div>
              <label className="text-sm font-medium text-gray-700">Motivo de anulación</label>
              <textarea
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                rows={3} value={cancelModal.reason}
                onChange={e => setCancelModal(m => m ? { ...m, reason: e.target.value } : null)}
                placeholder="Ej: Pedido duplicado..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setCancelModal(null)}>Cancelar</Button>
              <Button variant="danger" isLoading={cancelMut.isPending}
                onClick={() => cancelMut.mutate({ id: cancelModal.sale.id, reason: cancelModal.reason })}
                disabled={!cancelModal.reason.trim()}>
                Anular venta
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
