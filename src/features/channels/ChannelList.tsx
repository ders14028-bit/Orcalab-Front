import { Hash, Plus, Volume2 } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useRoomSocket } from '../realtime/RoomSocketContext'
import { CreateChannelModal } from './CreateChannelModal'
import type { Canal } from '../../types/room'

export function ChannelList() {
  const { auth } = useAuth()
  const { canales, canalActivoId, seleccionarCanal, presentes, cargandoHistorial } = useRoomSocket()
  const [creando, setCreando] = useState(false)

  const soyLider = presentes.find((p) => p.usuarioId === auth?.usuarioId)?.rolEnSala === 'LIDER'

  const canalesTexto = canales.filter((c) => c.tipo === 'TEXTO')
  const canalesVoz = canales.filter((c) => c.tipo === 'VOZ')

  return (
    <div className="flex flex-col gap-3 border-b border-border p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Canales</p>
        {soyLider && (
          <button
            type="button"
            onClick={() => setCreando(true)}
            title="Crear canal"
            aria-label="Crear canal"
            className="flex h-5 w-5 items-center justify-center rounded text-text-muted hover:bg-surface-hover hover:text-text cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      {cargandoHistorial && canales.length === 0 ? (
        <p className="px-1 text-xs text-text-muted">Cargando canales…</p>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {canalesTexto.map((canal) => (
            <FilaCanal key={canal.id} canal={canal} activo={canal.id === canalActivoId} onClick={seleccionarCanal} />
          ))}
          {canalesVoz.map((canal) => (
            <FilaCanal key={canal.id} canal={canal} activo={canal.id === canalActivoId} onClick={seleccionarCanal} />
          ))}
        </ul>
      )}

      <CreateChannelModal open={creando} onClose={() => setCreando(false)} />
    </div>
  )
}

function FilaCanal({
  canal,
  activo,
  onClick,
}: {
  canal: Canal
  activo: boolean
  onClick: (canalId: string) => void
}) {
  const Icono = canal.tipo === 'VOZ' ? Volume2 : Hash

  return (
    <li>
      <button
        type="button"
        onClick={() => onClick(canal.id)}
        className={`flex w-full items-center gap-1.5 rounded-control px-2 py-1.5 text-left text-sm cursor-pointer
          ${activo ? 'bg-surface text-text' : 'text-text-secondary hover:bg-surface-hover hover:text-text'}`}
      >
        <Icono className="h-3.5 w-3.5 shrink-0 text-text-muted" aria-hidden="true" />
        <span className="truncate">{canal.nombre}</span>
      </button>
    </li>
  )
}
