import type { FC } from 'react'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toppingService } from '@/services/toppingService'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Card, CardBody } from '@/components/ui/Card'
import { PageSpinner } from '@/components/ui/Spinner'
import { formatCurrency } from '@/lib/utils'
import { PlusIcon, PencilSquareIcon } from '@heroicons/react/24/outline'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import type { Topping } from '@/types'

const schema = z.object({
  name: z.preprocess((v) => (typeof v === 'string' ? v.trim() : v), z.string().min(1, 'El nombre del topping es obligatorio.')),
})
type FormData = z.infer<typeof schema>

export const ToppingsPage: FC = () => {
  const qc = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [editing, setEditing] = useState<Topping | null>(null)

  const { data: toppings = [], isLoading } = useQuery({ queryKey: ['toppings'], queryFn: toppingService.getAll })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) as any })

  const createMut = useMutation({ mutationFn: (d: FormData) => toppingService.create(d.name), onSuccess: () => { qc.invalidateQueries({ queryKey: ['toppings'] }); toast.success('Topping creado'); closeModal() }, onError: (e: Error) => toast.error(e.message) })
  const updateMut = useMutation({ mutationFn: ({ id, data }: { id: string; data: FormData }) => toppingService.update(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['toppings'] }); toast.success('Topping actualizado'); closeModal() }, onError: (e: Error) => toast.error(e.message) })
  const toggleMut = useMutation({ mutationFn: (id: string) => toppingService.toggleActive(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['toppings'] }) })

  const openCreate = () => { reset({ name: '' }); setEditing(null); setIsOpen(true) }
  const openEdit = (t: Topping) => { reset({ name: t.name }); setEditing(t); setIsOpen(true) }
  const closeModal = () => { setIsOpen(false); setEditing(null); reset() }
  const onSubmit: SubmitHandler<FormData> = (data) => { editing ? updateMut.mutate({ id: editing.id, data }) : createMut.mutate(data) }

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Toppings</h1>
        <Button onClick={openCreate} size="sm"><PlusIcon className="h-4 w-4" />Nuevo topping</Button>
      </div>
      <Card><CardBody className="p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100 bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Nombre</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Estado</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {toppings.map(t => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{t.name}</td>
                <td className="px-4 py-3"><Badge variant={t.isActive ? 'success' : 'default'}>{t.isActive ? 'Activo' : 'Inactivo'}</Badge></td>
                <td className="px-4 py-3 text-right flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(t)}><PencilSquareIcon className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => toggleMut.mutate(t.id)}>{t.isActive ? 'Desactivar' : 'Activar'}</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardBody></Card>

      <Modal isOpen={isOpen} onClose={closeModal} title={editing ? 'Editar topping' : 'Nuevo topping'} size="sm">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input label="Nombre" {...register('name')} error={errors.name?.message} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeModal}>Cancelar</Button>
            <Button type="submit" isLoading={isSubmitting}>{editing ? 'Guardar' : 'Crear'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
