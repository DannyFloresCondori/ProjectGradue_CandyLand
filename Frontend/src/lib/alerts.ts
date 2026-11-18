import Swal from 'sweetalert2'

export const showSuccessAlert = (title: string, text?: string) =>
  Swal.fire({
    title,
    text,
    icon: 'success',
    draggable: true,
    showConfirmButton: false,
    timer: 1500,
    timerProgressBar: true,
  })

export const showSuccessToast = (title: string, text?: string) =>
  Swal.fire({
    title,
    text,
    icon: 'success',
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 2000,
    timerProgressBar: true,
  })

export const confirmAction = async (
  title: string,
  text: string,
  confirmButtonText = 'Sí, continuar',
) => {
  const result = await Swal.fire({
    title,
    text,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText: 'No, volver',
    confirmButtonColor: '#E75480',
    cancelButtonColor: '#6b7280',
    reverseButtons: true,
    focusCancel: true,
  })

  return result.isConfirmed
}

export const confirmReactivate = async (itemType: string, itemName: string) => {
  const subject = itemType === 'categoría' ? 'La categoría' : `El ${itemType}`
  const result = await Swal.fire({
    title: 'Registro desactivado',
    text: `${subject} "${itemName}" ya está registrado, solo está desactivado. ¿Desea activarlo?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Activar',
    cancelButtonText: 'No, mantener desactivado',
    confirmButtonColor: '#E75480',
    cancelButtonColor: '#6b7280',
    reverseButtons: true,
    focusCancel: true,
  })

  return result.isConfirmed
}

export const requestCancellationReason = async (
  title: string,
  text: string,
): Promise<string | null> => {
  const result = await Swal.fire({
    title,
    text,
    icon: 'warning',
    input: 'textarea',
    inputLabel: 'Motivo de cancelación',
    inputPlaceholder: 'Escriba el motivo...',
    inputAttributes: { 'aria-label': 'Motivo de cancelación' },
    inputValidator: (value) => value?.trim() ? undefined : 'Debe ingresar un motivo.',
    showCancelButton: true,
    confirmButtonText: 'Cancelar pedido',
    cancelButtonText: 'Volver',
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#6b7280',
    reverseButtons: true,
  })

  return result.isConfirmed && typeof result.value === 'string'
    ? result.value.trim()
    : null
}