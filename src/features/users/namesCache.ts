import { apiFetch } from '../../lib/http'
import type { UsuarioResumen } from '../../types/auth'

const cache = new Map<number, string>()
const listeners = new Set<() => void>()
let pending: Promise<void> | null = null
let idsPendientes = new Set<number>()

function notificar() {
  listeners.forEach((fn) => fn())
}

async function resolverPendientes() {
  const ids = Array.from(idsPendientes)
  idsPendientes = new Set()

  try {
    const resumen = await apiFetch<UsuarioResumen[]>(`/api/auth/usuarios/resumen?ids=${ids.join(',')}`)
    resumen.forEach((u) => cache.set(u.id, u.nombre))
  } catch {
    // Si falla la resolución de nombres, se mantiene el fallback "Usuario #id" en el consumidor.
  } finally {
    pending = null
    notificar()
  }
}

export function solicitarNombres(ids: number[]) {
  const faltantes = ids.filter((id) => !cache.has(id) && id != null)
  if (faltantes.length === 0) return

  faltantes.forEach((id) => idsPendientes.add(id))

  if (!pending) {
    pending = new Promise((resolve) => {
      setTimeout(() => resolverPendientes().then(resolve), 30)
    })
  }
}

export function obtenerNombreCacheado(id: number): string | undefined {
  return cache.get(id)
}

export function suscribirCambiosNombres(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
