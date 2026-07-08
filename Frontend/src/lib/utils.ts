import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return `Bs. ${amount.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('es-BO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

const WEEKDAYS_ES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

export function formatDateTime(date: string | Date): string {
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return String(date)

  const weekday = WEEKDAYS_ES[d.getDay()]
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()

  const hours = d.getHours()
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const period = hours >= 12 ? 'pm' : 'am'
  const hour12 = String(hours % 12 || 12).padStart(2, '0')

  return `${weekday} ${day}/${month}/${year} ${hour12}:${minutes} ${period}`
}

export function generateId(): string {
  return crypto.randomUUID()
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function randomDelay(): Promise<void> {
  return sleep(300 + Math.random() * 900)
}

export function truncate(str: string, maxLength: number): string {
  return str.length > maxLength ? `${str.slice(0, maxLength)}...` : str
}

export function formatElapsedTime(date: string | Date): string {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return '< 1 min'
  if (mins < 60) return `${mins} min`
  const hours = Math.floor(mins / 60)
  return `${hours} h ${mins % 60} min`
}

export function getElapsedMinutes(date: string | Date): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / 60_000)
}

/** Returns the min attribute value for a datetime-local input for scheduled orders. */
export function getScheduledMin(): string {
  const now = new Date()
  now.setMinutes(now.getMinutes() + 30) // at least 30 min from now
  return now.toISOString().slice(0, 16)
}

/** Validates that a scheduled datetime is within business hours (09:00–19:00) and in the future. */
export function validateScheduledAt(value: string): string | null {
  if (!value) return 'La fecha y hora son requeridas para pedidos programados'
  const date = new Date(value)
  if (isNaN(date.getTime())) return 'Fecha inválida'
  if (date.getTime() < Date.now() + 25 * 60_000) return 'El pedido debe programarse con al menos 30 minutos de anticipación'
  const h = date.getHours()
  const m = date.getMinutes()
  const totalMins = h * 60 + m
  if (totalMins < 9 * 60) return 'El horario mínimo de entrega es las 09:00'
  if (totalMins >= 19 * 60) return 'El horario máximo de entrega es las 19:00'
  return null
}

export function formatRelativeTime(date: string | Date): string {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'ahora mismo'
  if (mins < 60) return `hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'ayer'
  return `hace ${days} días`
}
