import type { AuthResponse } from '../types/auth'

const STORAGE_KEY = 'orcalab.auth'

export function getStoredAuth(): AuthResponse | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthResponse
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

export function setStoredAuth(auth: AuthResponse): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(auth))
}

export function clearStoredAuth(): void {
  localStorage.removeItem(STORAGE_KEY)
}
