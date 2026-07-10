import { apiFetch } from '../../lib/http'
import type { CrearSalaRequest, Miembro, RolSala, Sala } from '../../types/room'

export function listarMisSalas(): Promise<Sala[]> {
  return apiFetch<Sala[]>('/api/salas')
}

export function crearSala(payload: CrearSalaRequest): Promise<Sala> {
  return apiFetch<Sala>('/api/salas', { method: 'POST', body: JSON.stringify(payload) })
}

export function obtenerSala(id: number): Promise<Sala> {
  return apiFetch<Sala>(`/api/salas/${id}`)
}

export function listarMiembros(id: number): Promise<Miembro[]> {
  return apiFetch<Miembro[]>(`/api/salas/${id}/miembros`)
}

export function unirseASala(id: number): Promise<void> {
  return apiFetch<void>(`/api/salas/${id}/miembros`, { method: 'POST' })
}

export function salirDeSala(id: number): Promise<void> {
  return apiFetch<void>(`/api/salas/${id}/miembros/me`, { method: 'DELETE' })
}

export function expulsarMiembro(salaId: number, usuarioId: number): Promise<void> {
  return apiFetch<void>(`/api/salas/${salaId}/miembros/${usuarioId}`, { method: 'DELETE' })
}

export function cambiarRolMiembro(salaId: number, usuarioId: number, nuevoRol: RolSala): Promise<void> {
  return apiFetch<void>(`/api/salas/${salaId}/miembros/${usuarioId}/rol`, {
    method: 'PATCH',
    body: JSON.stringify({ nuevoRol }),
  })
}
