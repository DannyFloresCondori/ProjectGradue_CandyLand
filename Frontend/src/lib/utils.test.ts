import { describe, it, expect, vi, afterEach } from 'vitest'
import { areCatalogNamesSimilar, formatCurrency, normalizeUniqueName, validateScheduledAt } from './utils'

describe('normalizeUniqueName', () => {
  it('recorta espacios y compara nombres sin distinguir mayúsculas', () => {
    expect(normalizeUniqueName('  FRAPPES ')).toBe(normalizeUniqueName('frappes'))
  })
})

describe('areCatalogNamesSimilar', () => {
  it('ignora tildes, mayúsculas y espacios repetidos', () => {
    expect(areCatalogNamesSimilar('Helado   de Limón', 'helado de limon')).toBe(true)
  })

  it('acepta un error tipográfico pequeño y rechaza nombres distintos', () => {
    expect(areCatalogNamesSimilar('Chocolate', 'Chocolote')).toBe(true)
    expect(areCatalogNamesSimilar('Frappes', 'frappe')).toBe(true)
    expect(areCatalogNamesSimilar('Chocolate', 'Frutilla')).toBe(false)
  })
})

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

  // Se fija la fecha del sistema para que el resultado no dependa de la hora de ejecución
  afterEach(() => {
    vi.useRealTimers()
  })

  it('rechaza horarios posteriores a las 19:00', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-01T10:00:00'))
    expect(validateScheduledAt('2026-07-01T19:30')).toBe('El horario máximo de entrega es las 19:00')
  })

  it('rechaza horarios anteriores a las 09:00', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-01T10:00:00'))
    expect(validateScheduledAt('2026-07-02T08:30')).toBe('El horario mínimo de entrega es las 09:00')
  })

  it('exige al menos 30 minutos de anticipación', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-01T10:00:00'))
    expect(validateScheduledAt('2026-07-01T10:10')).toBe('El pedido debe programarse con al menos 30 minutos de anticipación')
  })

  it('acepta un horario válido dentro de la atención', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-01T10:00:00'))
    expect(validateScheduledAt('2026-07-01T15:00')).toBeNull()
  })
})
