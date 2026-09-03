// ============================================================
// StreetRise — Nearest transit stop for a listing
// ============================================================
//
// Answers one question on a listing page: **can I get here on public transit?**
//
// It reads static GTFS data loaded by migrations — stop coordinates, which
// routes call there, which days they run, and the weekday service window.
// There is no realtime feed behind this and no API key: a stop's location is a
// fact that changes on service-change dates, not by the minute, so it can be a
// plain table read.
//
// ── The negative is the valuable half ────────────────────────────
// "There is a stop 55 feet away on Route 8" is useful. "The nearest stop we
// know of is 11 miles away" is *more* useful, because it stops someone without
// a car setting out for a park they cannot reach.
//
// That negative is computed here at read time rather than stored on the
// resource, so it can never go stale against a feed that has moved on.
//
// ── Three ways this refuses to speak ─────────────────────────────
// 1. **Expired feed.** Every stop carries `feed_valid_until`. Past that date
//    the network described here may not be the one running, so the panel
//    renders nothing rather than last quarter's routes.
// 2. **No coverage.** A county is authoritative only after every agency we
//    intentionally model for that county has a feed loaded and registered in
//    AGENCIES_BY_COUNTY. Until then the UI stays silent rather than turning a
//    partial network into a claim that no closer transit exists.
// 3. **Naming the agency on the far case.** Where a stop IS found but is
//    distant, the copy names that operator. We are reporting the limit of the
//    feeds we hold, not asserting that no other operator exists.

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
  /** Identifies the loader run that wrote this row; see migration 042. */
  feed_fingerprint: string | null
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
  hart:              'HART',
  mcat:              'MCAT',
  mdt:               'Miami-Dade Transit',
  pasco:             'GoPasco',
  psta:              'PSTA',
  lynx:              'LYNX',
  hernando:          'TheBus',
  bct:               'Broward County Transit',
  citrus_connection: 'Citrus Connection',
  breeze:            'Breeze Transit',
  sunrail:           'SunRail',
  trirail:           'Tri-Rail',
}

/**
 * Counties we hold authoritative transit feeds for, and every agency that
 * should participate in the nearest-stop lookup there.
 *
 * This used to be `Record<string, string>` — one agency per county. That model
 * breaks as soon as systems overlap: Orange/Osceola can have LYNX plus SunRail,
 * and Miami-Dade/Broward can have local transit plus Tri-Rail. An array keeps
 * the county gate (which makes negative claims safe) without silently ignoring
 * a second operator.
 *
 * IMPORTANT: only add a new county/agency here in the same change that adds its
 * validated feed migration. A configured agency with no rows would make a
 * partial dataset look authoritative. Hernando is intentionally absent until
 * the county publishes a current GTFS archive; the county-hosted file checked
 * on 2026-09-03 expired in March and predates Routes 10 and 11.
 */
export const AGENCIES_BY_COUNTY: Record<string, string[]> = {
  hillsborough: ['hart'],
  manatee:      ['mcat'],
  sarasota:     ['breeze'],
  miami_dade:   ['mdt'],
  pasco:        ['pasco'],
  pinellas:     ['psta'],
  orange:       ['lynx'],
  osceola:      ['lynx'],
  seminole:     ['lynx'],
  broward:      ['bct'],
  polk:         ['citrus_connection'],
}

/** Within this, the stop is a normal walk — the standard quarter-mile rule. */
export const WALKABLE_KM = 0.4
/**
 * Outside this, treat the silence as "we hold no feed covering this address"
 * rather than "no transit". Wide enough to still reach outlying listings and
 * far short of the next metro in the current StreetRise markets.
 */
export const COVERAGE_RADIUS_KM = 40

/**
 * How far we trust a lookup for this address.
 *
 *  • `authoritative` — the listing's county has loaded feeds registered above,
 *    so both a nearby stop AND the absence of one are meaningful.
 *  • `partial` — we could not resolve the city to a county. Positive evidence
 *    still counts, but a distant-stop negative is suppressed.
 *  • `none` — the county is known and we hold no authoritative feed for it.
 */
export type CoverageLevel = 'authoritative' | 'partial' | 'none'

export interface Coverage {
  level: CoverageLevel
  /** Operators whose feeds are authoritative for this county. Null when the
   * city did not resolve, which intentionally means "search any loaded feed"
   * for positive evidence only. */
  agencies: string[] | null
}

export function coverageFor(city: string | null | undefined): Coverage {
  const county = countyForCity(city)
  if (!county) return { level: 'partial', agencies: null }
  const agencies = AGENCIES_BY_COUNTY[county]
  return agencies?.length
    ? { level: 'authoritative', agencies }
    : { level: 'none', agencies: null }
}

export type TransitLookup =
  /** A stop close enough to walk to. */
  | { kind: 'walkable'; stop: TransitStop; km: number; fareFreeRoutes: string[] }
  /** A stop exists but it is a hike — say so plainly, with the distance. */
  | { kind: 'distant'; stop: TransitStop; km: number; fareFreeRoutes: string[] }
  /** No agency data covers this address. Render nothing. */
  | { kind: 'no_coverage' }
  /** Every usable candidate came from an expired feed. Render nothing. */
  | { kind: 'stale_feed' }

/**
 * The single closest stop within the radius, chosen by the database.
 *
 * Migration 049 extends the original lookup to an agency ARRAY. Its SQL
 * prefers current feeds over expired ones before ordering by distance, so an
 * expired operator can never silence a still-current overlapping operator.
 */
async function nearestStop(
  origin: LatLng,
  radiusKm: number,
  agencies: string[] | null,
): Promise<TransitStop | null> {
  const { data, error } = await db.nearestTransitStopMulti(origin.lat, origin.lng, radiusKm, agencies)
  if (error) throw error
  const rows = (data ?? []) as TransitStop[]
  return rows[0] ?? null
}

/** True when the agency's published validity window has run out. */
export function isFeedExpired(stop: TransitStop, now: Date): boolean {
  if (!stop.feed_valid_until) return false
  return new Date(`${stop.feed_valid_until}T23:59:59`) < now
}

/**
 * Find the nearest known stop to a point.
 *
 * One query at the full coverage radius: the database returns the true nearest
 * row among the county's authoritative agencies. The radius distinguishes
 * "the nearest stop is far" from "we hold no data here".
 */
export async function lookupNearestStop(
  origin: LatLng,
  opts: { now?: Date; city?: string | null } = {},
): Promise<TransitLookup> {
  const now = opts.now ?? new Date()

  // A county we hold no feed for is answered without touching the network.
  const coverage = coverageFor(opts.city)
  if (coverage.level === 'none') return { kind: 'no_coverage' }

  // Scoped to every authoritative operator where the county is known;
  // unscoped only when the city did not resolve, because then any genuinely
  // walkable stop is still positive evidence regardless of who runs it.
  const stop = await nearestStop(origin, COVERAGE_RADIUS_KM, coverage.agencies)
  if (!stop) return { kind: 'no_coverage' }
  if (isFeedExpired(stop, now)) return { kind: 'stale_feed' }

  // The distance the UI SHOWS is measured here, with the same `geo.ts` helper
  // the map uses, so there is exactly one implementation a user-visible number
  // can come from. The copy of the formula inside SQL only decides which row
  // wins.
  const km = distanceKm(origin, { lat: stop.lat, lng: stop.lng })
  if (km > COVERAGE_RADIUS_KM) return { kind: 'no_coverage' }

  if (km <= WALKABLE_KM) {
    return { kind: 'walkable', stop, km, fareFreeRoutes: await fareFreeAmong(stop) }
  }
  // Everything below here is a claim about ABSENCE — "nothing closer than
  // this" — which only the authoritative case has standing to make.
  if (coverage.level !== 'authoritative') return { kind: 'no_coverage' }
  return { kind: 'distant', stop, km, fareFreeRoutes: await fareFreeAmong(stop) }
}

/** Which of a stop's routes are explicitly fare-free, by short name. */
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

/**
 * Which days this stop actually has service, as an i18n key.
 * Every one of the eight combinations gets its own answer because collapsing
 * any two can advertise service on a day that has none.
 */
export function serviceDaysKey(stop: TransitStop): string | null {
  const { serves_weekday: w, serves_saturday: sa, serves_sunday: su } = stop
  if (w && sa && su) return 'transit.days.everyDay'
  if (w && sa && !su) return 'transit.days.monSat'
  if (w && !sa && su) return 'transit.days.weekdaysAndSunday'
  if (w && !sa && !su) return 'transit.days.weekdaysOnly'
  if (!w && sa && su) return 'transit.days.weekendOnly'
  if (!w && sa && !su) return 'transit.days.saturdayOnly'
  if (!w && !sa && su) return 'transit.days.sundayOnly'
  return null
}

/**
 * Distance to a transit stop, in the units a person walking actually thinks
 * in. Under about a fifth of a mile this switches to feet, rounded to the
 * nearest ten so rooftop geocodes do not imply false precision.
 */
export function formatWalkDistance(km: number): string {
  if (kmToMiles(km) < 0.19) {
    const feet = Math.round((km * 1000) / 0.3048 / 10) * 10
    return `${feet} ft`
  }
  return formatDistance(km)
}
