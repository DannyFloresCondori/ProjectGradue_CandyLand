import { describe, it, expect, vi } from 'vitest'

const sales = [
  {
    id: 's1', total: 24, payment_method: 'in_efective', status: 'delivered', createdAt: '2026-07-01T15:00:00.000Z',
    saleDetail: [{ id: 'd1', quantity: 3, subtotal: 24, product: { id: 'p1', name: 'Helado de fresa' } }],
  },
  {
    id: 's2', total: 5, payment_method: 'in_qr', status: 'delivered', createdAt: '2026-07-02T15:00:00.000Z',
    saleDetail: [{ id: 'd2', quantity: 1, subtotal: 5, product: { id: 'p2', name: 'Agua 500 ml' } }],
  },
  {
    id: 's3', total: 10, payment_method: 'in_qr', status: 'canceled', createdAt: '2026-07-02T16:00:00.000Z',
    saleDetail: [{ id: 'd3', quantity: 1, subtotal: 10, product: { id: 'p1', name: 'Helado de fresa' } }],
  },
  {
    id: 's4', total: 50, payment_method: 'in_efective', status: 'delivered', createdAt: '2026-08-15T15:00:00.000Z',
    saleDetail: [{ id: 'd4', quantity: 5, subtotal: 50, product: { id: 'p1', name: 'Helado de fresa' } }],
  },
]

vi.mock('@/lib/api', () => ({
  apiClient: { get: vi.fn(async () => ({ data: sales })) },
  getErrorMessage: (e: unknown) => String(e),
}))

import { reportService } from './reportService'

describe('reportService.getSalesReport', () => {
  it('resume solo las ventas del periodo y excluye las anuladas de los ingresos', async () => {
    const report = await reportService.getSalesReport(new Date('2026-07-01T00:00:00Z'), new Date('2026-07-31T23:59:59Z'))

    expect(report.totalSales).toBe(2)
    expect(report.totalRevenue).toBe(29)
    expect(report.cancelledSales).toBe(1)
  })

  it('agrupa por método de pago y ordena los productos más vendidos por ingreso', async () => {
    const report = await reportService.getSalesReport(new Date('2026-07-01T00:00:00Z'), new Date('2026-07-31T23:59:59Z'))

    expect(report.salesByPayment).toEqual([
      { method: 'Efectivo', count: 1, revenue: 24 },
      { method: 'QR', count: 1, revenue: 5 },
    ])
    expect(report.topProducts[0]).toMatchObject({ productName: 'Helado de fresa', quantity: 3, revenue: 24 })
  })
})
