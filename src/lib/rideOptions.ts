// ============================================================
// StreetRise — Ride Assistance Finder: deterministic matching
// ============================================================
//
// Someone taps "I need a ride", answers four or five plain questions, and gets
// back the transportation-assistance programs that could actually cover the
// trip — instead of a list of phone numbers to work through themselves.
//
// The house rules this engine follows
// -----------------------------------
// 1. **Nothing is invented.** Every reason and caution below is assembled from
//    a field already stored on the resource. A rule with nothing to say stays
//    silent rather than guessing, exactly as `resourceFaq.ts` does.
// 2. **No route planning.** StreetRise does not compute itineraries or quote
//    fares — `transport.ts` hands the trip to a real map app. What this file
//    matches is *eligibility for help paying for or providing* the trip.
// 3. **Unknown means "maybe", not "no".** A program that records no service
//    area, no mode, or no eligibility rule is never excluded on that basis; it
//    ranks lower and says what it does not know. The one thing that fails
//    closed is an *explicit* mismatch — a Pinellas-only program for a trip to
//    Miami goes into its own "other areas" bucket rather than the main list.
// 4. **Qualification is never asserted.** The strongest claim here is "you may
//    qualify" plus the requirement the program publishes. Only the agency can
//    say yes.
//
// Privacy
// -------
// The eligibility answers (income, disability, Medicaid, veteran status) are
// the most sensitive things anyone types into StreetRise. They are held in
// React state for the length of the session and are never written to Supabase,
// never put in the URL, and never persisted to a store. This module is pure
// and synchronous apart from `fetchRideAssistance`, which only reads.
//
// How a program describes itself
// ------------------------------
// Matching runs off `ride:`-prefixed entries in `resources.tags`, the same
// internal key:value convention the import pipeline already uses for
// `subcategory:` / `service_area:`. That means adding a program needs no DDL
// and no new column — see migration 041 for the seeded vocabulary:
//
//   ride:kind:<fare_assistance|paratransit|subsidized_rideshare|travel_training>
//   ride:mode:<bus|rideshare|paratransit|wheelchair>
//   ride:elig:<low_income|disability|medicaid|veteran>
//   ride:area:<county slug, e.g. pinellas>
//   ride:notice:<same_day|next_day|advance|enrollment>
//
// `ride` is registered as an internal tag prefix (see `publicTags` in
// mapFilters.ts), so none of this leaks onto the public detail page as a badge.

import { db } from '@/lib/supabase'
import type { Resource } from '@/types'

// ── Answer shape ─────────────────────────────────────────────────

/** What kind of transportation the person can actually use. */
export type RideMode = 'bus' | 'rideshare' | 'wheelchair' | 'paratransit'

/** Circumstances that unlock specific programs. Optional, always skippable. */
export type RideEligibility = 'low_income' | 'disability' | 'medicaid' | 'veteran'

/** When the trip needs to happen — this is what makes lead time matter. */
export type RideWhen = 'now' | 'today' | 'scheduled'

export interface RideAnswers {
  /** Empty means "any available option" — not "none of these". */
  modes: RideMode[]
  /** Empty means the person skipped or preferred not to answer. */
  eligibility: RideEligibility[]
  when: RideWhen
}

export const RIDE_MODES: { key: RideMode; icon: string; labelKey: string }[] = [
  { key: 'bus',         icon: '🚌', labelKey: 'ride.mode.bus' },
  { key: 'rideshare',   icon: '🚕', labelKey: 'ride.mode.rideshare' },
  { key: 'wheelchair',  icon: '♿', labelKey: 'ride.mode.wheelchair' },
  { key: 'paratransit', icon: '🚐', labelKey: 'ride.mode.paratransit' },
]

export const RIDE_ELIGIBILITY: { key: RideEligibility; labelKey: string }[] = [
  { key: 'low_income', labelKey: 'ride.elig.low_income' },
  { key: 'disability', labelKey: 'ride.elig.disability' },
  { key: 'medicaid',   labelKey: 'ride.elig.medicaid' },
  { key: 'veteran',    labelKey: 'ride.elig.veteran' },
]

export const RIDE_WHEN: { key: RideWhen; labelKey: string }[] = [
  { key: 'now',       labelKey: 'ride.when.now' },
  { key: 'today',     labelKey: 'ride.when.today' },
  { key: 'scheduled', labelKey: 'ride.when.scheduled' },
]

// ── Tag vocabulary ───────────────────────────────────────────────

const RIDE_TAG = /^ride:([a-z_]+):([a-z0-9_]+)$/

type RideFacet = 'kind' | 'mode' | 'elig' | 'area' | 'notice'

/** Pulls the `ride:<facet>:<value>` entries out of a resource's tags. */
export function rideFacet(r: Resource, facet: RideFacet): string[] {
  const out: string[] = []
  for (const tag of r.tags ?? []) {
    const m = RIDE_TAG.exec(tag)
    if (m && m[1] === facet) out.push(m[2])
  }
  return out
}

export const RIDE_KIND_LABEL_KEY: Record<string, string> = {
  fare_assistance:      'ride.kind.fare_assistance',
  paratransit:          'ride.kind.paratransit',
  subsidized_rideshare: 'ride.kind.subsidized_rideshare',
  travel_training:      'ride.kind.travel_training',
}

const MODE_LABEL_KEY: Record<string, string> = Object.fromEntries(
  RIDE_MODES.map((m) => [m.key, m.labelKey]),
)

const ELIG_REQUIREMENT_KEY: Record<string, string> = {
  low_income: 'ride.requirement.low_income',
  disability: 'ride.requirement.disability',
  medicaid:   'ride.requirement.medicaid',
  veteran:    'ride.requirement.veteran',
}

/**
 * How much a programme's lead time counts against it, given when the trip is.
 *
 * A table rather than nested conditions because the interesting cases are the
 * ones that read wrong in prose. An earlier revision exempted `next_day` from
 * any penalty for a trip needed *today* — the exact opposite of what the
 * notice means (caught in review on PR #100). With area, mode and eligibility
 * all matching, that let HARTPlus and PSTA Access rank "Closest match" for a
 * trip later today, when neither can be booked before tomorrow. That is the
 * failure the whole `ride:notice:` vocabulary exists to prevent.
 *
 * `scheduled` forgives lead time, which is the point of planning ahead —
 * except for `enrollment`, which is weeks of certification rather than days of
 * notice and stays a mild mark against even a future trip. The caution text is
 * shown either way; this only decides ordering.
 */
const NOTICE_SCORE: Record<string, Record<RideWhen, number>> = {
  next_day:   { now: -2, today: -2, scheduled: 0 },
  advance:    { now: -2, today: -2, scheduled: 0 },
  enrollment: { now: -3, today: -3, scheduled: -1 },
}

const NOTICE_KEY: Record<string, string> = {
  same_day:   'ride.notice.same_day',
  next_day:   'ride.notice.next_day',
  advance:    'ride.notice.advance',
  enrollment: 'ride.notice.enrollment',
}

// ── Service areas ────────────────────────────────────────────────

/**
 * Florida county for the cities StreetRise actually lists in.
 *
 * Transportation assistance is the one service class that is genuinely
 * county-scoped: a Pinellas fare programme cannot pay for a trip in Miami no
 * matter how close the two listings look on a statewide map. Every other facet
 * on the map is a property of the listing itself, which is why this table
 * lives here and not in `mapFilters.ts`.
 *
 * `src/lib/transit.ts` reads it too, for the same reason in a different guise:
 * transit feeds are published per agency and agencies are county-scoped, so
 * the county is what decides whether we hold data authoritative enough to say
 * anything about an address. Keep the two importers in mind when editing —
 * a missing city degrades ride ranking AND silences the nearest-stop line.
 *
 * Keys are lower-cased and stripped of punctuation by `countyForCity`, so
 * "St. Petersburg", "St Petersburg" and "SAINT PETERSBURG" all land here. A
 * city that is missing simply yields `null`, and an unknown county is treated
 * as "maybe" rather than "no" — see `scoreOption`.
 */
const COUNTY_BY_CITY: Record<string, string> = {
  // Pinellas
  clearwater: 'pinellas', 'st petersburg': 'pinellas', 'saint petersburg': 'pinellas',
  largo: 'pinellas', 'pinellas park': 'pinellas', 'safety harbor': 'pinellas',
  dunedin: 'pinellas', 'tarpon springs': 'pinellas', seminole: 'pinellas',
  'treasure island': 'pinellas', gulfport: 'pinellas', oldsmar: 'pinellas',
  'palm harbor': 'pinellas', 'tierra verde': 'pinellas',
  // Hillsborough
  tampa: 'hillsborough', brandon: 'hillsborough', riverview: 'hillsborough',
  'plant city': 'hillsborough', 'temple terrace': 'hillsborough', ruskin: 'hillsborough',
  'progress village': 'hillsborough', lutz: 'hillsborough', valrico: 'hillsborough',
  'sun city center': 'hillsborough', lithia: 'hillsborough', thonotosassa: 'hillsborough',
  seffner: 'hillsborough', gibsonton: 'hillsborough', 'apollo beach': 'hillsborough',
  // Pasco / Hernando / Manatee / Sarasota / Polk
  'new port richey': 'pasco', 'port richey': 'pasco', 'dade city': 'pasco',
  hudson: 'pasco', 'wesley chapel': 'pasco', 'zephyrhills': 'pasco',
  brooksville: 'hernando', 'spring hill': 'hernando',
  bradenton: 'manatee', palmetto: 'manatee',
  sarasota: 'sarasota', venice: 'sarasota',
  lakeland: 'polk', 'winter haven': 'polk', bartow: 'polk', mulberry: 'polk',
  'haines city': 'polk', 'lake wales': 'polk',
  // Orange / Osceola / Seminole
  orlando: 'orange', 'winter park': 'orange', apopka: 'orange', ocoee: 'orange',
  bithlo: 'orange', 'pine hills': 'orange', 'winter garden': 'orange', maitland: 'orange',
  kissimmee: 'osceola', 'st cloud': 'osceola', 'saint cloud': 'osceola',
  kenansville: 'osceola',
  sanford: 'seminole', 'altamonte springs': 'seminole', longwood: 'seminole',
  // Miami-Dade / Broward
  miami: 'miami_dade', 'miami beach': 'miami_dade', hialeah: 'miami_dade',
  homestead: 'miami_dade', 'miami gardens': 'miami_dade', 'north miami': 'miami_dade',
  'coral gables': 'miami_dade', 'opa locka': 'miami_dade',
  'cutler bay': 'miami_dade', 'florida city': 'miami_dade', doral: 'miami_dade',
  hollywood: 'broward', 'fort lauderdale': 'broward', 'pembroke pines': 'broward',
  'pompano beach': 'broward', 'dania beach': 'broward', hallandale: 'broward',
  'pembroke park': 'broward', plantation: 'broward',
}

export const COUNTY_LABEL_KEY: Record<string, string> = {
  pinellas:     'ride.county.pinellas',
  hillsborough: 'ride.county.hillsborough',
  pasco:        'ride.county.pasco',
  hernando:     'ride.county.hernando',
  manatee:      'ride.county.manatee',
  sarasota:     'ride.county.sarasota',
  polk:         'ride.county.polk',
  orange:       'ride.county.orange',
  osceola:      'ride.county.osceola',
  seminole:     'ride.county.seminole',
  miami_dade:   'ride.county.miami_dade',
  broward:      'ride.county.broward',
}

/**
 * County slug for a city name, or null when we genuinely do not know.
 *
 * Worth re-checking against live whenever a seed batch adds a metro:
 *
 *   SELECT DISTINCT address->>'city' FROM resources
 *   WHERE is_active AND is_map_ready AND lat IS NOT NULL;
 *
 * A city missing from the table is not a crash, but it is not free either —
 * it downgrades the transit lookup to `partial`, which suppresses the "nearest
 * stop is 8 miles away" line. That line matters most for exactly the remote
 * listings whose towns are likeliest to be missing here.
 */
export function countyForCity(city: string | null | undefined): string | null {
  if (!city) return null
  const key = city
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return COUNTY_BY_CITY[key] ?? null
}

// ── Matching ─────────────────────────────────────────────────────

/**
 * How well a programme fits the trip that was described.
 *
 * `other_area` is not a weaker match — it is a programme that publishes a
 * service area the destination is definitely outside of. It is surfaced in its
 * own section rather than hidden, because someone travelling between counties
 * still benefits from knowing it exists.
 */
export type RideFit = 'best' | 'possible' | 'check' | 'other_area'

export interface RideOption {
  resource: Resource
  fit: RideFit
  score: number
  /** Why this could help — one short sentence per stored fact. */
  reasons: string[]
  /** What would stop it helping. Never a reason to hide the option. */
  cautions: string[]
}

interface ScoreContext {
  answers: RideAnswers
  /** Destination county, or null when the city is not in COUNTY_BY_CITY. */
  destinationCounty: string | null
  t: (key: string) => string
}

function labelList(keys: string[], t: (key: string) => string, lookup: Record<string, string>): string {
  return keys.map((k) => (lookup[k] ? t(lookup[k]) : k)).join(', ')
}

function scoreOption(r: Resource, ctx: ScoreContext): RideOption {
  const { answers, destinationCounty, t } = ctx
  const reasons: string[] = []
  const cautions: string[] = []
  let score = 0
  let outOfArea = false

  // ── Service area ──
  const areas = rideFacet(r, 'area')
  if (areas.length > 0) {
    const areaNames = labelList(areas, t, COUNTY_LABEL_KEY)
    if (destinationCounty && areas.includes(destinationCounty)) {
      score += 3
      reasons.push(t('ride.reason.servesArea').replace('{area}', areaNames))
    } else if (destinationCounty) {
      // Explicit mismatch — the one place this engine fails closed.
      outOfArea = true
      cautions.push(t('ride.caution.outOfArea').replace('{area}', areaNames))
    } else {
      // We could not resolve the destination to a county. Say what the
      // programme covers and let the person judge it.
      reasons.push(t('ride.reason.servesArea').replace('{area}', areaNames))
    }
  }

  // ── Modes the person can use ──
  const modes = rideFacet(r, 'mode')
  if (modes.length > 0) {
    reasons.push(t('ride.reason.provides').replace('{modes}', labelList(modes, t, MODE_LABEL_KEY)))
    if (answers.modes.length > 0) {
      const overlap = modes.filter((m) => answers.modes.includes(m as RideMode))
      if (overlap.length > 0) score += 2
      else {
        score -= 2
        cautions.push(t('ride.caution.modeMismatch'))
      }
    }
  }

  // ── Eligibility ──
  // A programme's requirements are stated either way; what the answers change
  // is the ranking and whether we can say "you may qualify".
  const elig = rideFacet(r, 'elig')
  if (elig.length > 0) {
    const matched = elig.filter((e) => answers.eligibility.includes(e as RideEligibility))
    if (matched.length > 0) {
      score += 3
      reasons.push(
        t('ride.reason.mayQualify').replace('{requirement}', labelList(matched, t, ELIG_REQUIREMENT_KEY)),
      )
    }
    const unmet = elig.filter((e) => !matched.includes(e))
    if (unmet.length > 0) {
      cautions.push(
        t('ride.caution.requires').replace('{requirement}', labelList(unmet, t, ELIG_REQUIREMENT_KEY)),
      )
      if (answers.eligibility.length > 0 && matched.length === 0) score -= 1
    }
  } else {
    // No published eligibility rule is a genuine advantage when someone has
    // said they would rather not answer those questions.
    score += 1
    reasons.push(t('ride.reason.noEligibilityRule'))
  }

  // ── Lead time ──
  const notices = rideFacet(r, 'notice')
  for (const notice of notices) {
    const key = NOTICE_KEY[notice]
    if (!key) continue
    if (notice === 'same_day') {
      // Being arrangeable today is only an advantage when the trip is today.
      if (answers.when !== 'scheduled') score += 2
      reasons.push(t(key))
      continue
    }
    cautions.push(t(key))
    score += NOTICE_SCORE[notice]?.[answers.when] ?? 0
  }

  // A phone number is the difference between an option and a leaflet.
  if (r.phone) score += 1

  const fit: RideFit = outOfArea
    ? 'other_area'
    : score >= 6
      ? 'best'
      : score >= 2
        ? 'possible'
        : 'check'

  return { resource: r, fit, score, reasons, cautions }
}

/**
 * Rank every known transportation programme against the described trip.
 *
 * Returns everything it was given, sorted — never a filtered subset. Deciding
 * that a programme is irrelevant on the strength of four multiple-choice
 * answers is exactly the failure mode that leaves someone stranded, so the
 * weak matches sink to the bottom of the list instead of disappearing from it.
 */
export function rankRideOptions(
  resources: Resource[],
  answers: RideAnswers,
  opts: { destinationCity?: string | null; t: (key: string) => string },
): RideOption[] {
  const ctx: ScoreContext = {
    answers,
    destinationCounty: countyForCity(opts.destinationCity),
    t: opts.t,
  }
  return resources
    .map((r) => scoreOption(r, ctx))
    .sort((a, b) => {
      // Out-of-area options always sort last, whatever they scored.
      if ((a.fit === 'other_area') !== (b.fit === 'other_area')) return a.fit === 'other_area' ? 1 : -1
      if (b.score !== a.score) return b.score - a.score
      return a.resource.name.localeCompare(b.resource.name)
    })
}

// ── Data access ──────────────────────────────────────────────────

/**
 * Every publicly visible transportation-assistance listing.
 *
 * Deliberately NOT reusing `fetchMapResources()`: that query requires
 * `is_map_ready` and non-null coordinates, because the map cannot draw a pin
 * without them. Transportation programmes are the class of resource where that
 * requirement is wrong — a countywide paratransit service or a bus-fare
 * programme has a service area, not a doorway, and several are correctly
 * stored with `access_type = 'phone_intake'` and no coordinates. Requiring a
 * pin here would hide precisely the programmes this page exists to surface.
 *
 * The rest of the public visibility predicate is unchanged, so nothing appears
 * here that the map would refuse to show for any other reason.
 */
export async function fetchRideAssistance(): Promise<Resource[]> {
  const { data, error } = await db.resources()
    .select('*')
    .eq('is_active', true)
    .in('verification_status', ['verified', 'pending'])
    .eq('category', 'transportation')
    .order('name')
  if (error) throw error
  return (data ?? []) as unknown as Resource[]
}
