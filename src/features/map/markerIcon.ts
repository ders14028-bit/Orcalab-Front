import { divIcon } from 'leaflet'
import type { TipoMarcador } from '../../types/realtime'

const claseporTipo: Record<TipoMarcador, string> = {
  AVISTAMIENTO: 'orcalab-marker--avistamiento',
  ZONA_INTERES: 'orcalab-marker--zona_interes',
  CRITICO: 'orcalab-marker--critico',
}

export function crearIconoMarcador(tipo: TipoMarcador) {
  return divIcon({
    className: '',
    html: `<div class="orcalab-marker ${claseporTipo[tipo]}"></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -13],
  })
}

export const ETIQUETA_TIPO: Record<TipoMarcador, string> = {
  AVISTAMIENTO: 'Avistamiento',
  ZONA_INTERES: 'Zona de interés',
  CRITICO: 'Crítico',
}
