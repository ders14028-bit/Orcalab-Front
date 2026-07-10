export type Rol = 'ADMINISTRADOR' | 'INVESTIGADOR'

export interface LoginRequest {
  email: string
  password: string
}

export interface RegistroRequest {
  email: string
  password: string
  nombre: string
}

export interface AuthResponse {
  token: string
  tipo: string
  usuarioId: number
  nombre: string
  rol: Rol
}

export interface Usuario {
  id: number
  email: string
  nombre: string
  rol: Rol
}

export interface UsuarioResumen {
  id: number
  nombre: string
}
