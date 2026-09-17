import type { FC } from 'react'
import { useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { customerService } from '@/services/customerService'
import type { Customer } from '@/types'

const quickSchema = z.object({
  ci:       z.string().trim().min(5, 'Mínimo 5 dígitos').regex(/^\d+$/, 'Solo números'),
  fullName: z.preprocess((v) => (typeof v === 'string' ? v.trim() : v), z.string().min(2, 'El nombre es obligatorio.')),
  phone:    z.string().regex(/^[67]\d{7}$/, 'Ingrese un número de teléfono boliviano válido de 8 dígitos.'),
  address:  z.preprocess((v) => (typeof v === 'string' ? v.trim() : v), z.string().min(5, 'La dirección es obligatoria.')),
})
type QuickFormData = z.infer<typeof quickSchema>

interface QuickCustomerModalProps {
  isOpen: boolean
  prefill: string
  onClose: () => void
  onCreated: (c: Customer) => void
}

/** Opens over the current modal. Registers a new customer and selects it automatically. */
export const QuickCustomerModal: FC<QuickCustomerModalProps> = ({ isOpen, prefill, onClose, onCreated }) => {
  const qc = useQueryClient()
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<QuickFormData>({
    // z.preprocess can produce types that TS infers less narrowly; cast resolver to avoid mismatch
    resolver: zodResolver(quickSchema) as any,
  })

  useEffect(() => {
    if (isOpen) {
      reset({
        ci:       /^\d+$/.test(prefill) ? prefill : '',
        fullName: /^\d+$/.test(prefill) ? '' : prefill,
        phone:    '',
        address:  '',
      })
    }
  }, [isOpen, prefill, reset])

  const createMut = useMutation({
    mutationFn: (d: QuickFormData) => customerService.create(d),
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      qc.invalidateQueries({ queryKey: ['customers-active'] })
      toast.success(`Cliente "${c.fullName}" registrado`)
      onCreated(c)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registrar nuevo cliente" size="md">
      <form onSubmit={handleSubmit(d => createMut.mutate(d))} className="flex flex-col gap-4">
        <p className="text-xs text-gray-500 -mt-1">
          El cliente quedará seleccionado automáticamente.
        </p>
        <Input label="CI (Cédula de Identidad)" placeholder="Ej: 7823456" {...register('ci')} error={errors.ci?.message} />
        <Input label="Nombre completo" {...register('fullName')} error={errors.fullName?.message} />
        <Input label="Teléfono" {...register('phone')} error={errors.phone?.message} />
        <Input label="Dirección de entrega" {...register('address')} error={errors.address?.message} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" isLoading={isSubmitting || createMut.isPending}>
            Registrar y seleccionar
          </Button>
        </div>
      </form>
    </Modal>
  )
}
