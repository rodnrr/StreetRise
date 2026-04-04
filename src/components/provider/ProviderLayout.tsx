import { Outlet, NavLink, Navigate } from 'react-router-dom'
import { LayoutDashboard, ListChecks, CalendarDays, Briefcase, LogOut } from 'lucide-react'
import clsx from 'clsx'
import { useAuthStore } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import ToastContainer from '../shared/ToastContainer'

const LINKS = [
  { to: '/portal/dashboard', label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/portal/listings',  label: 'Listings',     icon: ListChecks },
  { to: '/portal/bookings',  label: 'Bookings',     icon: CalendarDays },
  { to: '/portal/work',      label: 'Work Exchange', icon: Briefcase },
]

export default function ProviderLayout() {
  const { role, clearAuth } = useAuthStore()

  // Redirect unauthenticated users
  if (role === 'guest') {
    return <Navigate to="/login?next=/portal/dashboard" replace />
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    clearAuth()
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex w-56 flex-col fixed inset-y-0 bg-white border-r border-gray-200">
        <div className="p-4 border-b border-gray-100">
          <NavLink to="/" className="flex items-center gap-2 font-bold text-primary-600">
            <span className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center text-white text-xs font-black">SR</span>
            StreetRise
          </NavLink>
          <p className="text-xs text-gray-400 mt-1 ml-9">Provider Portal</p>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {LINKS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors', {
                  'bg-primary-50 text-primary-700': isActive,
                  'text-gray-600 hover:bg-gray-50': !isActive,
                })
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <LogOut size={17} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 md:ml-56">
        <main className="p-4 md:p-8 max-w-5xl mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200
                       flex items-center justify-around pb-[env(safe-area-inset-bottom)]">
        {LINKS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx('flex flex-col items-center gap-0.5 py-2 px-3 text-[10px] font-medium transition-colors', {
                'text-primary-600': isActive,
                'text-gray-400':    !isActive,
              })
            }
          >
            <Icon size={22} />
            {label.split(' ')[0]}
          </NavLink>
        ))}
      </nav>

      <ToastContainer />
    </div>
  )
}
