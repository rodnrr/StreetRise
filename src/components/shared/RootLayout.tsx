import { Outlet, NavLink, Link, useLocation } from 'react-router-dom'
import { MapPin, Heart, Briefcase, HelpCircle, Menu, X, UserPlus } from 'lucide-react'
import { useState, useEffect } from 'react'
import clsx from 'clsx'
import ToastContainer from './ToastContainer'
import Footer from './Footer'

const NAV_LINKS = [
  { to: '/map',    label: 'Find Resources', icon: MapPin },
  { to: '/work',   label: 'Work Exchange',  icon: Briefcase },
  { to: '/donate', label: 'Donate',         icon: Heart },
  { to: '/faq',    label: 'FAQ',            icon: HelpCircle },
]

export default function RootLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const isMapPage = location.pathname === '/map'
  const isHomePage = location.pathname === '/'

  // Collapse the menu whenever the route changes.
  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  return (
    <div className="flex flex-col min-h-screen">
      {/* ── Top nav (hidden on full-screen map) ── */}
      {!isMapPage && (
        <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
          <div className="relative max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
            {/* Logo */}
            <NavLink to="/" className="flex items-center gap-2 font-bold text-primary-600 text-lg">
              <span className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center text-white text-xs font-black">SR</span>
              StreetRise
            </NavLink>

            {/* Hamburger trigger (all screen sizes) */}
            <button
              type="button"
              className="btn-icon"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Dropdown menu */}
            {menuOpen && (
              <>
                {/* Click-away backdrop */}
                <button
                  type="button"
                  aria-label="Close menu"
                  className="fixed inset-0 z-30 cursor-default"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-4 top-full z-40 mt-2 w-64 rounded-2xl border border-gray-100 bg-white p-2 shadow-lg animate-fade-in">
                  {NAV_LINKS.map(({ to, label, icon: Icon }) => (
                    <NavLink
                      key={to}
                      to={to}
                      className={({ isActive }) =>
                        clsx('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors', {
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
                    className={({ isActive }) =>
                      clsx('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors', {
                        'bg-primary-50 text-primary-700': isActive,
                        'text-gray-700 hover:bg-gray-50': !isActive,
                      })
                    }
                  >
                    <UserPlus size={18} />
                    Become a Provider
                  </NavLink>
                  <div className="my-1 border-t border-gray-100" />
                  <NavLink to="/portal" className="btn-primary w-full">
                    Provider Login
                  </NavLink>
                </div>
              </>
            )}
          </div>
        </header>
      )}

      {/* ── Page content ── */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* ── Footer (hidden on full-screen map) ── */}
      {!isMapPage && <Footer />}

      {/* ── Persistent "Get Help Now" CTA → resource map ──
           Hidden on home (the hero already leads with this action) and on
           the map itself. */}
      {!isMapPage && !isHomePage && (
        <Link
          to="/map"
          aria-label="Get Help Now — find resources near you"
          className={clsx(
            'fixed right-4 z-50 rounded-full px-5 py-3 text-sm font-bold uppercase tracking-wide shadow-lg',
            'focus:outline-none focus:ring-4 focus:ring-offset-2',
            'transition-transform hover:scale-[1.02] active:scale-[0.98]',
            'bg-red-600 text-white focus:ring-red-300',
            'bottom-20 md:bottom-4',
          )}
        >
          Get Help Now
        </Link>
      )}

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
