// ============================================================
// StreetRise — Second-Chance Housing Directory data layer
// ============================================================
//
// Backs /housing (migrations 056–058). Separate from mapFilters.ts and
// categories.ts, which serve the Florida resource map — this directory
// is national, state-first, and not point-located.
//
// Two rules live in this file rather than in the components, because
// they are the ones that cause real-world harm when they drift:
//
//   1. A null tri-state boolean is UNKNOWN, never "no".
//      answerFor() is the only place that decision is made.
//   2. Staleness is disclosed, never hidden. A listing past
//      STALE_AFTER_DAYS keeps rendering with a warning attached; it
//      does not disappear. Hiding an old listing looks like tidiness
//      and behaves like deleting somebody's last option.

import { supabase } from '@/lib/supabase'
import type {
  HousingState,
  HousingOrganization,
  HousingLocation,
  HousingProgram,
  HousingProgramWithOrg,
  HousingSourceAttribution,
  HousingReportInput,
  HousingType,
  HousingOrgType,
  HousingGenderServed,
} from '@/types'

// Table handles. Kept local rather than added to `db` in supabase.ts:
// database.types.ts is hand-maintained and does not describe these
// tables, so every read goes through the casts here — the same pattern
// transit.ts uses for the GTFS tables.
/* eslint-disable @typescript-eslint/no-explicit-any */
const t = {
  states:        () => (supabase as any).from('housing_states'),
  orgs:          () => (supabase as any).from('housing_organizations'),
  locations:     () => (supabase as any).from('housing_locations'),
  programs:      () => (supabase as any).from('housing_programs'),
  attribution:   () => (supabase as any).from('housing_source_attribution'),
  reports:       () => (supabase as any).from('housing_reports'),
  verifications: () => (supabase as any).from('housing_verifications'),
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Past this many days since the last confirmed check, a listing carries
 * a visible staleness warning. From the build spec.
 */
export const STALE_AFTER_DAYS = 180

// ------------------------------------------------------------
// Tri-state answers
// ------------------------------------------------------------

export type TriState = 'yes' | 'no' | 'unknown'

export interface TriAnswer {
  value: TriState
  /** What to actually print. Never the bare word "No" for an unknown. */
  label: string
}

/**
 * The single place a `boolean | null` becomes words.
 *
 * The unknown label is a full sentence with an instruction in it, not a
 * dash or an "N/A", because the reader is deciding whether to spend a
 * bus fare on this address. "Not stated" alone invites them to assume;
 * "call to ask" tells them the next action.
 */
export function answerFor(
  value: boolean | null | undefined,
  labels: { yes: string; no: string }
): TriAnswer {
  if (value === true)  return { value: 'yes',     label: labels.yes }
  if (value === false) return { value: 'no',      label: labels.no }
  return { value: 'unknown', label: 'Not stated — call to ask' }
}

/** Copy for each record-related field, phrased from the applicant's side. */
export const RECORD_QUESTIONS = [
  {
    key: 'accepts_felony' as const,
    question: 'Accepts felony records',
    yes: 'Yes — felony records considered',
    no: 'No — does not accept felony records',
  },
  {
    key: 'accepts_violent_offense' as const,
    question: 'Accepts violent offense records',
    yes: 'Yes — violent offense records considered',
    no: 'No — does not accept violent offense records',
  },
  {
    key: 'accepts_sex_offense' as const,
    question: 'Accepts sex offense records',
    yes: 'Yes — sex offense records considered',
    no: 'No — does not accept sex offense records',
  },
]

export const RULE_QUESTIONS = [
  {
    key: 'accepts_vouchers' as const,
    question: 'Housing vouchers',
    yes: 'Accepts housing vouchers',
    no: 'Does not accept housing vouchers',
  },
  {
    key: 'requires_sobriety' as const,
    question: 'Sobriety required',
    yes: 'Sobriety required',
    no: 'Sobriety not required',
  },
  {
    key: 'has_curfew' as const,
    question: 'Curfew',
    yes: 'Has a curfew',
    no: 'No curfew',
  },
]

// ------------------------------------------------------------
// Freshness
// ------------------------------------------------------------

export interface Freshness {
  /** Plain language, e.g. "Confirmed 3 months ago". */
  label: string
  isStale: boolean
  /** True when nobody has ever confirmed this listing. */
  neverVerified: boolean
}

/**
 * "Confirmed 3 months ago" — plain language, no date arithmetic for the
 * reader to do.
 *
 * A never-verified listing is called out as such rather than quietly
 * inheriting created_at. The distinction matters: "we added this and
 * never checked it" and "we checked it in March" are different claims,
 * and only one of them earns any trust.
 */
export function freshnessFor(lastVerifiedAt: string | null, now: Date = new Date()): Freshness {
  if (!lastVerifiedAt) {
    return {
      label: 'Never confirmed by StreetRise',
      isStale: true,
      neverVerified: true,
    }
  }

  const then = new Date(lastVerifiedAt)
  if (Number.isNaN(then.getTime())) {
    return { label: 'Never confirmed by StreetRise', isStale: true, neverVerified: true }
  }

  const days = Math.max(0, Math.floor((now.getTime() - then.getTime()) / 86_400_000))
  const isStale = days > STALE_AFTER_DAYS

  let ago: string
  if (days === 0)      ago = 'today'
  else if (days === 1) ago = 'yesterday'
  else if (days < 30)  ago = `${days} days ago`
  else if (days < 60)  ago = 'about a month ago'
  else if (days < 365) ago = `${Math.round(days / 30)} months ago`
  else if (days < 730) ago = 'about a year ago'
  else                 ago = `${Math.round(days / 365)} years ago`

  return {
    label: days === 0 ? 'Confirmed today' : `Confirmed ${ago}`,
    isStale,
    neverVerified: false,
  }
}

// ------------------------------------------------------------
// Display helpers
// ------------------------------------------------------------

export const HOUSING_TYPE_LABELS: Record<HousingType, string> = {
  transitional:         'Transitional housing',
  recovery_residence:   'Recovery residence',
  permanent_supportive: 'Permanent supportive housing',
  rental_unit:          'Rental unit',
  shared_housing:       'Shared housing',
  emergency_shelter:    'Emergency shelter',
}

export const ORG_TYPE_LABELS: Record<HousingOrgType, string> = {
  transitional_housing: 'Transitional housing provider',
  sober_living:         'Sober living',
  reentry_nonprofit:    'Reentry nonprofit',
  housing_authority:    'Housing authority',
  landlord:             'Landlord',
  legal_aid:            'Legal aid',
  shelter:              'Shelter',
}

export const GENDER_LABELS: Record<HousingGenderServed, string> = {
  any:    'Open to any gender',
  men:    'Men only',
  women:  'Women only',
  other:  'See program notes',
}

/**
 * Money, or an honest blank. `null` is not "free" — a program with no
 * recorded rent renders "Not stated", never "$0".
 */
export function formatMoney(cents: number | null): string | null {
  if (cents === null || cents === undefined) return null
  if (cents === 0) return 'No cost'
  const dollars = cents / 100
  return dollars % 1 === 0
    ? `$${dollars.toLocaleString('en-US')}`
    : `$${dollars.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatStay(days: number | null): string | null {
  if (!days) return null
  if (days < 31)  return `Up to ${days} days`
  if (days < 365) return `Up to about ${Math.round(days / 30)} months`
  const years = days / 365
  return years === 1 ? 'Up to about 1 year' : `Up to about ${Math.round(years)} years`
}

/** Single-line address, skipping the parts we do not have. */
export function formatAddress(loc: HousingLocation | undefined | null): string | null {
  if (!loc) return null
  const street = [loc.address_line1, loc.address_line2].filter(Boolean).join(', ')
  const town = [loc.city, loc.state_code].filter(Boolean).join(', ')
  const line = [street, town, loc.postal_code].filter(Boolean).join(' ').trim()
  return line || null
}

/** US state code → the URL segment used at /housing/:state. */
export function stateSlug(code: string): string {
  return code.toLowerCase()
}

// ------------------------------------------------------------
// Queries
// ------------------------------------------------------------

export async function fetchStates(): Promise<HousingState[]> {
  const { data, error } = await t.states().select('*').order('name')
  if (error) throw error
  return (data ?? []) as HousingState[]
}

export async function fetchState(code: string): Promise<HousingState | null> {
  const { data, error } = await t.states()
    .select('*')
    .eq('code', code.toUpperCase())
    .maybeSingle()
  if (error) throw error
  return (data ?? null) as HousingState | null
}

/**
 * Every published program with a location in this state.
 *
 * Reads programs → organization → locations in one round trip. RLS does
 * the publishing gate on both sides (migration 056 §12), so this query
 * carries no is_published filter of its own — one place to get it
 * wrong instead of two.
 *
 * The state filter is applied in the browser rather than as a nested
 * PostgREST filter: an organization can have addresses in more than one
 * state, and a nested .eq() would return the org with only the matching
 * address attached, silently hiding its other offices from the org page
 * that reuses this shape.
 */
export async function fetchProgramsByState(stateCode: string): Promise<HousingProgramWithOrg[]> {
  const code = stateCode.toUpperCase()

  const { data, error } = await t.programs()
    .select(`
      *,
      organization:housing_organizations!inner (
        *,
        locations:housing_locations ( * )
      )
    `)
    .order('name')

  if (error) throw error

  type Row = HousingProgram & {
    organization: HousingOrganization & { locations: HousingLocation[] }
  }

  return ((data ?? []) as Row[])
    .filter((row) => (row.organization?.locations ?? []).some((l) => l.state_code === code))
    .map((row) => ({
      ...row,
      organization: row.organization,
      locations: row.organization.locations ?? [],
    }))
}

export async function fetchOrgBySlug(slug: string): Promise<{
  organization: HousingOrganization
  locations: HousingLocation[]
  programs: HousingProgram[]
  sources: HousingSourceAttribution[]
} | null> {
  const { data, error } = await t.orgs()
    .select(`
      *,
      locations:housing_locations ( * ),
      programs:housing_programs ( * )
    `)
    .eq('slug', slug)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const org = data as HousingOrganization & {
    locations: HousingLocation[]
    programs: HousingProgram[]
  }

  // Attribution comes from the column-limited view, not the base table —
  // housing_sources.raw_payload can hold more of an upstream record than
  // we publish.
  const { data: sources, error: srcErr } = await t.attribution()
    .select('*')
    .eq('organization_id', org.id)
    .order('retrieved_at', { ascending: false })

  if (srcErr) throw srcErr

  return {
    organization: org,
    locations: org.locations ?? [],
    programs: (org.programs ?? []).slice().sort((a, b) => a.name.localeCompare(b.name)),
    sources: (sources ?? []) as HousingSourceAttribution[],
  }
}

/** Which states actually have something to show, for the state picker. */
export async function fetchStateCounts(): Promise<Record<string, number>> {
  const { data, error } = await t.programs()
    .select('id, organization:housing_organizations!inner ( locations:housing_locations ( state_code ) )')

  if (error) throw error

  type Row = { organization: { locations: { state_code: string | null }[] } | null }
  const counts: Record<string, number> = {}

  for (const row of (data ?? []) as Row[]) {
    // A program counts once per state it has an address in, not once per
    // address — two Miami houses under one org are one Florida listing
    // from the picker's point of view.
    const seen = new Set<string>()
    for (const loc of row.organization?.locations ?? []) {
      if (loc.state_code && !seen.has(loc.state_code)) {
        seen.add(loc.state_code)
        counts[loc.state_code] = (counts[loc.state_code] ?? 0) + 1
      }
    }
  }
  return counts
}

/**
 * File a public correction.
 *
 * Deliberately no `.select()` on the insert: anon has INSERT but no
 * SELECT on housing_reports (migration 056 §12), so asking for the row
 * back turns a successful write into an error the user sees as failure.
 */
export async function submitReport(input: HousingReportInput): Promise<void> {
  const { error } = await t.reports().insert({
    program_id:    input.program_id,
    report_type:   input.report_type,
    message:       input.message.trim(),
    contact_email: input.contact_email?.trim() || null,
  })
  if (error) throw error
}
