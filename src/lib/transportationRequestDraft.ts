import type { RideMode, RideWhen } from '@/lib/rideOptions'

/**
 * Trip context carried from /transportation into the request screen.
 *
 * Deliberately module-memory only: origin/destination searches and mobility
 * choices are not written to localStorage/sessionStorage or URL parameters.
 * A page refresh clears the draft; the request form can still be completed by
 * re-entering the trip. This is preferable to silently persisting sensitive
 * travel data before the visitor has chosen to submit it.
 */
export interface TransportationRequestDraft {
  destinationResourceId?: string | null
  originText?: string
  destinationText: string
  when: RideWhen
  modes: RideMode[]
  wheelchairRequired: boolean
}

let draft: TransportationRequestDraft | null = null

export function setTransportationRequestDraft(next: TransportationRequestDraft): void {
  draft = {
    ...next,
    modes: [...next.modes],
  }
}

export function getTransportationRequestDraft(): TransportationRequestDraft | null {
  if (!draft) return null
  return {
    ...draft,
    modes: [...draft.modes],
  }
}

export function clearTransportationRequestDraft(): void {
  draft = null
}
