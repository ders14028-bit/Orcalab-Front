import { MousePointer2 } from 'lucide-react'
import { useRoomSocket } from '../realtime/RoomSocketContext'
import { useNombreUsuario } from '../users/useNombreUsuario'
import { colorParaUsuario } from './cursorColor'

function CursorRemoto({ usuarioId, x, y }: { usuarioId: number; x: number; y: number }) {
  const nombre = useNombreUsuario(usuarioId)
  const color = colorParaUsuario(usuarioId)

  return (
    <div
      className="pointer-events-none absolute flex items-center transition-[left,top] duration-75 ease-linear"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <MousePointer2 className="h-4 w-4 drop-shadow" style={{ color, fill: color }} aria-hidden="true" />
      <span
        className="orcalab-cursor-label rounded-control px-1.5 py-0.5 text-xs font-medium text-white shadow"
        style={{ backgroundColor: color }}
      >
        {nombre}
      </span>
    </div>
  )
}

export function CursorLayer() {
  const { cursores } = useRoomSocket()

  return (
    <div className="pointer-events-none absolute inset-0 z-[1000] overflow-hidden">
      {Object.entries(cursores).map(([usuarioId, cursor]) => (
        <CursorRemoto key={usuarioId} usuarioId={Number(usuarioId)} x={cursor.x} y={cursor.y} />
      ))}
    </div>
  )
}
