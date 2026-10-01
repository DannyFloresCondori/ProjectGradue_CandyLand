import Swal from 'sweetalert2'

export const showSuccessAlert = (title: string, text?: string) =>
  Swal.fire({
    title,
    text,
    icon: 'success',
    draggable: true,
    confirmButtonText: 'Aceptar',
    confirmButtonColor: '#E75480',
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