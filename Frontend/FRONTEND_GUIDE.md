# Guía del Desarrollador — CandyLand Frontend

## Inicio rápido

```bash
cd candyland-frontend
npm install
npm run dev        # http://localhost:3000
```

### Credenciales de prueba

| Usuario | Contraseña | Rol | Acceso |
|---------|-----------|-----|--------|
| admin | Admin123 | Administrador | Todo |
| cajero | Cajero123 | Cajero | Ventas, Pedidos, Clientes |
| inventario | Inventario123 | Inventario | Inventario, Productos |

---

## Agregar un nuevo módulo

### 1. Definir el tipo en `src/types/index.ts`
```typescript
export interface NuevoModelo {
  id: string
  nombre: string
  isActive: boolean
  createdAt: string
}
```

### 2. Agregar datos mock en `src/mock/database.ts`
```typescript
export const nuevosItems: NuevoModelo[] = [
  { id: 'item-1', nombre: 'Ejemplo', isActive: true, createdAt: new Date().toISOString() },
]
```

### 3. Crear el servicio en `src/services/nuevoService.ts`
```typescript
import { nuevosItems as db } from '@/mock/database'
import { randomDelay, generateId } from '@/lib/utils'
import type { NuevoModelo } from '@/types'

const store: NuevoModelo[] = [...db]

export const nuevoService = {
  async getAll(): Promise<NuevoModelo[]> {
    await randomDelay()
    return [...store]
  },
  async create(input: Omit<NuevoModelo, 'id' | 'createdAt'>): Promise<NuevoModelo> {
    await randomDelay()
    const item: NuevoModelo = { id: generateId(), createdAt: new Date().toISOString(), ...input }
    store.push(item)
    return item
  },
}
```

### 4. Crear la página en `src/pages/NuevoPage.tsx`
```typescript
import type { FC } from 'react'
import { useQuery } from '@tanstack/react-query'
import { nuevoService } from '@/services/nuevoService'
import { PageSpinner } from '@/components/ui/Spinner'

export const NuevoPage: FC = () => {
  const { data = [], isLoading } = useQuery({
    queryKey: ['nuevo'],
    queryFn: nuevoService.getAll,
  })

  if (isLoading) return <PageSpinner />
  return <div>{/* render data */}</div>
}
```

### 5. Registrar la ruta en `src/router/index.tsx`
```typescript
import { NuevoPage } from '@/pages/NuevoPage'
// dentro de children de AppLayout:
{ path: '/nuevo', element: <NuevoPage /> },
```

### 6. Agregar al Sidebar en `src/components/layout/Sidebar.tsx`
```typescript
{ name: 'Nuevo', href: '/nuevo', icon: SomeIcon, roles: ['admin'] },
```

---

## Formularios (React Hook Form + Zod)

```typescript
const schema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres'),
  precio: z.coerce.number().positive('Debe ser positivo'),
})
type FormData = z.infer<typeof schema>

const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
  resolver: zodResolver(schema),
})
```

---

## Mutaciones con invalidación de caché

```typescript
const mutation = useMutation({
  mutationFn: (data: FormData) => miService.create(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['mi-query-key'] })
    toast.success('Creado correctamente')
    closeModal()
  },
  onError: (e: Error) => toast.error(e.message),
})
```

---

## Componentes UI disponibles

### Button
```tsx
<Button variant="primary" size="md" isLoading={isPending}>Guardar</Button>
// variants: primary | secondary | ghost | danger | link
// sizes: sm | md | lg | icon
```

### Badge
```tsx
<Badge variant="success">Activo</Badge>
// variants: default | success | warning | error | info | pink
```

### Modal
```tsx
<Modal isOpen={isOpen} onClose={handleClose} title="Título" size="md">
  {/* contenido */}
</Modal>
// sizes: sm | md | lg | xl
```

### Input / Select (con forwardRef para react-hook-form)
```tsx
<Input label="Nombre" {...register('nombre')} error={errors.nombre?.message} />
<Select label="Categoría" options={[{ value: '1', label: 'Cat 1' }]} {...register('categoriaId')} />
```

### StatCard (KPI)
```tsx
<StatCard
  title="Ventas hoy"
  value="Bs. 1,250.00"
  icon={<CurrencyDollarIcon className="h-5 w-5" />}
  trend={{ value: 12, direction: 'up', label: 'vs ayer' }}
/>
```

---

## Utilidades

```typescript
import { cn, formatCurrency, formatDate, formatDateTime, sleep, randomDelay, generateId, truncate } from '@/lib/utils'

cn('px-4', condition && 'bg-red-500')         // → string de clases Tailwind
formatCurrency(1250)                           // → "Bs. 1,250.00"
formatDate('2024-01-15T10:00:00Z')            // → "15/01/2024"
formatDateTime('2024-01-15T10:00:00Z')        // → "15/01/2024 10:00"
generateId()                                   // → "abc123def456" (12 chars)
await randomDelay()                            // espera 300ms–1200ms
```

---

## Scripts disponibles

```bash
npm run dev      # Servidor de desarrollo en puerto 3000
npm run build    # Build de producción en dist/
npm run preview  # Preview del build de producción
npm run lint     # ESLint
```
