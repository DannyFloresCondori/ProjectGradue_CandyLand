import type { FC } from 'react'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { customerService } from '@/services/customerService'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Card, CardBody } from '@/components/ui/Card'
import { Pagination } from '@/components/ui/Pagination'
import { PageSpinner } from '@/components/ui/Spinner'
import { PlusIcon, PencilSquareIcon, UserGroupIcon } from '@heroicons/react/24/outline'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import type { Customer } from '@/types'
import { EmptyState } from '@/components/ui/EmptyState'

const schema = z.object({
  ci: z.string().min(5, 'Mínimo 5 dígitos').max(10, 'Máximo 10 dígitos').regex(/^\d+$/, 'Solo números'),
  fullName: z.string().min(2, 'Mínimo 2 caracteres'),
  phone: z.string().min(7, 'Teléfono inválido').max(10, 'Teléfono inválido'),
  address: z.string().min(5, 'Mínimo 5 caracteres'),
})
type FormData = z.infer<typeof schema>

const PAGE_SIZE = 8

export const CustomersPage: FC = () => {
  const qc = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: customerService.getAll,
  })
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const createMut = useMutation({
    mutationFn: (d: FormData) => customerService.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); toast.success('Cliente registrado'); closeModal() },
    onError: (e: Error) => toast.error(e.message),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) => customerService.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); toast.success('Cliente actualizado'); closeModal() },
    onError: (e: Error) => toast.error(e.message),
  })
  const toggleMut = useMutation({
    mutationFn: (id: string) => customerService.toggleActive(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  })

  const openCreate = () => { reset(); setEditing(null); setIsOpen(true) }
  const openEdit = (c: Customer) => {
    reset({ ci: c.ci, fullName: c.fullName, phone: c.phone, address: c.address })
    setEditing(c)
    setIsOpen(true)
  }
  const closeModal = () => { setIsOpen(false); setEditing(null); reset() }
  const onSubmit = (data: FormData) => {
    editing ? updateMut.mutate({ id: editing.id, data }) : createMut.mutate(data)
  }

  // Búsqueda por CI o nombre (no por teléfono)
  const filtered = customers.filter(c => {
    const q = search.toLowerCase()
    return c.ci.includes(q) || c.fullName.toLowerCase().includes(q)
  })
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Clientes</h1>
        <Button onClick={openCreate} size="sm"><PlusIcon className="h-4 w-4" />Nuevo cliente</Button>
      </div>
      <div className="max-w-xs">
        <Input
          placeholder="Buscar por CI o nombre..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<UserGroupIcon className="h-10 w-10" />}
          title="No hay clientes"
          action={<Button onClick={openCreate} size="sm">Registrar cliente</Button>}
        />
      ) : (
        <Card><CardBody className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">CI</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Nombre</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Teléfono</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 hidden md:table-cell">Dirección</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Estado</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{c.ci}</td>
                  <td className="px-4 py-3 font-medium">{c.fullName}</td>
                  <td className="px-4 py-3 text-gray-600">{c.phone}</td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell truncate max-w-xs">{c.address}</td>
                  <td className="px-4 py-3">
                    <Badge variant={c.isActive ? 'success' : 'default'}>{c.isActive ? 'Activo' : 'Inactivo'}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
                        <PencilSquareIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleMut.mutate(c.id)}
                      >
                        {c.isActive ? 'Desact.' : 'Activar'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 border-t border-gray-100">
            <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
          </div>
        </CardBody></Card>
      )}

      <Modal isOpen={isOpen} onClose={closeModal} title={editing ? 'Editar cliente' : 'Nuevo cliente'} size="md">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input
            label="CI (Cédula de Identidad)"
            placeholder="Ej: 7823456"
            {...register('ci')}
            error={errors.ci?.message}
          />
          <Input label="Nombre completo" {...register('fullName')} error={errors.fullName?.message} />
          <Input label="Teléfono" {...register('phone')} error={errors.phone?.message} />
          <Input label="Dirección de entrega" {...register('address')} error={errors.address?.message} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeModal}>Cancelar</Button>
            <Button type="submit" isLoading={isSubmitting}>{editing ? 'Guardar' : 'Registrar'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
