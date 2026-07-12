import { Hash, Volume2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { FormAlert } from '../../components/ui/FormAlert'
import { ApiError } from '../../lib/http'
import { useRoomSocket } from '../realtime/RoomSocketContext'
import type { TipoCanal } from '../../types/room'

export function CreateChannelModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { crearCanal, seleccionarCanal } = useRoomSocket()

  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState<TipoCanal>('TEXTO')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function handleClose() {
    setNombre('')
    setTipo('TEXTO')
    setError(null)
    onClose()
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const canal = await crearCanal(nombre, tipo)
      seleccionarCanal(canal.id)
      handleClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear el canal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} title="Nuevo canal" onClose={handleClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {error && <FormAlert message={error} />}

        <Input
          label="Nombre"
          required
          maxLength={100}
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="ej. avistamientos-norte"
        />

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text-secondary">Tipo</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTipo('TEXTO')}
              aria-pressed={tipo === 'TEXTO'}
              className={`flex flex-1 items-center justify-center gap-2 rounded-control border px-3 py-2 text-sm cursor-pointer
                ${tipo === 'TEXTO' ? 'border-primary bg-primary-soft text-primary' : 'border-border-strong text-text-secondary hover:bg-surface-hover'}`}
            >
              <Hash className="h-4 w-4" aria-hidden="true" />
              Texto
            </button>
            <button
              type="button"
              onClick={() => setTipo('VOZ')}
              aria-pressed={tipo === 'VOZ'}
              className={`flex flex-1 items-center justify-center gap-2 rounded-control border px-3 py-2 text-sm cursor-pointer
                ${tipo === 'VOZ' ? 'border-primary bg-primary-soft text-primary' : 'border-border-strong text-text-secondary hover:bg-surface-hover'}`}
            >
              <Volume2 className="h-4 w-4" aria-hidden="true" />
              Voz
            </button>
          </div>
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            {loading ? 'Creando…' : 'Crear canal'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
