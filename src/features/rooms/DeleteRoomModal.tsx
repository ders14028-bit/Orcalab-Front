import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { FormAlert } from '../../components/ui/FormAlert'
import { ApiError } from '../../lib/http'
import { useRooms } from './RoomsContext'
import * as roomsApi from './api'
import type { Sala } from '../../types/room'

export function DeleteRoomModal({ open, onClose, sala }: { open: boolean; onClose: () => void; sala: Sala }) {
  const { refetch } = useRooms()
  const navigate = useNavigate()

  const [nombreEscrito, setNombreEscrito] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const coincide = nombreEscrito === sala.nombre

  function handleClose() {
    setNombreEscrito('')
    setError(null)
    onClose()
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!coincide) return

    setError(null)
    setLoading(true)
    try {
      await roomsApi.eliminarSala(sala.id)
      await refetch()
      handleClose()
      navigate('/')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo eliminar la sala')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} title="Eliminar servidor" onClose={handleClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {error && <FormAlert message={error} />}

        <div className="rounded-control border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-red-300">
          Esta acción es <strong>irreversible</strong>. Se eliminará la sala «{sala.nombre}», todas sus
          membresías, canales, mensajes y marcadores dejarán de estar disponibles.
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="confirmar-nombre-sala" className="text-sm font-medium text-text-secondary">
            Escribe <strong>{sala.nombre}</strong> para confirmar
          </label>
          <input
            id="confirmar-nombre-sala"
            value={nombreEscrito}
            onChange={(e) => setNombreEscrito(e.target.value)}
            autoComplete="off"
            className="h-11 rounded-control border border-border-strong bg-surface px-3 text-base text-text
              placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
          />
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" variant="danger" loading={loading} disabled={!coincide}>
            Eliminar servidor
          </Button>
        </div>
      </form>
    </Modal>
  )
}
