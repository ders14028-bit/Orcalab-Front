import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import * as authApi from './api'
import { clearStoredAuth, getStoredAuth, setStoredAuth } from '../../lib/authStorage'
import type { AuthResponse, LoginRequest, RegistroRequest } from '../../types/auth'

interface AuthContextValue {
  auth: AuthResponse | null
  isAuthenticated: boolean
  login: (payload: LoginRequest) => Promise<void>
  registrar: (payload: RegistroRequest) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthResponse | null>(() => getStoredAuth())

  const value = useMemo<AuthContextValue>(
    () => ({
      auth,
      isAuthenticated: auth !== null,
      login: async (payload) => {
        const response = await authApi.login(payload)
        setStoredAuth(response)
        setAuth(response)
      },
      registrar: async (payload) => {
        const response = await authApi.registrar(payload)
        setStoredAuth(response)
        setAuth(response)
      },
      logout: () => {
        clearStoredAuth()
        setAuth(null)
      },
    }),
    [auth],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
