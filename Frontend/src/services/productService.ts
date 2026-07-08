import type { Product, ProductInput } from '@/types'
import { apiClient, buildApiUrl, getErrorMessage } from '@/lib/api'

function resolveImageUrl(imagePath?: string): string {
  if (!imagePath) return ''
  if (/^https?:\/\//i.test(imagePath) || imagePath.startsWith('data:')) return imagePath
  if (imagePath.startsWith('/uploads')) return buildApiUrl(imagePath)
  return imagePath
}

function normalizeProduct(item: any): Product {
  const category = item.category ?? item.categoryEntity ?? null
  const toppings = (item.productToppings ?? item.toppings ?? []).map((t: any) => ({
    id: t.topping?.id ?? t.toppingId ?? t.id ?? '',
    name: t.topping?.name ?? t.name ?? '',
  }))

  return {
    id: item.id,
    categoryId: category?.id ?? item.categoryId ?? '',
    category: category ? { id: category.id, name: category.name, isActive: category.isActive ?? true } : { id: '', name: 'Sin categoría', isActive: true },
    name: item.name,
    description: item.description ?? '',
    imageUrl: resolveImageUrl(item.image ?? item.imageUrl ?? ''),
    price: Number(item.price ?? 0),
    stock: Number(item.current_stock ?? item.stock ?? 0),
    minStock: Number(item.minimum_stock ?? item.minStock ?? 0),
    isActive: item.isActive ?? true,
    toppings,
    createdAt: item.createdAt ?? new Date().toISOString(),
  }
}

export const productService = {
  async getAll(): Promise<Product[]> {
    try {
      const { data } = await apiClient.get('/products')
      const payload = Array.isArray(data) ? data : data?.data ?? data?.items ?? []
      const list = Array.isArray(payload) ? payload : [payload]
      return list.filter(Boolean).map(normalizeProduct)
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  },

  async getActive(): Promise<Product[]> {
    const products = await productService.getAll()
    return products.filter((p) => p.isActive)
  },

  async getById(id: string): Promise<Product> {
    try {
      const { data } = await apiClient.get(`/products/${id}`)
      return normalizeProduct(data)
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  },

  async getLowStock(): Promise<Product[]> {
    const products = await productService.getAll()
    return products.filter((p) => p.isActive && p.stock <= p.minStock)
  },

  async uploadImage(id: string, file: File): Promise<Product> {
    try {
      const formData = new FormData()
      formData.append('file', file)
      const token = (() => {
        const raw = localStorage.getItem('candyland_session')
        if (!raw) return undefined
        try {
          return JSON.parse(raw).token as string | undefined
        } catch {
          return undefined
        }
      })()

      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3002/api/v1'
      const response = await fetch(`${baseUrl}/products/${id}/image`, {
        method: 'POST',
        body: formData,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.message || response.statusText || 'Error subiendo imagen')
      }

      return this.getById(id)
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  },

  async create(input: ProductInput): Promise<Product> {
    try {
      const { data } = await apiClient.post('/products', {
        name: input.name,
        description: input.description || undefined,
        price: input.price,
        current_stock: input.stock,
        minimum_stock: input.minStock,
        categoryId: input.categoryId,
        toppingId: input.toppingIds,
      })
      const created = normalizeProduct(data)
      return created
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  },

  async update(id: string, input: Partial<ProductInput>): Promise<Product> {
    try {
      const payload: Record<string, unknown> = {}
      if (input.name !== undefined) payload.name = input.name
      if (input.description !== undefined) payload.description = input.description || undefined
      if (input.price !== undefined) payload.price = input.price
      if (input.stock !== undefined) payload.current_stock = input.stock
      if (input.minStock !== undefined) payload.minimum_stock = input.minStock
      if (input.categoryId !== undefined) payload.categoryId = input.categoryId
      if (input.toppingIds !== undefined) payload.toppingId = input.toppingIds

      const { data } = await apiClient.patch(`/products/${id}`, payload)
      return normalizeProduct(data)
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  },

  async updateStock(id: string, newStock: number): Promise<Product> {
    try {
      const { data } = await apiClient.patch(`/products/${id}`, { current_stock: newStock })
      return normalizeProduct(data)
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  },

  async toggleActive(id: string): Promise<Product> {
    try {
      const current = await productService.getById(id)
      const { data } = await apiClient.patch(`/products/${id}`, { isActive: !current.isActive })
      return normalizeProduct(data)
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  },
}
