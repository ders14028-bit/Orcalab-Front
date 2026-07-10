import { Outlet } from 'react-router-dom'
import { RoomsProvider } from '../features/rooms/RoomsContext'
import { RoomsRail } from '../features/rooms/RoomsRail'
import { RoomPanel } from '../features/rooms/RoomPanel'

export function RoomShellLayout() {
  return (
    <RoomsProvider>
      <div className="flex h-svh w-full overflow-hidden bg-bg-panel">
        <RoomsRail />
        <RoomPanel />
        <Outlet />
      </div>
    </RoomsProvider>
  )
}
