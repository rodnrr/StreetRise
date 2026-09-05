import type { RideMode, RideWhen } from '@/lib/rideOptions'
import type { LatLng } from '@/lib/geo'

/**
 * Trip context carried from /transportation into the request screen.
 *
 * Deliberately module-memory only: origin/destination searches, device
 * coordinates and mobility choices are not written to localStorage,
 * sessionStorage or URL parameters. A device location therefore disappears on
 * refresh unless the visitor explicitly submits it from the request form.
 */
export interface TransportationRequestDraft {
  destinationResourceId?: string | null
  originText?: string
  /**
   * Browser geolocation selected in the finder. Memory-only until the request
   * form explicitly asks whether to include it in the submitted request.
   */
  originCoordinate?: LatLng | null
  destinationText: string
  when: RideWhen
  modes: RideMode[]
  wheelchairRequired: boolean
}

let draft: TransportationRequestDraft | null = null

export function setTransportationRequestDraft(next: TransportationRequestDraft): void {
  draft = {
    ...next,
    originCoordinate: next.originCoordinate ? { ...next.originCoordinate } : null,
    modes: [...next.modes],
  }
}

export function getTransportationRequestDraft(): TransportationRequestDraft | null {
  if (!draft) return null
  return {
    ...draft,
    originCoordinate: draft.originCoordinate ? { ...draft.originCoordinate } : null,
    modes: [...draft.modes],
  }
}

export function clearTransportationRequestDraft(): void {
  draft = null
}
