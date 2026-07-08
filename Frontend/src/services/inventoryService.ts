import type { StockAlert, Product } from '@/types'
import { apiClient, getErrorMessage } from '@/lib/api'
import { productService } from '@/services/productService'

function normalizeStockAlert(item: any): StockAlert {
  return {
    id: item.id,
    productId: item.product?.id ?? item.productId,
    productName: item.product?.name ?? item.productName ?? '',
    currentStock: Number(item.current_stock ?? item.currentStock ?? 0),
    minStock: Number(item.minimum_stock ?? item.minStock ?? 0),
    isResolved: item.is_resolved ?? item.isResolved ?? false,
    alertedAt: item.alerted_at ?? item.alertedAt ?? new Date().toISOString(),
    resolvedAt: item.resolved_at ?? item.resolvedAt ?? null,
    message: item.alert_message ?? item.message ?? '',
  }
}

export const inventoryService = {
  async getLowStockProducts(): Promise<Product[]> {
    try {
      const { data } = await apiClient.get('/products')
      const products = (Array.isArray(data) ? data : []).map((item: any) => ({
        id: item.id,
        categoryId: item.category?.id ?? '',
        category: item.category ? { id: item.category.id, name: item.category.name, isActive: true } : { id: '', name: 'Sin categoría', isActive: true },
        name: item.name,
        description: item.description ?? '',
        imageUrl: item.image ?? '',
        price: Number(item.price ?? 0),
        stock: Number(item.current_stock ?? 0),
        minStock: Number(item.minimum_stock ?? 0),
        isActive: item.isActive ?? true,
        toppings: [],
        createdAt: item.createdAt ?? new Date().toISOString(),
      }))
      return products.filter((p) => p.isActive && p.stock <= p.minStock)
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  },

  async getAlerts(): Promise<StockAlert[]> {
    try {
      const { data } = await apiClient.get('/stock-alert')
      const list = Array.isArray(data) ? data : data?.data ?? []
      return list.map(normalizeStockAlert).sort((a: StockAlert, b: StockAlert) => new Date(b.alertedAt).getTime() - new Date(a.alertedAt).getTime())
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  },

  async getActiveAlerts(): Promise<StockAlert[]> {
    try {
      const { data } = await apiClient.get('/stock-alert/active')
      const list = Array.isArray(data) ? data : data?.data ?? []
      return list
        .map(normalizeStockAlert)
        .sort((a: StockAlert, b: StockAlert) => new Date(b.alertedAt).getTime() - new Date(a.alertedAt).getTime())
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  },

  async resolveAlert(id: string): Promise<StockAlert> {
    try {
      const { data } = await apiClient.patch(`/stock-alert/${id}`, { is_resolved: true, resolved_at: new Date().toISOString() })
      return normalizeStockAlert(data)
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  },

  async updateStock(productId: string, newStock: number): Promise<Product> {
    return productService.updateStock(productId, newStock)
  },

  async updateMinStock(productId: string, minStock: number): Promise<Product> {
    return productService.update(productId, { minStock } as any)
  },
}
