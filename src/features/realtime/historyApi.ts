import { apiFetch } from '../../lib/http'
import type { Alerta, Marcador, Mensaje } from '../../types/realtime'

export function obtenerMensajes(salaId: number): Promise<Mensaje[]> {
  return apiFetch<Mensaje[]>(`/api/salas/${salaId}/mensajes`)
}

export function obtenerMarcadores(salaId: number): Promise<Marcador[]> {
  return apiFetch<Marcador[]>(`/api/salas/${salaId}/marcadores`)
}

export function obtenerAlertas(salaId: number): Promise<Alerta[]> {
  return apiFetch<Alerta[]>(`/api/salas/${salaId}/alertas`)
}
