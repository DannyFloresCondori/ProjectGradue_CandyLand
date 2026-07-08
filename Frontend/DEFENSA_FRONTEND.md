# Preparación para la Defensa — Frontend CandyLand

## ¿Qué es este frontend?

Sistema web de gestión de ventas para la Heladería CandyLand (Cochabamba, Bolivia), desarrollado como trabajo de grado por Danny Flores. Permite gestionar ventas, pedidos, inventario, clientes, productos y reportes desde una interfaz web moderna, diseñada para ser migrada a un backend NestJS real.

---

## Preguntas frecuentes del tribunal y respuestas

### ¿Por qué eligió React + TypeScript?

React es la librería de interfaz de usuario más utilizada en la industria (State of JS 2024). TypeScript en modo estricto permite detectar errores de tipo en tiempo de compilación, reduciendo bugs en producción. La combinación es el estándar actual para aplicaciones web empresariales.

### ¿Qué es Vite y por qué lo usó en lugar de Create React App?

Vite es un build tool de nueva generación que usa ESModules nativos del navegador durante el desarrollo, logrando tiempos de inicio menores a 500 ms. Create React App está oficialmente discontinuado. Vite es la herramienta recomendada por el equipo de React.

### ¿Cómo funciona la autenticación?

1. El usuario ingresa usuario y contraseña en `LoginPage`
2. `authService.login()` valida contra el array de usuarios en memoria
3. Si las credenciales son correctas, genera un token JWT simulado (`fake.{base64}.signature`)
4. El token y los datos del usuario se guardan en `localStorage`
5. `PrivateRoute` verifica si existe sesión antes de renderizar cualquier página protegida
6. Al integrarse con NestJS, solo se reemplaza `authService.ts`: el resto del sistema no cambia

### ¿Cómo implementó el control de roles?

El sistema tiene 3 roles: Administrador, Cajero, e Inventario. Cada ítem del Sidebar tiene una propiedad `roles?: string[]`. Al renderizar, se filtra con:
```typescript
nav.filter(item => !item.roles || item.roles.includes(user.role))
```
Esto garantiza que el cajero solo vea las secciones que le corresponden.

### ¿Qué es TanStack Query y para qué sirve?

TanStack Query (antes React Query) es una librería de sincronización de estado asíncrono. Gestiona automáticamente: caché de datos, estados de carga y error, revalidación en foco de ventana, y reintentos en caso de error. Evita el anti-patrón de useEffect + useState para fetching.

### ¿Cómo funciona la capa de servicios?

Todos los componentes acceden a los datos a través de servicios (`productService`, `orderService`, etc.) que:
1. Ejecutan `await randomDelay()` para simular latencia de red (300–1200 ms)
2. Realizan validaciones de negocio
3. Manipulan los arrays en memoria
4. Retornan datos tipados

Los componentes nunca importan directamente de `mock/database.ts`. Esto permite migrar a NestJS simplemente reemplazando las implementaciones de los servicios.

### ¿Qué es Zustand?

Zustand es una librería de gestión de estado global minimalista para React. Se usó para dos stores: `authStore` (sesión del usuario) y `uiStore` (colapso del sidebar). Ambos persisten en `localStorage` con el middleware `persist`, lo que mantiene la sesión y preferencias de UI al refrescar.

### ¿Por qué React Hook Form con Zod?

React Hook Form evita re-renders innecesarios al registrar inputs directamente en el DOM. Zod proporciona validación con esquemas fuertemente tipados. El `zodResolver` conecta ambas librerías. El resultado es formularios eficientes con mensajes de error en español y validación tanto en cliente como (eventualmente) en servidor.

### ¿Cómo funcionan los reportes?

`reportService.getSalesReport(from, to)` filtra el array de ventas por rango de fecha y calcula:
- Total de ventas y ingresos
- Agrupación por día (para el BarChart)
- Agrupación por método de pago (para el PieChart)  
- Top 10 productos por cantidad vendida

Los gráficos usan Recharts, una librería declarativa basada en SVG.

### ¿Qué pasa con el stock cuando se crea una venta?

Al crear una venta (`saleService.create()`):
1. Por cada detalle de venta, se descuenta la cantidad del stock del producto
2. Si el stock resultante cae por debajo del `minStock`, `inventoryService.updateStock()` crea automáticamente una alerta
3. Si se cancela la venta, el stock se restaura

### ¿El sistema funciona sin conexión a internet?

Sí. Todos los datos están en memoria (mock). La única dependencia de red son las imágenes de productos (Unsplash) y la fuente Inter. El sistema funciona completamente offline para las operaciones de negocio.

---

## Decisiones de diseño destacables

| Decisión | Alternativa descartada | Razón |
|----------|----------------------|-------|
| Tailwind CSS | CSS Modules / Styled Components | Velocidad de desarrollo, consistencia visual sin naming collisions |
| Feature-based folders | Layer-based (components/, services/ globales) | Escalabilidad: cada módulo es autocontenido |
| Zustand | Redux / Context API | Menos boilerplate, API más simple para estado moderado |
| TanStack Query | useEffect + useState | Caché automático, manejo de errores, devtools |
| CVA para Button | if/else de clases | Composición declarativa de variantes tipada |

---

## Métricas del proyecto

- **Líneas de código TypeScript**: ~3,500
- **Componentes UI reutilizables**: 10
- **Páginas implementadas**: 12
- **Módulos del sistema**: 12
- **Servicios de abstracción**: 11
- **Tipos TypeScript definidos**: 35+
- **Entidades en mock database**: 16
