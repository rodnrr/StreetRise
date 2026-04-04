import { Outlet, NavLink, Navigate } from 'react-router-dom'
import { LayoutDashboard, Building2, MapPin, CalendarDays, HelpCircle, LogOut, ShieldAlert } from 'lucide-react'
import clsx from 'clsx'
import { useAuthStore } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import ToastContainer from '../shared/ToastContainer'

const LINKS = [
  { to: '/admin/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/admin/providers',  label: 'Providers',  icon: Building2 },
  { to: '/admin/resources',  label: 'Resources',  icon: MapPin },
  { to: '/admin/bookings',   label: 'Bookings',   icon: CalendarDays },
  { to: '/admin/faq',        label: 'FAQ',        icon: HelpCircle },
]

export default function AdminLayout() {
  const { role, clearAuth } = useAuthStore()

  if (role !== 'admin' && role !== 'super_admin') {
    return <Navigate to="/login?next=/admin/dashboard" replace />
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    clearAuth()
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="hidden md:flex w-56 flex-col fixed inset-y-0 bg-gray-900 text-white">
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-2 font-bold text-white">
            <ShieldAlert size={18} className="text-primary-400" />
            StreetRise Admin
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {LINKS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors', {
                  'bg-white/10 text-white': isActive,
                  'text-gray-400 hover:bg-white/5 hover:text-white': !isActive,
                })
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
          >
            <LogOut size={17} />
            Sign Out
          </button>
        </div>
      </aside>

      <div className="flex-1 md:ml-56">
        <main className="p-4 md:p-8 max-w-6xl mx-auto">
          <Outlet />
        </main>
      </div>

      <ToastContainer />
    </div>
  )
}
