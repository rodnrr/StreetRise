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
  /** Clear every refinement but keep the active need chip. */
  clearRefinements: () => void
  setSelectedId:   (id: string | null) => void
}

export const useMapStore = create<MapState>()(
  persist(
    (set) => ({
      userLocation: null,
      mapCenter:    { lat: 28.2, lng: -81.9 }, // Default: Tampa Bay area
      mapZoom:      9,
      filters:      {},
      selectedId:   null,
      setUserLocation: (loc)    => set({ userLocation: loc, mapCenter: loc ?? { lat: 28.2, lng: -81.9 } }),
      setMapCenter:    (center) => set({ mapCenter: center }),
      setMapZoom:      (zoom)   => set({ mapZoom: zoom }),
      setFilters: (f) => set((s) => {
        const next = { ...s.filters }
        for (const key of Object.keys(f) as Array<keyof MapFilters>) {
          if (f[key] === undefined) delete next[key]
          else next[key] = f[key] as never
        }
        return { filters: next }
      }),
      clearFilters:    ()       => set({ filters: {} }),
      clearRefinements: () => set((s) => ({
        filters: {
          need:         s.filters.need,
          category:     s.filters.category,
          quickFilter:  s.filters.quickFilter,
        },
      })),
      setSelectedId:   (id)     => set({ selectedId: id }),
    }),
    {
      // v4: MapFilters gained `need`; radius no longer defaults to 20 km, so a
      // persisted v3 filter set would silently keep narrowing the new map.
      name: 'streetrise-map-v4',
      partialize: (s) => ({ mapCenter: s.mapCenter, mapZoom: s.mapZoom, filters: s.filters }),
    }
  )
)

// ── Auth / User State ──
interface AuthState {
  userId:             string | null
  userEmail:          string | null
  role:               'guest' | 'provider' | 'admin' | 'super_admin'
  providerId:         string | null
  verificationStatus: 'pending' | 'verified' | 'rejected' | 'suspended' | null
  isLoading:          boolean
  setAuth: (auth: {
    userId: string; userEmail: string;
    role: AuthState['role']; providerId?: string
    verificationStatus?: AuthState['verificationStatus']
  }) => void
  clearAuth: () => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      userId:             null,
      userEmail:          null,
      role:               'guest',
      providerId:         null,
      verificationStatus: null,
      isLoading:          false,
      setAuth: ({ userId, userEmail, role, providerId = null, verificationStatus = null }) =>
        set({ userId, userEmail, role, providerId, verificationStatus, isLoading: false }),
      clearAuth: () =>
        set({ userId: null, userEmail: null, role: 'guest', providerId: null, verificationStatus: null }),
      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'streetrise-auth',
      partialize: (s) => ({
        userId: s.userId, userEmail: s.userEmail, role: s.role,
        providerId: s.providerId, verificationStatus: s.verificationStatus,
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
