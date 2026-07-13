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
import { useNavigate } from 'react-router-dom'
import { API_BASE } from '../../lib/apiBase'
import { useAuth } from '../auth/AuthContext'
import { useRooms } from '../rooms/RoomsContext'
import * as historyApi from './historyApi'
import * as canalesApi from '../channels/api'
import * as roomsApi from '../rooms/api'
import type {
  Alerta,
  CursorMensaje,
  EstadoConexion,
  Marcador,
  MarcadorRequest,
  Mensaje,
  ParticipanteVoz,
  PresenciaMensaje,
  UsuarioPresente,
  VozMensaje,
  VozSenalMensaje,
} from '../../types/realtime'
import type { Canal, Miembro, RolSala, TipoCanal } from '../../types/room'

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
  miembros: Miembro[]
  soyLider: boolean
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
  participantesVozPorCanal: Record<string, ParticipanteVoz[]>
  seleccionarCanal: (canalId: string) => void
  crearCanal: (nombre: string, tipo: TipoCanal) => Promise<Canal>
  eliminarCanal: (canalId: string) => Promise<void>
  enviarMensaje: (contenido: string, marcadorId?: string) => void
  enviarMarcador: (payload: MarcadorRequest) => void
  moverCursor: (x: number, y: number) => void
  descartarToast: (alertaId: string) => void
  quitarPresenteLocal: (usuarioId: number) => void
  actualizarRolLocal: (usuarioId: number, rolEnSala: 'LIDER' | 'MIEMBRO') => void
  quitarMiembroLocal: (usuarioId: number) => void
  actualizarRolMiembroLocal: (usuarioId: number, rolEnSala: RolSala) => void
  refetchMiembros: () => Promise<void>
  entrarVoz: (canalId: string) => void
  salirVoz: (canalId: string) => void
  silenciarVoz: (canalId: string, muteado: boolean) => void
  enviarOfertaVoz: (canalId: string, paraUsuarioId: number, sdp: string) => void
  enviarRespuestaVoz: (canalId: string, paraUsuarioId: number, sdp: string) => void
  enviarIceVoz: (canalId: string, paraUsuarioId: number, candidato: RTCIceCandidateInit) => void
  suscribirSenalVoz: (handler: (mensaje: VozSenalMensaje) => void) => () => void
}

const RoomSocketContext = createContext<RoomSocketValue | undefined>(undefined)

const CURSOR_THROTTLE_MS = 60

export function RoomSocketProvider({ salaId, children }: { salaId: number; children: ReactNode }) {
  const { auth } = useAuth()
  const { salas, refetch: refetchSalas } = useRooms()
  const navigate = useNavigate()
  const clientRef = useRef<Client | null>(null)
  const ultimoCursorEnviado = useRef(0)

  // El handler de presencia se registra una sola vez al conectar (ver más abajo) y su closure
  // quedaría con el "salas" de ese momento — casi seguro `[]`, porque RoomsProvider todavía no
  // terminó de cargar. Con un ref siempre se lee el valor más reciente en vez de uno viejo.
  const salasRef = useRef(salas)
  useEffect(() => {
    salasRef.current = salas
  }, [salas])

  const [estado, setEstado] = useState<EstadoConexion>('conectando')
  const [presentes, setPresentes] = useState<UsuarioPresente[]>([])
  const [miembros, setMiembros] = useState<Miembro[]>([])
  const [canales, setCanales] = useState<Canal[]>([])
  const [canalActivoId, setCanalActivoId] = useState<string | null>(null)
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [marcadores, setMarcadores] = useState<Marcador[]>([])
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [alertasToast, setAlertasToast] = useState<Alerta[]>([])
  const [cursores, setCursores] = useState<Record<number, CursorRemoto>>({})
  const [cargandoHistorial, setCargandoHistorial] = useState(true)
  const [cargandoMensajes, setCargandoMensajes] = useState(true)
  // Se incrementa en cada reconexión del socket (no en la conexión inicial) para
  // re-disparar la carga del historial de sala: lo que llegó por broadcast mientras
  // el socket estuvo caído (canales, marcadores, alertas, miembros) se perdió y
  // solo se recupera volviéndolo a pedir por REST.
  const [reconexiones, setReconexiones] = useState(0)
  const [participantesVozPorCanal, setParticipantesVozPorCanal] = useState<Record<string, ParticipanteVoz[]>>({})

  // Registro de listeners de señalización WebRTC: useVoiceCall se engancha aquí sin que este
  // contexto necesite saber nada de RTCPeerConnection — solo reenvía lo que llega por la cola
  // privada del usuario a quien esté escuchando en ese momento.
  const senalVozListenersRef = useRef(new Set<(mensaje: VozSenalMensaje) => void>())

  // Historial a nivel de sala: canales, marcadores, alertas y miembros son los mismos sin
  // importar en qué canal de texto/voz esté parado el usuario. Los miembros se traen por REST
  // (fuente confiable en la base de datos) en vez de derivarse de la presencia por WebSocket:
  // esta última tarda hasta 1s en reflejar el rol real (se llena de forma asíncrona vía Redis
  // Streams), y si el usuario es el único conectado a una sala recién creada, ese "aún no sé tu
  // rol" queda pegado toda la sesión porque la presencia solo se recalcula al conectar/desconectar.
  useEffect(() => {
    let cancelado = false
    let reintentoId: number | undefined
    setCargandoHistorial(true)

    // Una sala nunca puede quedar sin canales (el backend prohíbe eliminar el último),
    // así que una lista vacía siempre significa "sala recién creada cuyo canal 'general'
    // aún no fue creado por el consumidor de eventos (polling de 1s)": reintentar con
    // backoff corto hasta que aparezca, sin pisar canales que lleguen por broadcast.
    const reintentarCanales = (intento: number) => {
      reintentoId = window.setTimeout(() => {
        canalesApi
          .listarCanales(salaId)
          .then((cans) => {
            if (cancelado) return
            if (cans.length > 0) {
              setCanales((prev) => (prev.length > 0 ? prev : cans))
              setCanalActivoId((prev) => prev ?? elegirCanalPorDefecto(cans))
            } else if (intento < 4) {
              reintentarCanales(intento + 1)
            }
          })
          .catch(() => {
            if (!cancelado && intento < 4) reintentarCanales(intento + 1)
          })
      }, 1000 * (intento + 1))
    }

    Promise.all([
      canalesApi.listarCanales(salaId),
      historyApi.obtenerMarcadores(salaId),
      historyApi.obtenerAlertas(salaId),
      roomsApi.listarMiembros(salaId),
    ])
      .then(([cans, marks, alerts, mmbrs]) => {
        if (cancelado) return
        setCanales((prev) => (prev.length > 0 && cans.length === 0 ? prev : cans))
        setMarcadores(marks)
        setAlertas(alerts)
        setMiembros(mmbrs)
        setCanalActivoId((prev) => prev ?? elegirCanalPorDefecto(cans))
        if (cans.length === 0) {
          reintentarCanales(0)
        }
      })
      .finally(() => {
        if (!cancelado) setCargandoHistorial(false)
      })

    return () => {
      cancelado = true
      if (reintentoId) clearTimeout(reintentoId)
    }
  }, [salaId, reconexiones])

  useEffect(() => {
    if (!auth?.token) return

    setEstado('conectando')
    setPresentes([])
    setCursores({})

    const client = new Client({
      webSocketFactory: () => new SockJS(`${API_BASE}/ws`),
      connectHeaders: { Authorization: `Bearer ${auth.token}` },
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
    })

    // Local al ciclo de vida de ESTE client: distingue la conexión inicial de las
    // reconexiones automáticas de stompjs sin arrastrar estado entre salas/tokens.
    let yaConectoAlgunaVez = false

    client.onConnect = () => {
      setEstado('conectado')
      if (yaConectoAlgunaVez) {
        setReconexiones((n) => n + 1)
      }
      yaConectoAlgunaVez = true

      client.subscribe(`/topic/sala/${salaId}/presencia`, (message: IMessage) => {
        const data = JSON.parse(message.body) as PresenciaMensaje

        // El expulsado también recibe este mensaje (sigue suscrito al topic aunque ya no sea
        // miembro): en vez de dejarlo viendo una sala congelada con llamadas fallando en
        // silencio, se lo saca de inmediato con un aviso claro.
        if (data.tipo === 'MIEMBRO_SALIO' && data.usuarioId === auth?.usuarioId) {
          const nombreSala = salasRef.current.find((s) => s.id === salaId)?.nombre ?? 'la sala'
          refetchSalas()
          navigate('/', { state: { avisoExpulsion: nombreSala } })
          return
        }

        setPresentes(data.presentes)

        if (data.tipo === 'SALIDA' || data.tipo === 'MIEMBRO_SALIO') {
          setCursores((prev) => {
            if (!(data.usuarioId in prev)) return prev
            const { [data.usuarioId]: _eliminado, ...resto } = prev
            return resto
          })
        }

        // Cambios de membresía (unirse, ser expulsado, cambio de rol): refrescar la lista
        // completa de miembros por REST, porque el mensaje de presencia solo incluye a quienes
        // están conectados por WebSocket en este momento, no a la sala completa.
        if (data.tipo === 'MIEMBRO_UNIDO' || data.tipo === 'MIEMBRO_SALIO' || data.tipo === 'ROL_CAMBIADO') {
          refetchMiembros()
        }
      })

      client.subscribe(`/topic/sala/${salaId}/canales`, (message: IMessage) => {
        const canal = JSON.parse(message.body) as Canal
        setCanales((prev) => {
          if (prev.some((c) => c.id === canal.id)) return prev
          const siguiente = [...prev, canal]
          // En una sala recién creada, el canal "general" llega por este broadcast
          // (no por el fetch inicial, que corre antes de que exista): si aún no hay
          // canal activo, seleccionarlo para que el chat no quede en "cargando".
          setCanalActivoId((actual) => actual ?? elegirCanalPorDefecto(siguiente))
          return siguiente
        })
      })

      client.subscribe(`/topic/sala/${salaId}/canales/eliminado`, (message: IMessage) => {
        const data = JSON.parse(message.body) as { canalId: string }
        quitarCanalDelEstado(data.canalId)
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

      // Cola privada punto-a-punto (oferta/respuesta/ICE de WebRTC): una sola suscripción para
      // toda la sesión, reenviada a quien esté escuchando vía suscribirSenalVoz (useVoiceCall).
      client.subscribe('/user/queue/voz/senal', (message: IMessage) => {
        const data = JSON.parse(message.body) as VozSenalMensaje
        senalVozListenersRef.current.forEach((handler) => handler(data))
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

  // Presencia de voz: a diferencia del chat, se suscribe a TODOS los canales de voz de la sala
  // (no solo el activo), porque ChannelList necesita mostrar quién está en cada llamada en todo
  // momento, no solo en la que el usuario tiene abierta.
  useEffect(() => {
    if (estado !== 'conectado') return
    const client = clientRef.current
    if (!client) return

    const canalesVoz = canales.filter((c) => c.tipo === 'VOZ')
    const suscripciones = canalesVoz.map((canal) =>
      client.subscribe(`/topic/sala/${salaId}/canal/${canal.id}/voz/presentes`, (message: IMessage) => {
        const data = JSON.parse(message.body) as VozMensaje
        setParticipantesVozPorCanal((prev) => ({ ...prev, [canal.id]: data.participantes }))
      }),
    )

    return () => {
      suscripciones.forEach((s) => s.unsubscribe())
    }
  }, [salaId, estado, canales])

  const seleccionarCanal = useCallback((canalId: string) => {
    setCanalActivoId(canalId)
  }, [])

  // Si el canal eliminado era el activo, cae al canal por defecto disponible; se usa tanto para
  // la acción local del líder como para el broadcast que reciben los demás clientes conectados.
  const quitarCanalDelEstado = useCallback((canalId: string) => {
    setCanales((prev) => {
      const siguiente = prev.filter((c) => c.id !== canalId)
      setCanalActivoId((actual) => (actual === canalId ? elegirCanalPorDefecto(siguiente) : actual))
      return siguiente
    })
  }, [])

  const crearCanal = useCallback(
    async (nombre: string, tipo: TipoCanal) => {
      const canal = await canalesApi.crearCanal(salaId, { nombre, tipo })
      setCanales((prev) => (prev.some((c) => c.id === canal.id) ? prev : [...prev, canal]))
      return canal
    },
    [salaId],
  )

  const eliminarCanal = useCallback(
    async (canalId: string) => {
      await canalesApi.eliminarCanal(salaId, canalId)
      quitarCanalDelEstado(canalId)
    },
    [salaId, quitarCanalDelEstado],
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

  const quitarMiembroLocal = useCallback((usuarioId: number) => {
    setMiembros((prev) => prev.filter((m) => m.usuarioId !== usuarioId))
  }, [])

  const actualizarRolMiembroLocal = useCallback((usuarioId: number, rolEnSala: RolSala) => {
    setMiembros((prev) => prev.map((m) => (m.usuarioId === usuarioId ? { ...m, rolEnSala } : m)))
  }, [])

  const entrarVoz = useCallback(
    (canalId: string) => {
      clientRef.current?.publish({ destination: `/app/sala/${salaId}/canal/${canalId}/voz/entrar`, body: '{}' })
    },
    [salaId],
  )

  const salirVoz = useCallback(
    (canalId: string) => {
      clientRef.current?.publish({ destination: `/app/sala/${salaId}/canal/${canalId}/voz/salir`, body: '{}' })
    },
    [salaId],
  )

  const silenciarVoz = useCallback(
    (canalId: string, muteado: boolean) => {
      clientRef.current?.publish({
        destination: `/app/sala/${salaId}/canal/${canalId}/voz/silenciar`,
        body: JSON.stringify({ muteado }),
      })
    },
    [salaId],
  )

  const enviarOfertaVoz = useCallback(
    (canalId: string, paraUsuarioId: number, sdp: string) => {
      clientRef.current?.publish({
        destination: `/app/sala/${salaId}/canal/${canalId}/voz/oferta`,
        body: JSON.stringify({ paraUsuarioId, sdp }),
      })
    },
    [salaId],
  )

  const enviarRespuestaVoz = useCallback(
    (canalId: string, paraUsuarioId: number, sdp: string) => {
      clientRef.current?.publish({
        destination: `/app/sala/${salaId}/canal/${canalId}/voz/respuesta`,
        body: JSON.stringify({ paraUsuarioId, sdp }),
      })
    },
    [salaId],
  )

  const enviarIceVoz = useCallback(
    (canalId: string, paraUsuarioId: number, candidato: RTCIceCandidateInit) => {
      clientRef.current?.publish({
        destination: `/app/sala/${salaId}/canal/${canalId}/voz/ice`,
        body: JSON.stringify({ paraUsuarioId, candidato }),
      })
    },
    [salaId],
  )

  const suscribirSenalVoz = useCallback((handler: (mensaje: VozSenalMensaje) => void) => {
    senalVozListenersRef.current.add(handler)
    return () => {
      senalVozListenersRef.current.delete(handler)
    }
  }, [])

  const refetchMiembros = useCallback(async () => {
    try {
      const data = await roomsApi.listarMiembros(salaId)
      setMiembros(data)
    } catch {
      // Si falla (ej. el propio usuario ya no es miembro de esta sala tras ser expulsado),
      // se mantiene la última lista conocida en vez de dejar una promesa sin manejar.
    }
  }, [salaId])

  const soyLider = useMemo(
    () => miembros.some((m) => m.usuarioId === auth?.usuarioId && m.rolEnSala === 'LIDER'),
    [miembros, auth?.usuarioId],
  )

  const canalActivo = useMemo(
    () => canales.find((c) => c.id === canalActivoId) ?? null,
    [canales, canalActivoId],
  )

  const value = useMemo<RoomSocketValue>(
    () => ({
      salaId,
      estado,
      presentes,
      miembros,
      soyLider,
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
      participantesVozPorCanal,
      seleccionarCanal,
      crearCanal,
      eliminarCanal,
      enviarMensaje,
      enviarMarcador,
      moverCursor,
      descartarToast,
      quitarPresenteLocal,
      actualizarRolLocal,
      quitarMiembroLocal,
      actualizarRolMiembroLocal,
      refetchMiembros,
      entrarVoz,
      salirVoz,
      silenciarVoz,
      enviarOfertaVoz,
      enviarRespuestaVoz,
      enviarIceVoz,
      suscribirSenalVoz,
    }),
    [
      salaId,
      estado,
      presentes,
      miembros,
      soyLider,
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
      participantesVozPorCanal,
      seleccionarCanal,
      crearCanal,
      eliminarCanal,
      enviarMensaje,
      enviarMarcador,
      moverCursor,
      descartarToast,
      quitarPresenteLocal,
      actualizarRolLocal,
      quitarMiembroLocal,
      actualizarRolMiembroLocal,
      refetchMiembros,
      entrarVoz,
      salirVoz,
      silenciarVoz,
      enviarOfertaVoz,
      enviarRespuestaVoz,
      enviarIceVoz,
      suscribirSenalVoz,
    ],
  )

  return <RoomSocketContext.Provider value={value}>{children}</RoomSocketContext.Provider>
}

export function useRoomSocket(): RoomSocketValue {
  const ctx = useContext(RoomSocketContext)
  if (!ctx) throw new Error('useRoomSocket debe usarse dentro de RoomSocketProvider')
  return ctx
}
