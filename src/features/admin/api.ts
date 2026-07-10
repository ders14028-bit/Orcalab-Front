import { apiFetch } from '../../lib/http'
import type { Rol, Usuario } from '../../types/auth'

export function listarUsuarios(): Promise<Usuario[]> {
  return apiFetch<Usuario[]>('/api/auth/usuarios')
}

export function cambiarRol(usuarioId: number, nuevoRol: Rol): Promise<void> {
  return apiFetch<void>(`/api/auth/usuarios/${usuarioId}/rol`, {
    method: 'PATCH',
    body: JSON.stringify({ nuevoRol }),
  })
}
