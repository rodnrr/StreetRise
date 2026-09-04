// ============================================================
// StreetRise — "Get There" travel modes and map hand-off links
// ============================================================
//
// Finding a shelter, pantry or clinic is only half the problem if the person
// cannot physically get to it. This module is the small, dependency-free half
// of the answer: it turns a resource into deep links that open the visitor's
// own map app with directions already filled in.
//
// What this deliberately is NOT
// -----------------------------
// There is no routing backend here, and no attempt at one. StreetRise does not
// compute a bus itinerary, quote a fare, or promise a trip time — it hands the
// trip to Google Maps / Apple Maps, which already know the timetable. Inventing
// "47 minutes via Route 18" from data we do not have would be exactly the kind
// of confident-but-unfounded claim the rest of the codebase refuses to make.
//
// The two modes that are NOT map links — ride assistance and accessible
// transportation — route into /transportation instead, which matches the
// person against real fare-assistance and paratransit programs. See
// `src/lib/rideOptions.ts`.

import type { LatLng } from '@/lib/geo'
import type { Resource } from '@/types'

/** The four modes a consumer map app can actually route. */
export type TravelMode = 'transit' | 'walking' | 'bicycling' | 'driving'

export interface TravelModeDef {
  mode: TravelMode
  icon: string
  labelKey: string
  /** Apple Maps `dirflg` value, or null where Apple Maps has no equivalent. */
  appleFlag: string | null
}

export const TRAVEL_MODES: TravelModeDef[] = [
  { mode: 'transit',   icon: '🚌', labelKey: 'getThere.mode.transit',   appleFlag: 'r' },
  { mode: 'walking',   icon: '🚶', labelKey: 'getThere.mode.walking',   appleFlag: 'w' },
  // Apple Maps has cycling directions in the app but no documented URL flag,
  // so a bicycle link would silently fall back to driving. Google Maps it is.
  { mode: 'bicycling', icon: '🚲', labelKey: 'getThere.mode.bicycling', appleFlag: null },
  { mode: 'driving',   icon: '🚗', labelKey: 'getThere.mode.driving',   appleFlag: 'd' },
]

/**
 * The destination string a map app should route to.
 *
 * Coordinates win over the postal address when we have them: they are what the
 * map already dropped a pin on, so the directions land on the same spot the
 * visitor tapped rather than wherever the geocoder in someone else's app
 * decides the street number is. Falls back to the address, and returns null
 * when there is neither — a link that cannot route is worse than no link.
 */
export function destinationParam(r: Resource): string | null {
  if (r.lat != null && r.lng != null) return `${r.lat},${r.lng}`
  const dest = [r.address?.street, r.address?.city, r.address?.state, r.address?.zip]
    .filter(Boolean)
    .join(', ')
  return dest || null
}

/**
 * Whether it is honest to offer turn-by-turn directions to this listing at all.
 *
 * `confidential_address` and `phone_intake` listings store an address that is
 * not where the service reaches the public — a DV shelter's mailing address, a
 * district office, a mobile unit's base. Routing someone there sends them to a
 * door that cannot help them, and for DV listings it is a safety problem.
 * Mirrors the existing gate in ResourceSheet.
 */
/**
 * Access types whose stored address is not somewhere the public may turn up.
 *
 * One list, used for BOTH hiding the address and suppressing directions, so
 * the two cannot drift apart. `web_intake` is included: an online-intake
 * programme may well keep its office coordinates, and offering turn-by-turn
 * directions to a back office that does not receive visitors is a wasted trip.
 */
export const NON_WALK_IN_ACCESS: readonly string[] = [
  'confidential_address',
  'phone_intake',
  'web_intake',
]

// `not_map_ready` is deliberately NOT in that list. It means "the pin has not
// been confirmed yet" — migration 017 uses it for real walk-in locations
// imported with city-centroid coordinates, pending someone checking the
// address. Those places have a front door and people can go to them. Treating
// the flag as "no public location" would hide a genuine address and suppress
// directions to a shelter that is expecting visitors, which is the opposite of
// what the flag is for.

export function isNonWalkIn(r: Pick<Resource, 'access_type'>): boolean {
  return NON_WALK_IN_ACCESS.includes(r.access_type)
}

export function canRouteTo(r: Resource): boolean {
  if (isNonWalkIn(r)) return false
  return destinationParam(r) !== null
}

/**
 * Where the trip starts: coordinates from the browser, an address someone
 * typed, or nothing at all.
 *
 * "Nothing at all" is a first-class answer, not a missing value — omitting the
 * origin lets the map app use the device's own live location, which is both
 * more accurate than a cached coordinate and less of an over-share.
 */
export type TripOrigin = LatLng | string | null | undefined

function originParam(origin: TripOrigin): string | null {
  if (!origin) return null
  if (typeof origin === 'string') {
    const trimmed = origin.trim()
    return trimmed || null
  }
  return `${origin.lat},${origin.lng}`
}

/**
 * Google Maps universal directions link for an arbitrary destination string.
 * Works on the web and opens the native app on both mobile platforms, which is
 * why it is the default for every mode.
 *
 * `origin` is optional on purpose: omitting it lets the map app use the
 * device's own live location, which is both more accurate and less of an
 * over-share than pushing a coordinate we happen to have cached.
 *
 * The destination is a free string rather than a Resource because the Ride
 * Assistance Finder also has to route to a place someone typed in, which is
 * not a listing at all.
 */
export function googleMapsUrl(
  destination: string,
  mode: TravelMode,
  origin?: TripOrigin,
): string {
  const params = new URLSearchParams({ api: '1', destination, travelmode: mode })
  const from = originParam(origin)
  if (from) params.set('origin', from)
  return `https://www.google.com/maps/dir/?${params.toString()}`
}

/** Apple Maps directions link, for the platform where it is the default app. */
export function appleMapsUrl(
  destination: string,
  mode: TravelMode,
  origin?: TripOrigin,
): string {
  const def = TRAVEL_MODES.find((m) => m.mode === mode)
  const params = new URLSearchParams({ daddr: destination })
  if (def?.appleFlag) params.set('dirflg', def.appleFlag)
  const from = originParam(origin)
  if (from) params.set('saddr', from)
  return `https://maps.apple.com/?${params.toString()}`
}

/** Resource-shaped convenience wrappers. Null when the listing cannot be routed to. */
export function googleMapsDirectionsUrl(
  r: Resource,
  mode: TravelMode,
  origin?: TripOrigin,
): string | null {
  const destination = destinationParam(r)
  return destination ? googleMapsUrl(destination, mode, origin) : null
}

export function appleMapsDirectionsUrl(
  r: Resource,
  mode: TravelMode,
  origin?: TripOrigin,
): string | null {
  const destination = destinationParam(r)
  return destination ? appleMapsUrl(destination, mode, origin) : null
}

/**
 * Rough "is this an Apple device" test, used only to offer an extra link.
 *
 * User-agent sniffing is unreliable by nature, so nothing depends on getting
 * this right: a wrong answer costs the visitor one unused link, never a
 * missing one. iPadOS reports itself as a Mac, hence the touch-points check.
 */
export function prefersAppleMaps(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/i.test(ua)) return true
  return /Macintosh/i.test(ua) && navigator.maxTouchPoints > 1
}
