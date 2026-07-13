import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import * as roomsApi from './api'
import type { Sala } from '../../types/room'

interface RoomsContextValue {
  salas: Sala[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  agregarSalaLocal: (sala: Sala) => void
}

const RoomsContext = createContext<RoomsContextValue | undefined>(undefined)

export function RoomsProvider({ children }: { children: ReactNode }) {
  const [salas, setSalas] = useState<Sala[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setError(null)
    try {
      const data = await roomsApi.listarMisSalas()
      setSalas(data)
    } catch {
      setError('No se pudieron cargar tus salas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  // Revalidación automática: si el backend se reinició (o hubo un corte de red)
  // mientras la app estaba abierta, el listado se recupera solo sin F5 —
  // al volver el foco/visibilidad a la pestaña y cada 30s mientras esté visible.
  useEffect(() => {
    const alVolverFoco = () => refetch()
    const alCambiarVisibilidad = () => {
      if (document.visibilityState === 'visible') refetch()
    }
    const intervalo = setInterval(() => {
      if (!document.hidden) refetch()
    }, 30_000)

    window.addEventListener('focus', alVolverFoco)
    document.addEventListener('visibilitychange', alCambiarVisibilidad)
    return () => {
      clearInterval(intervalo)
      window.removeEventListener('focus', alVolverFoco)
      document.removeEventListener('visibilitychange', alCambiarVisibilidad)
    }
  }, [refetch])

  const agregarSalaLocal = useCallback((sala: Sala) => {
    setSalas((prev) => (prev.some((s) => s.id === sala.id) ? prev : [...prev, sala]))
  }, [])

  const value = useMemo(
    () => ({ salas, loading, error, refetch, agregarSalaLocal }),
    [salas, loading, error, refetch, agregarSalaLocal],
  )

  return <RoomsContext.Provider value={value}>{children}</RoomsContext.Provider>
}

export function useRooms(): RoomsContextValue {
  const ctx = useContext(RoomsContext)
  if (!ctx) throw new Error('useRooms debe usarse dentro de RoomsProvider')
  return ctx
}
