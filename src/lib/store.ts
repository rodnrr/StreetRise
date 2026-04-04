import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MapFilters, ToastMessage } from '@/types'

// ── Map / Search State ──

interface MapState {
  userLocation:   { lat: number; lng: number } | null
  mapCenter:      { lat: number; lng: number }
  mapZoom:        number
  filters:        MapFilters
  selectedId:     string | null

  setUserLocation: (loc: { lat: number; lng: number } | null) => void
  setMapCenter:    (center: { lat: number; lng: number }) => void
  setMapZoom:      (zoom: number) => void
  setFilters:      (filters: Partial<MapFilters>) => void
  clearFilters:    () => void
  setSelectedId:   (id: string | null) => void
}

export const useMapStore = create<MapState>()(
  persist(
    (set) => ({
      userLocation: null,
      mapCenter:    { lat: 34.0522, lng: -118.2437 }, // Default: LA
      mapZoom:      13,
      filters:      {},
      selectedId:   null,

      setUserLocation: (loc)    => set({ userLocation: loc, mapCenter: loc ?? undefined }),
      setMapCenter:    (center) => set({ mapCenter: center }),
      setMapZoom:      (zoom)   => set({ mapZoom: zoom }),
      setFilters:      (f)      => set((s) => ({ filters: { ...s.filters, ...f } })),
      clearFilters:    ()       => set({ filters: {} }),
      setSelectedId:   (id)     => set({ selectedId: id }),
    }),
    {
      name: 'streetrise-map',
      partialize: (s) => ({ mapCenter: s.mapCenter, mapZoom: s.mapZoom, filters: s.filters }),
    }
  )
)

// ── Auth / User State ──

interface AuthState {
  userId:         string | null
  userEmail:      string | null
  role:           'guest' | 'provider' | 'admin' | 'super_admin'
  providerId:     string | null
  isLoading:      boolean

  setAuth: (auth: {
    userId: string; userEmail: string;
    role: AuthState['role']; providerId?: string
  }) => void
  clearAuth: () => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      userId:    null,
      userEmail: null,
      role:      'guest',
      providerId: null,
      isLoading: false,

      setAuth: ({ userId, userEmail, role, providerId = null }) =>
        set({ userId, userEmail, role, providerId, isLoading: false }),
      clearAuth: () =>
        set({ userId: null, userEmail: null, role: 'guest', providerId: null }),
      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'streetrise-auth',
      partialize: (s) => ({
        userId: s.userId, userEmail: s.userEmail, role: s.role, providerId: s.providerId
      }),
    }
  )
)

// ── Toast / Notification State ──

interface ToastState {
  toasts: ToastMessage[]
  addToast:    (toast: Omit<ToastMessage, 'id'>) => void
  removeToast: (id: string) => void
}

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],

  addToast: (toast) => {
    const id = crypto.randomUUID()
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }))
    // Auto-remove after duration (default 4s)
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, toast.duration ?? 4000)
  },

  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

// Convenience hook
export function useToast() {
  const { addToast } = useToastStore()
  return {
    success: (title: string, message?: string) => addToast({ type: 'success', title, message }),
    error:   (title: string, message?: string) => addToast({ type: 'error',   title, message }),
    warning: (title: string, message?: string) => addToast({ type: 'warning', title, message }),
    info:    (title: string, message?: string) => addToast({ type: 'info',    title, message }),
  }
}
