import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthContext'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  return <>{children}</>
}

export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

export function AdminRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, auth } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (auth?.rol !== 'ADMINISTRADOR') {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
