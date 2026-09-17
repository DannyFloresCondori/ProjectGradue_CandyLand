import axios, { AxiosHeaders } from 'axios'

const localApiUrl = typeof window !== 'undefined'
  ? `http://${window.location.hostname}:3002/api/v1`
  : 'http://localhost:3002/api/v1'
const baseURL = import.meta.env.VITE_API_URL || localApiUrl

export const apiClient = axios.create({
  baseURL,
})

apiClient.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem('candyland_session')
    if (!raw) return config
    const parsed = JSON.parse(raw) as { token?: string }
    if (parsed.token) {
      const headers = new AxiosHeaders(config.headers)
      headers.set('Authorization', `Bearer ${parsed.token}`)
      config.headers = headers
    }
  } catch {
    // Ignore localStorage issues and continue without auth header
  }

  if (config.data instanceof FormData) {
    const headers = new AxiosHeaders(config.headers)
    headers.delete('Content-Type')
    config.headers = headers
  }

  return config
})

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; error?: string } | undefined
    const status = error.response?.status
    const raw = (data?.message || data?.error || error.message || '').toString()

    // Map common backend/axios messages to user-friendly Spanish messages
    const lower = raw.toLowerCase()
    if (status === 401 || /unauthorized|invalid credentials|invalid password|invalid username|unauthorized/i.test(raw) || /invalid_credentials/i.test(lower)) {
      return 'El usuario o la contraseña son incorrectos.'
    }
    if (/user not found|usuario no encontrado/i.test(raw) || /not found/i.test(lower) && status === 404) {
      return 'Usuario no encontrado.'
    }
    if (/email is required|email.*required/i.test(lower)) return 'El correo es obligatorio.'
    if (/password is required|password.*required/i.test(lower)) return 'La contraseña es obligatoria.'
    if (/network error/i.test(lower) || error.message === 'Network Error') return 'No se pudo conectar con el servidor.'

    // Default: prefer backend message if present, otherwise fall back
    return data?.message || data?.error || error.message || 'Ocurrió un error inesperado'
  }
  if (error instanceof Error) return error.message
  return 'Ocurrió un error inesperado'
}

export function buildApiUrl(path: string): string {
  try {
    const origin = new URL(baseURL).origin
    return `${origin}${path.startsWith('/') ? path : `/${path}`}`
  } catch {
    return `${baseURL}${path.startsWith('/') ? path : `/${path}`}`
  }
}
