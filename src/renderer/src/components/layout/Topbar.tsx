import { Archive, Bug } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '@renderer/lib/utils'

export function Topbar() {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between z-10 shrink-0">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-blue-700 font-bold text-xl">
          <Bug className="w-5 h-5" />
          Azure BugCat
        </div>
        <nav className="flex gap-4">
          <NavLink
            to="/"
            className={({ isActive }) =>
              cn(
                'px-3 py-2 text-sm font-medium',
                isActive
                  ? 'text-blue-700 border-b-2 border-blue-700'
                  : 'text-gray-500 hover:text-gray-900'
              )
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/closed-bugs"
            className={({ isActive }) =>
              cn(
                'px-3 py-2 text-sm font-medium flex items-center gap-1.5',
                isActive
                  ? 'text-blue-700 border-b-2 border-blue-700'
                  : 'text-gray-500 hover:text-gray-900'
              )
            }
          >
            <Archive className="w-4 h-4" />
            Closed history
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              cn(
                'px-3 py-2 text-sm font-medium',
                isActive
                  ? 'text-blue-700 border-b-2 border-blue-700'
                  : 'text-gray-500 hover:text-gray-900'
              )
            }
          >
            Settings
          </NavLink>
        </nav>
      </div>
    </header>
  )
}
