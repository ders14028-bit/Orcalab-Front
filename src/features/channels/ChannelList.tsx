import { Hash, Plus, Trash2, Volume2 } from 'lucide-react'
import { useState } from 'react'
import { useRoomSocket } from '../realtime/RoomSocketContext'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { CreateChannelModal } from './CreateChannelModal'
import type { Canal } from '../../types/room'

export function ChannelList() {
  const { canales, canalActivoId, seleccionarCanal, eliminarCanal, soyLider, cargandoHistorial } = useRoomSocket()
  const [creando, setCreando] = useState(false)
  const [canalAEliminar, setCanalAEliminar] = useState<Canal | null>(null)

  const puedeEliminar = soyLider && canales.length > 1

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
            <FilaCanal
              key={canal.id}
              canal={canal}
              activo={canal.id === canalActivoId}
              puedeEliminar={puedeEliminar}
              onClick={seleccionarCanal}
              onEliminar={setCanalAEliminar}
            />
          ))}
          {canalesVoz.map((canal) => (
            <FilaCanal
              key={canal.id}
              canal={canal}
              activo={canal.id === canalActivoId}
              puedeEliminar={puedeEliminar}
              onClick={seleccionarCanal}
              onEliminar={setCanalAEliminar}
            />
          ))}
        </ul>
      )}

      <CreateChannelModal open={creando} onClose={() => setCreando(false)} />

      <ConfirmModal
        open={canalAEliminar !== null}
        title="Eliminar canal"
        message={`¿Seguro que quieres eliminar el canal «${canalAEliminar?.nombre}»? Se borrará también su historial de mensajes.`}
        confirmLabel="Eliminar"
        danger
        onConfirm={async () => {
          if (canalAEliminar) await eliminarCanal(canalAEliminar.id)
        }}
        onClose={() => setCanalAEliminar(null)}
      />
    </div>
  )
}

function FilaCanal({
  canal,
  activo,
  puedeEliminar,
  onClick,
  onEliminar,
}: {
  canal: Canal
  activo: boolean
  puedeEliminar: boolean
  onClick: (canalId: string) => void
  onEliminar: (canal: Canal) => void
}) {
  const Icono = canal.tipo === 'VOZ' ? Volume2 : Hash

  return (
    <li className={`group flex items-center rounded-control ${activo ? 'bg-surface' : 'hover:bg-surface-hover'}`}>
      <button
        type="button"
        onClick={() => onClick(canal.id)}
        className={`flex min-w-0 flex-1 items-center gap-1.5 px-2 py-1.5 text-left text-sm cursor-pointer
          ${activo ? 'text-text' : 'text-text-secondary group-hover:text-text'}`}
      >
        <Icono className="h-3.5 w-3.5 shrink-0 text-text-muted" aria-hidden="true" />
        <span className="truncate">{canal.nombre}</span>
      </button>
      {puedeEliminar && (
        <button
          type="button"
          onClick={() => onEliminar(canal)}
          title="Eliminar canal"
          aria-label={`Eliminar canal ${canal.nombre}`}
          className="mr-1 hidden h-6 w-6 shrink-0 items-center justify-center rounded text-text-muted
            hover:text-danger cursor-pointer group-hover:flex"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      )}
    </li>
  )
}
