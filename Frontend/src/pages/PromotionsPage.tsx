import type { FC } from 'react'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { promotionService } from '@/services/promotionService'
import { productService } from '@/services/productService'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Card, CardBody } from '@/components/ui/Card'
import { PageSpinner } from '@/components/ui/Spinner'
import { PlusIcon, PencilSquareIcon } from '@heroicons/react/24/outline'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import type { Promotion, PromotionInput } from '@/types'

const getToday = () => new Date().toISOString().slice(0, 10)
const toDateOnly = (value?: string) => value?.slice(0, 10) ?? ''
const addDays = (date: string, days: number) => {
  const result = new Date(`${toDateOnly(date) || getToday()}T00:00:00Z`)
  result.setUTCDate(result.getUTCDate() + days)
  return result.toISOString().slice(0, 10)
}
const dayDifference = (start: string, end: string) => {
  const startDate = new Date(`${toDateOnly(start)}T00:00:00Z`)
  const endDate = new Date(`${toDateOnly(end)}T00:00:00Z`)
  return Math.round((endDate.getTime() - startDate.getTime()) / 86400000)
}

const schema = z.object({
  name: z.preprocess((v) => (typeof v === 'string' ? v.trim() : v), z.string().min(1, 'El nombre de la promoción es obligatorio.')),
  description: z.preprocess((v) => (typeof v === 'string' ? v.trim() : v), z.string().min(1, 'La descripción es obligatoria.')),
  discountPercent: z.coerce.number({ error: 'El descuento debe ser un número válido.' }).refine((v) => v > 0, { message: 'El descuento debe ser mayor que 0.' }).refine((v) => v <= 100, { message: 'El descuento no puede superar el 100%.' }),
  startDate: z.string().min(1, 'La fecha de inicio es obligatoria.'),
  endDate: z.string().min(1, 'La fecha de finalización es obligatoria.'),
}).superRefine((data, ctx) => {
  const today = getToday()
  if (data.startDate && data.startDate < today) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['startDate'], message: 'La fecha de inicio debe ser hoy o posterior.' })
  }
  if (data.startDate && data.endDate && data.endDate < data.startDate) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endDate'], message: 'La fecha fin debe ser igual o posterior al inicio.' })
  }
  if (data.startDate && data.endDate && dayDifference(data.startDate, data.endDate) > 6) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endDate'], message: 'La promoción no puede durar más de 7 días.' })
  }
})
type FormData = z.infer<typeof schema>
type PromotionFormData = FormData & { productIds: string[] }

export const PromotionsPage: FC = () => {
  const qc = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [editing, setEditing] = useState<Promotion | null>(null)
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])

  const { data: promos = [], isLoading } = useQuery({ queryKey: ['promotions'], queryFn: promotionService.getAll })
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: productService.getAll })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) as any })
  const formStartDate = watch('startDate')

  const createMut = useMutation({ mutationFn: (d: PromotionFormData) => promotionService.create(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['promotions'] }); toast.success('Promoción creada'); closeModal() }, onError: (e: Error) => toast.error(e.message) })
  const updateMut = useMutation({ mutationFn: ({ id, data }: { id: string; data: Partial<PromotionInput> }) => promotionService.update(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['promotions'] }); toast.success('Promoción actualizada'); closeModal(); closeActivate(); }, onError: (e: Error) => toast.error(e.message) })
  const toggleMut = useMutation({ mutationFn: (id: string) => promotionService.toggleActive(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['promotions'] }) })

  const [activating, setActivating] = useState<Promotion | null>(null)
  const [activateStart, setActivateStart] = useState('')
  const [activateEnd, setActivateEnd] = useState('')

  const openActivate = (p: Promotion) => { setActivating(p); setActivateStart(toDateOnly(p.startDate)); setActivateEnd(toDateOnly(p.endDate)) }
  const closeActivate = () => { setActivating(null); setActivateStart(''); setActivateEnd('') }
  const activateConfirm = () => {
    if (!activating) return
    if (!activateStart || !activateEnd) { toast.error('Completa ambas fechas'); return }
    const today = getToday()
    if (activateStart < today) { toast.error('La fecha de inicio debe ser hoy o posterior'); return }
    if (activateEnd < activateStart) { toast.error('La fecha fin debe ser igual o posterior a la fecha inicio'); return }
    if (dayDifference(activateStart, activateEnd) > 6) { toast.error('La promoción no puede durar más de 7 días'); return }
    const data: Partial<PromotionInput> = { startDate: activateStart, endDate: activateEnd, isActive: true }
    updateMut.mutate({ id: activating.id, data })
  }

  const openCreate = () => { reset(); setEditing(null); setSelectedProductIds([]); setIsOpen(true) }
  const openEdit = (p: Promotion) => { reset({ name: p.name, description: p.description, discountPercent: p.discountPercent, startDate: toDateOnly(p.startDate), endDate: toDateOnly(p.endDate) }); setEditing(p); setSelectedProductIds(p.productIds ?? []); setIsOpen(true) }
  const closeModal = () => { setIsOpen(false); setEditing(null); setSelectedProductIds([]); reset() }
  const onSubmit: SubmitHandler<FormData> = (data) => {
    const payload: PromotionFormData = { ...data, productIds: selectedProductIds }
    editing ? updateMut.mutate({ id: editing.id, data: payload }) : createMut.mutate(payload)
  }

  const toggleProductSelection = (productId: string) => {
    setSelectedProductIds((current) => current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId])
  }

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Promociones</h1>
        <Button onClick={openCreate} size="sm"><PlusIcon className="h-4 w-4" />Nueva promoción</Button>
      </div>
      <Card><CardBody className="p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100 bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Nombre</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Descuento</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Vigencia</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Estado</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {promos.map(p => {
              const today = new Date().toISOString().slice(0, 10)
              const isExpired = p.endDate < today
              return (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.description}</p>
                  </td>
                  <td className="px-4 py-3 font-bold text-primary-600">{p.discountPercent}%</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{p.startDate} → {p.endDate}</td>
                  <td className="px-4 py-3">
                    <Badge variant={p.isActive && !isExpired ? 'success' : isExpired ? 'error' : 'default'}>
                      {isExpired ? 'Vencida' : p.isActive ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(p)}><PencilSquareIcon className="h-4 w-4" /></Button>
                      {p.isActive ? (
                        <Button variant="ghost" size="sm" onClick={() => toggleMut.mutate(p.id)}>Desact.</Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => openActivate(p)}>Activar</Button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </CardBody></Card>

      <Modal isOpen={isOpen} onClose={closeModal} title={editing ? 'Editar promoción' : 'Nueva promoción'} size="md">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input label="Nombre" {...register('name')} error={errors.name?.message} />
          <Input label="Descripción" {...register('description')} error={errors.description?.message} />
          <Input label="Descuento (%)" type="number" min="1" max="100" {...register('discountPercent')} error={errors.discountPercent?.message} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Fecha inicio" type="date" min={getToday()} {...register('startDate')} error={errors.startDate?.message} />
            <Input label="Fecha fin" type="date" min={formStartDate || getToday()} max={formStartDate ? addDays(formStartDate, 6) : addDays(getToday(), 6)} {...register('endDate')} error={errors.endDate?.message} />
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="mb-2 text-sm font-medium text-gray-700">Productos asociados</p>
            <p className="mb-3 text-xs text-gray-500">Selecciona los productos que tendrán esta promoción.</p>
            <div className="flex flex-wrap gap-2">
              {products.length === 0 && <span className="text-sm text-gray-500">No hay productos disponibles.</span>}
              {products.map((product) => {
                const isSelected = selectedProductIds.includes(product.id)
                return (
                  <label key={product.id} className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-sm ${isSelected ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 bg-white text-gray-700'}`}>
                    <input type="checkbox" checked={isSelected} onChange={() => toggleProductSelection(product.id)} className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                    {product.name}
                  </label>
                )
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeModal}>Cancelar</Button>
            <Button type="submit" isLoading={isSubmitting}>{editing ? 'Guardar' : 'Crear'}</Button>
          </div>
        </form>
      </Modal>

      {/* Activate modal - only edit dates */}
      <Modal isOpen={!!activating} onClose={closeActivate} title={`Activar promoción${activating ? `: ${activating.name}` : ''}`} size="sm">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Fecha inicio" type="date" min={getToday()} value={activateStart} onChange={(e) => setActivateStart(e.target.value)} />
            <Input label="Fecha fin" type="date" min={activateStart || getToday()} max={activateStart ? addDays(activateStart, 6) : addDays(getToday(), 6)} value={activateEnd} onChange={(e) => setActivateEnd(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeActivate}>Cancelar</Button>
            <Button onClick={() => activateConfirm()}>{activating?.isActive ? 'Actualizar' : 'Activar'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
