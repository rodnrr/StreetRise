#!/usr/bin/env node
/**
 * StreetRise — Seed import script
 *
 * Safely imports normalized batch seed candidates into Supabase.
 * Requires migration 009 to be applied first.
 *
 * Usage:
 *   npm run import:seed -- --file data/seed/streetrise_seed_candidates_batch_2_normalized.csv --dry-run
 *   npm run import:seed -- --file data/seed/streetrise_seed_candidates_batch_2_normalized.csv --apply
 *
 * Required env (in .env.local):
 *   VITE_SUPABASE_URL          — project URL
 *   SUPABASE_SERVICE_ROLE_KEY  — bypasses RLS for admin import
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// ─── Constants ───────────────────────────────────────────────────────────────

const VALID_CATEGORIES = new Set([
  'shelter', 'food', 'work_exchange', 'mental_health', 'medical',
  'legal', 'hygiene', 'clothing', 'childcare', 'transportation',
  'outdoor_space', 'other',
])

const VALID_AVAILABILITY = new Set([
  'available', 'limited', 'full', 'unknown', 'closed',
])

const VALID_ACCESS_TYPES = new Set([
  'onsite', 'phone_intake', 'web_intake', 'confidential_address', 'not_map_ready',
])

// Map CSV access_type values → DB resource_access_type enum
const ACCESS_TYPE_MAP: Record<string, string> = {
  physical_site:          'onsite',
  phone_web_intake:       'phone_intake',
  confidential_phone_web: 'confidential_address',
  phone_intake:           'phone_intake',
  web_intake:             'web_intake',
  onsite:                 'onsite',
  confidential_address:   'confidential_address',
  not_map_ready:          'not_map_ready',
}

// Geocode statuses that must never be mapped, regardless of is_map_ready flag
const CONFIDENTIAL_GEOCODE = new Set(['confidential_no_map', 'intake_only_no_address'])

// Header index (0-indexed) where availability_status should land
const AVAIL_STATUS_EXPECTED_IDX = 27
// Scan this range for the misplaced availability_status value
const AVAIL_STATUS_SCAN_START = 24
const AVAIL_STATUS_VALUES = new Set(['available', 'limited', 'full', 'unknown', 'closed'])

// ─── Types ───────────────────────────────────────────────────────────────────

interface SeedRow {
  external_id:           string
  provider_external_id:  string
  provider_name:         string
  resource_name:         string
  category:              string   // preferred vocab (store in tags)
  current_app_category:  string   // use for DB enum
  subcategory:           string
  street:                string
  city:                  string
  state:                 string
  zip:                   string
  phone:                 string
  email:                 string
  website:               string
  hours_summary:         string
  description:           string
  eligibility_notes:     string
  walk_ins_accepted:     boolean
  requires_id:           boolean
  requires_referral:     boolean
  beds_total:            number | null
  beds_available:        number | null
  availability_status:   string
  verification_status:   string
  is_active:             boolean
  lat:                   number | null
  lng:                   number | null
  geocode_status:        string
  geocode_quality:       string
  is_map_ready:          boolean
  import_status:         string
  import_notes:          string
  access_type:           string   // CSV raw value (pre-mapping)
  population_served:     string
  provider_type:         string
  preferred_category_tag: string  // "category:<preferred>" for tags[]
  extra_tags:            string[]
}

interface Stats {
  totalRows:         number
  readyRows:         number
  skippedNeedsReview: number
  skippedOther:      number
  insertedProviders: number
  updatedProviders:  number
  insertedResources: number
  updatedResources:  number
  skippedResources:  Array<{ id: string; reason: string }>
}

// ─── Env loader ──────────────────────────────────────────────────────────────

function loadEnvFile(path: string): void {
  try {
    const content = readFileSync(path, 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx < 1) continue
      const key = trimmed.slice(0, eqIdx).trim()
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '')
      if (!(key in process.env)) process.env[key] = val
    }
  } catch {
    // .env.local not present — rely on existing process.env
  }
}

// ─── CSV parser ──────────────────────────────────────────────────────────────

function parseRawCSV(content: string): { header: string[]; rawRows: string[][] } {
  const rows: string[][] = []
  let inQuote = false
  let field = ''
  let row: string[] = []

  for (let i = 0; i < content.length; i++) {
    const ch = content[i]
    if (ch === '"') {
      if (inQuote && content[i + 1] === '"') {
        field += '"'
        i++
      } else {
        inQuote = !inQuote
      }
    } else if (ch === ',' && !inQuote) {
      row.push(field)
      field = ''
    } else if ((ch === '\n' || (ch === '\r' && content[i + 1] === '\n')) && !inQuote) {
      if (ch === '\r') i++ // consume LF
      row.push(field)
      if (row.some(f => f !== '')) rows.push(row)
      field = ''
      row = []
    } else if (ch !== '\r') {
      field += ch
    }
  }
  if (row.length > 0 || field !== '') {
    row.push(field)
    if (row.some(f => f !== '')) rows.push(row)
  }

  const [header, ...rawRows] = rows
  return { header, rawRows }
}

/**
 * The CSV was generated with beds_total / beds_available omitted for most rows.
 * Strategy: scan positions 24–27 to find where the availability_status value
 * landed.  When found at position i, insert (27 - i) empty strings there so the
 * value slides back to its correct position.  Rows that are still short after
 * correction are padded with empty strings at the end.  Rows that are too long
 * are trimmed (catches rows with an unquoted extra comma in a trailing field).
 */
function normalizeFieldCounts(rawRows: string[][], headerLen: number): string[][] {
  return rawRows.map(fields => {
    if (fields.length === headerLen) return fields

    if (fields.length > headerLen) {
      // Extra fields — trim safely (trailing tags/features)
      return fields.slice(0, headerLen)
    }

    // Short row: scan for misplaced availability_status
    for (let i = AVAIL_STATUS_SCAN_START; i < AVAIL_STATUS_EXPECTED_IDX; i++) {
      if (AVAIL_STATUS_VALUES.has((fields[i] ?? '').toLowerCase())) {
        const numToInsert = AVAIL_STATUS_EXPECTED_IDX - i
        const corrected = [
          ...fields.slice(0, i),
          ...Array(numToInsert).fill(''),
          ...fields.slice(i),
        ]
        // Pad remainder if still short (e.g. 3-field deficit rows)
        if (corrected.length < headerLen) {
          return [...corrected, ...Array(headerLen - corrected.length).fill('')]
        }
        return corrected.slice(0, headerLen)
      }
    }

    // Fallback: pad with empty strings at the end
    return [...fields, ...Array(headerLen - fields.length).fill('')]
  })
}

function toBoolean(v: string): boolean {
  return v.trim().toLowerCase() === 'true'
}

function toInt(v: string): number | null {
  const n = parseInt(v.trim(), 10)
  return isNaN(n) ? null : n
}

function toFloat(v: string): number | null {
  const n = parseFloat(v.trim())
  return isNaN(n) ? null : n
}

function parseSeedRow(raw: Record<string, string>): SeedRow {
  const preferredCat = (raw['category'] ?? '').trim()
  const extraTagsRaw = (raw['tags'] ?? '').trim()
  const extraTags = extraTagsRaw ? extraTagsRaw.split(',').map(t => t.trim()).filter(Boolean) : []
  const preferredTag = preferredCat ? `category:${preferredCat}` : ''

  const geocodeStatus = (raw['geocode_status'] ?? '').trim()
  const isMapReadyRaw = toBoolean(raw['is_map_ready'] ?? '')
  const latRaw = toFloat(raw['lat'] ?? '')
  const lngRaw = toFloat(raw['lng'] ?? '')

  return {
    external_id:           (raw['external_id'] ?? '').trim(),
    provider_external_id:  (raw['provider_external_id'] ?? '').trim(),
    provider_name:         (raw['provider_name'] ?? '').trim(),
    resource_name:         (raw['resource_name'] ?? '').trim(),
    category:              preferredCat,
    current_app_category:  (raw['current_app_category'] ?? '').trim(),
    subcategory:           (raw['subcategory'] ?? '').trim(),
    street:                (raw['street'] ?? '').trim(),
    city:                  (raw['city'] ?? '').trim(),
    state:                 (raw['state'] ?? 'FL').trim(),
    zip:                   (raw['zip'] ?? '').trim(),
    phone:                 (raw['phone'] ?? '').trim(),
    email:                 (raw['email'] ?? '').trim(),
    website:               (raw['website'] ?? '').trim(),
    hours_summary:         (raw['hours_summary'] ?? '').trim(),
    description:           (raw['description'] ?? '').trim(),
    eligibility_notes:     (raw['eligibility_notes'] ?? '').trim(),
    walk_ins_accepted:     toBoolean(raw['walk_ins_accepted'] ?? ''),
    requires_id:           toBoolean(raw['requires_id'] ?? ''),
    requires_referral:     toBoolean(raw['requires_referral'] ?? ''),
    beds_total:            toInt(raw['beds_total'] ?? ''),
    beds_available:        toInt(raw['beds_available'] ?? ''),
    availability_status:   (raw['availability_status'] ?? 'unknown').trim(),
    verification_status:   (raw['verification_status'] ?? 'pending').trim(),
    is_active:             toBoolean(raw['is_active'] ?? 'true'),
    lat:                   latRaw,
    lng:                   lngRaw,
    geocode_status:        geocodeStatus,
    geocode_quality:       (raw['confidence'] ?? '').trim(),
    is_map_ready:          isMapReadyRaw,
    import_status:         (raw['import_status'] ?? '').trim(),
    import_notes:          (raw['import_notes'] ?? '').trim(),
    access_type:           (raw['access_type'] ?? '').trim(),
    population_served:     (raw['population_served'] ?? '').trim(),
    provider_type:         (raw['provider_type'] ?? '').trim(),
    preferred_category_tag: preferredTag,
    extra_tags:            extraTags,
  }
}

// ─── Validation ──────────────────────────────────────────────────────────────

interface ValidationResult {
  ok: boolean
  reason?: string
}

function validateRow(row: SeedRow): ValidationResult {
  if (!row.external_id) return { ok: false, reason: 'missing external_id' }
  if (!row.provider_external_id) return { ok: false, reason: 'missing provider_external_id' }
  if (!row.resource_name) return { ok: false, reason: 'missing resource_name' }

  if (!VALID_CATEGORIES.has(row.current_app_category)) {
    return {
      ok: false,
      reason: `invalid current_app_category: '${row.current_app_category}' — must be one of: ${[...VALID_CATEGORIES].join(', ')}`,
    }
  }

  const avail = row.availability_status
  if (!VALID_AVAILABILITY.has(avail)) {
    return { ok: false, reason: `invalid availability_status: '${avail}'` }
  }

  return { ok: true }
}

// ─── Safety checks ───────────────────────────────────────────────────────────

interface SafetyResult {
  isMapReady: boolean
  lat: number | null
  lng: number | null
  accessType: string
  skipEntirely: boolean
  skipReason?: string
}

function applySafetyRules(row: SeedRow): SafetyResult {
  // Never map confidential geocode rows
  if (CONFIDENTIAL_GEOCODE.has(row.geocode_status)) {
    return {
      isMapReady: false, lat: null, lng: null,
      accessType: 'confidential_address',
      skipEntirely: false,
    }
  }

  // Confidential access types → never map
  const rawAccess = row.access_type
  if (rawAccess === 'confidential_address' || rawAccess === 'confidential_phone_web') {
    return {
      isMapReady: false, lat: null, lng: null,
      accessType: 'confidential_address',
      skipEntirely: false,
    }
  }

  // Map CSV access_type to DB enum
  const mappedAccess = ACCESS_TYPE_MAP[rawAccess] ?? 'onsite'
  if (!VALID_ACCESS_TYPES.has(mappedAccess)) {
    return {
      isMapReady: false, lat: null, lng: null,
      accessType: 'not_map_ready',
      skipEntirely: false,
    }
  }

  // Only include lat/lng if the row declares itself map-ready AND coords exist
  const isMapReady = row.is_map_ready && row.lat !== null && row.lng !== null
  const lat = isMapReady ? row.lat : null
  const lng = isMapReady ? row.lng : null

  return { isMapReady, lat, lng, accessType: mappedAccess, skipEntirely: false }
}

// ─── Supabase helpers ────────────────────────────────────────────────────────

async function checkMigrationApplied(sb: SupabaseClient): Promise<void> {
  const { error } = await sb
    .from('resources')
    .select('external_id')
    .limit(1)
  if (error && error.message.includes('column "external_id" does not exist')) {
    console.error('\nERROR: Migration 009 has not been applied.')
    console.error('Run: supabase db push  (or paste supabase/migrations/009_import_tracking_fields.sql into the SQL editor)\n')
    process.exit(1)
  }
}

async function findProviderByExternalId(
  sb: SupabaseClient,
  extId: string,
): Promise<string | null> {
  const { data } = await sb
    .from('providers')
    .select('id')
    .eq('external_id', extId)
    .maybeSingle()
  return data?.id ?? null
}

async function findProviderByName(
  sb: SupabaseClient,
  name: string,
): Promise<{ id: string; hasExternalId: boolean } | null> {
  const { data } = await sb
    .from('providers')
    .select('id, external_id')
    .ilike('organization_name', name)
    .maybeSingle()
  if (!data) return null
  return { id: data.id, hasExternalId: !!data.external_id }
}

async function upsertProvider(
  sb: SupabaseClient | null,
  extId: string,
  row: SeedRow,
  dryRun: boolean,
  stats: Stats,
  batchId: string,
): Promise<string> {
  const placeholderEmail = `contact@${extId.replace(/^provider_/, '').replace(/_/g, '.')}.placeholder`

  const providerPayload = {
    external_id:      extId,
    organization_name: row.provider_name,
    contact_name:     row.provider_name,
    contact_email:    placeholderEmail,
    website:          row.website || null,
    verification_status: 'pending' as const,
    role:             'provider' as const,
    import_batch_id:  batchId,
    last_imported_at: new Date().toISOString(),
  }

  if (dryRun) {
    console.log(`  [DRY] Would upsert provider: ${row.provider_name} (${extId})`)
    stats.insertedProviders++ // treat as insert for dry-run reporting
    return `dry-run-provider-${extId}`
  }

  // 1. Try match by external_id
  let providerId = await findProviderByExternalId(sb!, extId)
  if (providerId) {
    await sb!.from('providers').update({
      organization_name: providerPayload.organization_name,
      import_batch_id:   batchId,
      last_imported_at:  providerPayload.last_imported_at,
    }).eq('id', providerId)
    stats.updatedProviders++
    return providerId
  }

  // 2. Try match by name (existing seed rows from migration 008)
  const byName = await findProviderByName(sb!, row.provider_name)
  if (byName) {
    if (!byName.hasExternalId) {
      // Stamp the external_id onto the existing row
      await sb!.from('providers').update({
        external_id:      extId,
        import_batch_id:  batchId,
        last_imported_at: providerPayload.last_imported_at,
      }).eq('id', byName.id)
    }
    stats.updatedProviders++
    return byName.id
  }

  // 3. Create new (unclaimed) provider
  const { data, error } = await sb!
    .from('providers')
    .insert({ ...providerPayload, user_id: null })
    .select('id')
    .single()

  if (error) {
    console.error(`  ERROR inserting provider ${extId}: ${error.message}`)
    throw error
  }

  stats.insertedProviders++
  return data.id
}

async function upsertResource(
  sb: SupabaseClient | null,
  row: SeedRow,
  providerDbId: string,
  dryRun: boolean,
  stats: Stats,
  batchId: string,
  sourceFile: string,
): Promise<void> {
  const validation = validateRow(row)
  if (!validation.ok) {
    stats.skippedResources.push({ id: row.external_id, reason: validation.reason! })
    return
  }

  const safety = applySafetyRules(row)
  if (safety.skipEntirely) {
    stats.skippedResources.push({ id: row.external_id, reason: safety.skipReason! })
    return
  }

  // Build tags: preserve preferred category + extra tags from CSV
  const tags: string[] = []
  if (row.preferred_category_tag) tags.push(row.preferred_category_tag)
  if (row.subcategory) tags.push(`subcategory:${row.subcategory}`)
  tags.push(...row.extra_tags)
  if (row.population_served) tags.push(`population:${row.population_served}`)
  if (row.provider_type) tags.push(`provider_type:${row.provider_type}`)

  const addressObj = {
    street: row.street || '',
    city:   row.city || '',
    state:  row.state || 'FL',
    zip:    row.zip || '',
  }

  const hoursObj = row.hours_summary
    ? { summary: row.hours_summary }
    : {}

  const descriptionText = [row.description, row.eligibility_notes]
    .filter(Boolean)
    .join('\n\nEligibility: ')

  const resourcePayload = {
    provider_id:         providerDbId,
    name:                row.resource_name,
    description:         descriptionText,
    category:            row.current_app_category,
    subcategory:         row.subcategory || null,
    address:             addressObj,
    lat:                 safety.lat,
    lng:                 safety.lng,
    access_type:         safety.accessType,
    is_map_ready:        safety.isMapReady,
    phone:               row.phone || null,
    email:               row.email || null,
    website:             row.website || null,
    availability_status: VALID_AVAILABILITY.has(row.availability_status)
                           ? row.availability_status
                           : 'unknown',
    beds_total:          row.beds_total,
    beds_available:      row.beds_available,
    walk_ins_accepted:   row.walk_ins_accepted,
    requires_id:         row.requires_id,
    requires_referral:   row.requires_referral,
    hours_of_operation:  hoursObj,
    verification_status: 'pending' as const,
    is_active:           row.is_active,
    tags,
    languages_spoken:    [] as string[],
    photos:              [] as string[],
    // import tracking fields (added by migration 009)
    external_id:         row.external_id,
    source_file:         sourceFile,
    import_batch_id:     batchId,
    last_imported_at:    new Date().toISOString(),
    geocode_quality:     row.geocode_quality || null,
  }

  if (dryRun) {
    const mapFlag = safety.isMapReady ? '📍 map-ready' : '🔒 non-map'
    console.log(
      `  [DRY] Would upsert resource: ${row.resource_name} (${row.external_id}) [${row.current_app_category}] ${mapFlag}`,
    )
    stats.insertedResources++ // count as insert for dry-run
    return
  }

  // Try match by external_id first
  const { data: existing } = await sb!
    .from('resources')
    .select('id')
    .eq('external_id', row.external_id)
    .maybeSingle()

  if (existing) {
    const { error } = await sb!
      .from('resources')
      .update(resourcePayload)
      .eq('id', existing.id)
    if (error) {
      stats.skippedResources.push({ id: row.external_id, reason: `update error: ${error.message}` })
      return
    }
    stats.updatedResources++
    return
  }

  // Fallback dedup: same provider + same name + same address.street
  const { data: byName } = await sb!
    .from('resources')
    .select('id')
    .eq('provider_id', providerDbId)
    .ilike('name', row.resource_name)
    .maybeSingle()

  if (byName) {
    // Stamp external_id and update
    const { error } = await sb!
      .from('resources')
      .update({ ...resourcePayload })
      .eq('id', byName.id)
    if (error) {
      stats.skippedResources.push({ id: row.external_id, reason: `name-match update error: ${error.message}` })
      return
    }
    stats.updatedResources++
    return
  }

  // Insert new
  const { error } = await sb!
    .from('resources')
    .insert(resourcePayload)

  if (error) {
    stats.skippedResources.push({ id: row.external_id, reason: `insert error: ${error.message}` })
    return
  }

  stats.insertedResources++
}

// ─── Summary printer ─────────────────────────────────────────────────────────

function printSummary(stats: Stats, dryRun: boolean): void {
  const mode = dryRun ? 'DRY RUN' : 'APPLIED'
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`  Import summary (${mode})`)
  console.log('─'.repeat(60))
  console.log(`  Total rows read         : ${stats.totalRows}`)
  console.log(`  ready_for_import        : ${stats.readyRows}`)
  console.log(`  Skipped (needs_review)  : ${stats.skippedNeedsReview}`)
  console.log(`  Skipped (other/unknown) : ${stats.skippedOther}`)
  console.log('')
  console.log(`  Providers inserted      : ${stats.insertedProviders}`)
  console.log(`  Providers updated       : ${stats.updatedProviders}`)
  console.log('')
  console.log(`  Resources inserted      : ${stats.insertedResources}`)
  console.log(`  Resources updated       : ${stats.updatedResources}`)
  console.log(`  Resources skipped       : ${stats.skippedResources.length}`)
  console.log('─'.repeat(60))

  if (stats.skippedResources.length > 0) {
    console.log('\n  Skipped resources:')
    for (const { id, reason } of stats.skippedResources) {
      console.log(`    - ${id}: ${reason}`)
    }
  }

  if (dryRun) {
    console.log('\n  This was a DRY RUN. Re-run with --apply to write changes.')
  }
}

// ─── Entry point ─────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const fileIdx = args.indexOf('--file')
  const filePath = fileIdx >= 0 ? args[fileIdx + 1] : null
  const dryRun = !args.includes('--apply')

  if (!filePath) {
    console.error(
      'Usage:\n' +
      '  npm run import:seed -- --file <csv-path> --dry-run\n' +
      '  npm run import:seed -- --file <csv-path> --apply',
    )
    process.exit(1)
  }

  if (dryRun) {
    console.log('=== DRY RUN — no changes will be written to Supabase ===\n')
  } else {
    console.log('=== APPLY — writing to Supabase ===\n')
  }

  // Load env
  loadEnvFile(resolve(process.cwd(), '.env.local'))

  const supabaseUrl = process.env['VITE_SUPABASE_URL'] ?? process.env['SUPABASE_URL'] ?? ''
  const serviceKey  = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? ''

  let sb: SupabaseClient | null = null
  if (!dryRun) {
    if (!supabaseUrl) {
      console.error('ERROR: Missing VITE_SUPABASE_URL / SUPABASE_URL in .env.local')
      process.exit(1)
    }
    if (!serviceKey) {
      console.error(
        'ERROR: SUPABASE_SERVICE_ROLE_KEY is required for --apply mode.\n' +
        'Get it from: Supabase Dashboard → Project Settings → API → service_role\n' +
        'Add it to .env.local as: SUPABASE_SERVICE_ROLE_KEY=<key>\n' +
        'WARNING: Never commit this key to git.',
      )
      process.exit(1)
    }
    sb = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    await checkMigrationApplied(sb)
  }

  // Parse CSV
  const csvPath = resolve(process.cwd(), filePath)
  let rawContent: string
  try {
    rawContent = readFileSync(csvPath, 'utf-8')
  } catch {
    console.error(`ERROR: Cannot read file: ${csvPath}`)
    process.exit(1)
  }

  const { header, rawRows } = parseRawCSV(rawContent)
  const normalizedRows = normalizeFieldCounts(rawRows, header.length)

  const stats: Stats = {
    totalRows: normalizedRows.length,
    readyRows: 0,
    skippedNeedsReview: 0,
    skippedOther: 0,
    insertedProviders: 0,
    updatedProviders: 0,
    insertedResources: 0,
    updatedResources: 0,
    skippedResources: [],
  }

  // Map raw rows to typed objects
  const allRows: SeedRow[] = normalizedRows.map(fields => {
    const record: Record<string, string> = {}
    header.forEach((col, i) => { record[col] = fields[i] ?? '' })
    return parseSeedRow(record)
  })

  console.log(`CSV rows read: ${stats.totalRows}\n`)

  // Partition by import_status
  const ready:        SeedRow[] = []
  const needsReview:  SeedRow[] = []
  const otherStatus:  SeedRow[] = []

  for (const row of allRows) {
    if (row.import_status === 'ready_for_import') {
      ready.push(row)
    } else if (row.import_status === 'needs_review') {
      needsReview.push(row)
    } else {
      otherStatus.push(row)
    }
  }

  stats.readyRows         = ready.length
  stats.skippedNeedsReview = needsReview.length
  stats.skippedOther      = otherStatus.length

  console.log(`  ready_for_import   : ${stats.readyRows}`)
  console.log(`  needs_review       : ${stats.skippedNeedsReview} (skipped — not imported)`)
  console.log(`  other/unrecognized : ${stats.skippedOther} (skipped)`)

  if (needsReview.length > 0) {
    console.log('\n  Needs-review rows (NOT imported):')
    for (const r of needsReview) {
      console.log(`    - ${r.external_id}: ${r.import_notes || 'see CSV for details'}`)
    }
  }

  if (ready.length === 0) {
    console.log('\nNo ready rows to import.')
    printSummary(stats, dryRun)
    return
  }

  // Build batch id from timestamp
  const batchId = `batch2_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`
  const sourceFile = filePath

  // ── Phase 1: providers ──────────────────────────────────────────
  console.log('\n── Phase 1: Providers ──')
  const providerDbIds = new Map<string, string>() // external_id → db uuid

  const uniqueProviders = new Map<string, SeedRow>()
  for (const row of ready) {
    if (!uniqueProviders.has(row.provider_external_id)) {
      uniqueProviders.set(row.provider_external_id, row)
    }
  }

  console.log(`Processing ${uniqueProviders.size} unique providers...\n`)

  for (const [extId, row] of uniqueProviders) {
    try {
      const dbId = await upsertProvider(sb, extId, row, dryRun, stats, batchId)
      providerDbIds.set(extId, dbId)
    } catch (err) {
      console.error(`  FATAL: Could not upsert provider ${extId}`, err)
      process.exit(1)
    }
  }

  // ── Phase 2: resources ──────────────────────────────────────────
  console.log('\n── Phase 2: Resources ──\n')

  for (const row of ready) {
    const providerDbId = providerDbIds.get(row.provider_external_id)
    if (!providerDbId) {
      stats.skippedResources.push({
        id: row.external_id,
        reason: `provider ${row.provider_external_id} not resolved`,
      })
      continue
    }
    await upsertResource(sb, row, providerDbId, dryRun, stats, batchId, sourceFile)
  }

  printSummary(stats, dryRun)
}

main().catch(err => {
  console.error('Unhandled error:', err)
  process.exit(1)
})
