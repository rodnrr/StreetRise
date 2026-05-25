import { Outlet, NavLink, Navigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, ListChecks, CalendarDays, Briefcase, LogOut, Clock, XCircle, ShieldOff } from 'lucide-react'
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

function PendingScreen({ status, onLogout }: { status: string; onLogout: () => void }) {
  const isRejected  = status === 'rejected'
  const isSuspended = status === 'suspended'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full card text-center py-12 px-8">
        {isRejected || isSuspended ? (
          <>
            {isRejected
              ? <XCircle size={52} className="text-danger-500 mx-auto mb-4" />
              : <ShieldOff size={52} className="text-gray-400 mx-auto mb-4" />}
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              {isRejected ? 'Application not approved' : 'Account suspended'}
            </h1>
            <p className="text-gray-500 text-sm mb-6">
              {isRejected
                ? 'Your provider application was not approved. Contact support@streetrise.org if you believe this is an error.'
                : 'Your account has been suspended. Contact support@streetrise.org for assistance.'}
            </p>
          </>
        ) : (
          <>
            <Clock size={52} className="text-amber-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Application under review</h1>
            <p className="text-gray-500 text-sm mb-2">
              Your provider application has been submitted and is pending manual review by our team.
            </p>
            <p className="text-gray-500 text-sm mb-6">
              This typically takes <strong>1–2 business days</strong>. You'll receive an email when your account is verified.
            </p>
          </>
        )}
        <button
          onClick={onLogout}
          className="btn-secondary w-full flex items-center justify-center gap-2"
        >
          <LogOut size={15} /> Sign Out
        </button>
      </div>
    </div>
  )
}

export default function ProviderLayout() {
  const { role, verificationStatus, clearAuth } = useAuthStore()
  const location = useLocation()

  // Redirect unauthenticated users
  if (role === 'guest') {
    return <Navigate to="/login?next=/portal/dashboard" replace />
  }

  // Admins who land on the provider portal get sent to their panel
  if (role === 'admin' || role === 'super_admin') {
    return <Navigate to="/admin/dashboard" replace />
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    clearAuth()
  }

  // No providers row yet — user signed up but hasn't completed onboarding.
  // Allow /portal/onboarding to render; redirect everything else there.
  if (role === 'provider' && verificationStatus === null) {
    return location.pathname === '/portal/onboarding'
      ? <><Outlet /><ToastContainer /></>
      : <Navigate to="/portal/onboarding" replace />
  }

  // Block providers waiting for review / rejected / suspended
  if (role === 'provider' && verificationStatus !== 'verified') {
    return <PendingScreen status={verificationStatus} onLogout={handleLogout} />
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
