import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Card } from '../../components/ui/Card'
import { FormAlert } from '../../components/ui/FormAlert'
import { ApiError } from '../../lib/http'

export function RegisterPage() {
  const { registrar } = useAuth()
  const navigate = useNavigate()

  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setPasswordError(null)

    if (password.length < 8) {
      setPasswordError('La contraseña debe tener al menos 8 caracteres')
      return
    }
    if (password !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)
    try {
      await registrar({ email, password, nombre })
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-heading text-2xl font-semibold text-primary">OrcaLab</h1>
          <p className="mt-1 text-sm text-text-muted">
            Plataforma colaborativa de investigación marina
          </p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <h2 className="text-lg font-semibold text-text">Crear cuenta</h2>

            {error && <FormAlert message={error} />}

            <Input
              label="Nombre"
              autoComplete="name"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />

            <Input
              label="Email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Input
              label="Contraseña"
              type="password"
              autoComplete="new-password"
              required
              helperText={!passwordError ? 'Mínimo 8 caracteres' : undefined}
              error={passwordError ?? undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <Input
              label="Confirmar contraseña"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            <p className="text-xs text-text-muted">
              Las cuentas nuevas se crean con rol Investigador. Un administrador puede
              ascenderte más adelante si tu equipo lo requiere.
            </p>

            <Button type="submit" loading={loading} className="mt-2 w-full">
              {loading ? 'Creando cuenta…' : 'Crear cuenta'}
            </Button>
          </form>
        </Card>

        <p className="mt-4 text-center text-sm text-text-muted">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
