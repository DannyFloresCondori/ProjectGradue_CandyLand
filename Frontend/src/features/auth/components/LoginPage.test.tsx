import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import toast from 'react-hot-toast'
import { LoginPage } from './LoginPage'

const mockLogin = vi.fn()
const mockNavigate = vi.fn()

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({ login: mockLogin, isLoading: false }),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
  },
}))

describe('LoginPage', () => {
  beforeEach(() => {
    mockLogin.mockReset()
    mockNavigate.mockReset()
    vi.mocked(toast.error).mockClear()
    mockLogin.mockRejectedValue(new Error('Credenciales inválidas'))
  })

  it('bloquea el acceso después de 5 intentos fallidos y evita nuevos envíos', async () => {
    const user = userEvent.setup()

    render(<LoginPage />)

    const usernameInput = screen.getByLabelText(/usuario/i)
    const passwordInput = screen.getByLabelText(/contraseña/i)
    const submitButton = screen.getByRole('button', { name: /ingresar/i })

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      await user.type(usernameInput, 'admin')
      await user.type(passwordInput, 'wrong-pass')
      await user.click(submitButton)

      await waitFor(() => expect(mockLogin).toHaveBeenCalledTimes(attempt))

      if (attempt < 5) {
        await user.clear(usernameInput)
        await user.clear(passwordInput)
      }
    }

    expect(screen.getByText(/bloqueada/i)).toBeInTheDocument()
    expect(submitButton).toBeDisabled()

    await user.click(submitButton)

    expect(mockLogin).toHaveBeenCalledTimes(5)
  })
})
