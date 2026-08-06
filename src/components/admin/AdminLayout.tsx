import { useEffect, useState } from 'react'
import { Outlet, NavLink, Navigate, Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Building2, MapPin, CalendarDays, HelpCircle, LogOut,
  ShieldAlert, MessageSquare, Newspaper, Menu, X, ExternalLink,
} from 'lucide-react'
import clsx from 'clsx'
import { useAuthStore } from '@/lib/store'
import { useAdminCounts, EMPTY_ADMIN_COUNTS, type AdminCounts } from '@/lib/adminCounts'
import { supabase } from '@/lib/supabase'
import ToastContainer from '../shared/ToastContainer'

/** Grouped so the nav encodes what each area is for, not just a flat list. */
type NavLinkDef = {
  to: string
  label: string
  icon: typeof MapPin
  /**
   * Which pending counts to surface as a badge, if any. Several keys sum into
   * one badge when a single page actions all of them — /admin/providers
   * reviews both new applications and organization claims.
   */
  badgeKeys?: (keyof AdminCounts)[]
}

const NAV_GROUPS: { label: string | null; links: NavLinkDef[] }[] = [
  {
    label: null,
    links: [{ to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Moderation',
    links: [
      { to: '/admin/providers', label: 'Providers', icon: Building2,     badgeKeys: ['providersPending', 'claimsPending'] },
      { to: '/admin/resources', label: 'Resources', icon: MapPin,        badgeKeys: ['resourcesPending'] },
      { to: '/admin/bookings',  label: 'Bookings',  icon: CalendarDays,  badgeKeys: ['bookingsPending'] },
      { to: '/admin/messages',  label: 'Messages',  icon: MessageSquare, badgeKeys: ['messagesOpen'] },
    ],
  },
  {
    label: 'Content',
    links: [
      { to: '/admin/blog', label: 'Blog', icon: Newspaper },
      { to: '/admin/faq',  label: 'FAQ',  icon: HelpCircle },
    ],
  },
]

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  clsx(
    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
    {
      'bg-primary-600/15 text-primary-300': isActive,
      'text-gray-400 hover:bg-white/5 hover:text-white': !isActive,
    }
  )

export default function AdminLayout() {
  const { role, userEmail, clearAuth } = useAuthStore()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const location = useLocation()
  const isAdmin = role === 'admin' || role === 'super_admin'
  const { data: counts = EMPTY_ADMIN_COUNTS } = useAdminCounts(isAdmin)
  const totalPending =
    counts.providersPending + counts.claimsPending + counts.resourcesPending +
    counts.bookingsPending + counts.messagesOpen

  // Close the mobile drawer whenever the route changes.
  useEffect(() => { setDrawerOpen(false) }, [location.pathname])

  // Escape closes the drawer; lock body scroll while it is open.
  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawerOpen(false) }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [drawerOpen])

  if (!isAdmin) {
    return <Navigate to="/login?next=/admin/dashboard" replace />
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    clearAuth()
  }

  const roleLabel = role === 'super_admin' ? 'Super admin' : 'Admin'

  /** Brand block, shared by the sidebar and the mobile drawer/header. */
  function Brand() {
    return (
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center shrink-0">
          <ShieldAlert size={17} className="text-white" />
        </span>
        <div className="min-w-0">
          <p className="font-bold text-white text-sm leading-tight">StreetRise</p>
          <p className="text-[11px] text-primary-300 leading-tight">{roleLabel}</p>
        </div>
      </div>
    )
  }

  /** Nav list + account footer, shared by the sidebar and the drawer. */
  function NavBody() {
    return (
      <>
        <nav className="flex-1 overflow-y-auto p-3 space-y-4">
          {NAV_GROUPS.map((group, i) => (
            <div key={group.label ?? `group-${i}`} className="space-y-0.5">
              {group.label && (
                <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                  {group.label}
                </p>
              )}
              {group.links.map(({ to, label, icon: Icon, badgeKeys }) => {
                const count = (badgeKeys ?? []).reduce((n, k) => n + counts[k], 0)
                return (
                  <NavLink key={to} to={to} className={navLinkClass}>
                    <Icon size={17} className="shrink-0" />
                    <span className="flex-1">{label}</span>
                    {count > 0 && (
                      <span
                        aria-label={`${count} awaiting review`}
                        className="shrink-0 min-w-[20px] text-center bg-warning-500 text-gray-900
                                   text-[11px] font-bold rounded-full px-1.5 py-0.5 tabular-nums"
                      >
                        {count > 99 ? '99+' : count}
                      </span>
                    )}
                  </NavLink>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-800 space-y-0.5">
          {userEmail && (
            <p className="px-3 pb-1.5 text-[11px] text-gray-500 truncate" title={userEmail}>
              {userEmail}
            </p>
          )}
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400
                       hover:bg-white/5 hover:text-white transition-colors
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
          >
            <ExternalLink size={17} className="shrink-0" />
            View public site
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-medium text-gray-400
                       hover:bg-danger-600/15 hover:text-danger-500 transition-colors
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-500"
          >
            <LogOut size={17} className="shrink-0" />
            Sign out
          </button>
        </div>
      </>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex w-56 flex-col fixed inset-y-0 bg-gray-900 border-r border-gray-800">
        <div className="p-4 border-b border-gray-800">
          <Brand />
        </div>
        <NavBody />
      </aside>

      {/* Top bar — mobile */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between gap-3
                         bg-gray-900 border-b border-gray-800 px-4 h-14">
        <Brand />
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Open admin menu"
          aria-expanded={drawerOpen}
          className="relative p-2 -mr-2 rounded-xl text-gray-300 hover:bg-white/5 hover:text-white transition-colors
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
        >
          <Menu size={22} />
          {totalPending > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center
                         bg-warning-500 text-gray-900 text-[10px] font-bold rounded-full px-1 tabular-nums"
            >
              {totalPending > 99 ? '99+' : totalPending}
            </span>
          )}
        </button>
      </header>

      {/* Drawer — mobile */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Admin menu"
            className="relative ml-auto w-72 max-w-[85vw] h-full flex flex-col bg-gray-900
                       border-l border-gray-800 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-3 p-4 border-b border-gray-800">
              <Brand />
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Close admin menu"
                className="p-2 -mr-2 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-colors
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
              >
                <X size={20} />
              </button>
            </div>
            <NavBody />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="md:ml-56">
        <main className="p-4 md:p-8 max-w-6xl mx-auto">
          <Outlet />
        </main>
      </div>

      <ToastContainer />
    </div>
  )
}
