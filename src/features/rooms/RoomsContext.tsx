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
