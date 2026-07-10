import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import * as adminApi from './api'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { FormAlert } from '../../components/ui/FormAlert'
import { ApiError } from '../../lib/http'
import type { Rol, Usuario } from '../../types/auth'

export function AdminPage() {
  const { auth } = useAuth()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmandoId, setConfirmandoId] = useState<number | null>(null)
  const [actualizandoId, setActualizandoId] = useState<number | null>(null)

  useEffect(() => {
    cargarUsuarios()
  }, [])

  async function cargarUsuarios() {
    setLoading(true)
    setError(null)
    try {
      const data = await adminApi.listarUsuarios()
      setUsuarios(data)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cargar la lista de usuarios')
    } finally {
      setLoading(false)
    }
  }

  async function confirmarCambioRol(usuarioId: number, nuevoRol: Rol) {
    setActualizandoId(usuarioId)
    setConfirmandoId(null)
    setError(null)
    try {
      await adminApi.cambiarRol(usuarioId, nuevoRol)
      setUsuarios((prev) => prev.map((u) => (u.id === usuarioId ? { ...u, rol: nuevoRol } : u)))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo actualizar el rol')
    } finally {
      setActualizandoId(null)
    }
  }

  return (
    <div className="min-h-svh bg-bg px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-text">Administración</h1>
            <p className="mt-1 text-sm text-text-muted">Gestión de roles de usuario</p>
          </div>
          <Link to="/" className="text-sm font-medium text-primary hover:underline">
            Volver
          </Link>
        </div>

        {error && (
          <div className="mb-4">
            <FormAlert message={error} />
          </div>
        )}

        <div className="overflow-hidden rounded-card border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-bg-panel text-text-secondary">
              <tr>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Rol</th>
                <th className="px-4 py-3 font-medium">Acción</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-text-muted">
                    Cargando usuarios…
                  </td>
                </tr>
              )}

              {!loading && usuarios.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-text-muted">
                    No hay usuarios registrados.
                  </td>
                </tr>
              )}

              {!loading &&
                usuarios.map((usuario) => {
                  const esUnoMismo = usuario.id === auth?.usuarioId
                  const nuevoRol: Rol = usuario.rol === 'ADMINISTRADOR' ? 'INVESTIGADOR' : 'ADMINISTRADOR'

                  return (
                    <tr key={usuario.id} className="border-t border-border">
                      <td className="px-4 py-3 text-text">{usuario.nombre}</td>
                      <td className="px-4 py-3 text-text-secondary">{usuario.email}</td>
                      <td className="px-4 py-3">
                        <Badge tone={usuario.rol === 'ADMINISTRADOR' ? 'warning' : 'primary'}>
                          {usuario.rol}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {esUnoMismo ? (
                          <span className="text-xs text-text-muted">Tu cuenta</span>
                        ) : confirmandoId === usuario.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-text-muted">¿Confirmar?</span>
                            <Button
                              variant="primary"
                              className="h-8 px-2 text-xs"
                              loading={actualizandoId === usuario.id}
                              onClick={() => confirmarCambioRol(usuario.id, nuevoRol)}
                            >
                              Sí
                            </Button>
                            <Button
                              variant="ghost"
                              className="h-8 px-2 text-xs"
                              onClick={() => setConfirmandoId(null)}
                            >
                              Cancelar
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="secondary"
                            className="h-8 px-3 text-xs"
                            onClick={() => setConfirmandoId(usuario.id)}
                          >
                            {usuario.rol === 'ADMINISTRADOR' ? 'Quitar admin' : 'Hacer admin'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
