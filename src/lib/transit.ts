// ============================================================
// StreetRise — Nearest transit stop for a listing
// ============================================================
//
// Answers one question on a listing page: **can I get here on the bus?**
//
// It reads the static GTFS data loaded by migrations 042/043 — stop
// coordinates, which routes call there, which days they run, and the weekday
// service window. There is no realtime feed behind this and no API key: a bus
// stop's location is a fact that changes on service-change dates, not by the
// minute, so it can be a plain table read.
//
// ── The negative is the valuable half ────────────────────────────
// "There is a stop 55 feet away on Route 8" is useful. "The nearest stop we
// know of is 11 miles away" is *more* useful, because it stops someone without
// a car setting out for a park they cannot reach. Four listings on live are in
// exactly that position and nothing in the app could say so before.
//
// That negative is computed here at read time rather than stored on the
// resource, so it can never go stale against a feed that has moved on.
//
// ── Three ways this refuses to speak ─────────────────────────────
// 1. **Expired feed.** Every stop carries `feed_valid_until` from the agency's
//    own `feed_info.txt`. Past that date the network described here may not be
//    the one running, so the panel renders nothing rather than last quarter's
//    routes. Same instinct as the map's "Open right now" filter failing closed.
// 2. **No coverage.** StreetRise holds HART's feed, which is Hillsborough
//    only. A St. Petersburg listing is served by PSTA and an Orlando listing
//    by LYNX, and this table knows about neither. If nothing at all turns up
//    inside `COVERAGE_RADIUS_KM`, that is read as "we have no agency data
//    here" and nothing is rendered — never as "no bus".
// 3. **Naming the agency on the far case.** Where a stop IS found but is
//    distant, the copy says "nearest HART stop", not "nearest bus stop". We
//    are reporting the limit of what we hold, not asserting that no other
//    operator serves the address.

import { db } from '@/lib/supabase'
import { countyForCity } from '@/lib/rideOptions'
import { distanceKm, formatDistance, kmToMiles, type LatLng } from '@/lib/geo'

export interface TransitStop {
  id: string
  agency: string
  stop_id: string
  stop_code: string | null
  stop_name: string
  lat: number
  lng: number
  route_short_names: string[]
  route_ids: string[]
  serves_weekday: boolean
  serves_saturday: boolean
  serves_sunday: boolean
  weekday_first: string | null
  weekday_last: string | null
  feed_version: string | null
  feed_valid_until: string | null
}

export interface TransitRoute {
  id: string
  agency: string
  route_id: string
  short_name: string | null
  long_name: string | null
  fare_price: number | null
  fare_currency: string | null
  is_fare_free: boolean
}

/** Public brand name for an agency slug, as the agency itself writes it. */
export const AGENCY_LABEL: Record<string, string> = {
  hart:  'HART',
  mcat:  'MCAT',
  mdt:   'Miami-Dade Transit',
  pasco: 'GoPasco',
}

/**
 * Counties we hold a transit feed for, and which agency covers each.
 *
 * This is the gate that keeps the nearest-stop line honest as more feeds land.
 * Distance alone is not enough: GoPasco's service area borders Pinellas, so a
 * Tarpon Springs listing can sit a couple of kilometres from a GoPasco stop
 * while being served all day by PSTA, whose feed we do not hold. Saying
 * "nearest stop: GoPasco, 2 km" there is not false, but it is a partial answer
 * dressed as a complete one.
 *
 * Florida's other big systems — PSTA in Pinellas, LYNX in Orange/Osceola/
 * Seminole, Broward County Transit — are NOT loaded. Addresses in their
 * counties get silence, which is the honest answer, and this map is what makes
 * that distinguishable from "no bus".
 */
export const AGENCY_BY_COUNTY: Record<string, string> = {
  hillsborough: 'hart',
  manatee:      'mcat',
  miami_dade:   'mdt',
  pasco:        'pasco',
}

/** Within this, the stop is a normal walk — the standard quarter-mile rule. */
export const WALKABLE_KM = 0.4
/** Beyond WALKABLE_KM but still a reasonable walk for someone with no option. */
export const NEARBY_KM = 1.2
/**
 * Outside this, treat the silence as "we hold no feed covering this address"
 * rather than "no bus". Wide enough to still reach the outlying Hillsborough
 * listings (the furthest is ~18 km from a HART stop) and far short of the next
 * metro, so a Miami or Orlando listing correctly finds nothing.
 */
export const COVERAGE_RADIUS_KM = 40

/**
 * How far we trust a lookup for this address.
 *
 *  • `authoritative` — the listing's county has a loaded feed, so both a
 *    nearby stop AND the absence of one are meaningful.
 *  • `partial` — we could not resolve the city to a county (a town missing
 *    from COUNTY_BY_CITY). Positive evidence still counts: a stop 80 m away is
 *    a fact whatever county we think it is in. But the "nearest stop is 8 miles
 *    away" line is suppressed, because that one implies an absence we cannot
 *    vouch for.
 *  • `none` — the county is known and we hold no feed for it. Say nothing.
 */
export type CoverageLevel = 'authoritative' | 'partial' | 'none'

export function coverageFor(city: string | null | undefined): CoverageLevel {
  const county = countyForCity(city)
  if (!county) return 'partial'
  return AGENCY_BY_COUNTY[county] ? 'authoritative' : 'none'
}

export type TransitLookup =
  /** A stop close enough to walk to. */
  | { kind: 'walkable'; stop: TransitStop; km: number; fareFreeRoutes: string[] }
  /** A stop exists but it is a hike — say so plainly, with the distance. */
  | { kind: 'distant'; stop: TransitStop; km: number; fareFreeRoutes: string[] }
  /** No agency data covers this address. Render nothing. */
  | { kind: 'no_coverage' }
  /** The feed we hold has expired. Render nothing. */
  | { kind: 'stale_feed' }

/**
 * Degrees of latitude/longitude for a radius in km, used to build the
 * bounding box the query scans. Longitude degrees shrink towards the poles,
 * so the box is widened by 1/cos(lat) — at Tampa's latitude that is about
 * 13%. Both axes are then padded by 20% so the box can never clip a stop the
 * exact great-circle test would have accepted.
 */
function boundingBox(origin: LatLng, radiusKm: number) {
  const latDeg = (radiusKm / 111.32) * 1.2
  const lngDeg = latDeg / Math.max(Math.cos((origin.lat * Math.PI) / 180), 0.1)
  return {
    minLat: origin.lat - latDeg, maxLat: origin.lat + latDeg,
    minLng: origin.lng - lngDeg, maxLng: origin.lng + lngDeg,
  }
}

async function stopsInBox(origin: LatLng, radiusKm: number): Promise<TransitStop[]> {
  const b = boundingBox(origin, radiusKm)
  const { data, error } = await db.transit_stops()
    .select('*')
    .gte('lat', b.minLat).lte('lat', b.maxLat)
    .gte('lng', b.minLng).lte('lng', b.maxLng)
    .limit(500)
  if (error) throw error
  return (data ?? []) as TransitStop[]
}

function nearest(origin: LatLng, stops: TransitStop[]): { stop: TransitStop; km: number } | null {
  let best: { stop: TransitStop; km: number } | null = null
  for (const stop of stops) {
    const km = distanceKm(origin, { lat: stop.lat, lng: stop.lng })
    if (!best || km < best.km) best = { stop, km }
  }
  return best
}

/** True when the agency's published validity window has run out. */
export function isFeedExpired(stop: TransitStop, now: Date): boolean {
  if (!stop.feed_valid_until) return false
  return new Date(`${stop.feed_valid_until}T23:59:59`) < now
}

/**
 * Find the nearest known stop to a point.
 *
 * Runs the tight box first because that is the answer in the overwhelming
 * majority of cases and keeps the scan to a handful of rows. Only when that
 * comes back empty does it widen — the wide query exists to distinguish "the
 * nearest stop is far" from "we have no data here", which are very different
 * things to tell someone.
 */
export async function lookupNearestStop(
  origin: LatLng,
  opts: { now?: Date; city?: string | null } = {},
): Promise<TransitLookup> {
  const now = opts.now ?? new Date()

  // A county we hold no feed for is answered without touching the network.
  const coverage = coverageFor(opts.city)
  if (coverage === 'none') return { kind: 'no_coverage' }

  let found = nearest(origin, await stopsInBox(origin, NEARBY_KM))
  if (!found) found = nearest(origin, await stopsInBox(origin, COVERAGE_RADIUS_KM))
  if (!found || found.km > COVERAGE_RADIUS_KM) return { kind: 'no_coverage' }
  if (isFeedExpired(found.stop, now)) return { kind: 'stale_feed' }

  if (found.km <= WALKABLE_KM) {
    const fareFreeRoutes = await fareFreeAmong(found.stop)
    return { kind: 'walkable', stop: found.stop, km: found.km, fareFreeRoutes }
  }
  // Everything below here is a claim about ABSENCE — "nothing closer than
  // this" — which only the authoritative case has standing to make.
  if (coverage !== 'authoritative') return { kind: 'no_coverage' }
  const fareFreeRoutes = await fareFreeAmong(found.stop)
  return { kind: 'distant', stop: found.stop, km: found.km, fareFreeRoutes }
}

/**
 * Which of a stop's routes are fare-free, by short name.
 *
 * Worth a query of its own because the answer is genuinely useful and
 * genuinely surprising: HART's own fare data prices the TECO Line Streetcar
 * and the airport SkyConnect at $0.00. Someone with no money in downtown
 * Tampa can ride between downtown, Channelside and Ybor for nothing, and the
 * app has never said so.
 *
 * Only an explicit 0.00 in the feed sets `is_fare_free`; a route the feed
 * prices at NULL is unknown, not free, and never appears here.
 */
async function fareFreeAmong(stop: TransitStop): Promise<string[]> {
  if (stop.route_ids.length === 0) return []
  const ids = stop.route_ids.map((r) => `${stop.agency}:${r}`)
  const { data, error } = await db.transit_routes()
    .select('id, short_name, is_fare_free')
    .in('id', ids)
    .eq('is_fare_free', true)
  if (error) return []
  return ((data ?? []) as Pick<TransitRoute, 'short_name'>[])
    .map((r) => r.short_name)
    .filter((n): n is string => !!n)
}

/** "Mon–Sun", "Mon–Sat", "Weekdays only" — or null when the feed says nothing. */
export function serviceDaysKey(stop: TransitStop): string | null {
  const { serves_weekday: w, serves_saturday: sa, serves_sunday: su } = stop
  if (w && sa && su) return 'transit.days.everyDay'
  if (w && sa) return 'transit.days.monSat'
  if (w && !sa && !su) return 'transit.days.weekdaysOnly'
  if (!w && (sa || su)) return 'transit.days.weekendOnly'
  if (w && su && !sa) return 'transit.days.weekdaysAndSunday'
  return null
}

/**
 * Distance to a bus stop, in the units a person walking actually thinks in.
 *
 * `formatDistance` is built for the map, where anything under a tenth of a
 * mile is "< 0.1 mi" — deliberately vague, because a rooftop geocode does not
 * justify more precision at that scale. That is exactly wrong here: the whole
 * point of "the stop is 55 ft away" is that it is trivially close, and
 * "< 0.1 mi" throws that away. Under about a fifth of a mile this switches to
 * feet, rounded to the nearest ten so it still does not over-claim.
 */
export function formatWalkDistance(km: number): string {
  if (kmToMiles(km) < 0.19) {
    const feet = Math.round((km * 1000) / 0.3048 / 10) * 10
    return `${feet} ft`
  }
  return formatDistance(km)
}
