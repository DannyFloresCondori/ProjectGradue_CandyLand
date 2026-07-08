# Arquitectura Frontend — CandyLand

## Stack tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Framework UI | React | 18 |
| Lenguaje | TypeScript | 5 (strict) |
| Estilos | Tailwind CSS | 3 |
| Build tool | Vite | 5 |
| Enrutamiento | React Router | 6 |
| Estado global | Zustand | 4 |
| Fetching / Cache | TanStack Query | 5 |
| Formularios | React Hook Form + Zod | — |
| Gráficas | Recharts | 2 |
| Notificaciones | react-hot-toast | — |

## Principios de diseño

### SOLID aplicado a React
- **S** — Cada componente tiene una única responsabilidad (StatCard solo muestra métricas, no las obtiene)
- **O** — Componentes extensibles mediante props (`variant`, `size`) sin modificar el core
- **L** — `Button`, `Input`, `Select` son sustituibles por sus especializaciones sin romper contratos
- **I** — Interfaces de props pequeñas y específicas; nunca un mega-prop object
- **D** — Páginas dependen de servicios abstractos, no del mock directamente

### Separación de responsabilidades

```
mock/database.ts    ← datos brutos (solo importado por services/)
services/           ← lógica de negocio, delay simulado, transformaciones
stores/             ← estado global compartido (Zustand)
features/           ← módulos autocontenidos con sus hooks y componentes
pages/              ← orquestación: obtiene datos, delega en componentes
components/ui/      ← átomos reutilizables sin lógica de negocio
```

## Flujo de datos

```
Usuario interactúa → Página / Componente
                          ↓
                  useQuery / useMutation (TanStack Query)
                          ↓
                   Service layer (randomDelay → simula red)
                          ↓
                   Mock database (arrays en memoria)
                          ↓
                   Respuesta tipada → componente re-render
```

## Autenticación y autorización

- **JWT simulado**: token `fake.{base64(payload)}.signature` almacenado en `localStorage` bajo clave `candyland_session`
- **Zustand auth store** con `persist` middleware recarga la sesión al refrescar la página
- **PrivateRoute** redirige a `/login` si no hay sesión activa
- **Roles**: `admin` (acceso total) | `cajero` (ventas, pedidos, clientes) | `inventario` (inventario, productos)
- **Sidebar** filtra ítems de navegación por rol

## Estado global (Zustand stores)

### `authStore` (`candyland-auth` en localStorage)
```typescript
{ user: AuthUser | null, isLoading, login(), logout(), hasRole() }
```

### `uiStore` (`candyland-ui` en localStorage)
```typescript
{ sidebarCollapsed: boolean, toggleSidebar() }
```

## Caché de datos (TanStack Query)

- `staleTime: 30_000` ms por defecto
- `retry: 1` en error
- KitchenPage: `refetchInterval: 15_000` (refresco automático cada 15 s)
- Invalidaciones explícitas en cada `useMutation.onSuccess`

## Sistema de estilos

- Color primario: `#E75480` (rosa chicle CandyLand) con escala Tailwind `primary-50` → `primary-950`
- Tipografía: Inter (Google Fonts)
- Utilitarios: `cn()` = `twMerge(clsx(...))`, `cva` para variantes de Button
- Formato monetario: `Bs. X,XXX.XX` (`toLocaleString('es-BO')`)

## Módulos implementados

| Módulo | Ruta | Roles |
|--------|------|-------|
| Dashboard | `/dashboard` | todos |
| Ventas | `/ventas` | admin, cajero |
| Pedidos | `/pedidos` | admin, cajero |
| Cocina | `/cocina` | todos |
| Inventario | `/inventario` | admin, inventario |
| Productos | `/productos` | admin, inventario |
| Categorías | `/categorias` | admin |
| Toppings | `/toppings` | admin |
| Clientes | `/clientes` | admin, cajero |
| Promociones | `/promociones` | admin |
| Reportes | `/reportes` | admin |
| Usuarios | `/usuarios` | admin |
