// ============================================================
// StreetRise — Map Filter Query Builder & Display Constants
// ============================================================

import { db } from '@/lib/supabase'
import type { Resource, MapFilters, QuickFilterKey, ResourceCategory } from '@/types'

// ── Constants ────────────────────────────────────────────────────

export const DEFAULT_RADIUS_KM = 20
export const MIN_CONFIDENCE_SCORE = 20

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

// ── Query Builder ─────────────────────────────────────────────────

export async function fetchMapResources(
  lat: number,
  lng: number,
  filters: MapFilters = {},
  searchQuery = '',
): Promise<Resource[]> {
  const radiusKm = filters.radius ?? DEFAULT_RADIUS_KM
  const latDelta = radiusKm / 111
  const lngDelta = radiusKm / (111 * Math.max(Math.cos((lat * Math.PI) / 180), 0.2))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = db.resources()
    .select('*')
    .eq('is_active', true)
    .in('verification_status', filters.verifiedOnly ? ['verified'] : ['verified', 'pending'])
    .eq('is_map_ready', true)
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .gte('lat', lat - latDelta)
    .lte('lat', lat + latDelta)
    .gte('lng', lng - lngDelta)
    .lte('lng', lng + lngDelta)

  // Exclude low-confidence resources unless user explicitly opts in
  if (!filters.showLowConfidence) {
    query = query.gte('confidence_score', MIN_CONFIDENCE_SCORE)
  }

  // Legacy availability status
  if (filters.availabilityStatus) {
    query = query.eq('availability_status', filters.availabilityStatus)
  }

  // Quick filter overrides category/resourceType
  if (filters.quickFilter) {
    query = applyQuickFilter(query, filters.quickFilter)
  } else {
    if (filters.category === 'hygiene') {
      // "Hygiene" is a need, not a single category: surface anywhere someone can
      // shower or use a restroom (e.g. parks tagged under outdoor_space) alongside
      // any dedicated hygiene listings.
      query = query.or('category.eq.hygiene,has_showers.eq.true,has_restrooms.eq.true')
    } else if (filters.category) {
      query = query.eq('category', filters.category)
    }
    if (filters.resourceType) {
      query = query.eq('resource_type', filters.resourceType)
    }
  }

  // Overnight
  if (filters.overnightAllowed === true) {
    query = query.eq('overnight_allowed', true)
  }

  // Access conditions
  if (filters.walkInsOnly) {
    query = query.eq('walk_ins_accepted', true)
  }
  if (filters.noCallRequired) {
    query = query.eq('phone_required_before_arrival', false)
  }
  if (filters.noReferralRequired) {
    query = query.eq('requires_referral', false)
  }
  if (filters.noIdRequired) {
    query = query.eq('requires_id', false)
  }

  // Facility booleans
  if (filters.hasShowers)           query = query.eq('has_showers', true)
  if (filters.hasRestrooms)         query = query.eq('has_restrooms', true)
  if (filters.servesMeals)          query = query.eq('serves_meals', true)
  if (filters.hasLaundry)           query = query.eq('has_laundry', true)
  if (filters.petFriendly)          query = query.eq('pet_friendly', true)
  if (filters.wheelchairAccessible) query = query.eq('wheelchair_accessible', true)
  if (filters.nearTransit)          query = query.eq('public_transit_accessible', true)

  // Gender policy — include 'unknown' so resources with unconfirmed eligibility
  // stay visible rather than being filtered out alongside the explicit choices.
  if (filters.genderPolicy && filters.genderPolicy.length > 0) {
    query = query.in('gender_policy', [...filters.genderPolicy, 'unknown'])
  }

  // Population focus (array overlap — resource must contain ANY of the specified tags)
  if (filters.populationFocus && filters.populationFocus.length > 0) {
    query = query.overlaps('population_focus', filters.populationFocus)
  }

  const { data, error } = await query
  if (error) throw error

  let results = (data ?? []) as unknown as Resource[]

  // Client-side text search (searches the already-fetched results)
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim()
    results = results.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        (r.resource_type?.toLowerCase() ?? '').includes(q) ||
        (r.address.city?.toLowerCase() ?? '').includes(q) ||
        (r.description?.toLowerCase() ?? '').includes(q),
    )
  }

  // Client-side staleness filter
  if (filters.hideStale) {
    results = results.filter((r) => getTrustInfo(r).level !== 'stale')
  }

  return results
}

// Apply semantic quick filter conditions to a Supabase query
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyQuickFilter(query: any, key: QuickFilterKey): any {
  switch (key) {
    case 'shelter_tonight':
      // Shelter with confirmed overnight access
      return query.eq('category', 'shelter').eq('overnight_allowed', true)

    case 'food_today':
      // Food category OR any resource that serves meals
      return query.or('category.eq.food,serves_meals.eq.true')

    case 'shower_restroom':
      // Either showers or restrooms available
      return query.or('has_showers.eq.true,has_restrooms.eq.true')

    case 'safe_daytime':
      // Day-use outdoor/park spaces that are explicitly NOT overnight
      return query
        .in('category', ['day_space', 'outdoor_space'])
        .or('overnight_allowed.is.null,overnight_allowed.eq.false')

    // Gendered filters fail open: a resource whose eligibility is unconfirmed
    // ('unknown') must still appear, so an untagged shelter isn't hidden from
    // someone who needs it. Only resources tagged for a *different* group drop out.
    case 'family_help':
      return query.in('gender_policy', ['family_only', 'gender_inclusive', 'unknown'])

    case 'mens_help':
      return query.in('gender_policy', ['men_only', 'gender_inclusive', 'unknown'])

    case 'womens_help':
      return query.in('gender_policy', ['women_only', 'gender_inclusive', 'unknown'])

    case 'veteran_support':
      return query.contains('population_focus', ['veterans'])

    case 'lgbtq_support':
      return query.contains('population_focus', ['lgbtq'])

    case 'youth_support':
      return query.in('gender_policy', ['youth_only', 'gender_inclusive', 'unknown'])

    case 'dv_support':
      return query.contains('population_focus', ['domestic_violence'])

    default:
      return query
  }
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

export function countActiveFilters(filters: MapFilters): number {
  let n = 0
  if (filters.quickFilter)          n++
  else if (filters.category)        n++
  if (filters.resourceType)         n++
  if (filters.genderPolicy?.length) n++
  if (filters.populationFocus?.length) n++
  if (filters.overnightAllowed)     n++
  if (filters.walkInsOnly)          n++
  if (filters.noCallRequired)       n++
  if (filters.noReferralRequired)   n++
  if (filters.noIdRequired)         n++
  if (filters.hasShowers)           n++
  if (filters.hasRestrooms)         n++
  if (filters.servesMeals)          n++
  if (filters.hasLaundry)           n++
  if (filters.petFriendly)          n++
  if (filters.wheelchairAccessible) n++
  if (filters.nearTransit)          n++
  if (filters.verifiedOnly)         n++
  if (filters.hideStale)            n++
  if (filters.availabilityStatus)   n++
  return n
}

export function activeFilterSummary(filters: MapFilters): string {
  if (filters.quickFilter) {
    return QUICK_FILTER_DEFS[filters.quickFilter].label
  }
  if (filters.category) {
    return CATEGORY_LABEL[filters.category] ?? filters.category
  }
  return ''
}
