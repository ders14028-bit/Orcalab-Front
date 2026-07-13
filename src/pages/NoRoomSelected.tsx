import { TriangleAlert, Waves } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useRooms } from '../features/rooms/RoomsContext'

export function NoRoomSelected() {
  const { salas, loading } = useRooms()
  const location = useLocation()
  const avisoExpulsion = (location.state as { avisoExpulsion?: string } | null)?.avisoExpulsion

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
      {avisoExpulsion && (
        <div className="mb-2 flex items-center gap-2 rounded-control border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-red-300">
          <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
          Fuiste expulsado de «{avisoExpulsion}».
        </div>
      )}
      <Waves className="h-10 w-10 text-text-muted" aria-hidden="true" />
      <p className="text-text-secondary">
        {loading
          ? 'Cargando tus salas…'
          : salas.length === 0
            ? 'Aún no tienes salas. Crea una con el botón "+" del rail.'
            : 'Selecciona una sala del rail para ver su actividad en tiempo real.'}
      </p>
    </div>
  )
}
