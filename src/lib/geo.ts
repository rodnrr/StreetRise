// ============================================================
// StreetRise — Distance helpers
// ============================================================
//
// The map sorts and filters by distance in the browser, so these run on every
// resource on every keystroke. They are deliberately plain arithmetic — no
// dependencies, no allocation per call.

export interface LatLng {
  lat: number
  lng: number
}

const EARTH_RADIUS_KM = 6371
const KM_PER_MILE = 1.609344

/** Great-circle distance in kilometres. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}

export function kmToMiles(km: number): number {
  return km / KM_PER_MILE
}

export function milesToKm(miles: number): number {
  return miles * KM_PER_MILE
}

/**
 * Human distance label. Below a tenth of a mile we stop quoting a figure
 * rather than invent precision the geocode does not have — most addresses are
 * rooftop, but some are only street-centroid.
 */
export function formatDistance(km: number): string {
  const miles = kmToMiles(km)
  if (miles < 0.1) return '< 0.1 mi'
  if (miles < 10) return `${miles.toFixed(1)} mi`
  return `${Math.round(miles)} mi`
}
