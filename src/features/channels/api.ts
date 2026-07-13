import { apiFetch } from '../../lib/http'
import type { Canal, CrearCanalRequest } from '../../types/room'

export function listarCanales(salaId: number): Promise<Canal[]> {
  return apiFetch<Canal[]>(`/api/salas/${salaId}/canales`)
}

export function crearCanal(salaId: number, payload: CrearCanalRequest): Promise<Canal> {
  return apiFetch<Canal>(`/api/salas/${salaId}/canales`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function eliminarCanal(salaId: number, canalId: string): Promise<void> {
  return apiFetch<void>(`/api/salas/${salaId}/canales/${canalId}`, { method: 'DELETE' })
}
