import { TriangleAlert, X } from 'lucide-react'
import { useEffect } from 'react'
import { useRoomSocket } from '../realtime/RoomSocketContext'
import { useNombreUsuario } from '../users/useNombreUsuario'
import type { Alerta } from '../../types/realtime'

const AUTO_DISMISS_MS = 5000

function Toast({ alerta, onDismiss }: { alerta: Alerta; onDismiss: () => void }) {
  const nombre = useNombreUsuario(alerta.usuarioId)

  useEffect(() => {
    const t = setTimeout(onDismiss, AUTO_DISMISS_MS)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <div
      role="alert"
      className="flex w-80 items-start gap-2 rounded-card border border-danger/40 bg-danger-soft p-3 shadow-xl"
    >
      <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-text">Alerta crítica</p>
        <p className="truncate text-sm text-text-secondary">{alerta.descripcion || 'Marcador crítico reportado'}</p>
        <p className="text-xs text-text-muted">reportado por {nombre}</p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Descartar alerta"
        className="text-text-muted hover:text-text cursor-pointer"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}

export function AlertToastStack() {
  const { alertasToast, descartarToast } = useRoomSocket()

  if (alertasToast.length === 0) return null

  return (
    <div
      aria-live="polite"
      className="pointer-events-none absolute right-3 top-3 z-[1100] flex flex-col gap-2"
    >
      {alertasToast.map((a) => (
        <div key={a.id} className="pointer-events-auto">
          <Toast alerta={a} onDismiss={() => descartarToast(a.id)} />
        </div>
      ))}
    </div>
  )
}
