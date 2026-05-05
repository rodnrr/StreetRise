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
      mapCenter:    { lat: 27.9506, lng: -82.4572 }, // Default: Tampa Bay, FL
      mapZoom:      12,
      filters:      {},
      selectedId:   null,
      setUserLocation: (loc)    => set({ userLocation: loc, mapCenter: loc ?? { lat: 27.9506, lng: -82.4572 } }),
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
      setSelectedId:   (id)     => set({ selectedId: id }),
    }),
    {
      name: 'streetrise-map-v2', // bumped version to bust cached LA coordinates
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
