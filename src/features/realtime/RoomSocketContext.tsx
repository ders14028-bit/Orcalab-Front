import { Client, type IMessage } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from '../auth/AuthContext'
import * as historyApi from './historyApi'
import type {
  Alerta,
  CursorMensaje,
  EstadoConexion,
  Marcador,
  MarcadorRequest,
  Mensaje,
  PresenciaMensaje,
  UsuarioPresente,
} from '../../types/realtime'

interface CursorRemoto {
  x: number
  y: number
  actualizado: number
}

interface RoomSocketValue {
  salaId: number
  estado: EstadoConexion
  presentes: UsuarioPresente[]
  mensajes: Mensaje[]
  marcadores: Marcador[]
  alertas: Alerta[]
  alertasToast: Alerta[]
  cursores: Record<number, CursorRemoto>
  cargandoHistorial: boolean
  enviarMensaje: (contenido: string, marcadorId?: string) => void
  enviarMarcador: (payload: MarcadorRequest) => void
  moverCursor: (x: number, y: number) => void
  descartarToast: (alertaId: string) => void
  quitarPresenteLocal: (usuarioId: number) => void
  actualizarRolLocal: (usuarioId: number, rolEnSala: 'LIDER' | 'MIEMBRO') => void
}

const RoomSocketContext = createContext<RoomSocketValue | undefined>(undefined)

const CURSOR_THROTTLE_MS = 60

export function RoomSocketProvider({ salaId, children }: { salaId: number; children: ReactNode }) {
  const { auth } = useAuth()
  const clientRef = useRef<Client | null>(null)
  const ultimoCursorEnviado = useRef(0)

  const [estado, setEstado] = useState<EstadoConexion>('conectando')
  const [presentes, setPresentes] = useState<UsuarioPresente[]>([])
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [marcadores, setMarcadores] = useState<Marcador[]>([])
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [alertasToast, setAlertasToast] = useState<Alerta[]>([])
  const [cursores, setCursores] = useState<Record<number, CursorRemoto>>({})
  const [cargandoHistorial, setCargandoHistorial] = useState(true)

  useEffect(() => {
    let cancelado = false
    setCargandoHistorial(true)

    Promise.all([
      historyApi.obtenerMensajes(salaId),
      historyApi.obtenerMarcadores(salaId),
      historyApi.obtenerAlertas(salaId),
    ])
      .then(([msgs, marks, alerts]) => {
        if (cancelado) return
        setMensajes(msgs)
        setMarcadores(marks)
        setAlertas(alerts)
      })
      .finally(() => {
        if (!cancelado) setCargandoHistorial(false)
      })

    return () => {
      cancelado = true
    }
  }, [salaId])

  useEffect(() => {
    if (!auth?.token) return

    setEstado('conectando')
    setPresentes([])
    setCursores({})

    const client = new Client({
      webSocketFactory: () => new SockJS('/ws'),
      connectHeaders: { Authorization: `Bearer ${auth.token}` },
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
    })

    client.onConnect = () => {
      setEstado('conectado')

      client.subscribe(`/topic/sala/${salaId}/presencia`, (message: IMessage) => {
        const data = JSON.parse(message.body) as PresenciaMensaje
        setPresentes(data.presentes)
      })

      client.subscribe(`/topic/sala/${salaId}/chat`, (message: IMessage) => {
        const mensaje = JSON.parse(message.body) as Mensaje
        setMensajes((prev) => [...prev, mensaje])
      })

      client.subscribe(`/topic/sala/${salaId}/marcadores`, (message: IMessage) => {
        const marcador = JSON.parse(message.body) as Marcador
        setMarcadores((prev) => {
          const idx = prev.findIndex((m) => m.id === marcador.id)
          if (idx === -1) return [...prev, marcador]
          const copia = [...prev]
          copia[idx] = marcador
          return copia
        })
      })

      client.subscribe(`/topic/sala/${salaId}/alertas`, (message: IMessage) => {
        const alerta = JSON.parse(message.body) as Alerta
        setAlertas((prev) => [alerta, ...prev])
        setAlertasToast((prev) => [...prev, alerta])
      })

      client.subscribe(`/topic/sala/${salaId}/cursores`, (message: IMessage) => {
        const cursor = JSON.parse(message.body) as CursorMensaje
        if (cursor.usuarioId === auth.usuarioId) return
        setCursores((prev) => ({
          ...prev,
          [cursor.usuarioId]: { x: cursor.x, y: cursor.y, actualizado: Date.now() },
        }))
      })

      client.publish({ destination: `/app/sala/${salaId}/entrar`, body: '{}' })
    }

    client.onWebSocketClose = () => {
      setEstado((prev) => (prev === 'conectado' ? 'desconectado' : prev))
    }

    client.onStompError = () => {
      setEstado('error')
    }

    clientRef.current = client
    client.activate()

    return () => {
      client.deactivate()
      clientRef.current = null
    }
  }, [salaId, auth?.token, auth?.usuarioId])

  const enviarMensaje = useCallback(
    (contenido: string, marcadorId?: string) => {
      clientRef.current?.publish({
        destination: `/app/sala/${salaId}/mensaje`,
        body: JSON.stringify({ contenido, marcadorId }),
      })
    },
    [salaId],
  )

  const enviarMarcador = useCallback(
    (payload: MarcadorRequest) => {
      clientRef.current?.publish({
        destination: `/app/sala/${salaId}/marcador`,
        body: JSON.stringify(payload),
      })
    },
    [salaId],
  )

  const moverCursor = useCallback(
    (x: number, y: number) => {
      const ahora = Date.now()
      if (ahora - ultimoCursorEnviado.current < CURSOR_THROTTLE_MS) return
      ultimoCursorEnviado.current = ahora
      clientRef.current?.publish({
        destination: `/app/sala/${salaId}/cursor`,
        body: JSON.stringify({ x, y }),
      })
    },
    [salaId],
  )

  const descartarToast = useCallback((alertaId: string) => {
    setAlertasToast((prev) => prev.filter((a) => a.id !== alertaId))
  }, [])

  const quitarPresenteLocal = useCallback((usuarioId: number) => {
    setPresentes((prev) => prev.filter((p) => p.usuarioId !== usuarioId))
  }, [])

  const actualizarRolLocal = useCallback((usuarioId: number, rolEnSala: 'LIDER' | 'MIEMBRO') => {
    setPresentes((prev) => prev.map((p) => (p.usuarioId === usuarioId ? { ...p, rolEnSala } : p)))
  }, [])

  const value = useMemo<RoomSocketValue>(
    () => ({
      salaId,
      estado,
      presentes,
      mensajes,
      marcadores,
      alertas,
      alertasToast,
      cursores,
      cargandoHistorial,
      enviarMensaje,
      enviarMarcador,
      moverCursor,
      descartarToast,
      quitarPresenteLocal,
      actualizarRolLocal,
    }),
    [
      salaId,
      estado,
      presentes,
      mensajes,
      marcadores,
      alertas,
      alertasToast,
      cursores,
      cargandoHistorial,
      enviarMensaje,
      enviarMarcador,
      moverCursor,
      descartarToast,
      quitarPresenteLocal,
      actualizarRolLocal,
    ],
  )

  return <RoomSocketContext.Provider value={value}>{children}</RoomSocketContext.Provider>
}

export function useRoomSocket(): RoomSocketValue {
  const ctx = useContext(RoomSocketContext)
  if (!ctx) throw new Error('useRoomSocket debe usarse dentro de RoomSocketProvider')
  return ctx
}
