# Guía de Migración a NestJS — CandyLand

## Estrategia general

La arquitectura de servicios fue diseñada específicamente para facilitar la migración. Los componentes React nunca acceden a los datos directamente; siempre pasan por la capa de servicios. Para migrar, solo se reemplaza la implementación interna de cada servicio.

**Regla de oro**: Si un archivo en `src/pages/` o `src/components/` NO importa de `src/mock/database.ts`, la migración no lo toca.

---

## Paso 1 — Configurar el cliente HTTP

Crear `src/lib/api.ts`:

```typescript
import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api',
})

api.interceptors.request.use(config => {
  const token = useAuthStore.getState().user?.token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res,
  async error => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
```

Agregar a `.env`:
```
VITE_API_URL=http://localhost:3001/api
```

---

## Paso 2 — Migrar authService

**Antes** (mock):
```typescript
async login(username, password) {
  await randomDelay()
  const user = store.find(u => u.username === username && u.password === password)
  if (!user) throw new Error('Credenciales incorrectas')
  const token = createFakeToken(user.id)
  localStorage.setItem(SESSION_KEY, JSON.stringify({ ...user, token }))
  return { ...user, token }
}
```

**Después** (NestJS):
```typescript
import { api } from '@/lib/api'

async login(username: string, password: string): Promise<AuthUser> {
  const { data } = await api.post<{ access_token: string; user: AuthUser }>('/auth/login', { username, password })
  const user = { ...data.user, token: data.access_token }
  localStorage.setItem(SESSION_KEY, JSON.stringify(user))
  return user
}
```

---

## Paso 3 — Migrar servicios CRUD

**Patrón universal** para cualquier servicio:

```typescript
// Antes: productService.ts con mock
async getAll(): Promise<Product[]> {
  await randomDelay()
  return [...store]
}

// Después: productService.ts con NestJS
async getAll(): Promise<Product[]> {
  const { data } = await api.get<Product[]>('/products')
  return data
}

async create(input: ProductInput): Promise<Product> {
  const { data } = await api.post<Product>('/products', input)
  return data
}

async update(id: string, input: Partial<ProductInput>): Promise<Product> {
  const { data } = await api.patch<Product>(`/products/${id}`, input)
  return data
}

async toggleActive(id: string): Promise<Product> {
  const { data } = await api.patch<Product>(`/products/${id}/toggle-active`)
  return data
}
```

---

## Paso 4 — Servicios especiales

### inventoryService
```typescript
async updateStock(productId: string, newStock: number): Promise<Product> {
  const { data } = await api.patch<Product>(`/inventory/${productId}/stock`, { stock: newStock })
  return data
}
```

### orderService (stock automático en backend)
```typescript
async create(input: OrderInput): Promise<Order> {
  const { data } = await api.post<Order>('/orders', input)
  return data
}
// El backend NestJS maneja el descuento de stock en un @Transaction()
```

### reportService
```typescript
async getSalesReport(from: Date, to: Date) {
  const { data } = await api.get('/reports/sales', {
    params: { from: from.toISOString(), to: to.toISOString() }
  })
  return data
}
```

---

## Paso 5 — Eliminar el mock

Una vez que todos los servicios usen la API real:

1. Eliminar `src/mock/database.ts`
2. Verificar que ningún archivo importe de `@/mock/database`
3. Eliminar `randomDelay` de utils si ya no se usa en ningún servicio
4. Eliminar las variables `store` locales de cada servicio

```bash
# Verificar que no haya imports del mock
grep -r "from '@/mock/database'" src/
# Debe devolver 0 resultados
```

---

## Mapeo de endpoints esperados

| Servicio | Método Mock | Endpoint NestJS |
|----------|-----------|----------------|
| auth | login() | POST /auth/login |
| auth | logout() | POST /auth/logout |
| products | getAll() | GET /products |
| products | create() | POST /products |
| products | update() | PATCH /products/:id |
| categories | getAll() | GET /categories |
| customers | getAll() | GET /customers |
| orders | create() | POST /orders |
| orders | updateStatus() | PATCH /orders/:id/status |
| sales | create() | POST /sales |
| sales | cancel() | PATCH /sales/:id/cancel |
| inventory | updateStock() | PATCH /inventory/:id/stock |
| reports | getSalesReport() | GET /reports/sales?from=&to= |

---

## Impacto en componentes React

**Ninguno.** Los componentes usan TanStack Query:

```typescript
const { data } = useQuery({ queryKey: ['products'], queryFn: productService.getAll })
```

`productService.getAll` puede ser la versión mock o la versión NestJS — el componente no sabe ni le importa. La interfaz del servicio es el único contrato.
