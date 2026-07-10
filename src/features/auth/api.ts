import { apiFetch } from '../../lib/http'
import type { AuthResponse, LoginRequest, RegistroRequest } from '../../types/auth'

export function login(payload: LoginRequest): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function registrar(payload: RegistroRequest): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/api/auth/registro', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
