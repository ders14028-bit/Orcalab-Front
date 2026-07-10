import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Card } from '../../components/ui/Card'
import { FormAlert } from '../../components/ui/FormAlert'
import { ApiError } from '../../lib/http'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login({ email, password })
      const redirectTo = (location.state as { from?: string } | null)?.from ?? '/'
      navigate(redirectTo, { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-heading text-2xl font-semibold text-primary">OrcaLab</h1>
          <p className="mt-1 text-sm text-text-muted">
            Plataforma colaborativa de investigación marina
          </p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <h2 className="text-lg font-semibold">Iniciar sesión</h2>

            {error && <FormAlert message={error} />}

            <Input
              label="Email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <div className="relative">
              <Input
                label="Contraseña"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-8 text-xs font-medium text-primary cursor-pointer"
              >
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>

            <Button type="submit" loading={loading} className="mt-2 w-full">
              {loading ? 'Ingresando…' : 'Ingresar'}
            </Button>
          </form>
        </Card>

        <p className="mt-4 text-center text-sm text-text-muted">
          ¿No tienes cuenta?{' '}
          <Link to="/registro" className="font-medium text-primary hover:underline">
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  )
}
