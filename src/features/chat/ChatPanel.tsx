import { Send } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useRoomSocket } from '../realtime/RoomSocketContext'
import { useNombreUsuario } from '../users/useNombreUsuario'
import { useAuth } from '../auth/AuthContext'
import { VoiceChannelPanel } from '../voice/VoiceChannelPanel'
import type { Mensaje } from '../../types/realtime'

function Burbuja({ mensaje, esPropio }: { mensaje: Mensaje; esPropio: boolean }) {
  const nombre = useNombreUsuario(mensaje.usuarioId)

  return (
    <div className={`flex flex-col ${esPropio ? 'items-end' : 'items-start'}`}>
      <span className="mb-0.5 px-1 text-xs text-text-muted">
        {esPropio ? 'Tú' : nombre} · {new Date(mensaje.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
      <div
        className={`max-w-[85%] rounded-control px-3 py-2 text-sm ${
          esPropio ? 'bg-primary text-white' : 'bg-surface text-text'
        }`}
      >
        {mensaje.contenido}
      </div>
    </div>
  )
}

export function ChatPanel() {
  const { mensajes, enviarMensaje, cargandoMensajes, canalActivo } = useRoomSocket()
  const { auth } = useAuth()
  const [texto, setTexto] = useState('')
  const finRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    finRef.current?.scrollIntoView({ block: 'end' })
  }, [mensajes.length])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const contenido = texto.trim()
    if (!contenido) return
    enviarMensaje(contenido)
    setTexto('')
  }

  if (canalActivo?.tipo === 'VOZ') {
    return <VoiceChannelPanel canal={canalActivo} />
  }

  return (
    <div className="flex h-full min-w-0 flex-col">
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {cargandoMensajes ? (
          <p className="text-sm text-text-muted">Cargando chat…</p>
        ) : mensajes.length === 0 ? (
          <p className="text-sm text-text-muted">Aún no hay mensajes. Sé el primero en escribir.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {mensajes.map((m) => (
              <Burbuja key={m.id} mensaje={m} esPropio={m.usuarioId === auth?.usuarioId} />
            ))}
            <div ref={finRef} />
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-border p-2">
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escribe un mensaje…"
          aria-label="Mensaje"
          className="h-10 min-w-0 flex-1 rounded-control border border-border-strong bg-surface px-3 text-sm text-text
            placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
        <button
          type="submit"
          disabled={!texto.trim()}
          aria-label="Enviar mensaje"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-primary text-white
            hover:bg-primary-hover disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-panel"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>
    </div>
  )
}
