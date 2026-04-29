import { Outlet } from 'react-router-dom'
import { Topbar } from './Topbar'

export function AppLayout() {
  return (
    <div className="bg-gray-50 text-gray-800 h-screen overflow-hidden flex flex-col">
      <Topbar />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
