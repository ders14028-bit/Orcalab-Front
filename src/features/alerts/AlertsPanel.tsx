import { TriangleAlert } from 'lucide-react'
import { useRoomSocket } from '../realtime/RoomSocketContext'
import { useNombreUsuario } from '../users/useNombreUsuario'
import type { Alerta } from '../../types/realtime'
import { formatearHora } from '../../lib/formatDate'

function FilaAlerta({ alerta }: { alerta: Alerta }) {
  const nombre = useNombreUsuario(alerta.usuarioId)

  return (
    <li className="flex gap-2 rounded-control border border-danger/30 bg-danger-soft px-3 py-2">
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
      <div className="min-w-0">
        <p className="truncate text-sm text-text">{alerta.descripcion || 'Marcador crítico reportado'}</p>
        <p className="text-xs text-text-muted">
          {nombre} · {formatearHora(alerta.timestamp)}
        </p>
      </div>
    </li>
  )
}

export function AlertsPanel() {
  const { alertas, cargandoHistorial } = useRoomSocket()

  return (
    <div className="flex h-full min-w-0 flex-col">
      <div className="border-b border-border px-3 py-2">
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Alertas</p>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {cargandoHistorial ? (
          <p className="px-1 text-sm text-text-muted">Cargando…</p>
        ) : alertas.length === 0 ? (
          <p className="px-1 text-sm text-text-muted">Sin alertas por ahora.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {alertas.map((a) => (
              <FilaAlerta key={a.id} alerta={a} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
