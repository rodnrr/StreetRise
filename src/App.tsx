import { Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'

// Layouts
import RootLayout    from '@/components/shared/RootLayout'
import ProviderLayout from '@/components/provider/ProviderLayout'
import AdminLayout   from '@/components/admin/AdminLayout'

// Public pages (eagerly loaded for LCP)
import MapPage       from '@/pages/MapPage'
import HomePage      from '@/pages/HomePage'

// Lazy pages — split by route for smaller initial bundle
const ResourceDetailPage   = lazy(() => import('@/pages/ResourceDetailPage'))
const BookingPage          = lazy(() => import('@/pages/BookingPage'))
const WorkExchangePage     = lazy(() => import('@/pages/WorkExchangePage'))
const DonatePage           = lazy(() => import('@/pages/DonatePage'))
const FaqPage              = lazy(() => import('@/pages/FaqPage'))
const LoginPage            = lazy(() => import('@/pages/LoginPage'))
const NotFoundPage         = lazy(() => import('@/pages/NotFoundPage'))

// Provider portal
const ProviderDashboard    = lazy(() => import('@/pages/provider/ProviderDashboard'))
const ProviderListings     = lazy(() => import('@/pages/provider/ProviderListings'))
const ProviderListingEdit  = lazy(() => import('@/pages/provider/ProviderListingEdit'))
const ProviderBookings     = lazy(() => import('@/pages/provider/ProviderBookings'))
const ProviderWorkExchange = lazy(() => import('@/pages/provider/ProviderWorkExchange'))
const ProviderOnboarding   = lazy(() => import('@/pages/provider/ProviderOnboarding'))

// Admin
const AdminDashboard       = lazy(() => import('@/pages/admin/AdminDashboard'))
const AdminProviders       = lazy(() => import('@/pages/admin/AdminProviders'))
const AdminResources       = lazy(() => import('@/pages/admin/AdminResources'))
const AdminBookings        = lazy(() => import('@/pages/admin/AdminBookings'))
const AdminFaq             = lazy(() => import('@/pages/admin/AdminFaq'))

const Loading = () => (
  <div className="min-h-screen flex items-center justify-center bg-white">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-gray-500">Loading…</p>
    </div>
  </div>
)

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        {/* ── Public ── */}
        <Route element={<RootLayout />}>
          <Route index             element={<HomePage />} />
          <Route path="map"        element={<MapPage />} />
          <Route path="resources/:id" element={<ResourceDetailPage />} />
          <Route path="book/:resourceId" element={<BookingPage />} />
          <Route path="work"       element={<WorkExchangePage />} />
          <Route path="donate"     element={<DonatePage />} />
          <Route path="faq"        element={<FaqPage />} />
          <Route path="login"      element={<LoginPage />} />
          <Route path="404"        element={<NotFoundPage />} />
          <Route path="*"          element={<Navigate to="/404" replace />} />
        </Route>

        {/* ── Provider Portal ── */}
        <Route path="portal" element={<ProviderLayout />}>
          <Route index               element={<Navigate to="dashboard" replace />} />
          <Route path="onboarding"   element={<ProviderOnboarding />} />
          <Route path="dashboard"    element={<ProviderDashboard />} />
          <Route path="listings"     element={<ProviderListings />} />
          <Route path="listings/new" element={<ProviderListingEdit />} />
          <Route path="listings/:id" element={<ProviderListingEdit />} />
          <Route path="bookings"     element={<ProviderBookings />} />
          <Route path="work"         element={<ProviderWorkExchange />} />
        </Route>

        {/* ── Admin ── */}
        <Route path="admin" element={<AdminLayout />}>
          <Route index               element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard"    element={<AdminDashboard />} />
          <Route path="providers"    element={<AdminProviders />} />
          <Route path="resources"    element={<AdminResources />} />
          <Route path="bookings"     element={<AdminBookings />} />
          <Route path="faq"          element={<AdminFaq />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
