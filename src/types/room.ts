export type RolSala = 'LIDER' | 'MIEMBRO'

export interface Sala {
  id: number
  nombre: string
  descripcion: string | null
  creadorId: number
  fechaCreacion: string
  totalMiembros: number
}

export interface Miembro {
  usuarioId: number
  rolEnSala: RolSala
  fechaUnion: string
}

export interface CrearSalaRequest {
  nombre: string
  descripcion?: string
}
