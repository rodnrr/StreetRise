#!/usr/bin/env node
/**
 * StreetRise — Work Exchange agent
 *
 * The `/work` page reads `work_exchanges`. Every row in it today was either
 * typed in by a provider or transcribed by hand from an organization's public
 * "get involved / careers" page (migrations 020 and 028). Nothing has ever
 * re-checked those pages, so a listing whose program ended last spring still
 * renders with a working-looking "Apply on Website" button.
 *
 * This agent closes that loop. It does two jobs:
 *
 *   --verify    Re-read each listing's `source_url` and decide whether the
 *               page still advertises that opportunity.
 *   --discover  Read a provider's website and draft listings for programs
 *               we do not have yet.
 *
 * ── The one rule ────────────────────────────────────────────────
 * It never publishes. The only thing it writes to `work_exchanges` is
 * `last_verified_at` / `last_verify_status` — a record that a check ran.
 * Every proposed content change becomes a row in `work_exchange_candidates`
 * for an admin to approve at /admin/work-exchange. Machine-drafted text about
 * a real charity is not something to put in front of someone who needs help
 * without a human reading it first.
 *
 * Usage:
 *   npm run agent:work -- --verify
 *   npm run agent:work -- --verify --apply
 *   npm run agent:work -- --discover --provider <uuid> --apply
 *   npm run agent:work -- --verify --discover --limit 10 --apply
 *
 * Flags:
 *   --verify            re-check existing listings against their source page
 *   --discover          draft new listings from provider websites
 *   --apply             write to Supabase (default is a dry run)
 *   --limit N           cap how many pages are fetched per mode (default 20)
 *   --provider <uuid>   restrict both modes to one provider
 *   --stale-days N      only verify listings unchecked for N days (default 30)
 *
 * Required env (in .env.local):
 *   VITE_SUPABASE_URL          — project URL
 *   SUPABASE_SERVICE_ROLE_KEY  — bypasses RLS; never VITE_-prefixed
 *   ANTHROPIC_API_KEY          — for the extraction calls
 *
 * Requires migration 035.
 */

import Anthropic from '@anthropic-ai/sdk'
// JSON Schema rather than the zod helper: that helper imports `zod/v4`, and
// this project is on zod 3.
import { jsonSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/json-schema'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// ─── Constants ───────────────────────────────────────────────────────────────

const MODEL = 'claude-opus-5'

/**
 * Identifies the crawler and gives whoever reads their access log a way to
 * reach us. A bot that will not say who it is has no business on a small
 * charity's website.
 */
const USER_AGENT =
  'StreetRiseBot/1.0 (+https://app.streetrise.org/about; info@streetrise.org)'

const FETCH_TIMEOUT_MS = 15_000
/** Gap between requests to the same run. Deliberately unhurried. */
const REQUEST_DELAY_MS = 2_000
/** Page text handed to the model. Enough for a volunteer page, bounded for cost. */
const MAX_PAGE_CHARS = 14_000

const EXCHANGE_TYPES = ['volunteering', 'paid', 'skills_trade', 'internship'] as const

// ─── Types ───────────────────────────────────────────────────────────────────

interface Args {
  verify: boolean
  discover: boolean
  apply: boolean
  limit: number
  providerId: string | null
  staleDays: number
}

interface ListingRow {
  id: string
  provider_id: string
  external_id: string | null
  title: string
  description: string
  exchange_type: string
  hours_per_week: number | null
  compensation: string | null
  skills_required: string[]
  skills_gained: string[]
  source_url: string | null
  address: Record<string, string> | null
  lat: number | null
  lng: number | null
  last_verified_at: string | null
}

interface ProviderRow {
  id: string
  organization_name: string
  website: string | null
}

interface Stats {
  pagesFetched: number
  fetchFailures: number
  robotsBlocked: number
  verified: number
  candidatesCreated: number
  candidatesSkipped: number
  modelCalls: number
  inputTokens: number
  outputTokens: number
}

// ─── Model output schemas ────────────────────────────────────────────────────
// Structured outputs require `additionalProperties: false` and every property
// listed in `required`, so a value the page does not state is an explicit
// null (via `anyOf`) rather than a missing key. `as const` lets the SDK infer
// the parsed result type straight from the schema.

const NULLABLE_INT = { anyOf: [{ type: 'integer' }, { type: 'null' }] } as const
const NULLABLE_STRING = { anyOf: [{ type: 'string' }, { type: 'null' }] } as const
const STRING_ARRAY = { type: 'string' } as const

const VERIFY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: {
      type: 'string',
      enum: ['confirmed', 'changed', 'gone', 'unclear'],
      description:
        'confirmed = the page still advertises this opportunity; ' +
        'changed = still advertised but a detail we store is now wrong; ' +
        'gone = this page covers the organisation\'s opportunities and this one is not among them; ' +
        'unclear = the page is not the kind of page that would list it either way',
    },
    confidence: { type: 'integer', description: '0-100, how sure you are of the status' },
    evidence: {
      type: 'string',
      description: 'A verbatim quote from the page supporting the status, copied exactly',
    },
    note: { type: 'string', description: 'One sentence for the human reviewer' },
    revised: {
      description: 'Corrected listing values. Null unless status is "changed".',
      anyOf: [
        {
          type: 'object',
          additionalProperties: false,
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            exchange_type: { type: 'string', enum: EXCHANGE_TYPES },
            hours_per_week: NULLABLE_INT,
            compensation: NULLABLE_STRING,
            skills_required: { type: 'array', items: STRING_ARRAY },
            skills_gained: { type: 'array', items: STRING_ARRAY },
          },
          required: [
            'title', 'description', 'exchange_type', 'hours_per_week',
            'compensation', 'skills_required', 'skills_gained',
          ],
        },
        { type: 'null' },
      ],
    },
  },
  required: ['status', 'confidence', 'evidence', 'note', 'revised'],
} as const

const DISCOVER_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    opportunities: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          description: { type: 'string', description: '2-4 plain factual sentences' },
          exchange_type: { type: 'string', enum: EXCHANGE_TYPES },
          hours_per_week: NULLABLE_INT,
          compensation: NULLABLE_STRING,
          skills_required: { type: 'array', items: STRING_ARRAY },
          skills_gained: { type: 'array', items: STRING_ARRAY },
          evidence: {
            type: 'string',
            description: 'A verbatim quote from the page advertising this opportunity',
          },
          confidence: { type: 'integer', description: '0-100' },
        },
        required: [
          'title', 'description', 'exchange_type', 'hours_per_week', 'compensation',
          'skills_required', 'skills_gained', 'evidence', 'confidence',
        ],
      },
    },
    note: { type: 'string', description: 'One sentence for the human reviewer' },
  },
  required: ['opportunities', 'note'],
} as const

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

// ─── Polite fetching ─────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

/** Per-origin robots.txt disallow rules, fetched once per run. */
const robotsCache = new Map<string, string[]>()

/**
 * Minimal robots.txt reader: collects Disallow paths from the `*` group and
 * from any group naming us. Prefix matching only — enough to honour the
 * common "keep out of /admin, /search" cases without pretending to implement
 * the full grammar. On any doubt we treat the fetch as allowed only when
 * robots.txt was actually readable and said nothing against it.
 */
async function disallowedPaths(origin: string): Promise<string[]> {
  const cached = robotsCache.get(origin)
  if (cached) return cached

  let rules: string[] = []
  try {
    const res = await fetch(`${origin}/robots.txt`, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (res.ok) {
      const text = await res.text()
      let applies = false
      for (const raw of text.split('\n')) {
        const line = raw.split('#')[0].trim()
        if (!line) continue
        const [rawKey, ...rest] = line.split(':')
        const key = rawKey.trim().toLowerCase()
        const value = rest.join(':').trim()
        if (key === 'user-agent') {
          const ua = value.toLowerCase()
          applies = ua === '*' || USER_AGENT.toLowerCase().startsWith(ua)
        } else if (key === 'disallow' && applies && value) {
          rules.push(value)
        }
      }
    }
  } catch {
    // No robots.txt, or unreachable. Standard practice is to treat that as
    // permission; we still rate-limit ourselves.
    rules = []
  }

  robotsCache.set(origin, rules)
  return rules
}

async function robotsAllows(url: string): Promise<boolean> {
  const parsed = new URL(url)
  const rules = await disallowedPaths(parsed.origin)
  const path = parsed.pathname + parsed.search
  return !rules.some(rule => rule === '/' ? path.startsWith('/') : path.startsWith(rule))
}

/** Strip a page down to the readable text the model should reason over. */
function htmlToText(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/(p|div|li|tr|h[1-6]|section|article)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/[ \t ]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_PAGE_CHARS)
}

type PageResult =
  | { ok: true; text: string }
  | { ok: false; reason: string; blocked?: boolean }

async function fetchPage(url: string, stats: Stats): Promise<PageResult> {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return { ok: false, reason: 'malformed url' }
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { ok: false, reason: `unsupported protocol ${parsed.protocol}` }
  }

  if (!(await robotsAllows(url))) {
    stats.robotsBlocked++
    return { ok: false, reason: 'disallowed by robots.txt', blocked: true }
  }

  await sleep(REQUEST_DELAY_MS)

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml' },
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!res.ok) {
      stats.fetchFailures++
      return { ok: false, reason: `HTTP ${res.status}` }
    }
    const type = res.headers.get('content-type') ?? ''
    if (!type.includes('html') && !type.includes('text/plain')) {
      stats.fetchFailures++
      return { ok: false, reason: `unexpected content-type ${type}` }
    }
    stats.pagesFetched++
    const text = htmlToText(await res.text())
    if (text.length < 200) {
      return { ok: false, reason: 'page had almost no readable text (likely JS-rendered)' }
    }
    return { ok: true, text }
  } catch (err) {
    stats.fetchFailures++
    return { ok: false, reason: err instanceof Error ? err.message : 'fetch failed' }
  }
}

// ─── Model calls ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You read a nonprofit's public web page and report what it says about volunteer, paid, skills-trade, and internship opportunities.

This output is reviewed by a human before anything reaches people looking for work, so your job is accuracy, not helpfulness. Specifically:

- Report only what the page states. Never infer a program from an organization's general mission, and never carry over details from what you know about the organization.
- Every finding must be backed by a verbatim quote from the page text, copied exactly. If you cannot quote it, do not report it.
- A page that is a generic homepage, a donation appeal, a 404, or a cookie wall contains no opportunities. Say so rather than reaching.
- Descriptions you write should be plain and factual, 2-4 sentences, and must not promise anything the page does not (no guaranteed placement, no "always available").
- Set confidence honestly: 90+ only when the page names the opportunity explicitly, below 60 when you are reading between the lines.`

function pageBlock(url: string, text: string): string {
  return `<page url="${url}">\n${text}\n</page>`
}

/**
 * Extraction from a page this short does not need deep reasoning, and effort
 * is the main cost lever on a job that runs over every listing we have.
 */
const MODEL_EFFORT = 'low' as const

function recordUsage(
  response: { usage: { input_tokens: number; output_tokens: number }; stop_reason: string | null },
  stats: Stats,
): boolean {
  stats.modelCalls++
  stats.inputTokens += response.usage.input_tokens
  stats.outputTokens += response.usage.output_tokens
  if (response.stop_reason === 'refusal') {
    console.log('    model declined this page')
    return false
  }
  return true
}

async function verifyListing(
  client: Anthropic,
  listing: ListingRow,
  pageText: string,
  stats: Stats,
) {
  const prompt = `${pageBlock(listing.source_url!, pageText)}

Our directory currently lists this opportunity as belonging to that page:

<listing>
title: ${listing.title}
type: ${listing.exchange_type}
hours per week: ${listing.hours_per_week ?? 'not stated'}
compensation: ${listing.compensation ?? 'not stated'}
description: ${listing.description}
</listing>

Decide which is true:

- "confirmed" — the page still advertises this opportunity and our details are still broadly right.
- "changed" — the opportunity is still on the page, but a detail we store is now wrong (the type, the hours, the compensation, or a description that no longer matches). Fill in "revised" with corrected values for every field, keeping anything that is still accurate.
- "gone" — this page is one that covers the organisation's opportunities, and this one is not among them.
- "unclear" — this page is not the kind of page that would list the opportunity either way: an organisation homepage, a donation appeal, a news post, a cookie wall, a page whose content clearly loads by script.

The difference between "gone" and "unclear" matters more than any other judgement you make here. "gone" gets a listing taken down; a volunteer page that lists five programmes and not this one is real evidence, so say "gone". A homepage that never enumerates programmes is not evidence of anything — say "unclear". When you are torn between the two, choose "unclear".

Judge the opportunity, not the wording: a page that lists the same program under a slightly different heading is still "confirmed".

Set "revised" to null unless the status is "changed".`

  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    output_config: { effort: MODEL_EFFORT, format: jsonSchemaOutputFormat(VERIFY_SCHEMA) },
    messages: [{ role: 'user', content: prompt }],
  })

  if (!recordUsage(response, stats)) return null
  return response.parsed_output ?? null
}

async function discoverForProvider(
  client: Anthropic,
  provider: ProviderRow,
  pageText: string,
  existingTitles: string[],
  stats: Stats,
) {
  const known = existingTitles.length
    ? existingTitles.map(t => `- ${t}`).join('\n')
    : '(none yet)'

  const prompt = `${pageBlock(provider.website!, pageText)}

That page belongs to ${provider.organization_name}. We already list these opportunities for them:

${known}

List the volunteer, paid, skills-trade, and internship opportunities this page advertises that are NOT already covered above. Skip anything that only restates one of the known listings under a different name.

Use these types:
- volunteering — unpaid service open to the general public
- paid — wages, a stipend, or a living allowance
- skills_trade — asks for a specific existing skill, or trades work for training
- internship — a fixed-term student or early-career placement

Set hours_per_week and compensation to null unless the page states them. Return an empty list if the page advertises no specific opportunities.`

  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    output_config: { effort: MODEL_EFFORT, format: jsonSchemaOutputFormat(DISCOVER_SCHEMA) },
    messages: [{ role: 'user', content: prompt }],
  })

  if (!recordUsage(response, stats)) return null
  return response.parsed_output ?? null
}

// ─── Candidate writing ───────────────────────────────────────────────────────

interface CandidateInput {
  kind: 'new' | 'update' | 'delist'
  work_exchange_id: string | null
  provider_id: string | null
  external_id: string | null
  source_url: string
  proposed: Record<string, unknown>
  agent_note: string
  evidence: string
  confidence: number
}

async function insertCandidate(
  sb: SupabaseClient | null,
  runId: string,
  input: CandidateInput,
  dryRun: boolean,
  stats: Stats,
): Promise<void> {
  const label = `[${input.kind}] ${String(input.proposed.title ?? '(delist)')}`

  if (dryRun) {
    console.log(`    [DRY] would queue ${label} (confidence ${input.confidence})`)
    stats.candidatesCreated++
    return
  }

  const { error } = await sb!.from('work_exchange_candidates').insert({
    ...input,
    agent_run_id: runId,
    agent_model: MODEL,
    status: 'pending',
  })

  if (error) {
    // The two partial unique indexes in migration 035 mean a re-run hits an
    // already-open proposal rather than duplicating it. That is the design,
    // not a failure.
    if (error.code === '23505') {
      console.log(`    already queued: ${label}`)
      stats.candidatesSkipped++
      return
    }
    console.error(`    ERROR queueing ${label}: ${error.message}`)
    stats.candidatesSkipped++
    return
  }

  console.log(`    queued ${label} (confidence ${input.confidence})`)
  stats.candidatesCreated++
}

async function stampVerification(
  sb: SupabaseClient | null,
  listingId: string,
  status: 'confirmed' | 'changed' | 'gone' | 'unclear' | 'unreachable',
  dryRun: boolean,
): Promise<void> {
  if (dryRun) return
  const { error } = await sb!
    .from('work_exchanges')
    .update({ last_verified_at: new Date().toISOString(), last_verify_status: status })
    .eq('id', listingId)
  if (error) console.error(`    ERROR stamping verification: ${error.message}`)
}

// ─── Modes ───────────────────────────────────────────────────────────────────

async function runVerify(
  sb: SupabaseClient,
  client: Anthropic,
  args: Args,
  runId: string,
  stats: Stats,
): Promise<void> {
  console.log('\n── Verify ──')

  const cutoff = new Date(Date.now() - args.staleDays * 86_400_000).toISOString()
  let query = sb
    .from('work_exchanges')
    .select('*')
    .eq('is_active', true)
    .not('source_url', 'is', null)
    .or(`last_verified_at.is.null,last_verified_at.lt.${cutoff}`)
    .order('last_verified_at', { ascending: true, nullsFirst: true })
    .limit(args.limit)

  if (args.providerId) query = query.eq('provider_id', args.providerId)

  const { data, error } = await query
  if (error) {
    console.error(`Could not load listings: ${error.message}`)
    return
  }

  const listings = (data ?? []) as ListingRow[]
  console.log(`${listings.length} listing(s) due for a check (unverified or older than ${args.staleDays} days)\n`)

  for (const listing of listings) {
    console.log(`  ${listing.title}`)
    console.log(`    source: ${listing.source_url}`)

    const page = await fetchPage(listing.source_url!, stats)
    if (!page.ok) {
      console.log(`    unreachable: ${page.reason}`)
      // A page we could not read is not evidence the program ended, so this
      // records the attempt without proposing anything.
      await stampVerification(sb, listing.id, 'unreachable', !args.apply)
      continue
    }

    const result = await verifyListing(client, listing, page.text, stats)
    if (!result) continue

    stats.verified++
    console.log(`    ${result.status} (confidence ${result.confidence}) — ${result.note}`)
    await stampVerification(sb, listing.id, result.status, !args.apply)

    // "unclear" proposes nothing on purpose. Several seeded listings point at
    // an organisation homepage rather than a volunteer page (migration 035
    // backfills provider websites where the seed named no page), and "this
    // homepage does not enumerate programmes" is not evidence a programme
    // ended. The stamp records that we looked.
    if (result.status === 'gone') {
      await insertCandidate(sb, runId, {
        kind: 'delist',
        work_exchange_id: listing.id,
        provider_id: listing.provider_id,
        external_id: listing.external_id,
        source_url: listing.source_url!,
        proposed: { title: listing.title },
        agent_note: result.note,
        evidence: result.evidence,
        confidence: result.confidence,
      }, !args.apply, stats)
    } else if (result.status === 'changed' && result.revised) {
      await insertCandidate(sb, runId, {
        kind: 'update',
        work_exchange_id: listing.id,
        provider_id: listing.provider_id,
        external_id: listing.external_id,
        source_url: listing.source_url!,
        proposed: { ...result.revised, address: listing.address ?? {} },
        agent_note: result.note,
        evidence: result.evidence,
        confidence: result.confidence,
      }, !args.apply, stats)
    }
  }
}

async function runDiscover(
  sb: SupabaseClient,
  client: Anthropic,
  args: Args,
  runId: string,
  stats: Stats,
): Promise<void> {
  console.log('\n── Discover ──')

  // Only verified providers: /work joins `providers` and public RLS exposes
  // verified rows only, so a listing under a pending org renders without an
  // organization name or a working apply button.
  let query = sb
    .from('providers')
    .select('id, organization_name, website')
    .eq('verification_status', 'verified')
    .not('website', 'is', null)
    .order('organization_name')
    .limit(args.limit)

  if (args.providerId) query = query.eq('id', args.providerId)

  const { data, error } = await query
  if (error) {
    console.error(`Could not load providers: ${error.message}`)
    return
  }

  const providers = (data ?? []) as ProviderRow[]
  console.log(`${providers.length} provider website(s) to read\n`)

  for (const provider of providers) {
    console.log(`  ${provider.organization_name}`)
    console.log(`    site: ${provider.website}`)

    const { data: existing } = await sb
      .from('work_exchanges')
      .select('*')
      .eq('provider_id', provider.id)

    const siblings = (existing ?? []) as ListingRow[]
    const titles = siblings.map(l => l.title)

    const page = await fetchPage(provider.website!, stats)
    if (!page.ok) {
      console.log(`    unreachable: ${page.reason}`)
      continue
    }

    const result = await discoverForProvider(client, provider, page.text, titles, stats)
    if (!result) continue

    if (result.opportunities.length === 0) {
      console.log(`    nothing new — ${result.note}`)
      continue
    }

    // Give a new listing the same place as the org's existing ones. Where
    // there are none, the admin screen collects the address before approving;
    // /work renders "city, state" and an empty address reads as broken.
    const anchor = siblings.find(l => l.address && l.address.city)

    for (const opp of result.opportunities) {
      const { evidence, confidence, ...payload } = opp
      await insertCandidate(sb, runId, {
        kind: 'new',
        work_exchange_id: null,
        provider_id: provider.id,
        external_id: null,
        source_url: provider.website!,
        proposed: {
          ...payload,
          address: anchor?.address ?? {},
          lat: anchor?.lat ?? null,
          lng: anchor?.lng ?? null,
        },
        agent_note: result.note,
        evidence,
        confidence,
      }, !args.apply, stats)
    }
  }
}

// ─── Summary ─────────────────────────────────────────────────────────────────

function printSummary(stats: Stats, dryRun: boolean): void {
  // Claude Opus 5 list price, for a rough per-run figure. Not a bill.
  const cost = (stats.inputTokens / 1e6) * 5 + (stats.outputTokens / 1e6) * 25

  console.log(`\n${'─'.repeat(60)}`)
  console.log(`  Work exchange agent (${dryRun ? 'DRY RUN' : 'APPLIED'})`)
  console.log('─'.repeat(60))
  console.log(`  Pages fetched         : ${stats.pagesFetched}`)
  console.log(`  Fetch failures        : ${stats.fetchFailures}`)
  console.log(`  Blocked by robots.txt : ${stats.robotsBlocked}`)
  console.log(`  Listings verified     : ${stats.verified}`)
  console.log('')
  console.log(`  Candidates queued     : ${stats.candidatesCreated}`)
  console.log(`  Candidates skipped    : ${stats.candidatesSkipped}`)
  console.log('')
  console.log(`  Model calls           : ${stats.modelCalls}`)
  console.log(`  Tokens in / out       : ${stats.inputTokens} / ${stats.outputTokens}`)
  console.log(`  Approx. cost          : $${cost.toFixed(3)}`)
  console.log('─'.repeat(60))

  if (dryRun) {
    console.log('\n  This was a DRY RUN — nothing was written. Re-run with --apply.')
  } else if (stats.candidatesCreated > 0) {
    console.log('\n  Review the queue at /admin/work-exchange. Nothing is public until approved.')
  }
}

// ─── Entry point ─────────────────────────────────────────────────────────────

function parseArgs(argv: string[]): Args {
  const flagValue = (name: string): string | null => {
    const i = argv.indexOf(name)
    return i >= 0 && argv[i + 1] ? argv[i + 1] : null
  }
  const limit = parseInt(flagValue('--limit') ?? '20', 10)
  const staleDays = parseInt(flagValue('--stale-days') ?? '30', 10)

  return {
    verify: argv.includes('--verify'),
    discover: argv.includes('--discover'),
    apply: argv.includes('--apply'),
    limit: Number.isFinite(limit) && limit > 0 ? limit : 20,
    providerId: flagValue('--provider'),
    staleDays: Number.isFinite(staleDays) && staleDays >= 0 ? staleDays : 30,
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))

  if (!args.verify && !args.discover) {
    console.error(
      'Usage:\n' +
      '  npm run agent:work -- --verify [--apply]\n' +
      '  npm run agent:work -- --discover [--provider <uuid>] [--apply]\n\n' +
      'Pick at least one of --verify or --discover. Without --apply this is a dry run.',
    )
    process.exit(1)
  }

  console.log(
    args.apply
      ? '=== APPLY — queueing candidates in Supabase ==='
      : '=== DRY RUN — no changes will be written ===',
  )

  loadEnvFile(resolve(process.cwd(), '.env.local'))

  const supabaseUrl = process.env['VITE_SUPABASE_URL'] ?? process.env['SUPABASE_URL'] ?? ''
  const serviceKey  = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? ''
  const anthropicKey = process.env['ANTHROPIC_API_KEY'] ?? ''

  if (!supabaseUrl || !serviceKey) {
    console.error(
      'ERROR: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (even for a dry run —\n' +
      'the agent reads existing listings so it knows what to check).\n' +
      'Get the service key from: Supabase Dashboard → Project Settings → API → service_role\n' +
      'WARNING: never commit it.',
    )
    process.exit(1)
  }
  if (!anthropicKey) {
    console.error('ERROR: ANTHROPIC_API_KEY is required. Add it to .env.local.')
    process.exit(1)
  }

  const sb = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const client = new Anthropic({ apiKey: anthropicKey })

  // Fail early and clearly if migration 035 has not reached live yet.
  const { error: probe } = await sb.from('work_exchange_candidates').select('id').limit(1)
  if (probe) {
    console.error(
      `\nERROR: cannot read work_exchange_candidates (${probe.message}).\n` +
      'Migration 035 has probably not been applied — see docs/apply-migration-035.md.\n',
    )
    process.exit(1)
  }

  const runId = `wx_${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`
  console.log(`Run id: ${runId}\nModel:  ${MODEL}\nAgent:  ${USER_AGENT}`)

  const stats: Stats = {
    pagesFetched: 0, fetchFailures: 0, robotsBlocked: 0, verified: 0,
    candidatesCreated: 0, candidatesSkipped: 0,
    modelCalls: 0, inputTokens: 0, outputTokens: 0,
  }

  if (args.verify)   await runVerify(sb, client, args, runId, stats)
  if (args.discover) await runDiscover(sb, client, args, runId, stats)

  printSummary(stats, !args.apply)
}

main().catch(err => {
  console.error('Unhandled error:', err)
  process.exit(1)
})
