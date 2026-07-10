import { Crown, LogOut, ShieldOff } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useRoomSocket } from '../realtime/RoomSocketContext'
import { useNombreUsuario } from '../users/useNombreUsuario'
import * as roomsApi from '../rooms/api'
import type { UsuarioPresente } from '../../types/realtime'

function FilaMiembro({
  presente,
  esUnoMismo,
  puedeGestionar,
  salaId,
}: {
  presente: UsuarioPresente
  esUnoMismo: boolean
  puedeGestionar: boolean
  salaId: number
}) {
  const nombre = useNombreUsuario(presente.usuarioId)
  const { quitarPresenteLocal, actualizarRolLocal } = useRoomSocket()
  const [procesando, setProcesando] = useState(false)

  const esLider = presente.rolEnSala === 'LIDER'

  async function handleExpulsar() {
    setProcesando(true)
    try {
      await roomsApi.expulsarMiembro(salaId, presente.usuarioId)
      quitarPresenteLocal(presente.usuarioId)
    } catch {
      // Se ignora: si falla, el usuario simplemente sigue apareciendo en la lista.
    } finally {
      setProcesando(false)
    }
  }

  async function handlePromover() {
    setProcesando(true)
    try {
      await roomsApi.cambiarRolMiembro(salaId, presente.usuarioId, 'LIDER')
      actualizarRolLocal(presente.usuarioId, 'LIDER')
    } catch {
      // idem
    } finally {
      setProcesando(false)
    }
  }

  return (
    <li className="group flex items-center gap-2 rounded-control px-2 py-1.5 hover:bg-surface-hover">
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold
          ${esLider ? 'bg-amber-950 text-amber-300' : 'bg-surface text-text-secondary'}`}
      >
        {nombre.trim().charAt(0).toUpperCase() || '?'}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm text-text-secondary">
        {nombre}
        {esUnoMismo && <span className="text-text-muted"> (tú)</span>}
      </span>
      {esLider && <Crown className="h-3.5 w-3.5 shrink-0 text-amber-400" aria-label="Líder de la sala" />}

      {puedeGestionar && !esUnoMismo && (
        <div className="hidden shrink-0 items-center gap-1 group-hover:flex">
          {!esLider && (
            <button
              type="button"
              title="Promover a líder"
              disabled={procesando}
              onClick={handlePromover}
              className="flex h-6 w-6 items-center justify-center rounded text-text-muted hover:text-amber-400 disabled:opacity-40 cursor-pointer"
            >
              <Crown className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            title="Expulsar de la sala"
            disabled={procesando}
            onClick={handleExpulsar}
            className="flex h-6 w-6 items-center justify-center rounded text-text-muted hover:text-danger disabled:opacity-40 cursor-pointer"
          >
            <ShieldOff className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}
    </li>
  )
}

export function PresencePanel() {
  const { auth } = useAuth()
  const { salaId, presentes, estado } = useRoomSocket()

  const yoPresente = presentes.find((p) => p.usuarioId === auth?.usuarioId)
  const soyLider = yoPresente?.rolEnSala === 'LIDER'

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-l border-border bg-bg-sidebar">
      <div className="border-b border-border px-3 py-2.5">
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
          En línea — {presentes.length}
        </p>
        {estado !== 'conectado' && (
          <p className="mt-1 flex items-center gap-1 text-xs text-warning">
            <LogOut className="h-3 w-3" aria-hidden="true" />
            {estado === 'conectando' && 'Conectando…'}
            {estado === 'desconectado' && 'Desconectado, reintentando…'}
            {estado === 'error' && 'Error de conexión'}
          </p>
        )}
      </div>

      <ul className="flex-1 overflow-y-auto p-2">
        {presentes.length === 0 ? (
          <p className="px-2 py-1 text-sm text-text-muted">Nadie más está conectado ahora.</p>
        ) : (
          presentes.map((p) => (
            <FilaMiembro
              key={p.usuarioId}
              presente={p}
              esUnoMismo={p.usuarioId === auth?.usuarioId}
              puedeGestionar={soyLider}
              salaId={salaId}
            />
          ))
        )}
      </ul>
    </aside>
  )
}
