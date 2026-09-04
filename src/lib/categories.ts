// ============================================================
// StreetRise — Public Category Page Configuration
// ============================================================
//
// Single source of truth mapping public marketing URLs (e.g. /food-pantries)
// to EXISTING Supabase category values / map filters. This file renames for
// presentation only — it must never introduce a new category value or alter
// how /map filters resources. Live counts below are a snapshot (2026-07-28,
// project mldatfcwnmvrmxumzxyb) for architecture reference only; re-check
// against the `resources` table before relying on them for real content.

import { db } from '@/lib/supabase'
import { normalizeHousingEmbed, HOUSING_EMBED, isMissingHousingRelation } from '@/lib/housing'
import type { ResourceCategory, QuickFilterKey, Resource } from '@/types'

export type CategoryPageMode = 'live' | 'static'

export type CategoryMapLink =
  | { category: ResourceCategory }
  | { quickFilter: QuickFilterKey }
  | { hasShowers: true }
  | { subcategory: string[] }
  // Who a resource serves, not what it is — `population_focus` array overlap.
  // Still presentation-only: it reuses the map's existing populationFocus
  // facet and introduces no category value (migration 036 added the
  // `students` tag itself).
  | { populationFocus: string[] }

export interface CategoryPageConfig {
  slug: string
  displayName: string
  /** i18n.ts key for the translated display name — use via `t(displayNameKey)`. */
  displayNameKey: string
  emoji: string
  mode: CategoryPageMode
  /** Filter to deep-link into /map with the equivalent view pre-applied. */
  mapLink: CategoryMapLink
  description: string
  /** i18n.ts key for the translated description — use via `t(descriptionKey)`. */
  descriptionKey: string
  /** Snapshot resource count backing the `mode` decision — see file header. */
  liveResourceCountSnapshot: number
}

export const CATEGORY_PAGES: CategoryPageConfig[] = [
  {
    slug: 'food-pantries',
    displayName: 'Food Pantries',
    displayNameKey: 'categoryPage.food-pantries.name',
    emoji: '🍽️',
    mode: 'live',
    mapLink: { category: 'food' },
    description: 'Food pantries, hot meals, and food assistance across Tampa Bay, Orlando, and South Florida.',
    descriptionKey: 'categoryPage.food-pantries.description',
    liveResourceCountSnapshot: 26,
  },
  {
    slug: 'shelters',
    displayName: 'Shelters',
    displayNameKey: 'categoryPage.shelters.name',
    emoji: '🏠',
    mode: 'live',
    mapLink: { category: 'shelter' },
    description: 'Emergency and transitional shelter listings with real-time bed availability.',
    descriptionKey: 'categoryPage.shelters.description',
    liveResourceCountSnapshot: 23,
  },
  {
    slug: 'medical',
    displayName: 'Medical Care',
    displayNameKey: 'categoryPage.medical.name',
    emoji: '⚕️',
    mode: 'live',
    mapLink: { category: 'medical' },
    description: 'Free and low-cost medical clinics and healthcare services.',
    descriptionKey: 'categoryPage.medical.description',
    liveResourceCountSnapshot: 9,
  },
  {
    slug: 'employment',
    displayName: 'Employment & Work Exchange',
    displayNameKey: 'categoryPage.employment.name',
    emoji: '💼',
    mode: 'live',
    mapLink: { category: 'work_exchange' }, // site copy says "Employment" — schema value stays work_exchange
    description: 'Job training, career centers, and work-exchange opportunities.',
    descriptionKey: 'categoryPage.employment.description',
    liveResourceCountSnapshot: 16,
  },
  {
    slug: 'hygiene',
    displayName: 'Hygiene',
    displayNameKey: 'categoryPage.hygiene.name',
    emoji: '🚿',
    mode: 'live',
    // 'hygiene' as a category has 0 direct rows; fetchMapResources() already special-cases
    // category === 'hygiene' as an OR across has_showers/has_restrooms (mapFilters.ts:220-224).
    // Passing category=hygiene here reuses that existing logic, not a new query.
    mapLink: { category: 'hygiene' },
    description: 'Places to shower, use a restroom, or access hygiene supplies.',
    descriptionKey: 'categoryPage.hygiene.description',
    liveResourceCountSnapshot: 14,
  },
  {
    slug: 'showers',
    displayName: 'Showers',
    displayNameKey: 'categoryPage.showers.name',
    emoji: '🚿',
    mode: 'live',
    // Distinct from /hygiene: has_showers only, not the broader showers-OR-restrooms set.
    mapLink: { hasShowers: true },
    description: 'Find a place to shower today.',
    descriptionKey: 'categoryPage.showers.description',
    liveResourceCountSnapshot: 9,
  },
  {
    slug: 'legal',
    displayName: 'Legal Help',
    displayNameKey: 'categoryPage.legal.name',
    emoji: '⚖️',
    mode: 'static',
    mapLink: { category: 'legal' },
    description: 'Legal aid and services for people facing housing or benefits issues.',
    descriptionKey: 'categoryPage.legal.description',
    liveResourceCountSnapshot: 0,
  },
  {
    slug: 'veterans',
    displayName: 'Veterans',
    displayNameKey: 'categoryPage.veterans.name',
    emoji: '🎖️',
    mode: 'static',
    // Precise filter (population_focus contains 'veterans') — real but thin (2 resources).
    // Requires MapPage to read a ?quickFilter= param (currently only ?category= is wired —
    // see MapPage.tsx:93-98) before this CTA can deep-link. Needed in Phase 6.
    mapLink: { quickFilter: 'veteran_support' },
    description: 'Resources with veteran-specific support.',
    descriptionKey: 'categoryPage.veterans.description',
    liveResourceCountSnapshot: 2,
  },
  {
    slug: 'youth',
    displayName: 'Youth',
    displayNameKey: 'categoryPage.youth.name',
    emoji: '🧑',
    mode: 'static',
    // Precise filter via the subcategory column (not resource_type — that field is
    // 0 for this record; the tag only lives in subcategory). The map's own
    // 'youth_support' quickFilter is a deliberately fail-open safety filter
    // (gender_policy IN youth_only/gender_inclusive/unknown ≈ 105 of 111 resources)
    // and is NOT an honest count for marketing copy, so it's not used here.
    mapLink: { subcategory: ['youth_shelter'] },
    description: 'Support for youth experiencing homelessness or housing instability.',
    descriptionKey: 'categoryPage.youth.description',
    liveResourceCountSnapshot: 1,
  },
  {
    slug: 'students',
    displayName: 'Students & School Support',
    displayNameKey: 'categoryPage.students.name',
    emoji: '🎒',
    // 'live' from the moment migration 036 is applied: 20 seeded rows, every
    // one tagged population_focus ∋ 'students'. Until then this page renders
    // its static copy rather than an empty list.
    mode: 'live',
    mapLink: { populationFocus: ['students'] },
    description:
      'Free school clothing, uniforms, shoes and student support for families in Tampa Bay, Orlando, and Miami. Some are walk-in; some are arranged through your school counsellor or social worker.',
    descriptionKey: 'categoryPage.students.description',
    liveResourceCountSnapshot: 20,
  },
  {
    slug: 'families',
    displayName: 'Families',
    displayNameKey: 'categoryPage.families.name',
    emoji: '👨‍👩‍👧',
    mode: 'static',
    // Precise filter via subcategory. gender_policy = 'family_only' is 0 rows
    // (unused in practice) and the 'family_help' quickFilter is fail-open
    // (≈104 of 111 resources via gender_inclusive/unknown) — neither is honest here.
    mapLink: { subcategory: ['family_support', 'women_children_shelter'] },
    description: 'Shelter and support services for families in crisis.',
    descriptionKey: 'categoryPage.families.description',
    liveResourceCountSnapshot: 6,
  },
]

export function getCategoryPage(slug: string): CategoryPageConfig | undefined {
  return CATEGORY_PAGES.find((c) => c.slug === slug)
}

/**
 * Fetches resources for a 'live' category page. Deliberately NOT reusing
 * fetchMapResources()/MapFilters — that query builder assumes a viewport
 * (lat/lng + radius), which has no meaning for a sitewide marketing browse
 * page. This is a separate, simpler, unfiltered-by-location query so it
 * can't accidentally clip results or change the live map's own behavior.
 */
export async function fetchCategoryResources(mapLink: CategoryMapLink): Promise<Resource[]> {
  // Same embed as fetchMapResources, so a category page and the map it links
  // into produce the identical Resource shape. Without it, a card rendered here
  // would silently lose its housing eligibility block. `select` is a parameter
  // so the whole query can be replayed without the embed if migration 057 has
  // not been applied yet — see isMissingHousingRelation.
  const build = (select: string) => {
  let query = db.resources()
    .select(select)
    // Same public visibility predicate the map uses (fetchMapResources).
    // This previously read `verification_status = 'verified'` only, which
    // silently gave a category page a smaller world than the map it links
    // into — /shelters listed 23 while the map showed 34 of the same rows,
    // and an entire seed batch could be invisible here while being live on
    // the map. These pages are documented as presentation-only aliases over
    // the map's filters, so they have to agree on what is public. The cards
    // carry the Staff Verified / Community Listed badge so the distinction
    // stays visible rather than disappearing.
    .eq('is_active', true)
    .in('verification_status', ['verified', 'pending'])
    .eq('is_map_ready', true)
    // The coordinate checks are part of the predicate, not belt-and-braces.
    // `is_map_ready` is NOT NULL DEFAULT TRUE (migration 004), and
    // ProviderListingEdit's schema has lat/lng optional+nullable, so a
    // provider can save a listing with no coordinates and the default leaves
    // it flagged map-ready. The map drops that row on these very checks; a
    // category page without them would publish a listing the map it links
    // into cannot show. Zero such rows exist on live today — this keeps the
    // equivalence true rather than true-by-luck.
    .not('lat', 'is', null)
    .not('lng', 'is', null)

  if ('category' in mapLink) {
    if (mapLink.category === 'hygiene') {
      // Mirrors the special-case in mapFilters.ts's fetchMapResources.
      query = query.or('category.eq.hygiene,has_showers.eq.true,has_restrooms.eq.true')
    } else {
      query = query.eq('category', mapLink.category)
    }
  } else if ('hasShowers' in mapLink) {
    query = query.eq('has_showers', true)
  } else if ('subcategory' in mapLink) {
    query = query.in('subcategory', mapLink.subcategory)
  } else if ('populationFocus' in mapLink) {
    // Array overlap — matches the map's populationFocus facet, which is an
    // "any of these tags" test, not "all of them".
    query = query.overlaps('population_focus', mapLink.populationFocus)
  } else if ('quickFilter' in mapLink && mapLink.quickFilter === 'veteran_support') {
    query = query.contains('population_focus', ['veterans'])
  }

    return query.order('updated_at', { ascending: false })
  }

  let { data, error } = await build(HOUSING_EMBED)
  if (error && isMissingHousingRelation(error)) {
    const retry = await build('*')
    data = retry.data
    error = retry.error
  }
  if (error) throw error

  return ((data ?? []) as unknown as Record<string, unknown>[]).map((row) => ({
    ...(row as unknown as Resource),
    housing: normalizeHousingEmbed(row.housing),
  }))
}

/** Builds the /map search-string equivalent of a CategoryMapLink, for CTA links. */
export function categoryMapLinkToSearch(mapLink: CategoryMapLink): string {
  if ('category' in mapLink) return `?category=${mapLink.category}`
  if ('quickFilter' in mapLink) return `?quickFilter=${mapLink.quickFilter}`
  if ('subcategory' in mapLink) return `?subcategory=${mapLink.subcategory.join(',')}`
  if ('populationFocus' in mapLink) return `?populationFocus=${mapLink.populationFocus.join(',')}`
  if ('hasShowers' in mapLink) return '?hasShowers=true'
  return ''
}
