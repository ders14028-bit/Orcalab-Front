import { LogOut, Shield } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from './AuthContext'

export function UserMenu() {
  const { auth, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  if (!auth) return null

  const inicial = auth.nombre.trim().charAt(0).toUpperCase() || '?'

  return (
    <div ref={ref} className="relative">
      {open && (
        <div className="absolute bottom-full left-0 z-40 mb-2 w-52 rounded-card border border-border bg-surface p-1.5 shadow-xl">
          <div className="px-2.5 py-2 text-xs text-text-muted">
            <p className="truncate font-medium text-text-secondary">{auth.nombre}</p>
            <p className="truncate">{auth.rol}</p>
          </div>
          {auth.rol === 'ADMINISTRADOR' && (
            <Link
              to="/admin"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-control px-2.5 py-2 text-sm text-text-secondary hover:bg-surface-hover hover:text-text"
            >
              <Shield className="h-4 w-4" aria-hidden="true" />
              Administración
            </Link>
          )}
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-control px-2.5 py-2 text-left text-sm text-danger hover:bg-danger-soft cursor-pointer"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Cerrar sesión
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Menú de usuario"
        aria-expanded={open}
        title={auth.nombre}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-sm font-semibold text-text-secondary
          hover:rounded-control hover:bg-primary hover:text-white transition-all duration-150 cursor-pointer
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-rail"
      >
        {inicial}
      </button>
    </div>
  )
}
