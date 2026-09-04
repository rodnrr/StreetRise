// ============================================================
// StreetRise — Housing helpers
// ============================================================
//
// Housing is a CATEGORY of the canonical `resources` table, not a separate
// directory. There is no housing organization table (that is `providers`) and
// no housing program table (that is `resources`). See
// docs/housing-architecture.md.
//
// So this file holds no data layer of its own. It holds the three things that
// are genuinely housing-specific:
//
//   1. answerFor()  — the ONLY place a nullable eligibility boolean becomes
//                     words. Null means unknown, never "no".
//   2. HOUSING_SHORTCUTS — the /housing page's shortcut cards, expressed as
//                     canonical MapFilters so they compose with every existing
//                     facet instead of replacing them.
//   3. normalizeHousingEmbed() — flattens PostgREST's embed shape.

import { db } from '@/lib/supabase'
import type {
  Resource,
  ResourceHousingDetails,
  MapFilters,
  WaitlistStatus,
} from '@/types'

// ------------------------------------------------------------
// Tri-state eligibility
// ------------------------------------------------------------

export type TriState = 'yes' | 'no' | 'unknown'

export interface TriAnswer {
  value: TriState
  /** i18n key for the sentence to print. */
  labelKey: string
}

/**
 * Turn `boolean | null` into something printable.
 *
 * The unknown case is a full instruction — "Not stated — call to ask" — rather
 * than a dash or an "N/A", because the reader is deciding whether to spend a
 * bus fare on this address. A dash invites them to assume; naming the next
 * action does not.
 *
 * This is the only place that decision is made. Do not inline the ternary.
 */
export function answerFor(
  value: boolean | null | undefined,
  keys: { yes: string; no: string }
): TriAnswer {
  if (value === true) return { value: 'yes', labelKey: keys.yes }
  if (value === false) return { value: 'no', labelKey: keys.no }
  return { value: 'unknown', labelKey: 'housing.notStated' }
}

/** The record questions, in the order an applicant actually asks them. */
export const RECORD_QUESTIONS = [
  { field: 'accepts_felony' as const,          yes: 'housing.felony.yes',   no: 'housing.felony.no' },
  { field: 'accepts_violent_offense' as const, yes: 'housing.violent.yes',  no: 'housing.violent.no' },
  { field: 'accepts_sex_offense' as const,     yes: 'housing.sex.yes',      no: 'housing.sex.no' },
]

export const RULE_QUESTIONS = [
  { field: 'accepts_vouchers' as const,   yes: 'housing.vouchers.yes',  no: 'housing.vouchers.no' },
  { field: 'requires_sobriety' as const,  yes: 'housing.sobriety.yes',  no: 'housing.sobriety.no' },
  { field: 'has_curfew' as const,         yes: 'housing.curfew.yes',    no: 'housing.curfew.no' },
]

// ------------------------------------------------------------
// PostgREST embed
// ------------------------------------------------------------

/** Select list that pulls the housing extension alongside the resource. */
export const HOUSING_EMBED = '*, housing:resource_housing_details(*)'

/**
 * True when a query failed *because the housing extension table is not there*.
 *
 * This matters because of how StreetRise ships: migrations are applied by hand
 * in the Supabase SQL editor, while merging to `main` deploys the app. So there
 * is a real window in which this code is live and migration 057 has not been
 * run. Without a fallback, the embed in `fetchMapResources` would fail and take
 * the ENTIRE MAP down — every category, not just housing — until someone
 * noticed and ran the SQL.
 *
 * Callers retry with a plain `*` on this error, so a missing table degrades to
 * "no housing details" instead of "no resources at all". Once 057 is applied
 * the fallback never fires again.
 */
export function isMissingHousingRelation(error: unknown): boolean {
  if (!error) return false
  const e = error as { code?: string; message?: string }
  // PGRST200: PostgREST could not find the embedded relationship.
  // 42P01:    Postgres undefined_table.
  if (e.code === 'PGRST200' || e.code === '42P01') return true
  return /resource_housing_details/i.test(e.message ?? '')
}

// ------------------------------------------------------------
// Embed shape
// ------------------------------------------------------------

/**
 * PostgREST returns a to-one embed as an object, but returns an array when it
 * cannot prove the relationship is unique. `resource_housing_details` keys on
 * `resource_id` as both PK and FK so it *should* always be an object — this
 * normalizes both shapes anyway, because the cost of being wrong is every
 * housing listing silently rendering as if it had no details at all.
 */
export function normalizeHousingEmbed(raw: unknown): ResourceHousingDetails | null {
  if (!raw) return null
  if (Array.isArray(raw)) return (raw[0] as ResourceHousingDetails) ?? null
  return raw as ResourceHousingDetails
}

/** True when this resource is housing, whatever its detail row looks like. */
export function isHousing(r: Resource): boolean {
  return r.category === 'housing'
}

// ------------------------------------------------------------
// Link safety
// ------------------------------------------------------------

/**
 * Return the URL only if it is safe to put in an href, otherwise null.
 *
 * `application_url` is free text saved by a provider through an editor, not a
 * validating HTML form, and it is rendered straight into an anchor. React
 * 18.3 only *warns* about a `javascript:` href — it does not block it — so
 * without this a compromised or malicious provider account could store a link
 * that executes script in StreetRise's own origin the moment a visitor taps
 * "Apply online". An allowlist of schemes is the fix; a blocklist is not,
 * because `data:` and `vbscript:` are equally unwelcome and the next one has
 * not been invented yet.
 *
 * A bare `example.org/apply` is accepted and upgraded to https, because a
 * provider typing their own address without a scheme is the common case and
 * dropping the link entirely would punish them for it.
 */
export function safeExternalUrl(raw: string | null | undefined): string | null {
  if (!raw) return null
  const value = raw.trim()
  if (!value) return null

  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`

  try {
    const url = new URL(candidate)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    return url.toString()
  } catch {
    return null
  }
}

// ------------------------------------------------------------
// Money and stay length
// ------------------------------------------------------------

/**
 * How long somebody can stay, in words.
 *
 * Only meaningful for time-limited programmes — a null on permanent housing is
 * correct, not missing.
 */
export function formatStay(days: number | null | undefined): string | null {
  if (!days) return null
  if (days < 31) return `${days} days`
  if (days < 365) return `about ${Math.round(days / 30)} months`
  const years = days / 365
  return years === 1 ? 'about 1 year' : `about ${Math.round(years)} years`
}

/**
 * Rent, as a range when we hold one.
 *
 * `null` is unknown and renders as nothing — never as "$0". Zero is a real and
 * different answer ("no cost"), and conflating them would advertise free
 * housing that charges rent.
 */
export function formatCostRange(
  minCents: number | null | undefined,
  maxCents: number | null | undefined
): string | null {
  const fmt = (c: number) =>
    c === 0 ? '$0' : `$${Math.round(c / 100).toLocaleString('en-US')}`
  const hasMin = minCents !== null && minCents !== undefined
  const hasMax = maxCents !== null && maxCents !== undefined

  if (hasMin && hasMax) {
    return minCents === maxCents ? fmt(minCents) : `${fmt(minCents)} – ${fmt(maxCents)}`
  }
  if (hasMin) return `${fmt(minCents)}+`
  if (hasMax) return `≤ ${fmt(maxCents)}`
  return null
}

export function formatMoney(cents: number | null | undefined): string | null {
  if (cents === null || cents === undefined) return null
  return cents === 0 ? '$0' : `$${Math.round(cents / 100).toLocaleString('en-US')}`
}

// ------------------------------------------------------------
// Waitlist
// ------------------------------------------------------------

export const WAITLIST_LABEL_KEY: Record<WaitlistStatus, string> = {
  open: 'housing.waitlist.open',
  closed: 'housing.waitlist.closed',
  temporarily_closed: 'housing.waitlist.temporarilyClosed',
  unknown: 'housing.waitlist.unknown',
}

/**
 * How many days since the waitlist was checked, or null if never.
 *
 * Waitlist state moves faster than anything else StreetRise lists, so the
 * status is never shown without this. A six-month-old "open" is not evidence
 * that a waitlist is open today, and presenting it as though it were is how a
 * directory sends someone to queue for a list that closed in spring.
 */
export function waitlistAgeDays(
  checkedAt: string | null | undefined,
  now: Date = new Date()
): number | null {
  if (!checkedAt) return null
  const then = new Date(checkedAt)
  if (Number.isNaN(then.getTime())) return null
  return Math.max(0, Math.floor((now.getTime() - then.getTime()) / 86_400_000))
}

/** Past this, an "open" waitlist is reported as unconfirmed rather than open. */
export const WAITLIST_TRUST_DAYS = 30

export function waitlistIsStale(
  checkedAt: string | null | undefined,
  now: Date = new Date()
): boolean {
  const age = waitlistAgeDays(checkedAt, now)
  return age === null || age > WAITLIST_TRUST_DAYS
}

// ------------------------------------------------------------
// Fetching housing
// ------------------------------------------------------------

/**
 * Every publicly visible housing resource, INCLUDING the ones with no
 * coordinates.
 *
 * This exists because `fetchMapResources()` requires `is_map_ready = true` and
 * non-null lat/lng — correct for a map, wrong for housing. A Housing Choice
 * Voucher programme is a phone-and-paperwork service run out of a housing
 * authority office; a housing navigation service is a caseworker on a phone
 * line; a domestic-violence transitional house has a confidential address on
 * purpose. None of them can be given coordinates honestly, and all of them are
 * exactly what somebody searching for housing needs to find.
 *
 * Without this, `/housing` delegating all discovery to `/map` would mean those
 * listings had no public browse path at all — they would exist in the database
 * and be unreachable. That is the same trap `/transportation` had to avoid, and
 * `fetchRideAssistance()` in rideOptions.ts is the precedent this follows:
 * keep the whole public visibility predicate, drop only the coordinate
 * requirement.
 *
 * Located listings still appear on the map as normal. This is an additional
 * path, not a replacement.
 */
export async function fetchHousingResources(): Promise<Resource[]> {
  const run = (select: string) =>
    db.resources()
      .select(select)
      .eq('is_active', true)
      .in('verification_status', ['verified', 'pending'])
      .eq('category', 'housing')
      .order('name')

  let { data, error } = await run(HOUSING_EMBED)
  if (error && isMissingHousingRelation(error)) {
    const retry = await run('*')
    data = retry.data
    error = retry.error
  }
  if (error) throw error

  return ((data ?? []) as unknown as Record<string, unknown>[]).map((row) => ({
    ...(row as unknown as Resource),
    housing: normalizeHousingEmbed(row.housing),
  }))
}

/**
 * Does this resource satisfy a shortcut's facets?
 *
 * Deliberately reuses the same semantics as the map predicates in
 * mapFilters.ts: an affirmative facet needs an EXPLICIT true, so an unrecorded
 * eligibility answer never qualifies a listing into a "voucher friendly" or
 * "second chance" result set it has not earned.
 */
export function matchesShortcut(r: Resource, s: HousingShortcut): boolean {
  const f = s.filters
  if (f.housingKinds?.length) {
    if (!r.resource_type || !f.housingKinds.includes(r.resource_type)) return false
  }
  if (f.acceptsVouchers && r.housing?.accepts_vouchers !== true) return false
  if (f.considersRecord) {
    const considers =
      r.housing?.accepts_felony === true ||
      (r.population_focus?.includes('reentry') ?? false)
    if (!considers) return false
  }
  if (f.populationFocus?.length) {
    if (!f.populationFocus.some((t) => r.population_focus?.includes(t))) return false
  }
  return true
}

// ------------------------------------------------------------
// /housing shortcuts
// ------------------------------------------------------------

export interface HousingShortcut {
  slug: string
  labelKey: string
  descriptionKey: string
  icon: string
  /**
   * Canonical filters this shortcut expands to. These are ordinary
   * `MapFilters` — the shortcut is a saved search over the same pipeline
   * everything else uses, not a separate query path.
   */
  filters: Partial<MapFilters>
}

/**
 * The shortcuts offered on /housing.
 *
 * Every one is a COMBINATION OF CANONICAL ATTRIBUTES, not a database category.
 * "Second Chance" is not a resource type — it is housing whose record
 * eligibility is open, or which is tagged for reentry. Modelling it as a type
 * would have made it un-crossable with "accepts vouchers" or "men only", which
 * is exactly the search someone leaving prison actually needs to run.
 */
export const HOUSING_SHORTCUTS: HousingShortcut[] = [
  {
    slug: 'affordable',
    labelKey: 'housing.shortcut.affordable.label',
    descriptionKey: 'housing.shortcut.affordable.desc',
    icon: '🏢',
    filters: { category: 'housing', housingKinds: ['affordable_housing', 'public_housing', 'subsidized_housing'] },
  },
  {
    slug: 'voucher-help',
    labelKey: 'housing.shortcut.voucherHelp.label',
    descriptionKey: 'housing.shortcut.voucherHelp.desc',
    icon: '🎟️',
    // Voucher ASSISTANCE — the programme you apply to.
    filters: { category: 'housing', housingKinds: ['voucher_program', 'housing_navigation'] },
  },
  {
    slug: 'voucher-friendly',
    labelKey: 'housing.shortcut.voucherFriendly.label',
    descriptionKey: 'housing.shortcut.voucherFriendly.desc',
    icon: '🔑',
    // Voucher ACCEPTANCE — somewhere that takes the voucher you hold.
    filters: { category: 'housing', acceptsVouchers: true },
  },
  {
    slug: 'second-chance',
    labelKey: 'housing.shortcut.secondChance.label',
    descriptionKey: 'housing.shortcut.secondChance.desc',
    icon: '🌱',
    filters: { category: 'housing', considersRecord: true },
  },
  {
    slug: 'transitional',
    labelKey: 'housing.shortcut.transitional.label',
    descriptionKey: 'housing.shortcut.transitional.desc',
    icon: '🚪',
    filters: { category: 'housing', housingKinds: ['transitional_housing', 'recovery_residence', 'shared_housing'] },
  },
  {
    slug: 'supportive',
    labelKey: 'housing.shortcut.supportive.label',
    descriptionKey: 'housing.shortcut.supportive.desc',
    icon: '🤝',
    filters: { category: 'housing', housingKinds: ['permanent_supportive_housing'] },
  },
  {
    slug: 'veterans',
    labelKey: 'housing.shortcut.veterans.label',
    descriptionKey: 'housing.shortcut.veterans.desc',
    icon: '🎖️',
    filters: { category: 'housing', populationFocus: ['veterans'] },
  },
  {
    slug: 'families',
    labelKey: 'housing.shortcut.families.label',
    descriptionKey: 'housing.shortcut.families.desc',
    icon: '👨‍👩‍👧',
    filters: { category: 'housing', populationFocus: ['families'] },
  },
]

export function housingShortcut(slug: string): HousingShortcut | undefined {
  return HOUSING_SHORTCUTS.find((s) => s.slug === slug)
}

/** Deep link into /map with this shortcut's filters pre-applied. */
export function shortcutMapHref(s: HousingShortcut): string {
  return `/map?housing=${s.slug}`
}
