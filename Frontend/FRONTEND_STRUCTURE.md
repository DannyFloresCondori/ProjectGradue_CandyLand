# Estructura de Carpetas — CandyLand Frontend

```
candyland-frontend/
├── public/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx       ← Contenedor principal (Sidebar + Navbar + Outlet)
│   │   │   ├── Sidebar.tsx         ← Navegación lateral con colapso y roles
│   │   │   └── Navbar.tsx          ← Barra superior: alertas, notificaciones, usuario
│   │   └── ui/
│   │       ├── Badge.tsx           ← Etiqueta de estado (success/warning/error/info/pink)
│   │       ├── Button.tsx          ← Botón con variantes CVA + isLoading spinner
│   │       ├── Card.tsx            ← Card, CardHeader, CardBody, CardFooter
│   │       ├── EmptyState.tsx      ← Estado vacío con icono, título y acción
│   │       ├── Input.tsx           ← Input con label, error, hint (forwardRef)
│   │       ├── Modal.tsx           ← Diálogo accesible (ESC, backdrop click)
│   │       ├── Pagination.tsx      ← Paginador con prev/next y contador
│   │       ├── Select.tsx          ← Select con options[] y placeholder (forwardRef)
│   │       ├── Spinner.tsx         ← Spinner (sm/md/lg) + PageSpinner centrado
│   │       └── StatCard.tsx        ← KPI card: icono, valor grande, trend
│   │
│   ├── features/
│   │   └── auth/
│   │       └── components/
│   │           └── LoginPage.tsx   ← Formulario de inicio de sesión
│   │
│   ├── lib/
│   │   └── utils.ts                ← cn(), formatCurrency(), formatDate(), sleep(), randomDelay()
│   │
│   ├── mock/
│   │   └── database.ts             ← Arrays en memoria: users, products, orders, sales, etc.
│   │
│   ├── pages/
│   │   ├── DashboardPage.tsx       ← KPIs, AreaChart, BarChart, alertas recientes
│   │   ├── SalesPage.tsx           ← Tabla ventas, nueva venta, ticket, anulación
│   │   ├── OrdersPage.tsx          ← Pedidos con filtro de estado y progresión
│   │   ├── KitchenPage.tsx         ← Kanban 3 columnas (pendiente/preparando/listo)
│   │   ├── InventoryPage.tsx       ← Stock bajo, alertas, actualizar stock
│   │   ├── ProductsPage.tsx        ← Tarjetas con imagen, stock badge, CRUD
│   │   ├── CategoriesPage.tsx      ← Tabla CRUD de categorías
│   │   ├── ToppingsPage.tsx        ← Tabla CRUD de toppings con precio
│   │   ├── CustomersPage.tsx       ← Tabla paginada con búsqueda, CRUD
│   │   ├── PromotionsPage.tsx      ← CRUD con detección de vencimiento
│   │   ├── ReportsPage.tsx         ← Reportes por período: ventas, pagos, top productos
│   │   └── UsersPage.tsx           ← Gestión de usuarios (solo admin)
│   │
│   ├── router/
│   │   ├── index.tsx               ← createBrowserRouter con 12 rutas
│   │   └── PrivateRoute.tsx        ← Guard de autenticación → redirige a /login
│   │
│   ├── services/
│   │   ├── authService.ts          ← login(), logout(), getSession(), createFakeToken()
│   │   ├── categoryService.ts      ← CRUD categorías
│   │   ├── customerService.ts      ← CRUD clientes
│   │   ├── inventoryService.ts     ← updateStock(), alertas, getLowStock()
│   │   ├── orderService.ts         ← create() con descuento de stock, updateStatus()
│   │   ├── productService.ts       ← CRUD productos, getLowStock(), updateStock()
│   │   ├── promotionService.ts     ← CRUD promociones, getActive() con filtro fecha
│   │   ├── reportService.ts        ← getSalesReport(), getDashboardMetrics()
│   │   ├── saleService.ts          ← create() con stock, cancel() con restock
│   │   ├── toppingService.ts       ← CRUD toppings
│   │   └── userService.ts          ← CRUD usuarios, getRoles(), enmascara passwords
│   │
│   ├── stores/
│   │   ├── authStore.ts            ← Zustand: usuario autenticado + login/logout
│   │   └── uiStore.ts              ← Zustand: sidebarCollapsed
│   │
│   ├── types/
│   │   └── index.ts                ← Todas las interfaces y tipos TypeScript
│   │
│   ├── index.css                   ← Directivas Tailwind + Inter font
│   └── main.tsx                    ← Punto de entrada: QueryClientProvider + RouterProvider + Toaster
│
├── index.html
├── tailwind.config.ts
├── postcss.config.js
├── tsconfig.app.json
├── vite.config.ts
└── package.json
```

## Convenciones de nombrado

| Artefacto | Convención | Ejemplo |
|-----------|-----------|---------|
| Componentes | PascalCase | `StatCard.tsx` |
| Hooks | camelCase con `use` | `useAuthStore` |
| Servicios | camelCase con `Service` | `productService` |
| Páginas | PascalCase con `Page` | `SalesPage` |
| Tipos/interfaces | PascalCase | `Product`, `OrderStatus` |
| Constantes | UPPER_SNAKE | `SESSION_KEY`, `PAGE_SIZE` |
| Variables/funciones | camelCase | `formatCurrency`, `randomDelay` |

## Importaciones con alias

```typescript
import { Button } from '@/components/ui/Button'
import { productService } from '@/services/productService'
import { useAuthStore } from '@/stores/authStore'
import { formatCurrency } from '@/lib/utils'
import type { Product } from '@/types'
```

El alias `@` resuelve a `./src` (configurado en `vite.config.ts` y `tsconfig.app.json`).
