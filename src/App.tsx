import { Routes, Route, Navigate } from 'react-router-dom'
import { Suspense } from 'react'
import { lazyWithReload as lazy } from '@/lib/lazyWithReload'

// Layouts
import RootLayout    from '@/components/shared/RootLayout'
import ProviderLayout from '@/components/provider/ProviderLayout'
import AdminLayout   from '@/components/admin/AdminLayout'

// HomePage is the only eagerly loaded page (LCP critical path)
import HomePage      from '@/pages/HomePage'

// Lazy pages — split by route for smaller initial bundle
const MapPage              = lazy(() => import('@/pages/MapPage'))
const ResourceDetailPage   = lazy(() => import('@/pages/ResourceDetailPage'))
const BookingPage          = lazy(() => import('@/pages/BookingPage'))
const WorkExchangePage     = lazy(() => import('@/pages/WorkExchangePage'))
const DonatePage           = lazy(() => import('@/pages/DonatePage'))
const FaqPage              = lazy(() => import('@/pages/FaqPage'))
const LoginPage            = lazy(() => import('@/pages/LoginPage'))
const ForgotPasswordPage   = lazy(() => import('@/pages/ForgotPasswordPage'))
const ResetPasswordPage    = lazy(() => import('@/pages/ResetPasswordPage'))
const AuthCallbackPage     = lazy(() => import('@/pages/AuthCallbackPage'))
const NotFoundPage         = lazy(() => import('@/pages/NotFoundPage'))

// Marketing pages
const AboutPage            = lazy(() => import('@/pages/marketing/AboutPage'))
const ContactPage          = lazy(() => import('@/pages/marketing/ContactPage'))
const PartnersPage         = lazy(() => import('@/pages/marketing/PartnersPage'))
const PrivacyPage          = lazy(() => import('@/pages/marketing/PrivacyPage'))
const TermsPage            = lazy(() => import('@/pages/marketing/TermsPage'))
const AccessibilityPage    = lazy(() => import('@/pages/marketing/AccessibilityPage'))
const CommunityVoicesPage  = lazy(() => import('@/pages/marketing/CommunityVoicesPage'))

// Blog
const BlogIndexPage        = lazy(() => import('@/pages/blog/BlogIndexPage'))
const BlogPostPage         = lazy(() => import('@/pages/blog/BlogPostPage'))

// Category pages — all share one component, parameterized via categories.ts
const CategoryPage         = lazy(() => import('@/pages/categories/CategoryPage'))

// Provider claim flow (migrations 023–027 + 033)
const ClaimIndexPage       = lazy(() => import('@/pages/claim/ClaimIndexPage'))
const ClaimDetailPage      = lazy(() => import('@/pages/claim/ClaimDetailPage'))

// Provider portal
const ProviderDashboard    = lazy(() => import('@/pages/provider/ProviderDashboard'))
const ProviderListings     = lazy(() => import('@/pages/provider/ProviderListings'))
const ProviderListingEdit  = lazy(() => import('@/pages/provider/ProviderListingEdit'))
const ProviderBookings     = lazy(() => import('@/pages/provider/ProviderBookings'))
const ProviderChat         = lazy(() => import('@/pages/provider/ProviderChat'))
const ProviderWorkExchange = lazy(() => import('@/pages/provider/ProviderWorkExchange'))
const WorkExchangeEdit     = lazy(() => import('@/pages/provider/WorkExchangeEdit'))
const ProviderOnboarding   = lazy(() => import('@/pages/provider/ProviderOnboarding'))
const ProviderLandingPage  = lazy(() => import('@/pages/ProviderLandingPage'))

// Admin
const AdminDashboard       = lazy(() => import('@/pages/admin/AdminDashboard'))
const AdminProviders       = lazy(() => import('@/pages/admin/AdminProviders'))
const AdminProviderEdit    = lazy(() => import('@/pages/admin/AdminProviderEdit'))
const AdminResources       = lazy(() => import('@/pages/admin/AdminResources'))
const AdminResourceEdit    = lazy(() => import('@/pages/admin/AdminResourceEdit'))
const AdminResourceCreate  = lazy(() => import('@/pages/admin/AdminResourceCreate'))
const AdminBookings        = lazy(() => import('@/pages/admin/AdminBookings'))
const AdminWorkExchange    = lazy(() => import('@/pages/admin/AdminWorkExchange'))
const AdminChat            = lazy(() => import('@/pages/admin/AdminChat'))
const AdminFaq             = lazy(() => import('@/pages/admin/AdminFaq'))
const AdminBlog            = lazy(() => import('@/pages/admin/AdminBlog'))

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
          <Route path="login"              element={<LoginPage />} />
          <Route path="forgot-password"    element={<ForgotPasswordPage />} />
          <Route path="reset-password"     element={<ResetPasswordPage />} />
          <Route path="auth/callback"      element={<AuthCallbackPage />} />
          <Route path="provider/onboarding" element={<ProviderLandingPage />} />
          <Route path="claim"      element={<ClaimIndexPage />} />
          <Route path="claim/:id"  element={<ClaimDetailPage />} />

          {/* Marketing */}
          <Route path="about"          element={<AboutPage />} />
          <Route path="contact"        element={<ContactPage />} />
          <Route path="partner-with-us" element={<PartnersPage />} />
          <Route path="privacy"        element={<PrivacyPage />} />
          <Route path="terms"          element={<TermsPage />} />
          <Route path="accessibility"  element={<AccessibilityPage />} />
          <Route path="community-voices" element={<CommunityVoicesPage />} />

          {/* Blog */}
          <Route path="blog"           element={<BlogIndexPage />} />
          <Route path="blog/:slug"     element={<BlogPostPage />} />

          {/* Category pages — presentation-only aliases over existing /map filters,
              see src/lib/categories.ts for the slug → filter mapping. */}
          <Route path="food-pantries" element={<CategoryPage slug="food-pantries" />} />
          <Route path="shelters"      element={<CategoryPage slug="shelters" />} />
          <Route path="medical"       element={<CategoryPage slug="medical" />} />
          <Route path="employment"    element={<CategoryPage slug="employment" />} />
          <Route path="hygiene"       element={<CategoryPage slug="hygiene" />} />
          <Route path="showers"       element={<CategoryPage slug="showers" />} />
          <Route path="legal"         element={<CategoryPage slug="legal" />} />
          <Route path="veterans"      element={<CategoryPage slug="veterans" />} />
          <Route path="youth"         element={<CategoryPage slug="youth" />} />
          <Route path="students"      element={<CategoryPage slug="students" />} />
          <Route path="families"      element={<CategoryPage slug="families" />} />

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
          <Route path="messages"     element={<ProviderChat />} />
          <Route path="work"         element={<ProviderWorkExchange />} />
          <Route path="work/new"     element={<WorkExchangeEdit />} />
          <Route path="work/:id"     element={<WorkExchangeEdit />} />
        </Route>

        {/* ── Admin ── */}
        <Route path="admin" element={<AdminLayout />}>
          <Route index               element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard"        element={<AdminDashboard />} />
          <Route path="providers"        element={<AdminProviders />} />
          <Route path="providers/:id"    element={<AdminProviderEdit />} />
          <Route path="resources"        element={<AdminResources />} />
          <Route path="resources/new"    element={<AdminResourceCreate />} />
          <Route path="resources/:id"    element={<AdminResourceEdit />} />
          <Route path="bookings"         element={<AdminBookings />} />
          <Route path="work-exchange"    element={<AdminWorkExchange />} />
          <Route path="messages"         element={<AdminChat />} />
          <Route path="faq"              element={<AdminFaq />} />
          <Route path="blog"             element={<AdminBlog />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
