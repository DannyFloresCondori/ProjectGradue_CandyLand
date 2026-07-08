import type {
  Role, User, Category, Topping, Product, Customer,
  Order, Sale, Promotion, StockAlert, DashboardMetrics,
  Notification, ActivityLog,
} from '@/types'

// ─── Roles ───────────────────────────────────────────────────────────────────
export const roles: Role[] = [
  { id: 'role-1', name: 'admin', description: 'Acceso completo al sistema', createdAt: '2025-01-01T00:00:00Z' },
  { id: 'role-2', name: 'cajero', description: 'Gestión de ventas y pedidos', createdAt: '2025-01-01T00:00:00Z' },
  { id: 'role-3', name: 'inventario', description: 'Control de inventario', createdAt: '2025-01-01T00:00:00Z' },
]

// ─── Users ───────────────────────────────────────────────────────────────────
export const users: User[] = [
  {
    id: 'user-1', roleId: 'role-1', role: roles[0],
    fullName: 'Administrador del Sistema', username: 'admin',
    email: 'admin@candyland.bo', password: 'Admin123',
    isActive: true, createdAt: '2025-01-01T08:00:00Z',
  },
  {
    id: 'user-2', roleId: 'role-2', role: roles[1],
    fullName: 'María Quispe Flores', username: 'cajero',
    email: 'cajero@candyland.bo', password: 'Cajero123',
    isActive: true, createdAt: '2025-03-15T08:00:00Z',
  },
  {
    id: 'user-3', roleId: 'role-1', role: roles[0],
    fullName: 'Carlos Mamani López', username: 'manager',
    email: 'manager@candyland.bo', password: 'Manager123',
    isActive: true, createdAt: '2025-02-10T08:00:00Z',
  },
  {
    id: 'user-4', roleId: 'role-3', role: roles[2],
    fullName: 'Ana Condori Vargas', username: 'inventario',
    email: 'inventario@candyland.bo', password: 'Inventario123',
    isActive: true, createdAt: '2025-04-01T08:00:00Z',
  },
]

// ─── Categories ───────────────────────────────────────────────────────────────
export const categories: Category[] = [
  { id: 'cat-1', name: 'Helados Artesanales', isActive: true },
  { id: 'cat-2', name: 'Combinados', isActive: true },
  { id: 'cat-3', name: 'Postres con Fruta', isActive: true },
  { id: 'cat-4', name: 'Bebidas Frías', isActive: true },
  { id: 'cat-5', name: 'Helados Industriales', isActive: true },
  { id: 'cat-6', name: 'Promociones Especiales', isActive: false },
]

// ─── Toppings ─────────────────────────────────────────────────────────────────
export const toppings: Topping[] = [
  { id: 'top-1', name: 'Fresas frescas', isActive: true },
  { id: 'top-2', name: 'Crema chantilly', isActive: true },
  { id: 'top-3', name: 'Nutella', isActive: true },
  { id: 'top-4', name: 'Chispas de chocolate', isActive: true },
  { id: 'top-5', name: 'Oreo triturado', isActive: true },
  { id: 'top-6', name: 'Maní caramelizado', isActive: true },
  { id: 'top-7', name: 'Mermelada de fresa', isActive: true },
  { id: 'top-8', name: 'Coco rallado', isActive: true },
  { id: 'top-9', name: 'Granola', isActive: true },
  { id: 'top-10', name: 'Galleta de vainilla', isActive: true },
]

// ─── Products ─────────────────────────────────────────────────────────────────
export const products: Product[] = [
  {
    id: 'prod-1', categoryId: 'cat-1', category: categories[0],
    name: 'Helado Artesanal de Fresa',
    description: 'Helado artesanal elaborado con fresas frescas de temporada, cremoso y natural.',
    imageUrl: 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=400',
    price: 15.00, stock: 45, minStock: 10, isActive: true,
    toppings: [toppings[0], toppings[1], toppings[3]],
    createdAt: '2025-01-10T00:00:00Z',
  },
  {
    id: 'prod-2', categoryId: 'cat-1', category: categories[0],
    name: 'Helado Artesanal de Vainilla',
    description: 'Clásico helado de vainilla natural con textura suave y cremosa.',
    imageUrl: 'https://images.unsplash.com/photo-1580915411954-282cb1b0d780?w=400',
    price: 12.00, stock: 60, minStock: 10, isActive: true,
    toppings: [toppings[1], toppings[3], toppings[4]],
    createdAt: '2025-01-10T00:00:00Z',
  },
  {
    id: 'prod-3', categoryId: 'cat-1', category: categories[0],
    name: 'Helado Artesanal de Chocolate',
    description: 'Intenso sabor a cacao, preparado con chocolate de alta calidad.',
    imageUrl: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400',
    price: 15.00, stock: 38, minStock: 10, isActive: true,
    toppings: [toppings[2], toppings[3], toppings[4]],
    createdAt: '2025-01-10T00:00:00Z',
  },
  {
    id: 'prod-4', categoryId: 'cat-2', category: categories[1],
    name: 'Mixto Especial Candyland',
    description: 'Combinación de tres sabores artesanales con toppings a elección.',
    imageUrl: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400',
    price: 25.00, stock: 30, minStock: 8, isActive: true,
    toppings: [toppings[0], toppings[1], toppings[2], toppings[3]],
    createdAt: '2025-01-15T00:00:00Z',
  },
  {
    id: 'prod-5', categoryId: 'cat-2', category: categories[1],
    name: 'Nutella con Fresa y Crema',
    description: 'El favorito de la casa. Helado con Nutella, fresas frescas y crema chantilly.',
    imageUrl: 'https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?w=400',
    price: 28.00, stock: 4, minStock: 8, isActive: true,
    toppings: [toppings[0], toppings[1], toppings[2]],
    createdAt: '2025-01-15T00:00:00Z',
  },
  {
    id: 'prod-6', categoryId: 'cat-3', category: categories[2],
    name: 'Copa de Fresas con Crema',
    description: 'Fresas frescas de temporada bañadas en crema chantilly.',
    imageUrl: 'https://images.unsplash.com/photo-1464305795204-6f5bbfc7fb81?w=400',
    price: 20.00, stock: 25, minStock: 8, isActive: true,
    toppings: [toppings[0], toppings[1], toppings[8]],
    createdAt: '2025-02-01T00:00:00Z',
  },
  {
    id: 'prod-7', categoryId: 'cat-3', category: categories[2],
    name: 'Ensalada de Frutas con Helado',
    description: 'Mezcla de frutas frescas de temporada con una bola de helado artesanal.',
    imageUrl: 'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=400',
    price: 22.00, stock: 20, minStock: 6, isActive: true,
    toppings: [toppings[1], toppings[8], toppings[9]],
    createdAt: '2025-02-01T00:00:00Z',
  },
  {
    id: 'prod-8', categoryId: 'cat-4', category: categories[3],
    name: 'Batido de Fresa',
    description: 'Batido cremoso de fresas frescas con leche y helado de vainilla.',
    imageUrl: 'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=400',
    price: 18.00, stock: 3, minStock: 5, isActive: true,
    toppings: [],
    createdAt: '2025-02-15T00:00:00Z',
  },
  {
    id: 'prod-9', categoryId: 'cat-4', category: categories[3],
    name: 'Limonada Helada',
    description: 'Refresco de limón natural con trozos de hielo y menta.',
    imageUrl: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=400',
    price: 12.00, stock: 50, minStock: 10, isActive: true,
    toppings: [],
    createdAt: '2025-02-15T00:00:00Z',
  },
  {
    id: 'prod-10', categoryId: 'cat-5', category: categories[4],
    name: 'Pil Chocolate (1L)',
    description: 'Helado industrial Pil sabor chocolate, presentación de 1 litro.',
    imageUrl: 'https://images.unsplash.com/photo-1567206563114-c179900d7065?w=400',
    price: 35.00, stock: 15, minStock: 5, isActive: true,
    toppings: [],
    createdAt: '2025-03-01T00:00:00Z',
  },
  {
    id: 'prod-11', categoryId: 'cat-5', category: categories[4],
    name: 'Panda Vainilla (500ml)',
    description: 'Helado industrial Panda sabor vainilla, presentación de 500ml.',
    imageUrl: 'https://images.unsplash.com/photo-1579954115545-a95591f28bfc?w=400',
    price: 20.00, stock: 2, minStock: 5, isActive: true,
    toppings: [],
    createdAt: '2025-03-01T00:00:00Z',
  },
  {
    id: 'prod-12', categoryId: 'cat-2', category: categories[1],
    name: 'Sundae de Oreo',
    description: 'Helado de vainilla con salsa de chocolate y galleta Oreo triturada.',
    imageUrl: 'https://images.unsplash.com/photo-1629385701021-fcd9a7b5d7c7?w=400',
    price: 22.00, stock: 28, minStock: 8, isActive: true,
    toppings: [toppings[3], toppings[4], toppings[1]],
    createdAt: '2025-03-10T00:00:00Z',
  },
]

// ─── Customers ────────────────────────────────────────────────────────────────
export const customers: Customer[] = [
  { id: 'cust-1', ci: '7823456', fullName: 'María López Torres', phone: '72345678', address: 'Calle Heroínas 234, Cochabamba', isActive: true, createdAt: '2025-04-01T00:00:00Z' },
  { id: 'cust-2', ci: '6512348', fullName: 'Juan Mamani Quispe', phone: '71234567', address: 'Av. Ballivián 567, Zona Norte', isActive: true, createdAt: '2025-04-10T00:00:00Z' },
  { id: 'cust-3', ci: '9034521', fullName: 'Ana García Flores', phone: '69876543', address: 'Calle Baptista 89, Quillacollo', isActive: true, createdAt: '2025-04-15T00:00:00Z' },
  { id: 'cust-4', ci: '8167432', fullName: 'Carlos Rojas Medina', phone: '76543210', address: 'Av. República 123', isActive: true, createdAt: '2025-05-01T00:00:00Z' },
  { id: 'cust-5', ci: '5290876', fullName: 'Lucía Vargas Pinto', phone: '73210987', address: 'Calle Sucre 456', isActive: true, createdAt: '2025-05-15T00:00:00Z' },
  { id: 'cust-6', ci: '4381209', fullName: 'Roberto Chávez Luna', phone: '68901234', address: 'Av. Villazón 789, Cercado', isActive: true, createdAt: '2025-06-01T00:00:00Z' },
  { id: 'cust-7', ci: '3147865', fullName: 'Patricia Soria Díaz', phone: '77654321', address: 'Calle Calama 321', isActive: false, createdAt: '2025-06-10T00:00:00Z' },
]

// ─── Orders ───────────────────────────────────────────────────────────────────
export const orders: Order[] = [
  {
    id: 'ord-1', userId: 'user-2', userName: 'María Quispe',
    customerId: 'cust-1', customerName: 'María López Torres', customerPhone: '72345678',
    orderType: 'delivery', status: 'pending',
    deliveryAddress: 'Calle Heroínas 234, Cochabamba',
    scheduledAt: null, total: 53.00, notes: 'Sin maní por favor', cancellationReason: null,
    details: [
      { id: 'od-1', orderId: 'ord-1', productId: 'prod-5', productName: 'Nutella con Fresa y Crema', quantity: 1, unitPrice: 28.00, subtotal: 28.00, toppings: [] },
      { id: 'od-2', orderId: 'ord-1', productId: 'prod-1', productName: 'Helado Artesanal de Fresa', quantity: 1, unitPrice: 15.00, subtotal: 15.00, toppings: [{ toppingId: 'top-1', toppingName: 'Fresas frescas', price: 3.00 }] },
      { id: 'od-3', orderId: 'ord-1', productId: 'prod-9', productName: 'Limonada Helada', quantity: 1, unitPrice: 12.00, subtotal: 12.00, toppings: [] },
    ],
    createdAt: '2026-06-24T10:15:00Z',
  },
  {
    id: 'ord-2', userId: 'user-2', userName: 'María Quispe',
    customerId: null, customerName: null, customerPhone: null,
    orderType: 'delivery', status: 'preparing',
    deliveryAddress: null, scheduledAt: null, total: 40.00, notes: null, cancellationReason: null,
    details: [
      { id: 'od-4', orderId: 'ord-2', productId: 'prod-4', productName: 'Mixto Especial Candyland', quantity: 1, unitPrice: 25.00, subtotal: 25.00, toppings: [] },
      { id: 'od-5', orderId: 'ord-2', productId: 'prod-6', productName: 'Copa de Fresas con Crema', quantity: 1, unitPrice: 20.00, subtotal: 20.00, toppings: [] },
    ],
    createdAt: '2026-06-24T11:00:00Z',
  },
  {
    id: 'ord-3', userId: 'user-2', userName: 'María Quispe',
    customerId: 'cust-3', customerName: 'Ana García Flores', customerPhone: '69876543',
    orderType: 'scheduled', status: 'pending',
    deliveryAddress: 'Calle Baptista 89, Quillacollo',
    scheduledAt: '2026-06-25T15:00:00Z', total: 90.00, notes: 'Es para un cumpleaños', cancellationReason: null,
    details: [
      { id: 'od-6', orderId: 'ord-3', productId: 'prod-5', productName: 'Nutella con Fresa y Crema', quantity: 2, unitPrice: 28.00, subtotal: 56.00, toppings: [] },
      { id: 'od-7', orderId: 'ord-3', productId: 'prod-4', productName: 'Mixto Especial Candyland', quantity: 1, unitPrice: 25.00, subtotal: 25.00, toppings: [] },
      { id: 'od-8', orderId: 'ord-3', productId: 'prod-9', productName: 'Limonada Helada', quantity: 1, unitPrice: 12.00, subtotal: 12.00, toppings: [] },
    ],
    createdAt: '2026-06-23T16:30:00Z',
  },
  {
    id: 'ord-4', userId: 'user-2', userName: 'María Quispe',
    customerId: null, customerName: null, customerPhone: null,
    orderType: 'delivery', status: 'ready',
    deliveryAddress: null, scheduledAt: null, total: 37.00, notes: null, cancellationReason: null,
    details: [
      { id: 'od-9', orderId: 'ord-4', productId: 'prod-3', productName: 'Helado Artesanal de Chocolate', quantity: 1, unitPrice: 15.00, subtotal: 15.00, toppings: [{ toppingId: 'top-3', toppingName: 'Nutella', price: 4.00 }] },
      { id: 'od-10', orderId: 'ord-4', productId: 'prod-7', productName: 'Ensalada de Frutas con Helado', quantity: 1, unitPrice: 22.00, subtotal: 22.00, toppings: [] },
    ],
    createdAt: '2026-06-24T11:45:00Z',
  },
  {
    id: 'ord-5', userId: 'user-2', userName: 'María Quispe',
    customerId: 'cust-2', customerName: 'Juan Mamani Quispe', customerPhone: '71234567',
    orderType: 'delivery', status: 'delivered',
    deliveryAddress: 'Av. Ballivián 567, Zona Norte',
    scheduledAt: null, total: 43.00, notes: null, cancellationReason: null,
    details: [
      { id: 'od-11', orderId: 'ord-5', productId: 'prod-12', productName: 'Sundae de Oreo', quantity: 1, unitPrice: 22.00, subtotal: 22.00, toppings: [] },
      { id: 'od-12', orderId: 'ord-5', productId: 'prod-8', productName: 'Batido de Fresa', quantity: 1, unitPrice: 18.00, subtotal: 18.00, toppings: [] },
    ],
    createdAt: '2026-06-24T09:00:00Z',
  },
]

// ─── Sales ────────────────────────────────────────────────────────────────────
export const sales: Sale[] = [
  {
    id: 'sale-1', userId: 'user-2', userName: 'María Quispe',
    orderId: 'ord-5', customerId: 'cust-2', customerName: 'Juan Mamani Quispe',
    total: 43.00, paymentType: 'cash', status: 'delivered',
    cancellationReason: null,
    details: [
      { id: 'sd-1', saleId: 'sale-1', productId: 'prod-12', productName: 'Sundae de Oreo', quantity: 1, unitPrice: 22.00, subtotal: 22.00, toppings: [] },
      { id: 'sd-2', saleId: 'sale-1', productId: 'prod-8', productName: 'Batido de Fresa', quantity: 1, unitPrice: 18.00, subtotal: 18.00, toppings: [] },
    ],
    createdAt: '2026-06-24T09:30:00Z',
  },
  {
    id: 'sale-2', userId: 'user-2', userName: 'María Quispe',
    orderId: null, customerId: null, customerName: null,
    total: 27.00, paymentType: 'qr', status: 'delivered',
    cancellationReason: null,
    details: [
      { id: 'sd-3', saleId: 'sale-2', productId: 'prod-1', productName: 'Helado Artesanal de Fresa', quantity: 1, unitPrice: 15.00, subtotal: 15.00, toppings: [] },
      { id: 'sd-4', saleId: 'sale-2', productId: 'prod-9', productName: 'Limonada Helada', quantity: 1, unitPrice: 12.00, subtotal: 12.00, toppings: [] },
    ],
    createdAt: '2026-06-24T10:05:00Z',
  },
  {
    id: 'sale-3', userId: 'user-1', userName: 'Administrador',
    orderId: null, customerId: 'cust-4', customerName: 'Carlos Rojas Medina',
    total: 50.00, paymentType: 'cash', status: 'delivered',
    cancellationReason: null,
    details: [
      { id: 'sd-5', saleId: 'sale-3', productId: 'prod-5', productName: 'Nutella con Fresa y Crema', quantity: 1, unitPrice: 28.00, subtotal: 28.00, toppings: [] },
      { id: 'sd-6', saleId: 'sale-3', productId: 'prod-6', productName: 'Copa de Fresas con Crema', quantity: 1, unitPrice: 20.00, subtotal: 20.00, toppings: [] },
    ],
    createdAt: '2026-06-24T10:45:00Z',
  },
  {
    id: 'sale-4', userId: 'user-2', userName: 'María Quispe',
    orderId: null, customerId: null, customerName: null,
    total: 25.00, paymentType: 'cash', status: 'canceled',
    cancellationReason: 'Pedido duplicado por error del cajero',
    details: [
      { id: 'sd-7', saleId: 'sale-4', productId: 'prod-4', productName: 'Mixto Especial Candyland', quantity: 1, unitPrice: 25.00, subtotal: 25.00, toppings: [] },
    ],
    createdAt: '2026-06-23T14:00:00Z',
  },
  {
    id: 'sale-5', userId: 'user-2', userName: 'María Quispe',
    orderId: null, customerId: null, customerName: null,
    total: 60.00, paymentType: 'qr', status: 'delivered',
    cancellationReason: null,
    details: [
      { id: 'sd-8', saleId: 'sale-5', productId: 'prod-4', productName: 'Mixto Especial Candyland', quantity: 1, unitPrice: 25.00, subtotal: 25.00, toppings: [] },
      { id: 'sd-9', saleId: 'sale-5', productId: 'prod-5', productName: 'Nutella con Fresa y Crema', quantity: 1, unitPrice: 28.00, subtotal: 28.00, toppings: [] },
      { id: 'sd-10', saleId: 'sale-5', productId: 'prod-9', productName: 'Limonada Helada', quantity: 1, unitPrice: 12.00, subtotal: 12.00, toppings: [] },
    ],
    createdAt: '2026-06-23T16:00:00Z',
  },
]

// ─── Promotions ───────────────────────────────────────────────────────────────
export const promotions: Promotion[] = [
  {
    id: 'promo-1', name: 'Happy Hour Vespertino',
    description: '20% de descuento en todos los combinados de 15:00 a 18:00.',
    discountPercent: 20, startDate: '2026-06-01', endDate: '2026-06-30', isActive: true,
  },
  {
    id: 'promo-2', name: '2x1 en Helados Artesanales',
    description: 'Lleva 2 helados artesanales al precio de 1 los lunes.',
    discountPercent: 50, startDate: '2026-06-01', endDate: '2026-07-31', isActive: true,
  },
  {
    id: 'promo-3', name: 'Descuento de Lanzamiento',
    description: '15% de descuento en la primera compra de clientes nuevos.',
    discountPercent: 15, startDate: '2025-01-01', endDate: '2025-12-31', isActive: false,
  },
]

// ─── Stock Alerts ─────────────────────────────────────────────────────────────
export const stockAlerts: StockAlert[] = [
  { id: 'alert-1', productId: 'prod-5', productName: 'Nutella con Fresa y Crema', currentStock: 4, minStock: 8, isResolved: false, alertedAt: '2026-06-24T08:00:00Z', resolvedAt: null },
  { id: 'alert-2', productId: 'prod-8', productName: 'Batido de Fresa', currentStock: 3, minStock: 5, isResolved: false, alertedAt: '2026-06-24T08:00:00Z', resolvedAt: null },
  { id: 'alert-3', productId: 'prod-11', productName: 'Panda Vainilla (500ml)', currentStock: 2, minStock: 5, isResolved: false, alertedAt: '2026-06-24T07:30:00Z', resolvedAt: null },
  { id: 'alert-4', productId: 'prod-2', productName: 'Helado Artesanal de Vainilla', currentStock: 6, minStock: 10, isResolved: true, alertedAt: '2026-06-23T09:00:00Z', resolvedAt: '2026-06-23T15:00:00Z' },
]

// ─── Notifications ────────────────────────────────────────────────────────────
export const notifications: Notification[] = [
  { id: 'notif-1', type: 'stock_alert', title: 'Stock crítico', message: 'Nutella con Fresa y Crema tiene solo 4 unidades. Considere reabastecer.', priority: 'high', isRead: false, createdAt: '2026-06-24T08:00:00Z', relatedId: 'prod-5', link: '/inventario' },
  { id: 'notif-2', type: 'stock_alert', title: 'Stock crítico', message: 'Batido de Fresa tiene solo 3 unidades (mínimo: 5).', priority: 'high', isRead: false, createdAt: '2026-06-24T08:00:00Z', relatedId: 'prod-8', link: '/inventario' },
  { id: 'notif-3', type: 'order_scheduled', title: 'Pedido programado', message: 'El pedido #ORD-003 de Ana García está programado para mañana 25/06 a las 15:00.', priority: 'medium', isRead: false, createdAt: '2026-06-24T07:00:00Z', relatedId: 'ord-3', link: '/pedidos' },
  { id: 'notif-4', type: 'sale_cancelled', title: 'Venta anulada', message: 'La venta #SALE-004 fue anulada. Stock restituido automáticamente.', priority: 'medium', isRead: true, createdAt: '2026-06-23T14:05:00Z', relatedId: 'sale-4', link: '/ventas' },
]

// ─── Activity Logs ────────────────────────────────────────────────────────────
export const activityLogs: ActivityLog[] = [
  { id: 'log-1', userId: 'user-2', userName: 'María Quispe', action: 'CREATE', entity: 'Sale', entityId: 'sale-1', details: 'Venta de Bs. 43.00 registrada', createdAt: '2026-06-24T09:30:00Z' },
  { id: 'log-2', userId: 'user-2', userName: 'María Quispe', action: 'CREATE', entity: 'Order', entityId: 'ord-1', details: 'Pedido delivery para María López', createdAt: '2026-06-24T10:15:00Z' },
  { id: 'log-3', userId: 'user-1', userName: 'Administrador', action: 'UPDATE', entity: 'Product', entityId: 'prod-5', details: 'Stock actualizado a 4 unidades', createdAt: '2026-06-24T08:00:00Z' },
  { id: 'log-4', userId: 'user-2', userName: 'María Quispe', action: 'CANCEL', entity: 'Sale', entityId: 'sale-4', details: 'Venta anulada: Pedido duplicado', createdAt: '2026-06-23T14:00:00Z' },
]

// ─── Dashboard Metrics ────────────────────────────────────────────────────────
export const dashboardMetrics: DashboardMetrics = {
  todaySales: 3,
  todayRevenue: 120.00,
  pendingOrders: 2,
  lowStockProducts: 3,
  weeklyRevenue: [85, 120, 95, 140, 110, 155, 120],
  topProducts: [
    { name: 'Nutella con Fresa y Crema', quantity: 28, revenue: 784.00 },
    { name: 'Mixto Especial Candyland', quantity: 22, revenue: 550.00 },
    { name: 'Copa de Fresas con Crema', quantity: 18, revenue: 360.00 },
    { name: 'Helado Artesanal de Fresa', quantity: 35, revenue: 525.00 },
    { name: 'Limonada Helada', quantity: 42, revenue: 504.00 },
  ],
  recentSales: sales.slice(0, 5),
  salesByPayment: { cash: 2, qr: 1 },
}
