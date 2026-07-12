import { Outlet, useParams } from 'react-router-dom'
import { RoomsProvider } from '../features/rooms/RoomsContext'
import { RoomsRail } from '../features/rooms/RoomsRail'
import { RoomPanel } from '../features/rooms/RoomPanel'
import { RoomSocketProvider } from '../features/realtime/RoomSocketContext'

function RoomShellContent() {
  const { salaId } = useParams()
  const id = Number(salaId)
  const salaValida = Boolean(salaId) && Number.isInteger(id) && id > 0

  if (!salaValida) {
    return (
      <>
        <RoomPanel />
        <Outlet />
      </>
    )
  }

  return (
    <RoomSocketProvider key={id} salaId={id}>
      <RoomPanel />
      <Outlet />
    </RoomSocketProvider>
  )
}

export function RoomShellLayout() {
  return (
    <RoomsProvider>
      <div className="flex h-svh w-full overflow-hidden bg-bg-panel">
        <RoomsRail />
        <RoomShellContent />
      </div>
    </RoomsProvider>
  )
}
