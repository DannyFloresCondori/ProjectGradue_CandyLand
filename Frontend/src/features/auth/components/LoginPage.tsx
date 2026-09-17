import { useEffect, useState, type FC } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import LogoImg from '@/assets/Logo.jpeg'
import toast from 'react-hot-toast'

const schema = z.object({
  username: z.string().min(1, 'El usuario es requerido'),
  password: z.string().min(1, 'La contraseña es requerida'),
})

type FormData = z.infer<typeof schema>

export const LoginPage: FC = () => {
  const { login, isLoading } = useAuthStore()
  const navigate = useNavigate()
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [lockUntil, setLockUntil] = useState<number | null>(null)
  const [isLocked, setIsLocked] = useState(false)
  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (!lockUntil) {
      setIsLocked(false)
      return
    }

    const remaining = lockUntil - Date.now()

    if (remaining <= 0) {
      setLockUntil(null)
      setFailedAttempts(0)
      setIsLocked(false)
      return
    }

    setIsLocked(true)
    const timeout = window.setTimeout(() => {
      setLockUntil(null)
      setFailedAttempts(0)
      setIsLocked(false)
    }, remaining)

    return () => window.clearTimeout(timeout)
  }, [lockUntil])

  const onSubmit = async (data: FormData) => {
    if (isLocked) {
      toast.error('Demasiados intentos fallidos. Inténtalo de nuevo en unos segundos.')
      return
    }

    try {
      await login(data.username, data.password)
      setFailedAttempts(0)
      setLockUntil(null)
      setIsLocked(false)
      reset()
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setFailedAttempts(prev => {
        const nextAttempts = prev + 1

        if (nextAttempts >= 5) {
          const waitMs = Math.min(30000 + (nextAttempts - 5) * 10000, 120000)
          setLockUntil(Date.now() + waitMs)
          toast.error(`Demasiados intentos fallidos. Espera ${Math.round(waitMs / 1000)} segundos antes de volver a intentarlo.`)
        } else {
          toast.error(err instanceof Error ? err.message : 'Error al iniciar sesión')
        }

        return nextAttempts
      })
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(250,218,229,0.75),_transparent_42%),radial-gradient(circle_at_bottom_right,_rgba(255,236,190,0.7),_transparent_38%)]" />
      <div className="relative flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-sm">
          {/* Brand */}
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex h-24 w-24 items-center justify-center rounded-2xl bg-white/90 p-2 shadow-[0_12px_35px_rgba(255,255,255,0.35)] ring-1 ring-white/80 backdrop-blur-md">
              <img src={LogoImg} alt="Logo CandyLand" className="h-full w-full object-contain" />
            </div>
            <h1 className="bg-gradient-to-r from-pink-500 via-rose-400 to-amber-300 bg-clip-text text-3xl font-black tracking-wide text-transparent drop-shadow-[0_2px_8px_rgba(255,255,255,0.45)]">
              CandyLand
            </h1>
            <p className="mt-2 text-sm font-medium text-gray-600">
              Sistema de Gestión de Ventas
            </p>
          </div>

          {/* Form card */}
          <div className="rounded-2xl border border-pink-100 bg-white/95 p-6 shadow-[0_20px_60px_-20px_rgba(190,70,120,0.22)] backdrop-blur-xl">
            <div className="mb-5 text-center">
              <h2 className="text-lg font-semibold text-gray-900">Iniciar sesión</h2>
              <p className="mt-1 text-sm text-gray-600">Bienvenido de nuevo</p>
              {isLocked && lockUntil && (
                <p className="mt-2 text-sm font-medium text-rose-600">
                  Cuenta bloqueada por {Math.max(1, Math.ceil((lockUntil - Date.now()) / 1000))} segundos.
                </p>
              )}
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
              <Input
                label="Usuario"
                placeholder="Ej: admin"
                autoComplete="username"
                disabled={isLocked}
                error={errors.username?.message}
                {...register('username')}
              />
              <Input
                label="Contraseña"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={isLocked}
                error={errors.password?.message}
                {...register('password')}
              />
              <Button
                type="submit"
                isLoading={isLoading}
                disabled={isLocked}
                className="mt-1 bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500"
              >
                {isLoading ? 'Verificando...' : 'Ingresar'}
              </Button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs font-medium text-gray-500">
            Heladería Candyland · Cochabamba, Bolivia
          </p>
        </div>
      </div>
    </div>
  )
}
