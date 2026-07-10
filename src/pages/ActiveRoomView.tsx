import { Navigate, useParams } from 'react-router-dom'
import { RoomSocketProvider } from '../features/realtime/RoomSocketContext'
import { MapView } from '../features/map/MapView'
import { ChatPanel } from '../features/chat/ChatPanel'
import { AlertsPanel } from '../features/alerts/AlertsPanel'
import { PresencePanel } from '../features/presence/PresencePanel'

export function ActiveRoomView() {
  const { salaId } = useParams()
  const id = Number(salaId)

  if (!salaId || !Number.isInteger(id) || id <= 0) {
    return <Navigate to="/" replace />
  }

  return (
    <RoomSocketProvider key={id} salaId={id}>
      <div className="flex min-w-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1">
            <MapView />
          </div>
          <div className="flex h-72 shrink-0 border-t border-border">
            <div className="min-w-0 flex-[2] border-r border-border">
              <ChatPanel />
            </div>
            <div className="min-w-0 flex-1">
              <AlertsPanel />
            </div>
          </div>
        </div>
        <PresencePanel />
      </div>
    </RoomSocketProvider>
  )
}
