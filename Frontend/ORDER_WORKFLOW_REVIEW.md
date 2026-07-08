# Order Workflow Review — CandyLand Frontend

**Fecha de revisión:** 2026-07-02  
**Revisores:** Principal Software Architect · Senior Product Designer · Senior UI/UX (POS) · Senior React Engineer · Restaurant POS Consultant · Software Quality Engineer

---

## 1. Resumen ejecutivo

Se realizó una revisión completa del ciclo de vida del pedido: creación, preparación, entrega y cancelación. Se encontraron deficiencias críticas en el módulo Pedidos (Select para clientes, modal pequeño, sin validaciones de negocio), inconsistencias con el módulo Ventas, y ausencia de reglas de negocio fundamentales para una operación real de heladería.

Todas las mejoras se implementaron bajo el principio de **consistencia total** con el módulo Ventas, compartiendo componentes, patrones y convenciones. El sistema ya no se siente como dos módulos separados.

---

## 2. Ciclo de vida completo de un pedido

### Estados y transiciones válidas

```
PENDIENTE ──────► EN PREPARACIÓN ──────► LISTO ──────► ENTREGADO
    │                   │
    └──────────────────►└──► CANCELADO
```

| Transición | Desde | Hacia | Responsable | Notas |
|---|---|---|---|---|
| Iniciar preparación | `pending` | `preparing` | Cajero / Cocina | Cocina toma el pedido |
| Marcar listo | `preparing` | `ready` | Cocina | Pedido listo para entrega |
| Entregar | `ready` | `delivered` | Cajero | Confirmado en módulo Pedidos |
| Cancelar | `pending` | `cancelled` | Cajero | Stock restituido |
| Cancelar en prep | `preparing` | `cancelled` | Cajero | Stock restituido |

### Transiciones BLOQUEADAS (reglas de negocio)

| Intento | Resultado | Motivo |
|---|---|---|
| `ready` → `cancelled` | Error | Pedido ya preparado, debe entregarse |
| `delivered` → cualquiera | Error | Pedido finalizado, no modificable |
| `cancelled` → cualquiera | Error | Pedido cancelado, no reactivable |
| `pending` → `delivered` | Error | Salta etapas obligatorias |

---

## 3. Problemas encontrados y soluciones implementadas

### 3.1 Modal de pedido: mismo problema que Ventas antes de la revisión

**Antes:**  
- Modal `xl` con altura fija `h-96` (384px) — exactamente el mismo error que tenía SalesPage.
- Grid 5 columnas con todo comprimido en un espacio insuficiente para operar.

**Solución:**  
- Modal `2xl` (max-w-5xl) con altura `70vh` — idéntico a SalesPage.
- Misma división 58/42 entre catálogo y panel de orden.
- Consistencia visual total con el módulo de Ventas.

---

### 3.2 Selección de cliente — mismo error que Ventas

**Antes:**  
`<Select>` nativo con todos los clientes. Idéntico al error de SalesPage pre-revisión. Consulta directa a `customerService.getActive` sin ningún filtro interactivo.

**Solución:**  
- Exactamente el mismo `CustomerSearch` autocomplete usado en Ventas.
- `CustomerSearch` y `QuickCustomerModal` fueron extraídos a `src/components/shared/` para ser reutilizados en ambos módulos.
- Auto-relleno de dirección: cuando se selecciona un cliente con dirección registrada y el tipo de pedido es Domicilio/Programado, la dirección se pre-rellena automáticamente.
- Botón "Cliente General" independiente y claramente visible.

**Justificación arquitectónica:** Extraer los componentes compartidos a `components/shared/` elimina la duplicación y garantiza que cualquier mejora futura (ej: mostrar historial del cliente al seleccionarlo) se aplique en ambos módulos automáticamente.

---

### 3.3 Validación de fechas y horario comercial — completamente ausente

**Antes:**  
El campo `datetime-local` no tenía ninguna restricción. El cajero podía seleccionar una fecha de hace 5 años y crear el pedido sin ninguna advertencia.

**Problemas:**
- Pedidos con fechas pasadas (imposibles de cumplir).
- Pedidos programados para las 3 AM (fuera del horario comercial).
- Sin feedback al usuario sobre qué es válido.

**Solución implementada — validación en 3 capas:**

**Capa 1 — HTML nativo:**
```html
<input type="datetime-local" min={getScheduledMin()} />
```
El atributo `min` se calcula dinámicamente: hoy + 30 minutos. El navegador bloquea fechas pasadas visualmente.

**Capa 2 — Validación reactiva (JS):**
```typescript
function validateScheduledAt(value: string): string | null {
  if (!value) return 'La fecha y hora son requeridas'
  if (date.getTime() < Date.now() + 25 * 60_000) return 'Mínimo 30 min de anticipación'
  if (totalMins < 9 * 60) return 'Horario mínimo: 09:00'
  if (totalMins >= 19 * 60) return 'Horario máximo: 19:00'
  return null
}
```
El error aparece en tiempo real mientras el usuario escribe/elige la fecha. El botón de confirmar permanece deshabilitado si hay errores.

**Capa 3 — Validación en el servicio (backend-ready):**
```typescript
// orderService.create()
if (input.orderType === 'scheduled') {
  const err = validateScheduledAt(input.scheduledAt ?? '')
  if (err) throw new Error(err)
}
```
La misma función `validateScheduledAt` se usa en el servicio. Al migrar a NestJS, esta lógica se replicará en los DTOs de validación de Nest con `class-validator`.

**Justificación de negocio:**  
Una heladería que acepta pedidos para las 6 AM enfrenta problemas operacionales reales. La regla "mínimo 30 minutos de anticipación" también es pragmática: ningún sistema puede garantizar preparación instantánea.

---

### 3.4 Validación de dirección obligatoria

**Antes:**  
Los pedidos de tipo `delivery` y `scheduled` podían crearse sin dirección de entrega. El repartidor no sabría dónde ir.

**Solución:**
- Campo dirección condicional: solo aparece cuando el tipo es `delivery` o `scheduled`.
- Validación en el servicio: `if (!input.deliveryAddress?.trim()) throw new Error(...)`.
- El botón de confirmar está deshabilitado si el campo requerido está vacío.
- Auto-relleno desde el perfil del cliente cuando se selecciona uno con dirección.

---

### 3.5 Reglas de transición de estado — no existían

**Antes:**  
El servicio aplicaba cualquier cambio de estado sin verificación. Era posible:
- Pasar de `delivered` a `pending` (regresión de estado).
- Pasar de `cancelled` a `preparing` (reactivar un pedido cancelado).
- Pasar de `pending` directamente a `delivered` (saltarse preparación).

**Solución:**
```typescript
const VALID_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  pending:   ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready:     ['delivered'],
  // delivered y cancelled: sin transiciones (terminales)
}

function assertTransition(current: OrderStatus, next: OrderStatus): void {
  const allowed = VALID_TRANSITIONS[current] ?? []
  if (!allowed.includes(next)) throw new Error(`Mensaje específico por caso`)
}
```

Cada transición inválida produce un mensaje de error claro y específico, no un error genérico.

---

### 3.6 Cancelación de pedidos — sin motivo obligatorio

**Antes:**  
La cancelación era `updateStatus(id, 'cancelled')` sin registrar ningún motivo. Imposible hacer auditoría de por qué se canceló un pedido.

**Solución:**
- Nuevo método `orderService.cancel(id, reason)` separado de `updateStatus`.
- Motivo obligatorio (validado en el servicio).
- `cancellationReason: string | null` agregado al tipo `Order` y a los datos mock.
- Modal de cancelación con textarea, información de impacto (stock a restituir) y confirmación explícita.
- El motivo se muestra en el detalle del pedido (`OrderDetailView`).

---

### 3.7 Sin vista de detalle de pedido

**Antes:**  
No había forma de ver los productos de un pedido sin crear uno nuevo. Solo existía la lista. El cajero no podía responder preguntas de clientes sobre su pedido.

**Solución:**  
- Botón `EyeIcon` en cada fila abre un modal de detalle (`OrderDetailView`).
- Muestra: estado, tipo, cliente, fecha, programado, dirección, notas, motivo de cancelación (si aplica), lista de productos con subtotales y total.

---

### 3.8 Filtros de la lista — "activos" como vista predeterminada

**Antes:**  
La lista por defecto mostraba `all` — todos los pedidos mezclados, incluyendo entregados y cancelados. En un día con 30 pedidos, el cajero tenía que filtrar manualmente para ver qué necesita atención.

**Solución:**
- **Filtro predeterminado: "Activos"** (pending + preparing + ready).
- El cajero ve inmediatamente qué pedidos necesitan acción.
- Badge con contador sobre el filtro "Activos" para llamar la atención cuando hay pedidos pendientes.
- Filtros disponibles: Activos | Pendientes | En preparación | Listos | Entregados | Cancelados | Todos.
- Buscador por # de pedido o nombre de cliente.

**Justificación UX:** El principio de "información en primera plana" dicta que la vista predeterminada debe mostrar lo que requiere acción inmediata, no un historial completo.

---

### 3.9 Productividad del catálogo de productos

**Antes:**  
- Sin búsqueda de productos.
- Sin filtro por categoría.
- Productos sin indicadores de stock.
- Botones de `h-2` (muy pequeños).

**Solución:** Exactamente el mismo `ProductCatalog` compartido con Ventas:
- Búsqueda en tiempo real.
- Filtros de categoría como pills.
- Indicadores POCO/AGOTADO.
- Botones deshabilitados para productos sin stock.
- Feedback visual al click (scale).

---

### 3.10 KitchenPage — información insuficiente para el personal de cocina

**Antes:**  
- Cards minimalistas con solo nombre de producto y botón de acción.
- Sin indicador de cuánto tiempo lleva el pedido esperando.
- Sin mostrar la dirección de delivery.
- Sin mostrar la hora de entrega programada.
- Sin botón de refresh manual.
- Auto-refresh cada 15 segundos (optimizado a 20 s para reducir carga).

**Solución:**
- **Indicador de urgencia** (UrgencyBadge):
  - < 8 min: gris (normal)
  - 8–15 min: ámbar en negrita (alerta)
  - > 15 min: rojo + "URGENTE" (crítico)
- **Hora de entrega programada** destacada en recuadro ámbar.
- **Dirección de delivery** mostrada con icono de pin.
- **Notas** siempre visibles (no colapsadas).
- **Indicador de cantidad** con badge coloreado por cada producto.
- **Botón de refresh manual** con animación de giro durante el fetch.
- **Columna "Listos"** muestra información de entrega y nota explicativa de que la confirmación final es del cajero.
- Timestamp de última actualización visible.

---

## 4. Componentes compartidos creados

Se crearon 4 componentes en `src/components/shared/` para garantizar consistencia entre Ventas y Pedidos:

| Componente | Responsabilidad | Usado en |
|---|---|---|
| `CustomerSearch.tsx` | Autocomplete CI/nombre + teclado + registro rápido | SalesPage, OrdersPage |
| `QuickCustomerModal.tsx` | Registro rápido sin abandonar el flujo | SalesPage, OrdersPage |
| `ProductCatalog.tsx` | Panel izquierdo: categorías + búsqueda + grid | SalesPage, OrdersPage |
| `QuantityControl.tsx` | Stepper de cantidad con input editable | SalesPage, OrdersPage |

**Principio aplicado:** DRY (Don't Repeat Yourself). Cualquier mejora futura a estos componentes se propaga automáticamente a todos los módulos que los usan.

---

## 5. Reglas de negocio implementadas

| Regla | Dónde se valida | Mensaje al usuario |
|---|---|---|
| Pedido programado requiere fecha | Servicio + UI | "La fecha y hora son requeridas" |
| Fecha mínimo 30 min en el futuro | UI reactiva + Servicio | "Mínimo 30 min de anticipación" |
| Horario de entrega 09:00–19:00 | UI reactiva + Servicio | "Horario: 09:00 – 19:00" |
| Delivery requiere dirección | Servicio + UI | "Requiere dirección de entrega" |
| Pedido no puede estar vacío | Servicio + UI (botón disabled) | "Debe tener al menos un producto" |
| Stock insuficiente | Servicio + UI (real-time) | "Stock insuficiente para X (disponible: N)" |
| Producto inactivo no ordenable | Servicio | "X no está disponible" |
| Cancelación requiere motivo | Servicio + UI (botón disabled) | "Debe ingresar un motivo" |
| No cancelar pedido `ready` | Servicio | "Listo para entregar, proceda a entrega" |
| No modificar pedido `delivered` | Servicio | "Ya entregado, no modificable" |
| No reactivar pedido `cancelled` | Servicio | "Cancelado, no modificable" |
| No saltar estados | Servicio | Mensaje específico por transición |
| Cantidad mínima 1 | Servicio + UI | UI previene qty < 1 |

---

## 6. Decisiones de arquitectura

### 6.1 Extracción a shared components vs. duplicación

**Decisión:** Extraer.  
**Razón:** `CustomerSearch`, `QuickCustomerModal`, `ProductCatalog` y `QuantityControl` son idénticos en Sales y Orders. Mantenerlos en dos lugares garantiza divergencia. El principio de shared components fue preferido sobre el de "co-location" porque la reutilización entre módulos distintos justifica la extracción.

### 6.2 `orderService.cancel()` vs. reutilizar `updateStatus()`

**Decisión:** Método `cancel()` separado.  
**Razón:** La cancelación tiene semántica diferente: requiere motivo (validado), ejecuta restock, y escribe `cancellationReason`. Mezclar esto en `updateStatus()` crearía un método con demasiadas responsabilidades. Al migrar a NestJS, `cancel` y `updateStatus` serán endpoints REST distintos.

### 6.3 Filtro predeterminado "Activos" en OrdersPage

**Decisión:** `statusFilter` inicial = `'active'` (pending + preparing + ready).  
**Razón:** El cajero siempre quiere ver qué pedidos necesitan acción. Ver todos los pedidos del día (incluyendo entregados y cancelados) es una necesidad secundaria. Este principio es estándar en sistemas como Toast POS y Square.

### 6.4 Validación de horario en `lib/utils.ts` en lugar de solo en el servicio

**Decisión:** Función `validateScheduledAt` en utils, usada tanto en la UI como en el servicio.  
**Razón:** Single source of truth para la lógica de validación. La misma función se usa en el cambio de input (feedback inmediato) y en el servicio (defensa en profundidad). Al migrar a NestJS, la lógica equivalente se replicará en un DTO con `@Min`, `@Max` y `@IsDateString`.

### 6.5 La "entrega" se confirma desde OrdersPage, no desde KitchenPage

**Decisión:** `ready → delivered` solo en OrdersPage (cajero).  
**Razón:** El personal de cocina solo sabe cuándo terminó de preparar el pedido. La confirmación de que el cliente recibió el pedido es responsabilidad del cajero (para pedidos de local/takeaway) o del sistema de delivery. En KitchenPage la columna "Listos" muestra una nota explicativa de este flujo.

---

## 7. Métricas de mejora

| Métrica | Antes | Después |
|---|---|---|
| Clics para seleccionar cliente en pedido | ~5 (Select scroll) | 2–3 (CI + Enter) |
| Validación de fecha fuera de horario | Sin validación | 3 capas: min attr + JS reactivo + servicio |
| Vista predeterminada de la lista | Todos los pedidos | Solo activos (los que necesitan acción) |
| Vista de detalle de pedido | No existía | Modal con toda la información |
| Urgencia visible en cocina | No existía | Indicador de tiempo + colores |
| Reglas de transición de estado | Sin validación | 11 reglas implementadas |
| Cancelación con motivo | No | Sí, obligatorio |
| Stock en cancellation | Sí (restock) | Sí + mensaje de confirmación |
| Componentes compartidos entre módulos | 0 | 4 componentes en shared/ |

---

## 8. Recomendaciones futuras

### Alta prioridad

1. **Notificaciones automáticas al cocina:** Cuando se crea un pedido local/takeaway, la cocina debería recibir una notificación en tiempo real (WebSocket). El sistema mock usa polling de 20 s; con NestJS se usará Socket.io.

2. **Timer visual en KitchenPage:** Un reloj en vivo por tarjeta (actualizado cada 60 s vía `setInterval`) daría más presión de urgencia que el texto estático.

3. **Historial de estado del pedido:** Registrar cada cambio de estado con timestamp y usuario responsable. Útil para auditoría y resolución de disputas.

4. **Integración con Ventas para pedidos entregados:** Cuando un pedido pasa a `delivered`, crear automáticamente una `Sale` pre-rellenada con los detalles del pedido, pendiente solo de confirmación de pago.

5. **Pedidos recurrentes / plantillas:** Para clientes frecuentes con el mismo pedido semanal, permitir "Repetir pedido" desde el historial.

### Media prioridad

6. **Búsqueda por dirección para delivery:** Autocompletado de direcciones frecuentes.

7. **Priorización de pedidos en cocina:** El personal de cocina debería poder reordenar las tarjetas para priorizar pedidos urgentes.

8. **Export de pedidos del día:** Resumen exportable (PDF/CSV) al cierre del día.

9. **Indicador de carga del día:** En el dashboard, mostrar cuántos pedidos hay activos ahora para el administrador.

10. **Cancelación antes del tiempo límite:** Para pedidos programados, definir una ventana máxima de cancelación (ej: no cancelar con menos de 2 horas de anticipación).

---

## 9. Archivos modificados o creados

| Archivo | Tipo |
|---|---|
| `src/types/index.ts` | `cancellationReason` en `Order` |
| `src/mock/database.ts` | `cancellationReason: null` en órdenes mock |
| `src/lib/utils.ts` | `formatElapsedTime`, `getElapsedMinutes`, `getScheduledMin`, `validateScheduledAt` |
| `src/services/orderService.ts` | Reglas de negocio, método `cancel()`, `assertTransition()` |
| `src/components/shared/CustomerSearch.tsx` | **NUEVO** — extraído de SalesPage |
| `src/components/shared/QuickCustomerModal.tsx` | **NUEVO** — extraído de SalesPage |
| `src/components/shared/ProductCatalog.tsx` | **NUEVO** — panel de catálogo compartido |
| `src/components/shared/QuantityControl.tsx` | **NUEVO** — control de cantidad compartido |
| `src/pages/SalesPage.tsx` | Refactorizado para usar shared components |
| `src/pages/OrdersPage.tsx` | Rediseño completo |
| `src/pages/KitchenPage.tsx` | Mejoras de urgencia, información y UX |

---

*CandyLand Order Workflow Review — Generado el 2026-07-02*
