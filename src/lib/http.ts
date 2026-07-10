import { getStoredAuth } from './authStorage'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

interface ErrorBody {
  mensaje?: string
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const auth = getStoredAuth()
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json')
  if (auth?.token) {
    headers.set('Authorization', `Bearer ${auth.token}`)
  }

  const res = await fetch(path, { ...init, headers })

  if (!res.ok) {
    let mensaje = `Error ${res.status}: ${res.statusText}`
    try {
      const body = (await res.json()) as ErrorBody
      if (body.mensaje) mensaje = body.mensaje
    } catch {
      // el cuerpo no era JSON, se conserva el mensaje por defecto
    }
    throw new ApiError(mensaje, res.status)
  }

  if (res.status === 204) {
    return undefined as T
  }

  return (await res.json()) as T
}
