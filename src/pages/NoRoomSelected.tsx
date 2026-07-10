import { Waves } from 'lucide-react'
import { useRooms } from '../features/rooms/RoomsContext'

export function NoRoomSelected() {
  const { salas, loading } = useRooms()

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
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
