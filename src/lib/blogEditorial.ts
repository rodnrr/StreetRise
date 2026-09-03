export const BLOG_ARTICLE_TYPES = [
  {
    value: 'streetrise_update',
    label: 'StreetRise Update',
    description: 'Product, platform, or organizational news with a concise announcement structure.',
  },
  {
    value: 'city_expansion',
    label: 'City Expansion',
    description: 'A location-specific launch or expansion. Current launch facts must be supplied.',
  },
  {
    value: 'resource_education',
    label: 'Resource Education',
    description: 'Explain how community resources, verification, or service navigation work.',
  },
  {
    value: 'how_to_guide',
    label: 'How-To Guide',
    description: 'Practical, step-by-step guidance for using StreetRise or finding help.',
  },
  {
    value: 'community_spotlight',
    label: 'Provider / Community Spotlight',
    description: 'Highlight an organization or community effort using only supplied facts.',
  },
  {
    value: 'behind_streetrise',
    label: 'Behind StreetRise',
    description: 'Founder, build, trust, process, and behind-the-scenes stories.',
  },
  {
    value: 'volunteer_community',
    label: 'Volunteer & Community',
    description: 'Invite participation, volunteering, outreach, or community involvement.',
  },
  {
    value: 'fundraising_support',
    label: 'Fundraising / Support',
    description: 'Mission-led support content without inventing impact claims or donation outcomes.',
  },
  {
    value: 'general',
    label: 'General',
    description: 'A flexible StreetRise article that does not fit a more specific editorial format.',
  },
] as const

export type BlogArticleType = (typeof BLOG_ARTICLE_TYPES)[number]['value']

export const BLOG_AUDIENCES = [
  { value: 'general', label: 'General audience', prompt: 'StreetRise users, service providers, outreach teams, supporters, and community partners.' },
  { value: 'resource_seekers', label: 'People seeking resources', prompt: 'People using StreetRise to find community resources for themselves, family, or friends.' },
  { value: 'outreach_workers', label: 'Outreach workers', prompt: 'Street outreach workers, case managers, school support staff, and frontline navigators.' },
  { value: 'service_providers', label: 'Service providers', prompt: 'Community organizations and service providers that maintain or may claim StreetRise listings.' },
  { value: 'supporters', label: 'Donors / supporters', prompt: 'Current and prospective donors, volunteers, and supporters interested in StreetRise impact and growth.' },
  { value: 'community_partners', label: 'Community partners', prompt: 'Public agencies, nonprofits, coalitions, schools, and organizations considering collaboration with StreetRise.' },
] as const

export type BlogAudience = (typeof BLOG_AUDIENCES)[number]['value']

/**
 * Stable facts only. Do not put launch cities, counts, partner names, dates,
 * availability, or other fast-changing claims here. Those belong in the
 * per-draft Facts field so the admin has to consciously ground them.
 */
export const STREETRISE_STABLE_FACTS = [
  {
    id: 'platform-purpose',
    label: 'What StreetRise is',
    text: 'StreetRise is a community-resource discovery platform.',
  },
  {
    id: 'public-app-url',
    label: 'Public app URL',
    text: 'The public StreetRise app is available at https://app.streetrise.org.',
  },
  {
    id: 'booking-not-guaranteed',
    label: 'Booking requests are not guarantees',
    text: 'A StreetRise booking request is a request to a provider and does not guarantee admission, a bed, or service placement.',
  },
] as const

export function audiencePrompt(value: BlogAudience): string {
  return BLOG_AUDIENCES.find(option => option.value === value)?.prompt ?? BLOG_AUDIENCES[0].prompt
}

export function stableFactsFor(ids: string[]): string[] {
  const selected = new Set(ids)
  return STREETRISE_STABLE_FACTS
    .filter(fact => selected.has(fact.id))
    .map(fact => fact.text)
}

const DUPLICATE_STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'at', 'be', 'behind', 'for', 'from', 'how', 'in', 'is',
  'of', 'on', 'our', 'the', 'to', 'we', 'why', 'with', 'your',
])

function topicTokens(value: string): string[] {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map(token => token.trim())
    .filter(token => token.length >= 3 && !DUPLICATE_STOP_WORDS.has(token))
}

function topicSimilarity(a: string, b: string): number {
  const aTokens = new Set(topicTokens(a))
  const bTokens = new Set(topicTokens(b))
  if (aTokens.size === 0 || bTokens.size === 0) return 0

  const aKey = [...aTokens].sort().join(' ')
  const bKey = [...bTokens].sort().join(' ')
  if (aKey === bKey) return 1
  if (aKey.includes(bKey) || bKey.includes(aKey)) return 0.9

  let overlap = 0
  for (const token of aTokens) if (bTokens.has(token)) overlap += 1
  return overlap / Math.min(aTokens.size, bTokens.size)
}

export function findSimilarBlogPost<T extends { title: string; slug: string }>(
  topic: string,
  posts: T[],
): { post: T; score: number } | null {
  if (topic.trim().length < 5) return null

  let best: { post: T; score: number } | null = null
  for (const post of posts) {
    const score = Math.max(topicSimilarity(topic, post.title), topicSimilarity(topic, post.slug))
    if (!best || score > best.score) best = { post, score }
  }

  return best && best.score >= 0.5 ? best : null
}
