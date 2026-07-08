import { describe, it, expect } from 'vitest'
import { formatCurrency, validateScheduledAt } from './utils'

describe('formatCurrency', () => {
  it('formatea montos con el prefijo Bs. y dos decimales', () => {
    expect(formatCurrency(1500)).toBe('Bs. 1.500,00')
  })

  it('mantiene el formato para valores decimales', () => {
    expect(formatCurrency(1250.5)).toBe('Bs. 1.250,50')
  })
})

describe('validateScheduledAt', () => {
  it('rechaza una fecha vacía', () => {
    expect(validateScheduledAt('')).toBe('La fecha y hora son requeridas para pedidos programados')
  })

  it('rechaza horarios fuera del rango de atención', () => {
    const tooLate = new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16)
    expect(validateScheduledAt(tooLate)).toBe('El horario máximo de entrega es las 19:00')
  })
})
