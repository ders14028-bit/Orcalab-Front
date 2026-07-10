import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { FormAlert } from '../../components/ui/FormAlert'
import { ApiError } from '../../lib/http'
import { useRooms } from './RoomsContext'
import * as roomsApi from './api'

export function CreateRoomModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { agregarSalaLocal } = useRooms()
  const navigate = useNavigate()

  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const sala = await roomsApi.crearSala({ nombre, descripcion: descripcion || undefined })
      agregarSalaLocal(sala)
      setNombre('')
      setDescripcion('')
      onClose()
      navigate(`/salas/${sala.id}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear la sala')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} title="Nueva sala de investigación" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {error && <FormAlert message={error} />}

        <Input
          label="Nombre"
          required
          maxLength={150}
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />

        <Input
          label="Descripción"
          maxLength={500}
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          helperText="Opcional"
        />

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            {loading ? 'Creando…' : 'Crear sala'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
