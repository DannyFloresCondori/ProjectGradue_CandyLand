import axios, { AxiosHeaders } from 'axios'

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api/v1'

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
