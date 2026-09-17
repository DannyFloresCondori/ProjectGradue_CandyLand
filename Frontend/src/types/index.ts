// ─── Domain Types ────────────────────────────────────────────────────────────

export type RoleName = 'admin' | 'cajero' | 'inventario' | 'cocina'

export interface Role {
  id: string
  name: RoleName
  description: string
  createdAt: string
}

export interface User {
  id: string
  roleId: string
  role: Role
  fullName: string
  username: string
  email: string
  phone?: string
  password: string
  isActive: boolean
  createdAt: string
  updatedAt?: string
  salesCount?: number
}

export interface AuthUser {
  id: string
  fullName: string
  username: string
  email: string
  role: RoleName
  token: string
}

export interface Category {
  id: string
  name: string
  isActive: boolean
}

export interface Topping {
  id: string
  name: string
  isActive: boolean
}

export interface Product {
  id: string
  categoryId: string
  category: Category
  name: string
  description: string
  imageUrl: string
  price: number
  stock: number
  minStock: number
  isActive: boolean
  toppings: Topping[]
  createdAt: string
  promotion?: {
    id?: string
    name?: string
    type?: string
    discountPercent?: number
    isActive?: boolean
  } | null
}

export interface Customer {
  id: string
  ci: string
  fullName: string
  phone: string
  address: string
  isActive: boolean
  createdAt: string
}

export type OrderType = 'delivery' | 'scheduled'
export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled'

export interface OrderDetailTopping {
  toppingId: string
  toppingName: string
  price: number
}

export interface OrderDetail {
  id: string
  orderId: string
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  subtotal: number
  toppings: OrderDetailTopping[]
}

export interface Order {
  id: string
  userId: string
  userName: string
  customerId: string | null
  customerName: string | null
  customerPhone: string | null
  orderType: OrderType
  status: OrderStatus
  deliveryAddress: string | null
  scheduledAt: string | null
  total: number
  notes: string | null
  cancellationReason: string | null
  details: OrderDetail[]
  createdAt: string
}

export type PaymentType = 'cash' | 'qr'
export type SaleStatus = 'delivered' | 'canceled'
export type SaleOrderType = OrderType | 'local'

export interface SaleDetail {
  id: string
  saleId: string
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  subtotal: number
  toppings: OrderDetailTopping[]
}

export interface Sale {
  id: string
  userId: string
  userName: string
  userRole?: string | null
  orderId: string | null
  orderType?: SaleOrderType
  deliveryAddress?: string | null
  scheduledAt?: string | null
  customerId: string | null
  customerName: string | null
  total: number
  paymentType: PaymentType
  status: SaleStatus
  cancellationReason: string | null
  details: SaleDetail[]
  createdAt: string
}

export interface Promotion {
  id: string
  name: string
  description: string
  discountPercent: number
  startDate: string
  endDate: string
  isActive: boolean
  productIds?: string[]
}

export interface StockAlert {
  id: string
  productId: string
  productName: string
  currentStock: number
  minStock: number
  stockQuantity?: number
  isResolved: boolean
  alertedAt: string
  resolvedAt: string | null
  message?: string
}

export interface DashboardMetrics {
  todaySales: number
  todayRevenue: number
  pendingOrders: number
  lowStockProducts: number
  weeklyRevenue: number[]
  topProducts: { name: string; quantity: number; revenue: number }[]
  recentSales: Sale[]
  salesByPayment: { cash: number; qr: number }
}

export type NotificationPriority = 'high' | 'medium' | 'low'

export interface Notification {
  id: string
  type: 'stock_alert' | 'order_scheduled' | 'sale_cancelled'
  title: string
  message: string
  priority: NotificationPriority
  isRead: boolean
  createdAt: string
  relatedId: string | null
  link: string | null
}

export interface ActivityLog {
  id: string
  userId: string
  userName: string
  action: string
  entity: string
  entityId: string
  details: string
  createdAt: string
}

// ─── API / Service Layer ──────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

export interface ApiError {
  message: string
  statusCode: number
}

// ─── Form Inputs ──────────────────────────────────────────────────────────────

export interface LoginInput {
  username: string
  password: string
}

export interface ProductInput {
  categoryId: string
  name: string
  description: string
  price: number
  stock: number
  minStock: number
  toppingIds: string[]
}

export interface CustomerInput {
  ci: string
  fullName: string
  phone: string
  address: string
}

export interface OrderDetailInput {
  productId: string
  quantity: number
  toppingIds: string[]
}

export interface OrderInput {
  customerId: string | null
  orderType: OrderType
  deliveryAddress: string | null
  scheduledAt: string | null
  notes: string | null
  details: OrderDetailInput[]
}

export interface SaleDetailInput {
  productId: string
  quantity: number
  toppingIds?: string[]
}

export interface SaleInput {
  orderId: string | null
  customerId: string | null
  paymentType: PaymentType
  details: SaleDetailInput[]
}

export interface PromotionInput {
  name: string
  description: string
  discountPercent: number
  startDate: string
  endDate: string
  isActive?: boolean
  productIds?: string[]
}

export interface UserInput {
  roleId: string
  name: string
  email?: string
  phone?: string
  password: string
}
