import type { RolSala } from './room'

export type TipoMarcador = 'AVISTAMIENTO' | 'ZONA_INTERES' | 'CRITICO'

export interface Marcador {
  id: string
  salaId: number
  usuarioId: number
  latitud: number
  longitud: number
  tipo: TipoMarcador
  descripcion: string | null
  fechaCreacion: string
  fechaUltimaEdicion: string
}

export interface MarcadorRequest {
  id?: string
  latitud: number
  longitud: number
  tipo: TipoMarcador
  descripcion: string
}

export interface Mensaje {
  id: string
  salaId: number
  usuarioId: number
  contenido: string
  marcadorId: string | null
  timestamp: string
}

export interface MensajeRequest {
  contenido: string
  marcadorId?: string
}

export interface Alerta {
  id: string
  salaId: number
  usuarioId: number
  marcadorId: string
  latitud: number
  longitud: number
  descripcion: string | null
  timestamp: string
}

export interface UsuarioPresente {
  usuarioId: number
  rolEnSala: RolSala | 'DESCONOCIDO'
}

export interface PresenciaMensaje {
  tipo: 'ENTRADA' | 'SALIDA'
  usuarioId: number
  presentes: UsuarioPresente[]
}

export interface CursorMensaje {
  usuarioId: number
  x: number
  y: number
}

export type EstadoConexion = 'conectando' | 'conectado' | 'desconectado' | 'error'
