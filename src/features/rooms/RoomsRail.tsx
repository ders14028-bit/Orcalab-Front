import { Plus, Waves } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { UserMenu } from '../auth/UserMenu'
import { useRooms } from './RoomsContext'
import { CreateRoomModal } from './CreateRoomModal'

export function RoomsRail() {
  const { salas } = useRooms()
  const { salaId } = useParams()
  const [creando, setCreando] = useState(false)
  const activaId = salaId ? Number(salaId) : null

  return (
    <nav
      aria-label="Salas"
      className="flex h-full w-18 shrink-0 flex-col items-center gap-2 border-r border-border bg-bg-rail py-3"
    >
      <Link
        to="/"
        title="OrcaLab"
        className="mb-1 flex h-11 w-11 items-center justify-center rounded-control bg-primary-soft text-primary"
      >
        <Waves className="h-5 w-5" aria-hidden="true" />
      </Link>

      <div className="h-px w-8 bg-border" />

      <div className="flex w-full flex-1 flex-col items-center gap-2 overflow-y-auto py-1">
        {salas.map((sala) => {
          const activa = sala.id === activaId
          return (
            <Link
              key={sala.id}
              to={`/salas/${sala.id}`}
              title={sala.nombre}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-all duration-150
                ${
                  activa
                    ? 'rounded-control bg-primary text-white'
                    : 'bg-surface text-text-secondary hover:rounded-control hover:bg-surface-hover hover:text-text'
                }`}
            >
              {sala.nombre.trim().charAt(0).toUpperCase() || '?'}
            </Link>
          )
        })}

        <button
          type="button"
          onClick={() => setCreando(true)}
          aria-label="Crear sala"
          title="Crear sala"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-success
            hover:rounded-control hover:bg-emerald-950 transition-all duration-150 cursor-pointer"
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <UserMenu />

      <CreateRoomModal open={creando} onClose={() => setCreando(false)} />
    </nav>
  )
}
