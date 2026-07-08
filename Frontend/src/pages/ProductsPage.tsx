import type { FC } from 'react'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productService } from '@/services/productService'
import { categoryService } from '@/services/categoryService'
import { toppingService } from '@/services/toppingService'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageSpinner } from '@/components/ui/Spinner'
import { formatCurrency } from '@/lib/utils'
import { PlusIcon, PencilSquareIcon, TagIcon } from '@heroicons/react/24/outline'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import type { Product } from '@/types'

const schema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  categoryId: z.string().min(1, 'Seleccione una categoría'),
  description: z.string().min(5, 'Mínimo 5 caracteres'),
  imageFile: z.any().optional(),
  price: z.coerce.number().positive('Debe ser mayor a 0'),
  stock: z.coerce.number().int().min(0, 'No puede ser negativo'),
  minStock: z.coerce.number().int().positive('Mínimo 1'),
  toppingIds: z.array(z.string()).default([]),
})
type FormData = z.infer<typeof schema>

export const ProductsPage: FC = () => {
  const qc = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [search, setSearch] = useState('')

  const { data: products = [], isLoading } = useQuery({ queryKey: ['products'], queryFn: productService.getAll })
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: categoryService.getActive })
  const { data: toppings = [] } = useQuery({ queryKey: ['toppings'], queryFn: toppingService.getActive })

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: { toppingIds: [] },
  })

  const selectedToppings = watch('toppingIds') ?? []
  const imageFile = watch('imageFile') as FileList | undefined
  const selectedImageFile = imageFile?.[0]

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const created = await productService.create(data)
      const file = data.imageFile?.[0]
      if (file) await productService.uploadImage(created.id, file)
      return created
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); toast.success('Producto creado'); closeModal() },
    onError: (e: Error) => toast.error(e.message),
  })
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FormData }) => {
      const updated = await productService.update(id, data)
      const file = data.imageFile?.[0]
      if (file) await productService.uploadImage(id, file)
      return updated
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); toast.success('Producto actualizado'); closeModal() },
    onError: (e: Error) => toast.error(e.message),
  })
  const toggleMutation = useMutation({
    mutationFn: (id: string) => productService.toggleActive(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); toast.success('Estado actualizado') },
    onError: (e: Error) => toast.error(e.message),
  })

  const openCreate = () => { reset({ toppingIds: [] }); setEditing(null); setIsOpen(true) }
  const openEdit = (p: Product) => {
    setEditing(p)
    reset({ name: p.name, categoryId: p.categoryId, description: p.description, price: p.price, stock: p.stock, minStock: p.minStock, toppingIds: p.toppings.map(t => t.id) })
    setIsOpen(true)
  }
  const closeModal = () => { setIsOpen(false); setEditing(null); reset() }

  const onSubmit: SubmitHandler<FormData> = (data) => {
    if (editing) updateMutation.mutate({ id: editing.id, data })
    else createMutation.mutate(data)
  }

  const toggleTopping = (id: string) => {
    const current = selectedToppings
    setValue('toppingIds', current.includes(id) ? current.filter(t => t !== id) : [...current, id])
  }

  const normalizedSearch = search.trim().toLowerCase()

  const filtered = products.filter((p) => {
    const name = p.name.toLowerCase()
    const categoryName = p.category?.name?.toLowerCase() ?? ''
    const description = p.description?.toLowerCase() ?? ''

    return normalizedSearch.length === 0 || [name, categoryName, description].some((value) => value.includes(normalizedSearch))
  })

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Productos</h1>
        <Button onClick={openCreate} size="sm"><PlusIcon className="h-4 w-4" />Nuevo producto</Button>
      </div>

      <div className="max-w-xs">
        <Input placeholder="Buscar productos..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<TagIcon className="h-10 w-10" />} title="No hay productos" description="Crea el primer producto del catálogo" action={<Button onClick={openCreate} size="sm">Nuevo producto</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map(p => (
            <div key={p.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="aspect-video bg-gray-100 overflow-hidden">
                <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400' }} />
              </div>
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.category.name}</p>
                  </div>
                  <Badge variant={p.isActive ? 'success' : 'default'}>{p.isActive ? 'Activo' : 'Inactivo'}</Badge>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="font-semibold text-primary-600">{formatCurrency(p.price)}</span>
                  <span className={`text-xs ${p.stock <= p.minStock ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                    Stock: {p.stock}
                  </span>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button variant="secondary" size="sm" className="flex-1" onClick={() => openEdit(p)}>
                    <PencilSquareIcon className="h-3.5 w-3.5" />Editar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => toggleMutation.mutate(p.id)}>
                    {p.isActive ? 'Desact.' : 'Activar'}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isOpen} onClose={closeModal} title={editing ? 'Editar producto' : 'Nuevo producto'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Input label="Nombre" {...register('name')} error={errors.name?.message} />
          </div>
          <Select
            label="Categoría"
            options={categories.map(c => ({ value: c.id, label: c.name }))}
            placeholder="Seleccionar..."
            error={errors.categoryId?.message}
            {...register('categoryId')}
          />
          <Input label="Precio (Bs.)" type="number" step="0.5" {...register('price')} error={errors.price?.message} />
          <Input label="Stock inicial" type="number" {...register('stock')} error={errors.stock?.message} />
          <Input label="Stock mínimo" type="number" {...register('minStock')} error={errors.minStock?.message} />
          <div className="col-span-2">
            <label className="text-sm font-medium text-gray-700 block mb-1">Imagen</label>
            <input
              type="file"
              accept="image/*"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              {...register('imageFile')}
            />
            {selectedImageFile ? (
              <p className="text-xs text-gray-500 mt-1">Seleccionado: {selectedImageFile.name}</p>
            ) : editing?.imageUrl ? (
              <img src={editing.imageUrl} alt="Imagen actual" className="mt-2 h-24 w-full rounded-md border border-gray-200 object-cover" />
            ) : null}
          </div>
          <div className="col-span-2">
            <label className="text-sm font-medium text-gray-700 block mb-1">Descripción</label>
            <textarea
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={2}
              {...register('description')}
            />
            {errors.description && <p className="text-xs text-red-600 mt-1">{errors.description.message}</p>}
          </div>
          {toppings.length > 0 && (
            <div className="col-span-2">
              <p className="text-sm font-medium text-gray-700 mb-2">Toppings disponibles</p>
              <div className="flex flex-wrap gap-2">
                {toppings.map(t => (
                  <button
                    key={t.id} type="button"
                    onClick={() => toggleTopping(t.id)}
                    className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                      selectedToppings.includes(t.id)
                        ? 'bg-primary-500 text-white border-primary-500'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-primary-400'
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="col-span-2 flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={closeModal}>Cancelar</Button>
            <Button type="submit" isLoading={isSubmitting}>{editing ? 'Guardar cambios' : 'Crear producto'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
