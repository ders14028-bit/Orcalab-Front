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
import * as canalesApi from '../channels/api'
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
import type { Canal, TipoCanal } from '../../types/room'

interface CursorRemoto {
  x: number
  y: number
  actualizado: number
}

function elegirCanalPorDefecto(canales: Canal[]): string | null {
  const texto = canales.find((c) => c.tipo === 'TEXTO')
  return texto?.id ?? canales[0]?.id ?? null
}

interface RoomSocketValue {
  salaId: number
  estado: EstadoConexion
  presentes: UsuarioPresente[]
  canales: Canal[]
  canalActivoId: string | null
  canalActivo: Canal | null
  mensajes: Mensaje[]
  marcadores: Marcador[]
  alertas: Alerta[]
  alertasToast: Alerta[]
  cursores: Record<number, CursorRemoto>
  cargandoHistorial: boolean
  cargandoMensajes: boolean
  seleccionarCanal: (canalId: string) => void
  crearCanal: (nombre: string, tipo: TipoCanal) => Promise<Canal>
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
  const [canales, setCanales] = useState<Canal[]>([])
  const [canalActivoId, setCanalActivoId] = useState<string | null>(null)
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [marcadores, setMarcadores] = useState<Marcador[]>([])
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [alertasToast, setAlertasToast] = useState<Alerta[]>([])
  const [cursores, setCursores] = useState<Record<number, CursorRemoto>>({})
  const [cargandoHistorial, setCargandoHistorial] = useState(true)
  const [cargandoMensajes, setCargandoMensajes] = useState(true)

  // Historial a nivel de sala: canales, marcadores y alertas son los mismos sin
  // importar en qué canal de texto/voz esté parado el usuario.
  useEffect(() => {
    let cancelado = false
    setCargandoHistorial(true)

    Promise.all([
      canalesApi.listarCanales(salaId),
      historyApi.obtenerMarcadores(salaId),
      historyApi.obtenerAlertas(salaId),
    ])
      .then(([cans, marks, alerts]) => {
        if (cancelado) return
        setCanales(cans)
        setMarcadores(marks)
        setAlertas(alerts)
        setCanalActivoId((prev) => prev ?? elegirCanalPorDefecto(cans))
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

      client.subscribe(`/topic/sala/${salaId}/canales`, (message: IMessage) => {
        const canal = JSON.parse(message.body) as Canal
        setCanales((prev) => (prev.some((c) => c.id === canal.id) ? prev : [...prev, canal]))
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

  // Suscripción de chat por canal: el chat es lo único que cambia al navegar
  // entre canales; el mapa, las alertas y la presencia siguen siendo de sala.
  useEffect(() => {
    const canalActivo = canales.find((c) => c.id === canalActivoId) ?? null

    // Canal de voz (o aún sin canal activo determinado): no hay historial de chat que cargar.
    if (canalActivo && canalActivo.tipo !== 'TEXTO') {
      setMensajes([])
      setCargandoMensajes(false)
      return
    }

    // Todavía no sabemos qué canal está activo o el socket no está listo: se mantiene
    // el estado de "cargando" hasta poder resolverlo, en vez de mostrar "sin mensajes".
    if (estado !== 'conectado' || !canalActivoId || !canalActivo) {
      return
    }

    const client = clientRef.current
    if (!client) return

    let cancelado = false
    setCargandoMensajes(true)
    setMensajes([])

    historyApi
      .obtenerMensajes(salaId, canalActivoId)
      .then((msgs) => {
        if (!cancelado) setMensajes(msgs)
      })
      .finally(() => {
        if (!cancelado) setCargandoMensajes(false)
      })

    const suscripcion = client.subscribe(`/topic/sala/${salaId}/canal/${canalActivoId}/chat`, (message: IMessage) => {
      const mensaje = JSON.parse(message.body) as Mensaje
      setMensajes((prev) => [...prev, mensaje])
    })

    return () => {
      cancelado = true
      suscripcion.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salaId, canalActivoId, estado])

  const seleccionarCanal = useCallback((canalId: string) => {
    setCanalActivoId(canalId)
  }, [])

  const crearCanal = useCallback(
    async (nombre: string, tipo: TipoCanal) => {
      const canal = await canalesApi.crearCanal(salaId, { nombre, tipo })
      setCanales((prev) => (prev.some((c) => c.id === canal.id) ? prev : [...prev, canal]))
      return canal
    },
    [salaId],
  )

  const enviarMensaje = useCallback(
    (contenido: string, marcadorId?: string) => {
      if (!canalActivoId) return
      clientRef.current?.publish({
        destination: `/app/sala/${salaId}/canal/${canalActivoId}/mensaje`,
        body: JSON.stringify({ contenido, marcadorId }),
      })
    },
    [salaId, canalActivoId],
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

  const canalActivo = useMemo(
    () => canales.find((c) => c.id === canalActivoId) ?? null,
    [canales, canalActivoId],
  )

  const value = useMemo<RoomSocketValue>(
    () => ({
      salaId,
      estado,
      presentes,
      canales,
      canalActivoId,
      canalActivo,
      mensajes,
      marcadores,
      alertas,
      alertasToast,
      cursores,
      cargandoHistorial,
      cargandoMensajes,
      seleccionarCanal,
      crearCanal,
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
      canales,
      canalActivoId,
      canalActivo,
      mensajes,
      marcadores,
      alertas,
      alertasToast,
      cursores,
      cargandoHistorial,
      cargandoMensajes,
      seleccionarCanal,
      crearCanal,
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
