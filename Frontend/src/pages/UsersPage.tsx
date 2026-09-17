import type { FC } from 'react'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userService } from '@/services/userService'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card, CardBody } from '@/components/ui/Card'
import { PageSpinner } from '@/components/ui/Spinner'
import { formatDate } from '@/lib/utils'
import { EyeIcon, PlusIcon } from '@heroicons/react/24/outline'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import type { User } from '@/types'

const ROLE_LABELS: Record<string, string> = { admin: 'Administrador', cajero: 'Cajero', inventario: 'Inventario', cocina: 'Cocina' }

const schema = z.object({
  roleId: z.string().min(1, 'Seleccione un rol'),
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  email: z.string().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
}).superRefine((data, ctx) => {
  const hasEmail = data.email?.trim()
  const hasPhone = data.phone?.trim()

  if (!hasEmail && !hasPhone) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['email'],
      message: 'Debe ingresar un correo o un teléfono',
    })
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['phone'],
      message: 'Debe ingresar un correo o un teléfono',
    })
  }

  if (hasEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(hasEmail)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['email'], message: 'Email inválido' })
  }

  if (hasPhone && !/^\+?[0-9\s\-()]{7,15}$/.test(hasPhone)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['phone'], message: 'Teléfono inválido' })
  }
})
type FormData = z.infer<typeof schema>

export const UsersPage: FC = () => {
  const qc = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [viewing, setViewing] = useState<User | null>(null)

  const { data: users = [], isLoading } = useQuery({ queryKey: ['users'], queryFn: userService.getAll })
  const { data: roles = [] } = useQuery({ queryKey: ['roles'], queryFn: userService.getRoles })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) })

  const createMut = useMutation({ mutationFn: (d: FormData) => userService.create(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Usuario creado'); closeModal() }, onError: (e: Error) => toast.error(e.message) })
  const toggleMut = useMutation({ mutationFn: (id: string) => userService.toggleActive(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }) })

  const openCreate = () => { reset(); setEditing(null); setIsOpen(true) }
  const closeModal = () => { setIsOpen(false); setEditing(null); reset() }
  const closeDetails = () => setViewing(null)
  const onSubmit = (data: FormData) => createMut.mutate(data)

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Usuarios</h1>
        <Button onClick={openCreate} size="sm"><PlusIcon className="h-4 w-4" />Nuevo usuario</Button>
      </div>
      <Card><CardBody className="p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100 bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Usuario</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Rol</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Estado</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600 hidden md:table-cell">Creado</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-primary-100 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary-700">{u.fullName.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="font-medium">{u.fullName}</p>
                      <p className="text-xs text-gray-400">@{u.username}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{u.email}</td>
                <td className="px-4 py-3"><Badge variant="info">{ROLE_LABELS[u.role.name] ?? u.role.name}</Badge></td>
                <td className="px-4 py-3"><Badge variant={u.isActive ? 'success' : 'default'}>{u.isActive ? 'Activo' : 'Inactivo'}</Badge></td>
                <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">{formatDate(u.createdAt)}</td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewing(u)}
                    title={`Ver datos de ${u.fullName}`}
                    aria-label={`Ver datos de ${u.fullName}`}
                  >
                    <EyeIcon className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => toggleMut.mutate(u.id)}>
                    {u.isActive ? 'Desactivar' : 'Activar'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardBody></Card>

      <Modal isOpen={isOpen} onClose={closeModal} title="Nuevo usuario" size="md">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input label="Nombre" {...register('name')} error={errors.name?.message} />
          <Input label="Email" type="email" {...register('email')} error={errors.email?.message} />
          <Input label="Teléfono" {...register('phone')} error={errors.phone?.message} />
          <Input label="Contraseña" type="password" {...register('password')} error={errors.password?.message} />
          <Select
            label="Rol"
            options={roles.map(r => ({ value: r.id, label: ROLE_LABELS[r.name] ?? r.name }))}
            placeholder="Seleccionar rol..."
            error={errors.roleId?.message}
            {...register('roleId')}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeModal}>Cancelar</Button>
            <Button type="submit" isLoading={isSubmitting}>Crear usuario</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!viewing} onClose={closeDetails} title="Datos del usuario" size="md">
        {viewing && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg bg-primary-50 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
                <span className="text-lg font-bold text-primary-700">{viewing.fullName.charAt(0)}</span>
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-lg font-semibold text-gray-900">{viewing.fullName}</h3>
              </div>
            </div>
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-gray-100 p-3 sm:col-span-2"><dt className="text-xs text-gray-500">Correo electrónico</dt><dd className="mt-1 wrap-break-word font-medium text-gray-900">{viewing.email || 'No registrado'}</dd></div>
              <div className="rounded-lg border border-gray-100 p-3"><dt className="text-xs text-gray-500">Nombre completo</dt><dd className="mt-1 font-medium text-gray-900">{viewing.fullName || 'No registrado'}</dd></div>
              <div className="rounded-lg border border-gray-100 p-3"><dt className="text-xs text-gray-500">Teléfono</dt><dd className="mt-1 font-medium text-gray-900">{viewing.phone || 'No registrado'}</dd></div>
              <div className="rounded-lg border border-gray-100 p-3"><dt className="text-xs text-gray-500">Rol</dt><dd className="mt-1"><Badge variant="info">{ROLE_LABELS[viewing.role.name] ?? viewing.role.name}</Badge></dd></div>
              <div className="rounded-lg border border-gray-100 p-3"><dt className="text-xs text-gray-500">Estado</dt><dd className="mt-1"><Badge variant={viewing.isActive ? 'success' : 'default'}>{viewing.isActive ? 'Activo' : 'Inactivo'}</Badge></dd></div>
              <div className="rounded-lg border border-gray-100 p-3"><dt className="text-xs text-gray-500">Fecha de creación</dt><dd className="mt-1 font-medium text-gray-900">{formatDate(viewing.createdAt)}</dd></div>
              {['admin', 'cajero'].includes(viewing.role.name.toLowerCase()) && (
                <div className="rounded-lg border border-gray-100 p-3"><dt className="text-xs text-gray-500">Ventas realizadas</dt><dd className="mt-1 font-medium text-gray-900">{viewing.salesCount}</dd></div>
              )}
            </dl>
            <div className="flex justify-end border-t border-gray-100 pt-4"><Button variant="secondary" onClick={closeDetails}>Cerrar</Button></div>
          </div>
        )}
      </Modal>
    </div>
  )
}
