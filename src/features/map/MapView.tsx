import { useEffect, useState } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import type { LatLng } from 'leaflet'
import { useRoomSocket } from '../realtime/RoomSocketContext'
import { useNombreUsuario } from '../users/useNombreUsuario'
import { crearIconoMarcador, ETIQUETA_TIPO } from './markerIcon'
import { MarkerFormModal, type MarkerDraft } from './MarkerFormModal'
import { CursorLayer } from './CursorLayer'
import { AlertToastStack } from '../alerts/AlertToastStack'
import type { Marcador, TipoMarcador } from '../../types/realtime'

const CENTRO_DEFECTO: [number, number] = [15, -35]
const ZOOM_DEFECTO = 3

function ManejadorClicks({ onMapClick }: { onMapClick: (latlng: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng)
    },
  })
  return null
}

function RastreadorCursor() {
  const map = useMap()
  const { moverCursor } = useRoomSocket()

  useEffect(() => {
    const contenedor = map.getContainer()
    function onMouseMove(e: MouseEvent) {
      const rect = contenedor.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      if (x < 0 || x > 100 || y < 0 || y > 100) return
      moverCursor(x, y)
    }
    contenedor.addEventListener('mousemove', onMouseMove)
    return () => contenedor.removeEventListener('mousemove', onMouseMove)
  }, [map, moverCursor])

  return null
}

function PopupMarcador({ marcador, onEditar }: { marcador: Marcador; onEditar: () => void }) {
  const nombreAutor = useNombreUsuario(marcador.usuarioId)

  return (
    <div className="min-w-40 text-sm">
      <p className="font-semibold text-text">{ETIQUETA_TIPO[marcador.tipo]}</p>
      {marcador.descripcion && <p className="mt-1 text-text-secondary">{marcador.descripcion}</p>}
      <p className="mt-2 text-xs text-text-muted">
        {nombreAutor} · {new Date(marcador.fechaUltimaEdicion).toLocaleString()}
      </p>
      <button
        type="button"
        onClick={onEditar}
        className="mt-2 text-xs font-medium text-primary hover:underline cursor-pointer"
      >
        Editar
      </button>
    </div>
  )
}

export function MapView() {
  const { marcadores, enviarMarcador } = useRoomSocket()
  const [draft, setDraft] = useState<MarkerDraft | null>(null)

  function handleConfirm(tipo: TipoMarcador, descripcion: string) {
    if (!draft) return
    enviarMarcador({
      id: draft.marcador?.id,
      latitud: draft.marcador ? draft.marcador.latitud : draft.latlng.lat,
      longitud: draft.marcador ? draft.marcador.longitud : draft.latlng.lng,
      tipo,
      descripcion,
    })
    setDraft(null)
  }

  return (
    <div className="relative isolate z-0 h-full w-full">
      <MapContainer center={CENTRO_DEFECTO} zoom={ZOOM_DEFECTO} className="h-full w-full" worldCopyJump>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <ManejadorClicks onMapClick={(latlng) => setDraft({ latlng })} />
        <RastreadorCursor />

        {marcadores.map((marcador) => (
          <Marker
            key={marcador.id}
            position={[marcador.latitud, marcador.longitud]}
            icon={crearIconoMarcador(marcador.tipo)}
          >
            <Popup>
              <PopupMarcador
                marcador={marcador}
                onEditar={() =>
                  setDraft({ latlng: { lat: marcador.latitud, lng: marcador.longitud }, marcador })
                }
              />
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <CursorLayer />
      <AlertToastStack />

      <MarkerFormModal draft={draft} onClose={() => setDraft(null)} onConfirm={handleConfirm} />
    </div>
  )
}
