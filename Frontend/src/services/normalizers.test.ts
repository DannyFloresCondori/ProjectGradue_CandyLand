import { describe, expect, it } from 'vitest'
import { normalizeSale } from './saleService'
import { normalizeOrder } from './orderService'

describe('normalizers include discount metadata', () => {
  it('includes discount and promotion info in sales', () => {
    const sale = normalizeSale({
      id: 's-1',
      total: 120,
      payment_method: 'in_qr',
      status: 'delivered',
      createdAt: '2024-01-01T00:00:00Z',
      saleDetail: [{
        id: 'sd-1',
        quantity: 2,
        priceUnique: 50,
        finalPrice: 40,
        discountApplied: 20,
        subtotal: 80,
        product: { id: 'p-1', name: 'Helado', promotion: { name: 'Promo verano' } },
        toppings: [{ name: 'Fresa' }],
      }],
    })

    expect(sale.details[0]).toMatchObject({
      discountApplied: 20,
      finalPrice: 40,
      promotionName: 'Promo verano',
      unitPrice: 50,
      subtotal: 80,
    })
  })

  it('creates stable IDs for sale details without an ID', () => {
    const sale = normalizeSale({
      id: 's-1',
      saleDetail: [{ quantity: 1 }, { quantity: 2 }],
    })

    expect(sale.details.map((detail) => detail.id)).toEqual([
      's-1-detail-0',
      's-1-detail-1',
    ])
  })

  it('includes discount and promotion info in orders', () => {
    const order = normalizeOrder({
      id: 'o-1',
      total: 90,
      status: 'delivered',
      createdAt: '2024-01-01T00:00:00Z',
      details: [{
        id: 'od-1',
        quantity: 3,
        priceUnique: 30,
        finalPrice: 25,
        discountApplied: 16.67,
        subtotal: 75,
        product: { id: 'p-1', name: 'Batido', promotion: { name: 'Promo lunes' } },
        toppings: [{ name: 'Nuez' }],
      }],
    })

    expect(order.details[0]).toMatchObject({
      discountApplied: 16.67,
      finalPrice: 25,
      promotionName: 'Promo lunes',
      unitPrice: 30,
      subtotal: 75,
    })
  })
})
