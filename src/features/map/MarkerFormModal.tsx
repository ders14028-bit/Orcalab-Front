import { useEffect, useState, type FormEvent } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import type { Marcador, TipoMarcador } from '../../types/realtime'
import { ETIQUETA_TIPO } from './markerIcon'

export interface MarkerDraft {
  latlng: { lat: number; lng: number }
  marcador?: Marcador
}

const TIPOS: TipoMarcador[] = ['AVISTAMIENTO', 'ZONA_INTERES', 'CRITICO']

export function MarkerFormModal({
  draft,
  onClose,
  onConfirm,
}: {
  draft: MarkerDraft | null
  onClose: () => void
  onConfirm: (tipo: TipoMarcador, descripcion: string) => void
}) {
  const [tipo, setTipo] = useState<TipoMarcador>('AVISTAMIENTO')
  const [descripcion, setDescripcion] = useState('')

  useEffect(() => {
    if (draft?.marcador) {
      setTipo(draft.marcador.tipo)
      setDescripcion(draft.marcador.descripcion ?? '')
    } else {
      setTipo('AVISTAMIENTO')
      setDescripcion('')
    }
  }, [draft])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onConfirm(tipo, descripcion)
  }

  const esEdicion = Boolean(draft?.marcador)

  return (
    <Modal open={draft !== null} title={esEdicion ? 'Editar marcador' : 'Nuevo marcador'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium text-text-secondary">Tipo</legend>
          {TIPOS.map((opcion) => (
            <label
              key={opcion}
              className={`flex cursor-pointer items-center gap-2.5 rounded-control border px-3 py-2 text-sm
                ${tipo === opcion ? 'border-primary bg-primary-soft text-text' : 'border-border-strong text-text-secondary'}`}
            >
              <input
                type="radio"
                name="tipoMarcador"
                value={opcion}
                checked={tipo === opcion}
                onChange={() => setTipo(opcion)}
                className="accent-primary"
              />
              {ETIQUETA_TIPO[opcion]}
            </label>
          ))}
        </fieldset>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="descripcion-marcador" className="text-sm font-medium text-text-secondary">
            Descripción
          </label>
          <textarea
            id="descripcion-marcador"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={3}
            className="rounded-control border border-border-strong bg-surface px-3 py-2 text-sm text-text
              placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            placeholder="¿Qué se observó?"
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">{esEdicion ? 'Guardar cambios' : 'Agregar marcador'}</Button>
        </div>
      </form>
    </Modal>
  )
}
