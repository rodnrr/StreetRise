// ============================================================
// StreetRise — Map data layer: fetch, filter, and facet counting
// ============================================================
//
// How the map gets its data
// -------------------------
// The public resource set is small (a few hundred rows statewide), so the map
// fetches it **once** and applies every facet in the browser. That is not a
// micro-optimisation — it is what makes the filters honest:
//
//   • a toggle reacts instantly instead of costing a network round trip, and
//   • we can tell the user how many results an option will return *before*
//     they commit to it, and hide options that would return nothing.
//
// The Supabase query itself is unchanged in spirit: same `db.resources()`
// helper, same public visibility predicate (active + verified/pending +
// map-ready + geocoded). Only the facet conditions moved client-side.

import { db } from '@/lib/supabase'
import { distanceKm, type LatLng } from '@/lib/geo'
import type { Resource, MapFilters, QuickFilterKey, ResourceCategory, NeedKey } from '@/types'

export type { NeedKey }

// ── Constants ────────────────────────────────────────────────────

export const DEFAULT_RADIUS_KM = 20
export const MIN_CONFIDENCE_SCORE = 20

// Upper bound on a single fetch of the public set. Well above the current
// row count; exists so a runaway import can't try to stream the whole table
// into a phone browser.
export const PUBLIC_RESOURCE_LIMIT = 2000

export const CATEGORY_EMOJI: Record<string, string> = {
  shelter:            '🏠',
  food:               '🍽️',
  work_exchange:      '🤝',
  employment:         '💼',
  mental_health:      '💙',
  substance_recovery: '🌱',
  medical:            '⚕️',
  healthcare:         '⚕️',
  legal:              '⚖️',
  legal_aid:          '⚖️',
  hygiene:            '🚿',
  clothing:           '👕',
  childcare:          '👶',
  transportation:     '🚌',
  outdoor_space:      '🌳',
  day_space:          '🌤️',
  outreach:           '🤲',
  hotline:            '📞',
  other:              '📍',
}

export const CATEGORY_LABEL: Record<string, string> = {
  shelter:            'Shelter',
  food:               'Food',
  work_exchange:      'Work Exchange',
  employment:         'Employment',
  mental_health:      'Mental Health',
  substance_recovery: 'Recovery',
  medical:            'Medical',
  healthcare:         'Healthcare',
  legal:              'Legal',
  legal_aid:          'Legal Aid',
  hygiene:            'Hygiene',
  clothing:           'Clothing',
  childcare:          'Childcare',
  transportation:     'Transportation',
  outdoor_space:      'Outdoor Space',
  day_space:          'Daytime Space',
  outreach:           'Outreach',
  hotline:            'Hotline',
  other:              'Other',
}

export const RESOURCE_TYPE_LABEL: Record<string, string> = {
  emergency_shelter:          'Emergency Shelter',
  transitional_housing:       'Transitional Housing',
  food_pantry:                'Food Pantry',
  hot_meal:                   'Hot Meal',
  shower_facility:            'Shower Facility',
  restroom_access:            'Restroom Access',
  day_use_park:               'Day-Use Park',
  warming_cooling_center:     'Warming / Cooling Center',
  domestic_violence_shelter:  'DV Shelter',
  veteran_housing:            'Veteran Housing',
  youth_shelter:              'Youth Shelter',
  work_exchange:              'Work Exchange',
  crisis_hotline:             'Crisis Hotline',
  job_training:               'Job Training',
  legal_services:             'Legal Services',
  medical_clinic:             'Medical Clinic',
  mental_health_clinic:       'Mental Health Clinic',
  substance_recovery_program: 'Recovery Program',
  clothing_closet:            'Clothing Closet',
  hygiene_supplies:           'Hygiene Supplies',
  laundry_facility:           'Laundry',
  childcare_services:         'Childcare',
  transportation_assistance:  'Transportation',
  outreach_program:           'Outreach',
  other:                      'Other',
}

export const GENDER_POLICY_LABEL: Record<string, string> = {
  gender_inclusive: 'All genders welcome',
  men_only:         'Men only',
  women_only:       'Women only',
  family_only:      'Families only',
  couples_only:     'Couples',
  youth_only:       'Youth only',
  unknown:          'Eligibility unclear',
}

export const POPULATION_FOCUS_LABEL: Record<string, string> = {
  veterans:          'Veterans',
  lgbtq:             'LGBTQ+',
  domestic_violence: 'Domestic Violence',
  families:          'Families',
  students:          'Students',
  seniors:           'Seniors',
  young_adults:      'Young Adults',
  pregnant_women:    'Pregnant Women',
  substance_recovery:'Recovery',
  mental_health:     'Mental Health',
  reentry:           'Reentry',
  hiv_aids:          'HIV/AIDS',
}

export const QUICK_FILTER_DEFS: Record<QuickFilterKey, { label: string; icon: string }> = {
  shelter_tonight: { label: 'Shelter tonight',   icon: '🏠'  },
  food_today:      { label: 'Food today',         icon: '🍽️' },
  shower_restroom: { label: 'Shower / restroom',  icon: '🚿'  },
  safe_daytime:    { label: 'Safe daytime place', icon: '🌤️' },
  family_help:     { label: 'Family help',        icon: '👨‍👩‍👧' },
  mens_help:       { label: "Men's help",         icon: '🧔'  },
  womens_help:     { label: "Women's help",       icon: '👩'  },
  veteran_support: { label: 'Veterans',           icon: '🎖️' },
  lgbtq_support:   { label: 'LGBTQ+',             icon: '🏳️‍🌈' },
  youth_support:   { label: 'Youth',              icon: '🧑'  },
  dv_support:      { label: 'DV support',         icon: '🛡️' },
}

// Ordered list for the chip row (most frequent needs first)
export const QUICK_FILTER_ORDER: QuickFilterKey[] = [
  'shelter_tonight',
  'food_today',
  'shower_restroom',
  'safe_daytime',
  'family_help',
  'mens_help',
  'womens_help',
  'veteran_support',
  'lgbtq_support',
  'youth_support',
  'dv_support',
]

// Maps URL slugs from homepage links to canonical ResourceCategory values
export const CATEGORY_SLUG_MAP: Record<string, ResourceCategory> = {
  shelter:           'shelter',
  food:              'food',
  work_exchange:     'work_exchange',
  employment:        'employment',
  mental_health:     'mental_health',
  substance_recovery:'substance_recovery',
  medical:           'medical',
  healthcare:        'healthcare',
  legal:             'legal',
  legal_help:        'legal',
  legal_aid:         'legal_aid',
  hygiene:           'hygiene',
  clothing:          'clothing',
  childcare:         'childcare',
  transportation:    'transportation',
  outdoor_space:     'outdoor_space',
  day_space:         'day_space',
  parks:             'outdoor_space',
  outdoors:          'outdoor_space',
  outreach:          'outreach',
  hotline:           'hotline',
  other:             'other',
}

// ── "Needs" — the single chip row that replaces the old
//    quick-filter-row / category-drawer split ──────────────────────
//
// Previously a user could pick a quick filter in the chip row *and* a category
// in the drawer, where one silently cancelled the other. There is now one flat
// list of needs: exactly one is active at a time, each is a plain predicate,
// and the UI shows how many resources each would return.

export interface NeedDef {
  label: string
  icon: string
  /** Short line shown under the label in the filter drawer. */
  hint: string
  match: (r: Resource) => boolean
}

const inCategory = (r: Resource, cats: string[]) => cats.includes(r.category)
const hasPopulation = (r: Resource, tag: string) => r.population_focus?.includes(tag) ?? false

export const NEED_DEFS: Record<NeedKey, NeedDef> = {
  shelter: {
    label: 'Shelter tonight',
    icon: '🏠',
    hint: 'Places to sleep',
    // `overnight_allowed` is unrecorded (null) on many shelter rows. Treating
    // "unknown" as a no would hide real beds from someone who needs one
    // tonight, so only an explicit `false` drops out.
    match: (r) => r.category === 'shelter' && r.overnight_allowed !== false,
  },
  food: {
    label: 'Food',
    icon: '🍽️',
    hint: 'Pantries and hot meals',
    match: (r) => r.category === 'food' || r.serves_meals,
  },
  hygiene: {
    label: 'Shower / restroom',
    icon: '🚿',
    hint: 'Showers, restrooms, laundry',
    match: (r) => r.category === 'hygiene' || r.has_showers || r.has_restrooms || r.has_laundry,
  },
  daytime: {
    label: 'Daytime space',
    icon: '🌤️',
    hint: 'Somewhere to be during the day',
    match: (r) => inCategory(r, ['day_space', 'outdoor_space']),
  },
  medical: {
    label: 'Medical',
    icon: '⚕️',
    hint: 'Clinics and health care',
    match: (r) => inCategory(r, ['medical', 'healthcare']),
  },
  mental_health: {
    label: 'Mental health',
    icon: '💙',
    hint: 'Counselling and crisis support',
    match: (r) => inCategory(r, ['mental_health', 'hotline']),
  },
  recovery: {
    label: 'Recovery',
    icon: '🌱',
    hint: 'Substance recovery programs',
    match: (r) => r.category === 'substance_recovery' || hasPopulation(r, 'substance_recovery'),
  },
  legal: {
    label: 'Legal aid',
    icon: '⚖️',
    hint: 'Free and low-cost legal help',
    match: (r) => inCategory(r, ['legal', 'legal_aid']),
  },
  work: {
    label: 'Work & jobs',
    icon: '💼',
    hint: 'Employment and work exchange',
    match: (r) => inCategory(r, ['employment', 'work_exchange']),
  },
  clothing: {
    label: 'Clothing',
    icon: '👕',
    hint: 'Clothing closets',
    match: (r) => r.category === 'clothing',
  },
  transportation: {
    label: 'Transportation',
    icon: '🚌',
    hint: 'Bus passes and rides',
    match: (r) => r.category === 'transportation',
  },
  childcare: {
    label: 'Childcare',
    icon: '👶',
    hint: 'Childcare services',
    match: (r) => r.category === 'childcare',
  },
  outreach: {
    label: 'Outreach',
    icon: '🤲',
    hint: 'Teams that come to you',
    match: (r) => r.category === 'outreach',
  },
  families: {
    label: 'Families',
    icon: '👨‍👩‍👧',
    hint: 'Serves families with children',
    match: (r) => hasPopulation(r, 'families') || r.gender_policy === 'family_only',
  },
  students: {
    label: 'Students',
    icon: '🎒',
    hint: 'School clothing, uniforms and student support',
    // Tag-driven only, exactly like `veterans`. A clothing closet that serves
    // adults on the street is not a student resource, so this deliberately does
    // NOT widen to `category === 'clothing'`. As student-facing resources land
    // in other categories — a school-based pantry, a homeless-liaison program —
    // they join this chip by carrying the tag, with no change here.
    match: (r) => hasPopulation(r, 'students'),
  },
  veterans: {
    label: 'Veterans',
    icon: '🎖️',
    hint: 'Serves veterans',
    match: (r) => hasPopulation(r, 'veterans'),
  },
  dv: {
    label: 'DV support',
    icon: '🛡️',
    hint: 'Domestic violence support',
    match: (r) => hasPopulation(r, 'domestic_violence'),
  },
  youth: {
    label: 'Youth',
    icon: '🧑',
    hint: 'Serves youth and young adults',
    match: (r) => hasPopulation(r, 'young_adults') || r.gender_policy === 'youth_only',
  },
  lgbtq: {
    label: 'LGBTQ+',
    icon: '🏳️‍🌈',
    hint: 'Serves LGBTQ+ people',
    match: (r) => hasPopulation(r, 'lgbtq'),
  },
}

/** Chip-row order: urgent survival needs first, then services, then who-it-serves. */
export const NEED_ORDER: NeedKey[] = [
  'shelter', 'food', 'hygiene', 'daytime',
  'medical', 'mental_health', 'recovery', 'legal', 'work',
  'clothing', 'transportation', 'childcare', 'outreach',
  'families', 'students', 'veterans', 'youth', 'dv', 'lgbtq',
]

/** Deep-link translation: a marketing category slug → the equivalent need chip. */
const NEED_BY_CATEGORY: Partial<Record<string, NeedKey>> = {
  shelter: 'shelter',
  food: 'food',
  hygiene: 'hygiene',
  day_space: 'daytime',
  outdoor_space: 'daytime',
  medical: 'medical',
  healthcare: 'medical',
  mental_health: 'mental_health',
  hotline: 'mental_health',
  substance_recovery: 'recovery',
  legal: 'legal',
  legal_aid: 'legal',
  employment: 'work',
  work_exchange: 'work',
  clothing: 'clothing',
  transportation: 'transportation',
  childcare: 'childcare',
  outreach: 'outreach',
}

const NEED_BY_QUICK_FILTER: Partial<Record<QuickFilterKey, NeedKey>> = {
  shelter_tonight: 'shelter',
  food_today: 'food',
  shower_restroom: 'hygiene',
  safe_daytime: 'daytime',
  family_help: 'families',
  veteran_support: 'veterans',
  lgbtq_support: 'lgbtq',
  youth_support: 'youth',
  dv_support: 'dv',
}

/**
 * Deep-link translation: a population_focus tag → the equivalent need chip.
 *
 * A `?populationFocus=` link that names one tag is better expressed as the
 * active need chip than as a refinement — the chip is what the visitor can see
 * and switch away from. But that swap is only honest when the need's predicate
 * is *exactly* the tag test, because the URL is a contract about which set
 * comes back.
 *
 * Only these four qualify. `families` and `youth` are deliberately absent:
 * their predicates widen past the tag to `gender_policy === 'family_only'` and
 * `'youth_only'` respectively, so translating them would return listings that
 * do not carry the requested tag at all. There is already one live row that is
 * `youth_only` without `young_adults`. Those tags fall through and stay
 * `populationFocus` refinements, which match the link exactly — as do tags with
 * no chip at all (seniors, reentry, …).
 */
const NEED_BY_POPULATION_FOCUS: Partial<Record<string, NeedKey>> = {
  students: 'students',
  veterans: 'veterans',
  domestic_violence: 'dv',
  lgbtq: 'lgbtq',
}

export function needForCategory(category: string): NeedKey | undefined {
  return NEED_BY_CATEGORY[category]
}

export function needForPopulationFocus(tags: string[]): NeedKey | undefined {
  return tags.length === 1 ? NEED_BY_POPULATION_FOCUS[tags[0]] : undefined
}

export function needForQuickFilter(key: QuickFilterKey): NeedKey | undefined {
  return NEED_BY_QUICK_FILTER[key]
}

/**
 * Translate a legacy `?quickFilter=` link into modern filter values.
 *
 * Most keys map onto a need. The gendered ones don't: there is no "men's help"
 * need, because eligibility is a refinement rather than a need. They become an
 * eligibility selection instead — `gender_inclusive` is included alongside the
 * gendered value because a man can use a mixed shelter, and the eligibility
 * predicate adds `unknown` itself. Returning `{}` here would leave a shared
 * link showing the whole unfiltered list under an "active" filter label.
 */
export function quickFilterToFilters(key: QuickFilterKey): Partial<MapFilters> {
  const need = NEED_BY_QUICK_FILTER[key]
  if (need) return { need }
  if (key === 'mens_help')   return { genderPolicy: ['men_only', 'gender_inclusive'] }
  if (key === 'womens_help') return { genderPolicy: ['women_only', 'gender_inclusive'] }
  return {}
}

/** Fold any legacy `quickFilter` into the modern fields before filtering. */
function normalizeFilters(filters: MapFilters): MapFilters {
  if (!filters.quickFilter) return filters
  return { ...filters, ...quickFilterToFilters(filters.quickFilter), quickFilter: undefined }
}

// ── Refinement toggles ────────────────────────────────────────────
//
// Each toggle is a named predicate so the drawer can count how many resources
// it would leave — and hide itself when the answer is "all of them" or "none
// of them", which is what made several of these look like decoration.

export type ToggleKey =
  | 'openNow' | 'overnightAllowed' | 'walkInsOnly' | 'noCallRequired' | 'noReferralRequired'
  | 'noIdRequired' | 'hasShowers' | 'hasRestrooms' | 'servesMeals' | 'hasLaundry'
  | 'petFriendly' | 'wheelchairAccessible' | 'nearTransit' | 'verifiedOnly' | 'hideStale'

export interface ToggleDef {
  key: ToggleKey
  label: string
  group: 'access' | 'facility' | 'trust'
  /** `now` is supplied so time-dependent filters stay live; most ignore it. */
  test: (r: Resource, now: Date) => boolean
}

export const TOGGLE_DEFS: ToggleDef[] = [
  { key: 'openNow',             group: 'access',   label: 'Open right now',            test: (r, now) => isOpenNow(r, now) },
  { key: 'overnightAllowed',    group: 'access',   label: 'Open overnight',            test: (r) => r.overnight_allowed === true },
  { key: 'walkInsOnly',         group: 'access',   label: 'Walk-ins accepted',         test: (r) => r.walk_ins_accepted },
  { key: 'noCallRequired',      group: 'access',   label: 'No call needed first',      test: (r) => r.phone_required_before_arrival === false },
  { key: 'noReferralRequired',  group: 'access',   label: 'No referral needed',        test: (r) => r.requires_referral === false },
  { key: 'noIdRequired',        group: 'access',   label: 'No ID needed',              test: (r) => r.requires_id === false },
  { key: 'hasShowers',          group: 'facility', label: '🚿 Showers',                test: (r) => r.has_showers },
  { key: 'hasRestrooms',        group: 'facility', label: '🚻 Restrooms',              test: (r) => r.has_restrooms },
  { key: 'servesMeals',         group: 'facility', label: '🍽️ Meals served',          test: (r) => r.serves_meals },
  { key: 'hasLaundry',          group: 'facility', label: '🫧 Laundry',                test: (r) => r.has_laundry },
  { key: 'petFriendly',         group: 'facility', label: '🐾 Pets allowed',           test: (r) => r.pet_friendly },
  { key: 'wheelchairAccessible',group: 'facility', label: '♿ Wheelchair accessible',  test: (r) => r.wheelchair_accessible },
  { key: 'nearTransit',         group: 'facility', label: '🚌 Near public transit',    test: (r) => r.public_transit_accessible },
  { key: 'verifiedOnly',        group: 'trust',    label: 'Staff-verified only',       test: (r) => r.verification_status === 'verified' },
  { key: 'hideStale',           group: 'trust',    label: 'Hide possibly outdated',    test: (r) => getTrustInfo(r).level !== 'stale' },
]

const TOGGLE_BY_KEY = new Map(TOGGLE_DEFS.map((t) => [t.key, t]))

/** Distance options offered in the drawer, in miles. */
export const DISTANCE_OPTIONS_MI = [5, 10, 25, 50]

// ── "Open right now" ──────────────────────────────────────────────
//
// Opening hours are stored in the listing's own local time and every listing
// is in Florida, so "now" is resolved in America/New_York rather than in the
// visitor's timezone. Someone checking from California at 8 PM is looking at
// 11 PM in Tampa, and a 9-to-5 pantry must not come back as open.
//
// This filter is the one place that deliberately fails *closed*. Elsewhere an
// unrecorded field means "maybe" and the listing stays visible, because hiding
// a real bed is the worse error. Here the filter makes a positive claim — "this
// place is open" — so a listing that publishes no hours cannot satisfy it. The
// map says how many were set aside for that reason rather than hiding them
// silently.

export const RESOURCE_TIME_ZONE = 'America/New_York'

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const
type DayKey = (typeof DAY_KEYS)[number]

/** Minutes past midnight, or null when the value isn't a usable HH:MM. */
function toMinutes(value: string | undefined): number | null {
  if (!value) return null
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!m) return null
  const hours = Number(m[1])
  const mins = Number(m[2])
  if (hours > 24 || mins > 59) return null
  return hours * 60 + mins
}

const zonedFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: RESOURCE_TIME_ZONE,
  weekday: 'long',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

/** Weekday and minutes-past-midnight where the resources actually are. */
export function zonedNow(now: Date): { dayIndex: number; minutes: number } {
  const parts = zonedFormatter.formatToParts(now)
  const weekday = (parts.find((p) => p.type === 'weekday')?.value ?? '').toLowerCase()
  // hour12:false reports midnight as "24" in some engines.
  const rawHour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0')
  const hour = rawHour >= 24 ? rawHour - 24 : rawHour
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0')

  const dayIndex = DAY_KEYS.indexOf(weekday as DayKey)
  return {
    dayIndex: dayIndex < 0 ? now.getDay() : dayIndex,
    minutes: hour * 60 + minute,
  }
}

interface DayWindow { open?: string; close?: string; closed?: boolean }

function windowFor(r: Resource, day: DayKey): DayWindow | null {
  const hours = r.hours_of_operation as Record<string, unknown> | null | undefined
  if (!hours) return null
  const win = hours[day]
  if (!win || typeof win !== 'object') return null
  return win as DayWindow
}

/** True when the listing publishes at least one usable day. */
export function hasKnownHours(r: Resource): boolean {
  return DAY_KEYS.some((day) => {
    const win = windowFor(r, day)
    if (!win) return false
    if (win.closed) return true // an explicit "closed today" is still knowledge
    return toMinutes(win.open) != null && toMinutes(win.close) != null
  })
}

/**
 * Is `minutes` inside this window? `spillover` asks the opposite question —
 * whether a window that opened *yesterday* and runs past midnight still covers
 * this morning.
 */
function coversMinute(win: DayWindow | null, minutes: number, spillover: boolean): boolean {
  if (!win || win.closed) return false
  const open = toMinutes(win.open)
  let close = toMinutes(win.close)
  if (open == null || close == null) return false

  // 23:59 is how "open until end of day" is stored, including the 24/7 rows.
  if (close === 23 * 60 + 59) close = 24 * 60

  if (close > open) {
    // An ordinary same-day window can never reach into the following day.
    return spillover ? false : minutes >= open && minutes < close
  }
  // Window crosses midnight, e.g. 19:00-07:00.
  return spillover ? minutes < close : minutes >= open
}

/** Whether the listing is open at `now`, in the listing's own timezone. */
export function isOpenNow(r: Resource, now: Date): boolean {
  const { dayIndex, minutes } = zonedNow(now)
  const today = DAY_KEYS[dayIndex]
  const yesterday = DAY_KEYS[(dayIndex + 6) % 7]

  if (coversMinute(windowFor(r, today), minutes, false)) return true
  return coversMinute(windowFor(r, yesterday), minutes, true)
}

// ── Fetch ─────────────────────────────────────────────────────────

/**
 * Fetch the public resource set. Applies only the structural visibility
 * predicate — everything a visitor is allowed to see. Facets are applied by
 * `filterResources`.
 */
export async function fetchMapResources(): Promise<Resource[]> {
  const { data, error } = await db.resources()
    .select('*')
    .eq('is_active', true)
    .in('verification_status', ['verified', 'pending'])
    .eq('is_map_ready', true)
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .limit(PUBLIC_RESOURCE_LIMIT)

  if (error) throw error
  return (data ?? []) as unknown as Resource[]
}

// ── Filtering ─────────────────────────────────────────────────────

export interface RankedResource {
  resource: Resource
  /** Distance from the search origin, or null when no origin is known. */
  distanceKm: number | null
}

type PredicateKey = 'search' | 'need' | 'category' | 'resourceType' | 'subcategory'
  | 'genderPolicy' | 'populationFocus' | 'availabilityStatus' | 'radius'
  | 'confidence' | ToggleKey

interface Predicate {
  key: PredicateKey
  test: (r: Resource) => boolean
}

function matchesText(r: Resource, q: string): boolean {
  return (
    r.name.toLowerCase().includes(q) ||
    r.category.toLowerCase().includes(q) ||
    (r.resource_type?.toLowerCase() ?? '').includes(q) ||
    (r.address?.city?.toLowerCase() ?? '').includes(q) ||
    (r.address?.zip?.toLowerCase() ?? '').includes(q) ||
    (r.description?.toLowerCase() ?? '').includes(q)
  )
}

function buildPredicates(
  filters: MapFilters,
  searchQuery: string,
  origin: LatLng | null,
  now: Date,
): Predicate[] {
  const preds: Predicate[] = []
  // A legacy quickFilter is folded into the modern fields first, so a key with
  // no need mapping still narrows instead of quietly matching everything.
  const f = normalizeFilters(filters)

  const q = searchQuery.trim().toLowerCase()
  if (q) preds.push({ key: 'search', test: (r) => matchesText(r, q) })

  if (f.need) {
    const def = NEED_DEFS[f.need]
    if (def) preds.push({ key: 'need', test: def.match })
  } else if (f.category) {
    // Legacy deep links that set a raw category.
    const cat = f.category
    preds.push({ key: 'category', test: (r) => r.category === cat })
  }

  if (f.resourceType) {
    const rt = f.resourceType
    preds.push({ key: 'resourceType', test: (r) => r.resource_type === rt })
  }
  if (f.subcategory?.length) {
    const subs = f.subcategory
    preds.push({ key: 'subcategory', test: (r) => !!r.subcategory && subs.includes(r.subcategory) })
  }

  // Eligibility fails open: a resource whose policy is unrecorded stays
  // visible, so an untagged shelter is never hidden from someone who needs it.
  if (f.genderPolicy?.length) {
    const gps = new Set<string>([...f.genderPolicy, 'unknown'])
    preds.push({ key: 'genderPolicy', test: (r) => gps.has(r.gender_policy) })
  }
  if (f.populationFocus?.length) {
    const tags = f.populationFocus
    preds.push({
      key: 'populationFocus',
      test: (r) => tags.some((t) => r.population_focus?.includes(t)),
    })
  }

  if (f.availabilityStatus) {
    const st = f.availabilityStatus
    preds.push({ key: 'availabilityStatus', test: (r) => r.availability_status === st })
  }

  for (const def of TOGGLE_DEFS) {
    if (f[def.key]) preds.push({ key: def.key, test: (r) => def.test(r, now) })
  }

  if (!f.showLowConfidence) {
    preds.push({ key: 'confidence', test: (r) => (r.confidence_score ?? 0) >= MIN_CONFIDENCE_SCORE })
  }

  if (f.radius != null && origin) {
    const limit = f.radius
    preds.push({
      key: 'radius',
      test: (r) =>
        r.lat != null && r.lng != null &&
        distanceKm(origin, { lat: r.lat, lng: r.lng }) <= limit,
    })
  }

  return preds
}

function runPredicates(resources: Resource[], preds: Predicate[]): Resource[] {
  if (!preds.length) return resources
  return resources.filter((r) => preds.every((p) => p.test(r)))
}

/**
 * Apply every active facet, then rank by distance from `origin`
 * (the user's location when granted, otherwise the map centre).
 */
export function filterResources(
  resources: Resource[],
  filters: MapFilters,
  searchQuery = '',
  origin: LatLng | null = null,
  now: Date = new Date(),
): RankedResource[] {
  const preds = buildPredicates(filters, searchQuery, origin, now)
  const matched = runPredicates(resources, preds)

  const ranked: RankedResource[] = matched.map((resource) => ({
    resource,
    distanceKm:
      origin && resource.lat != null && resource.lng != null
        ? distanceKm(origin, { lat: resource.lat, lng: resource.lng })
        : null,
  }))

  if (origin) {
    ranked.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
  } else {
    ranked.sort((a, b) => a.resource.name.localeCompare(b.resource.name))
  }

  return ranked
}

// ── Facet counting ────────────────────────────────────────────────
//
// Standard faceted-search semantics: an option's count is computed with that
// option's own facet removed, so it answers "how many results would I get if I
// picked this?" rather than "how many results do I have now?".

export interface FacetCounts {
  /** Results with all current filters applied. */
  total: number
  needs: Record<string, number>
  toggles: Record<string, number>
  genderPolicy: Record<string, number>
  populationFocus: Record<string, number>
  /** Keyed by distance in miles, plus `any`. */
  distance: Record<string, number>
  /**
   * Size of the set each facet's options were counted against — the
   * denominator for `isUsefulOption`. An option matching the whole base set
   * would narrow nothing, so it is hidden rather than shown as a no-op.
   */
  base: {
    needs: number
    toggles: Record<string, number>
    genderPolicy: number
    populationFocus: number
    distance: number
  }
}

function countWhere(resources: Resource[], test: (r: Resource) => boolean): number {
  let n = 0
  for (const r of resources) if (test(r)) n++
  return n
}

export function computeFacetCounts(
  resources: Resource[],
  filters: MapFilters,
  searchQuery = '',
  origin: LatLng | null = null,
  now: Date = new Date(),
): FacetCounts {
  const all = buildPredicates(filters, searchQuery, origin, now)
  const without = (...keys: PredicateKey[]) =>
    runPredicates(resources, all.filter((p) => !keys.includes(p.key)))

  const total = runPredicates(resources, all).length

  // Needs are mutually exclusive, so each is counted against the set with the
  // need facet (and its legacy category equivalent) removed.
  const needBase = without('need', 'category')
  const needs: Record<string, number> = {}
  for (const key of NEED_ORDER) {
    needs[key] = countWhere(needBase, NEED_DEFS[key].match)
  }

  const toggles: Record<string, number> = {}
  const toggleBase: Record<string, number> = {}
  for (const def of TOGGLE_DEFS) {
    const base = without(def.key)
    toggleBase[def.key] = base.length
    toggles[def.key] = countWhere(base, (r) => def.test(r, now))
  }

  const genderBase = without('genderPolicy')
  const genderPolicy: Record<string, number> = {}
  for (const gp of Object.keys(GENDER_POLICY_LABEL)) {
    genderPolicy[gp] = countWhere(genderBase, (r) => r.gender_policy === gp || r.gender_policy === 'unknown')
  }

  const popBase = without('populationFocus')
  const populationFocus: Record<string, number> = {}
  for (const tag of Object.keys(POPULATION_FOCUS_LABEL)) {
    populationFocus[tag] = countWhere(popBase, (r) => r.population_focus?.includes(tag) ?? false)
  }

  const distanceBase = without('radius')
  const distance: Record<string, number> = {}
  if (origin) {
    for (const mi of DISTANCE_OPTIONS_MI) {
      const km = mi * 1.609344
      distance[String(mi)] = countWhere(
        distanceBase,
        (r) => r.lat != null && r.lng != null && distanceKm(origin, { lat: r.lat, lng: r.lng }) <= km,
      )
    }
  }
  distance.any = distanceBase.length

  return {
    total,
    needs,
    toggles,
    genderPolicy,
    populationFocus,
    distance,
    base: {
      needs: needBase.length,
      toggles: toggleBase,
      genderPolicy: genderBase.length,
      populationFocus: popBase.length,
      distance: distanceBase.length,
    },
  }
}

/**
 * An option is worth showing only if picking it would actually change the
 * result set: it must match at least one resource, and not all of them.
 * This is what retires filters the data can't support — they disappear on
 * their own, and come back automatically once providers fill the field in.
 */
export function isUsefulOption(count: number, baseTotal: number): boolean {
  return count > 0 && count < baseTotal
}

// ── Trust / Freshness Helpers ─────────────────────────────────────

export type TrustLevel = 'fresh' | 'recent' | 'aging' | 'stale'

export interface TrustInfo {
  label: string
  level: TrustLevel
}

export function getTrustInfo(resource: Resource): TrustInfo {
  const refDate = resource.last_provider_update_at
    ? new Date(resource.last_provider_update_at)
    : resource.updated_at
    ? new Date(resource.updated_at)
    : null

  const staleAfter = resource.stale_after_days ?? 30
  const isVerified = resource.verification_status === 'verified'

  if (!refDate) {
    return { label: 'May be outdated — call first', level: 'stale' }
  }

  const daysSince = Math.floor((Date.now() - refDate.getTime()) / 86_400_000)

  if (daysSince === 0) {
    return {
      label: isVerified ? 'Verified · Updated today' : 'Updated today',
      level: 'fresh',
    }
  }
  if (daysSince <= 7) {
    return {
      label: isVerified ? 'Verified recently' : `Updated ${daysSince}d ago`,
      level: 'fresh',
    }
  }
  if (daysSince <= staleAfter) {
    return { label: `Updated ${daysSince}d ago`, level: 'recent' }
  }
  if (daysSince <= staleAfter * 2) {
    return { label: 'May be outdated — call first', level: 'aging' }
  }
  return { label: 'May be outdated — call first', level: 'stale' }
}

export const TRUST_LEVEL_CLASSES: Record<TrustLevel, string> = {
  fresh:  'text-emerald-700 bg-emerald-50',
  recent: 'text-blue-700 bg-blue-50',
  aging:  'text-amber-700 bg-amber-50',
  stale:  'text-red-700 bg-red-50',
}

// ── Filter Utilities ──────────────────────────────────────────────

/**
 * A stable string identifying *what* is being filtered for, used to decide when
 * the map should re-fit to the results.
 *
 * It deliberately keys on the filter inputs rather than on the resulting IDs.
 * With a radius active the result set depends on the map centre, so re-fitting
 * to the results would move the map, which changes the centre, which changes
 * the set — an oscillation. Filter inputs don't move when the map does.
 *
 * Every refinement value is included, not just how many are set: switching
 * 5 mi to 50 mi leaves the count unchanged while changing the results
 * completely, and the map has to follow that.
 */
export function filterSignature(filters: MapFilters, searchQuery = ''): string {
  const f = normalizeFilters(filters)
  return [
    f.need ?? f.category ?? '',
    searchQuery.trim().toLowerCase(),
    f.resourceType ?? '',
    (f.subcategory ?? []).join('+'),
    [...(f.genderPolicy ?? [])].sort().join('+'),
    [...(f.populationFocus ?? [])].sort().join('+'),
    f.availabilityStatus ?? '',
    f.radius ?? '',
    // Sorted by definition order, so the string doesn't depend on click order.
    TOGGLE_DEFS.filter((d) => f[d.key]).map((d) => d.key).join('+'),
  ].join('|')
}

/** Refinements only — the need chip is shown separately in the UI. */
export function countActiveRefinements(filters: MapFilters): number {
  let n = 0
  if (filters.resourceType)            n++
  if (filters.subcategory?.length)     n++
  if (filters.genderPolicy?.length)    n++
  if (filters.populationFocus?.length) n++
  if (filters.availabilityStatus)      n++
  if (filters.radius != null)          n++
  for (const def of TOGGLE_DEFS) if (filters[def.key]) n++
  return n
}

export function countActiveFilters(filters: MapFilters): number {
  const need = filters.need || filters.quickFilter || filters.category ? 1 : 0
  return need + countActiveRefinements(filters)
}

/** Human list of everything currently narrowing the results. */
export function activeFilterLabels(filters: MapFilters): string[] {
  const out: string[] = []

  if (filters.need) out.push(NEED_DEFS[filters.need].label)
  else if (filters.quickFilter) out.push(QUICK_FILTER_DEFS[filters.quickFilter].label)
  else if (filters.category) out.push(CATEGORY_LABEL[filters.category] ?? filters.category)

  for (const def of TOGGLE_DEFS) {
    if (filters[def.key]) out.push(def.label)
  }
  for (const gp of filters.genderPolicy ?? []) out.push(GENDER_POLICY_LABEL[gp] ?? gp)
  for (const tag of filters.populationFocus ?? []) out.push(POPULATION_FOCUS_LABEL[tag] ?? tag)
  if (filters.availabilityStatus) out.push(filters.availabilityStatus)

  return out
}

export function activeFilterSummary(filters: MapFilters): string {
  return activeFilterLabels(filters)[0] ?? ''
}

/** Remove one refinement by name — powers the removable chips above the list. */
export function clearedFilter(filters: MapFilters, label: string): Partial<MapFilters> {
  const patch: Partial<MapFilters> = {}

  for (const def of TOGGLE_DEFS) {
    if (def.label === label && filters[def.key]) patch[def.key] = undefined
  }
  for (const [gp, gpLabel] of Object.entries(GENDER_POLICY_LABEL)) {
    if (gpLabel === label) {
      patch.genderPolicy = (filters.genderPolicy ?? []).filter((v) => v !== gp)
      if (!patch.genderPolicy.length) patch.genderPolicy = undefined
    }
  }
  for (const [tag, tagLabel] of Object.entries(POPULATION_FOCUS_LABEL)) {
    if (tagLabel === label) {
      patch.populationFocus = (filters.populationFocus ?? []).filter((v) => v !== tag)
      if (!patch.populationFocus.length) patch.populationFocus = undefined
    }
  }

  return patch
}

export { TOGGLE_BY_KEY }
