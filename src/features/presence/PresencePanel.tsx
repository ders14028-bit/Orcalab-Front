import { Crown, LogOut, ShieldOff } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useRoomSocket } from '../realtime/RoomSocketContext'
import { useNombreUsuario } from '../users/useNombreUsuario'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { useRooms } from '../rooms/RoomsContext'
import * as roomsApi from '../rooms/api'
import type { Miembro, RolSala } from '../../types/room'

interface AccionPendiente {
  tipo: 'expulsar' | 'cambiarRol'
  miembro: Miembro
  nuevoRol?: RolSala
}

function FilaMiembro({
  miembro,
  enLinea,
  esUnoMismo,
  puedeGestionar,
  permitirQuitarLider,
  onExpulsar,
  onCambiarRol,
}: {
  miembro: Miembro
  enLinea: boolean
  esUnoMismo: boolean
  puedeGestionar: boolean
  permitirQuitarLider: boolean
  onExpulsar: (miembro: Miembro) => void
  onCambiarRol: (miembro: Miembro, nuevoRol: RolSala) => void
}) {
  const nombre = useNombreUsuario(miembro.usuarioId)
  const esLider = miembro.rolEnSala === 'LIDER'

  return (
    <li className="group flex items-center gap-2 rounded-control px-2 py-1.5 hover:bg-surface-hover">
      <span className="relative flex h-8 w-8 shrink-0 items-center justify-center">
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold
            ${esLider ? 'bg-amber-950 text-amber-300' : 'bg-surface text-text-secondary'} ${enLinea ? '' : 'opacity-50'}`}
        >
          {nombre.trim().charAt(0).toUpperCase() || '?'}
        </span>
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-bg-sidebar
            ${enLinea ? 'bg-success' : 'bg-text-muted'}`}
          aria-hidden="true"
        />
      </span>
      <span className={`min-w-0 flex-1 truncate text-sm ${enLinea ? 'text-text-secondary' : 'text-text-muted'}`}>
        {nombre}
        {esUnoMismo && <span className="text-text-muted"> (tú)</span>}
      </span>
      {esLider && <Crown className="h-3.5 w-3.5 shrink-0 text-amber-400" aria-label="Líder de la sala" />}

      {puedeGestionar && !esUnoMismo && (
        <div className="hidden shrink-0 items-center gap-1 group-hover:flex">
          {(!esLider || permitirQuitarLider) && (
            <button
              type="button"
              title={esLider ? 'Quitar líder' : 'Promover a líder'}
              onClick={() => onCambiarRol(miembro, esLider ? 'MIEMBRO' : 'LIDER')}
              className={`flex h-6 w-6 items-center justify-center rounded text-text-muted hover:text-amber-400 cursor-pointer
                ${esLider ? 'text-amber-400' : ''}`}
            >
              <Crown className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            title="Expulsar de la sala"
            onClick={() => onExpulsar(miembro)}
            className="flex h-6 w-6 items-center justify-center rounded text-text-muted hover:text-danger cursor-pointer"
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
  const {
    salaId,
    presentes,
    miembros,
    soyLider,
    estado,
    cargandoHistorial,
    quitarPresenteLocal,
    actualizarRolLocal,
    quitarMiembroLocal,
    actualizarRolMiembroLocal,
  } = useRoomSocket()
  const { refetch: refetchSalas } = useRooms()

  const [accionPendiente, setAccionPendiente] = useState<AccionPendiente | null>(null)

  const idsEnLinea = new Set(presentes.map((p) => p.usuarioId))
  // Único LÍDER de la sala: no se le ofrece "Quitar líder" a sí mismo ni a él, para no
  // dejar la sala sin nadie con permisos (el backend no protege este caso en cambiarRol).
  const cantidadLideres = miembros.filter((m) => m.rolEnSala === 'LIDER').length

  const enLinea = miembros.filter((m) => idsEnLinea.has(m.usuarioId))
  const desconectados = miembros.filter((m) => !idsEnLinea.has(m.usuarioId))

  function puedeQuitarLider(miembro: Miembro): boolean {
    return miembro.rolEnSala !== 'LIDER' || cantidadLideres > 1
  }

  async function handleConfirmarAccion() {
    if (!accionPendiente) return
    const { tipo, miembro, nuevoRol } = accionPendiente

    if (tipo === 'expulsar') {
      await roomsApi.expulsarMiembro(salaId, miembro.usuarioId)
      quitarPresenteLocal(miembro.usuarioId)
      quitarMiembroLocal(miembro.usuarioId)
      refetchSalas()
    } else if (nuevoRol) {
      await roomsApi.cambiarRolMiembro(salaId, miembro.usuarioId, nuevoRol)
      actualizarRolLocal(miembro.usuarioId, nuevoRol)
      actualizarRolMiembroLocal(miembro.usuarioId, nuevoRol)
    }

    setAccionPendiente(null)
  }

  const nombreObjetivo = useNombreUsuario(accionPendiente?.miembro.usuarioId)

  function tituloModal(): string {
    if (!accionPendiente) return ''
    if (accionPendiente.tipo === 'expulsar') return 'Expulsar miembro'
    return accionPendiente.nuevoRol === 'LIDER' ? 'Promover a líder' : 'Quitar líder'
  }

  function mensajeModal(): string {
    if (!accionPendiente) return ''
    if (accionPendiente.tipo === 'expulsar') {
      return `¿Seguro que quieres expulsar a ${nombreObjetivo} de la sala? Podrá volver a unirse con el ID de la sala.`
    }
    return accionPendiente.nuevoRol === 'LIDER'
      ? `¿Promover a ${nombreObjetivo} a líder de la sala?`
      : `¿Quitarle el rol de líder a ${nombreObjetivo}?`
  }

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

      <div className="flex-1 overflow-y-auto p-2">
        {enLinea.length === 0 ? (
          <p className="px-2 py-1 text-sm text-text-muted">Nadie más está conectado ahora.</p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {enLinea.map((m) => (
              <FilaMiembro
                key={m.usuarioId}
                miembro={m}
                enLinea
                esUnoMismo={m.usuarioId === auth?.usuarioId}
                puedeGestionar={soyLider}
                permitirQuitarLider={puedeQuitarLider(m)}
                onExpulsar={(miembro) => setAccionPendiente({ tipo: 'expulsar', miembro })}
                onCambiarRol={(miembro, nuevoRol) => setAccionPendiente({ tipo: 'cambiarRol', miembro, nuevoRol })}
              />
            ))}
          </ul>
        )}

        {!cargandoHistorial && desconectados.length > 0 && (
          <>
            <p className="mb-1 mt-4 px-2 text-xs font-medium uppercase tracking-wide text-text-muted">
              Desconectados — {desconectados.length}
            </p>
            <ul className="flex flex-col gap-0.5">
              {desconectados.map((m) => (
                <FilaMiembro
                  key={m.usuarioId}
                  miembro={m}
                  enLinea={false}
                  esUnoMismo={m.usuarioId === auth?.usuarioId}
                  puedeGestionar={soyLider}
                  permitirQuitarLider={puedeQuitarLider(m)}
                  onExpulsar={(miembro) => setAccionPendiente({ tipo: 'expulsar', miembro })}
                  onCambiarRol={(miembro, nuevoRol) => setAccionPendiente({ tipo: 'cambiarRol', miembro, nuevoRol })}
                />
              ))}
            </ul>
          </>
        )}
      </div>

      <ConfirmModal
        open={accionPendiente !== null}
        title={tituloModal()}
        message={mensajeModal()}
        confirmLabel={accionPendiente?.tipo === 'expulsar' ? 'Expulsar' : 'Confirmar'}
        danger={accionPendiente?.tipo === 'expulsar'}
        onConfirm={handleConfirmarAccion}
        onClose={() => setAccionPendiente(null)}
      />
    </aside>
  )
}
