import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { MapPin, Heart, HelpCircle, Menu, X } from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'
import ToastContainer from './ToastContainer'
import Footer from './Footer'

const NAV_LINKS = [
  { to: '/map',    label: 'Find Resources', icon: MapPin },
  { to: '/donate', label: 'Donate',         icon: Heart },
  { to: '/faq',    label: 'FAQ',            icon: HelpCircle },
]

export default function RootLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const isMapPage = location.pathname === '/map'
  const emergencyUrl = 'https://app.streetrise.org'
  const isEmergencyUrlSafe = emergencyUrl.startsWith('https://')

  return (
    <div className="flex flex-col min-h-screen">
      {/* ── Top nav (hidden on full-screen map) ── */}
      {!isMapPage && (
        <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
            {/* Logo */}
            <NavLink to="/" className="flex items-center gap-2 font-bold text-primary-600 text-lg">
              <span className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center text-white text-xs font-black">SR</span>
              StreetRise
            </NavLink>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    clsx('px-4 py-2 rounded-xl text-sm font-medium transition-colors', {
                      'bg-primary-50 text-primary-700': isActive,
                      'text-gray-600 hover:bg-gray-50': !isActive,
                    })
                  }
                >
                  {label}
                </NavLink>
              ))}
              <NavLink
                to="/provider/onboarding"
                className={({ isActive }) =>
                  clsx('px-4 py-2 rounded-xl text-sm font-medium transition-colors ml-1', {
                    'bg-primary-50 text-primary-700': isActive,
                    'text-gray-600 hover:bg-gray-50': !isActive,
                  })
                }
              >
                Become a Provider
              </NavLink>
              <NavLink to="/portal" className="btn-primary btn-sm ml-2">
                Provider Login
              </NavLink>
            </nav>

            {/* Mobile hamburger */}
            <button
              className="md:hidden btn-icon"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

          {/* Mobile dropdown */}
          {menuOpen && (
            <div className="md:hidden border-t border-gray-100 bg-white px-4 pb-4 animate-fade-in">
              {NAV_LINKS.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    clsx('flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium my-1 transition-colors', {
                      'bg-primary-50 text-primary-700': isActive,
                      'text-gray-700 hover:bg-gray-50': !isActive,
                    })
                  }
                >
                  <Icon size={18} />
                  {label}
                </NavLink>
              ))}
              <NavLink
                to="/provider/onboarding"
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  clsx('flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium my-1 transition-colors', {
                    'bg-primary-50 text-primary-700': isActive,
                    'text-gray-700 hover:bg-gray-50': !isActive,
                  })
                }
              >
                Become a Provider
              </NavLink>
              <NavLink to="/portal" className="btn-primary w-full mt-2" onClick={() => setMenuOpen(false)}>
                Provider Login
              </NavLink>
            </div>
          )}
        </header>
      )}

      {/* ── Page content ── */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* ── Footer (hidden on full-screen map) ── */}
      {!isMapPage && <Footer />}

      {/* ── Persistent emergency help CTA ── */}
      <a
        href={isEmergencyUrlSafe ? emergencyUrl : '#'}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Get Help Now - Emergency Hotline"
        className={clsx(
          'fixed right-4 z-50 rounded-full px-5 py-3 text-sm font-bold uppercase tracking-wide shadow-lg',
          'focus:outline-none focus:ring-4 focus:ring-offset-2',
          'transition-transform hover:scale-[1.02] active:scale-[0.98]',
          'bg-red-600 text-white focus:ring-red-300',
          'bottom-20 md:bottom-4',
          { 'pointer-events-none opacity-50': !isEmergencyUrlSafe },
        )}
      >
        Get Help Now
      </a>

      {/* ── Bottom tab bar (mobile) ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200
                       flex items-center justify-around pb-[env(safe-area-inset-bottom)]">
        {NAV_LINKS.map(({ to, label, icon: Icon }) => (
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
            <Icon size={22} strokeWidth={isMapPage ? 1.5 : 2} />
            {label.split(' ')[0]}
          </NavLink>
        ))}
      </nav>

      {/* ── Toast container ── */}
      <ToastContainer />
    </div>
  )
}
