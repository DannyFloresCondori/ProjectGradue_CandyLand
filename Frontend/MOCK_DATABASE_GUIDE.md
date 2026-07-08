# Guía de la Base de Datos Mock — CandyLand

## Propósito

`src/mock/database.ts` actúa como base de datos en memoria durante el desarrollo y la demostración del sistema. Permite que la aplicación funcione completamente sin backend.

## Estructura de datos

### Entidades y relaciones

```
roles (3)
  └── users (4)           ← cada user tiene un role embebido
       
categories (6)
  └── products (12)       ← cada product tiene una category embebida

toppings (10)             ← productos pueden tener múltiples toppings

customers (7)

orders (5)
  └── orderDetails        ← inline en cada order, con toppings[]

sales (5)
  └── saleDetails         ← inline en cada sale

promotions (3)
stockAlerts (4)
notifications (3)
activityLogs (5)
dashboardMetrics (1)      ← snapshot precalculado
```

### Usuarios de prueba

| ID | Usuario | Contraseña | Rol |
|----|---------|-----------|-----|
| user-1 | admin | Admin123 | Administrador |
| user-2 | cajero | Cajero123 | Cajero |
| user-3 | manager | Manager123 | Administrador |
| user-4 | inventario | Inventario123 | Inventario |

### Productos (12 ítems con imágenes reales de Unsplash)

| ID | Nombre | Precio | Stock | MinStock |
|----|--------|--------|-------|---------|
| prod-1 | Helado Artesanal de Fresa | Bs. 15 | 45 | 10 |
| prod-2 | Copa de Chocolate Belga | Bs. 18 | 30 | 8 |
| prod-3 | Sundae de Vainilla | Bs. 20 | 25 | 5 |
| prod-4 | Batido de Frutilla | Bs. 22 | 20 | 5 |
| prod-5 | Nutella con Fresa y Crema | Bs. 28 | **4** | **8** ← stock bajo |
| prod-6 | Banana Split | Bs. 25 | 15 | 5 |
| prod-7 | Crepe de Helado | Bs. 30 | **3** | **6** ← stock bajo |
| prod-8 | Waffles con Helado | Bs. 35 | 12 | 5 |
| prod-9 | Cono Artesanal | Bs. 12 | 60 | 15 |
| prod-10 | Paleta Artesanal | Bs. 10 | **2** | **5** ← stock bajo |
| prod-11 | Frappé de Caramelo | Bs. 24 | 18 | 5 |
| prod-12 | Postre de Durazno | Bs. 22 | **1** | **4** ← stock bajo |

### Promociones

| Nombre | Descuento | Período | Estado |
|--------|----------|---------|--------|
| Happy Hour | 20% | Todo el año | Activa |
| 2x1 Helados Artesanales | 50% | Semanal | Activa |
| Lanzamiento Nueva Línea | 15% | Pasado | Inactiva |

## Cómo funciona la mutabilidad

```typescript
// database.ts exporta arrays originales (inmutables por convención)
export const products: Product[] = [...]

// Los servicios crean su propia copia mutable al inicializar
const store: Product[] = [...db]  // spread copia referencias de objetos

// Las mutaciones afectan a store, no a db
store.push(newProduct)            // create
store[idx] = { ...store[idx], ...updates }  // update
```

Los cambios persisten **en memoria durante la sesión**. Al recargar la página, los arrays se reinician desde los valores originales de `database.ts`.

## Delay simulado

```typescript
export function randomDelay(): Promise<void> {
  return sleep(300 + Math.random() * 900)  // 300ms – 1200ms
}
```

Este delay activa los estados de carga (`isLoading`, `isPending`) y permite ver los skeleton screens y spinners de la UI.

## Agregar datos de prueba

Para agregar más entidades al mock, editar `src/mock/database.ts`:

```typescript
export const products: Product[] = [
  // ... existentes ...
  {
    id: 'prod-13',
    name: 'Nuevo Producto',
    description: 'Descripción del nuevo helado',
    price: 20,
    imageUrl: 'https://images.unsplash.com/...',
    category: categories[0],
    toppings: [],
    stock: 25,
    minStock: 8,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
]
```
