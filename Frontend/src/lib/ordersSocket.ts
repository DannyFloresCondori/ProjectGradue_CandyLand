import { io, type Socket } from 'socket.io-client'

const localApiUrl = typeof window !== 'undefined'
  ? `http://${window.location.hostname}:3002/api/v1`
  : 'http://localhost:3002/api/v1'
const apiUrl = import.meta.env.VITE_API_URL || localApiUrl
const socketOrigin = new URL(apiUrl).origin

export const ordersSocket: Socket = io(`${socketOrigin}/orders`, {
  autoConnect: false,
  transports: ['websocket'],
})
