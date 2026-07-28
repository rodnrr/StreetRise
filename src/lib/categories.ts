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
import type { ResourceCategory, QuickFilterKey, Resource } from '@/types'

export type CategoryPageMode = 'live' | 'static'

export type CategoryMapLink =
  | { category: ResourceCategory }
  | { quickFilter: QuickFilterKey }
  | { hasShowers: true }
  | { subcategory: string[] }

export interface CategoryPageConfig {
  slug: string
  displayName: string
  emoji: string
  mode: CategoryPageMode
  /** Filter to deep-link into /map with the equivalent view pre-applied. */
  mapLink: CategoryMapLink
  description: string
  /** Snapshot resource count backing the `mode` decision — see file header. */
  liveResourceCountSnapshot: number
}

export const CATEGORY_PAGES: CategoryPageConfig[] = [
  {
    slug: 'food-pantries',
    displayName: 'Food Pantries',
    emoji: '🍽️',
    mode: 'live',
    mapLink: { category: 'food' },
    description: 'Food pantries, hot meals, and food assistance across Tampa Bay and Orlando.',
    liveResourceCountSnapshot: 26,
  },
  {
    slug: 'shelters',
    displayName: 'Shelters',
    emoji: '🏠',
    mode: 'live',
    mapLink: { category: 'shelter' },
    description: 'Emergency and transitional shelter listings with real-time bed availability.',
    liveResourceCountSnapshot: 23,
  },
  {
    slug: 'medical',
    displayName: 'Medical Care',
    emoji: '⚕️',
    mode: 'live',
    mapLink: { category: 'medical' },
    description: 'Free and low-cost medical clinics and healthcare services.',
    liveResourceCountSnapshot: 9,
  },
  {
    slug: 'employment',
    displayName: 'Employment & Work Exchange',
    emoji: '💼',
    mode: 'live',
    mapLink: { category: 'work_exchange' }, // site copy says "Employment" — schema value stays work_exchange
    description: 'Job training, career centers, and work-exchange opportunities.',
    liveResourceCountSnapshot: 16,
  },
  {
    slug: 'hygiene',
    displayName: 'Hygiene',
    emoji: '🚿',
    mode: 'live',
    // 'hygiene' as a category has 0 direct rows; fetchMapResources() already special-cases
    // category === 'hygiene' as an OR across has_showers/has_restrooms (mapFilters.ts:220-224).
    // Passing category=hygiene here reuses that existing logic, not a new query.
    mapLink: { category: 'hygiene' },
    description: 'Places to shower, use a restroom, or access hygiene supplies.',
    liveResourceCountSnapshot: 14,
  },
  {
    slug: 'showers',
    displayName: 'Showers',
    emoji: '🚿',
    mode: 'live',
    // Distinct from /hygiene: has_showers only, not the broader showers-OR-restrooms set.
    mapLink: { hasShowers: true },
    description: 'Find a place to shower today.',
    liveResourceCountSnapshot: 9,
  },
  {
    slug: 'legal',
    displayName: 'Legal Help',
    emoji: '⚖️',
    mode: 'static',
    mapLink: { category: 'legal' },
    description: 'Legal aid and services for people facing housing or benefits issues.',
    liveResourceCountSnapshot: 0,
  },
  {
    slug: 'veterans',
    displayName: 'Veterans',
    emoji: '🎖️',
    mode: 'static',
    // Precise filter (population_focus contains 'veterans') — real but thin (2 resources).
    // Requires MapPage to read a ?quickFilter= param (currently only ?category= is wired —
    // see MapPage.tsx:93-98) before this CTA can deep-link. Needed in Phase 6.
    mapLink: { quickFilter: 'veteran_support' },
    description: 'Resources with veteran-specific support.',
    liveResourceCountSnapshot: 2,
  },
  {
    slug: 'youth',
    displayName: 'Youth',
    emoji: '🧑',
    mode: 'static',
    // Precise filter via the subcategory column (not resource_type — that field is
    // 0 for this record; the tag only lives in subcategory). The map's own
    // 'youth_support' quickFilter is a deliberately fail-open safety filter
    // (gender_policy IN youth_only/gender_inclusive/unknown ≈ 105 of 111 resources)
    // and is NOT an honest count for marketing copy, so it's not used here.
    mapLink: { subcategory: ['youth_shelter'] },
    description: 'Support for youth experiencing homelessness or housing instability.',
    liveResourceCountSnapshot: 1,
  },
  {
    slug: 'families',
    displayName: 'Families',
    emoji: '👨‍👩‍👧',
    mode: 'static',
    // Precise filter via subcategory. gender_policy = 'family_only' is 0 rows
    // (unused in practice) and the 'family_help' quickFilter is fail-open
    // (≈104 of 111 resources via gender_inclusive/unknown) — neither is honest here.
    mapLink: { subcategory: ['family_support', 'women_children_shelter'] },
    description: 'Shelter and support services for families in crisis.',
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
  let query = db.resources()
    .select('*')
    .eq('is_active', true)
    .eq('verification_status', 'verified')
    .eq('is_map_ready', true)

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
  } else if ('quickFilter' in mapLink && mapLink.quickFilter === 'veteran_support') {
    query = query.contains('population_focus', ['veterans'])
  }

  const { data, error } = await query.order('updated_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as Resource[]
}

/** Builds the /map search-string equivalent of a CategoryMapLink, for CTA links. */
export function categoryMapLinkToSearch(mapLink: CategoryMapLink): string {
  if ('category' in mapLink) return `?category=${mapLink.category}`
  if ('quickFilter' in mapLink) return `?quickFilter=${mapLink.quickFilter}`
  if ('subcategory' in mapLink) return `?subcategory=${mapLink.subcategory.join(',')}`
  if ('hasShowers' in mapLink) return '?hasShowers=true'
  return ''
}
