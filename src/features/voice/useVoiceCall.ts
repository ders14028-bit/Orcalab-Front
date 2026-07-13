import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useRoomSocket } from '../realtime/RoomSocketContext'

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
}

export function useVoiceCall(canalId: string) {
  const { auth } = useAuth()
  const {
    participantesVozPorCanal,
    entrarVoz,
    salirVoz,
    silenciarVoz,
    enviarOfertaVoz,
    enviarRespuestaVoz,
    enviarIceVoz,
    suscribirSenalVoz,
  } = useRoomSocket()

  const usuarioId = auth?.usuarioId

  const [unido, setUnido] = useState(false)
  const [muteado, setMuteado] = useState(false)
  const [streamsRemotos, setStreamsRemotos] = useState<Record<number, MediaStream>>({})
  const [error, setError] = useState<string | null>(null)

  const localStreamRef = useRef<MediaStream | null>(null)
  const peersRef = useRef<Record<number, RTCPeerConnection>>({})
  const candidatosPendientesRef = useRef<Record<number, RTCIceCandidateInit[]>>({})
  const participantesPreviosRef = useRef<Set<number>>(new Set())

  const cerrarConexion = useCallback((remotoId: number) => {
    peersRef.current[remotoId]?.close()
    delete peersRef.current[remotoId]
    delete candidatosPendientesRef.current[remotoId]
    setStreamsRemotos((prev) => {
      if (!(remotoId in prev)) return prev
      const { [remotoId]: _eliminado, ...resto } = prev
      return resto
    })
  }, [])

  const obtenerOCrearConexion = useCallback(
    (remotoId: number) => {
      const existente = peersRef.current[remotoId]
      if (existente) return existente

      const pc = new RTCPeerConnection(ICE_SERVERS)
      localStreamRef.current?.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!)
      })

      pc.ontrack = (event) => {
        setStreamsRemotos((prev) => ({ ...prev, [remotoId]: event.streams[0] }))
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          enviarIceVoz(canalId, remotoId, event.candidate.toJSON())
        }
      }

      peersRef.current[remotoId] = pc
      return pc
    },
    [canalId, enviarIceVoz],
  )

  const aplicarCandidatosPendientes = useCallback(async (remotoId: number, pc: RTCPeerConnection) => {
    const pendientes = candidatosPendientesRef.current[remotoId] ?? []
    delete candidatosPendientesRef.current[remotoId]
    for (const candidato of pendientes) {
      await pc.addIceCandidate(candidato)
    }
  }, [])

  const iniciarOferta = useCallback(
    async (remotoId: number) => {
      const pc = obtenerOCrearConexion(remotoId)
      const oferta = await pc.createOffer()
      await pc.setLocalDescription(oferta)
      enviarOfertaVoz(canalId, remotoId, oferta.sdp ?? '')
    },
    [canalId, enviarOfertaVoz, obtenerOCrearConexion],
  )

  const manejarOferta = useCallback(
    async (remotoId: number, sdp: string) => {
      const pc = obtenerOCrearConexion(remotoId)
      await pc.setRemoteDescription({ type: 'offer', sdp })
      await aplicarCandidatosPendientes(remotoId, pc)
      const respuesta = await pc.createAnswer()
      await pc.setLocalDescription(respuesta)
      enviarRespuestaVoz(canalId, remotoId, respuesta.sdp ?? '')
    },
    [aplicarCandidatosPendientes, canalId, enviarRespuestaVoz, obtenerOCrearConexion],
  )

  const manejarRespuesta = useCallback(
    async (remotoId: number, sdp: string) => {
      const pc = peersRef.current[remotoId]
      if (!pc) return
      await pc.setRemoteDescription({ type: 'answer', sdp })
      await aplicarCandidatosPendientes(remotoId, pc)
    },
    [aplicarCandidatosPendientes],
  )

  const manejarIce = useCallback(async (remotoId: number, candidato: RTCIceCandidateInit) => {
    const pc = peersRef.current[remotoId]
    if (pc?.remoteDescription) {
      await pc.addIceCandidate(candidato)
    } else {
      candidatosPendientesRef.current[remotoId] = [...(candidatosPendientesRef.current[remotoId] ?? []), candidato]
    }
  }, [])

  // Señalización entrante: una sola suscripción por hook, filtrando por el canal que le interesa
  // (la cola privada del usuario es genérica para toda la sala, no por canal).
  useEffect(() => {
    return suscribirSenalVoz((mensaje) => {
      if (mensaje.canalId !== canalId) return
      const remotoId = mensaje.deUsuarioId

      if (mensaje.tipo === 'OFERTA' && mensaje.sdp) manejarOferta(remotoId, mensaje.sdp)
      else if (mensaje.tipo === 'RESPUESTA' && mensaje.sdp) manejarRespuesta(remotoId, mensaje.sdp)
      else if (mensaje.tipo === 'ICE' && mensaje.candidato) manejarIce(remotoId, mensaje.candidato)
    })
  }, [canalId, suscribirSenalVoz, manejarOferta, manejarRespuesta, manejarIce])

  // Regla anti-glare: para cualquier par, quien tiene el usuarioId menor siempre ofrece hacia el
  // mayor; el otro lado solo espera y responde. Se evalúa cada vez que cambia la lista de
  // participantes del canal, cubriendo tanto "yo entro con gente ya hablando" como "alguien entra
  // mientras yo ya estoy".
  useEffect(() => {
    if (!unido || usuarioId === undefined) return

    const lista = participantesVozPorCanal[canalId] ?? []
    const idsActuales = new Set(lista.map((p) => p.usuarioId).filter((id) => id !== usuarioId))
    const previos = participantesPreviosRef.current

    idsActuales.forEach((id) => {
      if (!previos.has(id) && usuarioId < id) {
        iniciarOferta(id)
      }
    })
    previos.forEach((id) => {
      if (!idsActuales.has(id)) cerrarConexion(id)
    })

    participantesPreviosRef.current = idsActuales
  }, [participantesVozPorCanal, canalId, unido, usuarioId, iniciarOferta, cerrarConexion])

  const unirse = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      localStreamRef.current = stream
      setUnido(true)
      entrarVoz(canalId)
    } catch {
      setError('No se pudo acceder al micrófono. Revisá los permisos del navegador.')
    }
  }, [canalId, entrarVoz])

  const salir = useCallback(() => {
    Object.keys(peersRef.current).forEach((id) => cerrarConexion(Number(id)))
    localStreamRef.current?.getTracks().forEach((track) => track.stop())
    localStreamRef.current = null
    participantesPreviosRef.current = new Set()
    salirVoz(canalId)
    setUnido(false)
    setMuteado(false)
    setStreamsRemotos({})
  }, [canalId, salirVoz, cerrarConexion])

  const alternarMute = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0]
    if (!track) return
    const nuevoMuteado = !muteado
    track.enabled = !nuevoMuteado
    setMuteado(nuevoMuteado)
    silenciarVoz(canalId, nuevoMuteado)
  }, [canalId, muteado, silenciarVoz])

  // Salir de la llamada al desmontar o al cambiar de canal, para no dejar RTCPeerConnection
  // ni el micrófono abiertos si el usuario navega a otro canal sin apretar "Salir".
  const salirRef = useRef(salir)
  salirRef.current = salir
  const unidoRef = useRef(unido)
  unidoRef.current = unido
  useEffect(() => {
    return () => {
      if (unidoRef.current) salirRef.current()
    }
  }, [canalId])

  return {
    unido,
    muteado,
    streamsRemotos,
    error,
    unirse,
    salir,
    alternarMute,
  }
}
