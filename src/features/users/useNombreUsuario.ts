import { useEffect, useSyncExternalStore } from 'react'
import { obtenerNombreCacheado, solicitarNombres, suscribirCambiosNombres } from './namesCache'

export function useNombreUsuario(usuarioId: number | null | undefined): string {
  const nombre = useSyncExternalStore(
    suscribirCambiosNombres,
    () => (usuarioId != null ? obtenerNombreCacheado(usuarioId) : undefined),
  )

  useEffect(() => {
    if (usuarioId != null) {
      solicitarNombres([usuarioId])
    }
  }, [usuarioId])

  if (usuarioId == null) return 'Desconocido'
  return nombre ?? `Usuario #${usuarioId}`
}
