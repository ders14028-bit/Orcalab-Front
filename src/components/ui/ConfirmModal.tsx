import { useEffect, useState } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import { FormAlert } from './FormAlert'
import { ApiError } from '../../lib/http'

interface ConfirmModalProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void | Promise<void>
  onClose: () => void
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = false,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) setError(null)
  }, [open])

  async function handleConfirm() {
    setLoading(true)
    setError(null)
    try {
      await onConfirm()
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo completar la acción')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <p className="text-sm text-text-secondary">{message}</p>
      {error && (
        <div className="mt-3">
          <FormAlert message={error} />
        </div>
      )}
      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button type="button" variant={danger ? 'danger' : 'primary'} loading={loading} onClick={handleConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
