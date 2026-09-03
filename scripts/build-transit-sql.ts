/**
 * StreetRise — generate the transit seed migration from a static GTFS feed.
 *
 *   npx tsx scripts/build-transit-sql.ts <unzipped-gtfs-dir> <agency-slug> > out.sql
 *
 * Reads a published GTFS bundle and emits the INSERTs for `transit_stops` and
 * `transit_routes` (schema: migration 042). The committed migration 043 is
 * this script's output for HART's 2608.1 feed, so the provenance of every row
 * is reproducible rather than being a wall of hand-written SQL.
 *
 * Re-run it whenever an agency publishes a new feed — HART does so on service
 * change dates, roughly quarterly — and commit the new output as the next
 * migration. Adding a second agency (PSTA, LYNX, Miami-Dade) is another run
 * with a different slug, not a schema change.
 *
 * ── What it deliberately drops ──────────────────────────────────
 * `stop_times.txt` is ~19 MB and 411k rows for one mid-size agency. None of it
 * ships: the script reduces it to the two things a listing page actually needs
 * — which routes call at a stop, and the day types and weekday window they
 * cover — leaving ~2,200 small rows. `shapes.txt` (route geometry) is not read
 * at all; drawing bus lines on the map is not a decision anyone makes here.
 *
 * ── Only currently-active service ───────────────────────────────
 * A feed carries several service periods at once. HART's 2608.1 holds one that
 * ran to 15 Aug 2026 and one running to 2 Jan 2027. Only service_ids whose
 * calendar window covers the reference date are counted, so a stop that lost
 * its service in the last shake-up does not keep making a listing look
 * reachable. Pass a date as the third argument to build against a future feed
 * before it takes effect.
 */
import { createReadStream, readFileSync, existsSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { join } from 'node:path'

const [dir, agencySlug, asOfArg] = process.argv.slice(2)
if (!dir || !agencySlug) {
  console.error('usage: tsx scripts/build-transit-sql.ts <gtfs-dir> <agency-slug> [YYYYMMDD]')
  process.exit(1)
}

/** Minimal RFC 4180 reader — GTFS quotes any field containing a comma. */
function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (quoted) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++ } else { quoted = false }
      } else cur += c
    } else if (c === '"') quoted = true
    else if (c === ',') { out.push(cur); cur = '' }
    else cur += c
  }
  out.push(cur)
  return out
}

function readTable(name: string): Record<string, string>[] {
  const path = join(dir, name)
  if (!existsSync(path)) return []
  const lines = readFileSync(path, 'utf8').split(/\r?\n/).filter((l) => l.trim() !== '')
  const header = parseCsvLine(lines[0])
  return lines.slice(1).map((l) => {
    const cells = parseCsvLine(l)
    return Object.fromEntries(header.map((h, i) => [h, cells[i] ?? '']))
  })
}

const q = (v: string | null | undefined) =>
  v == null || v === '' ? 'NULL' : `'${v.replace(/'/g, "''")}'`
const arr = (vs: string[]) =>
  vs.length === 0 ? `'{}'` : `'{${vs.map((v) => `"${v.replace(/(["\\])/g, '\\$1')}"`).join(',')}}'`

// ── Feed metadata ────────────────────────────────────────────────
const feedInfo = readTable('feed_info.txt')[0] ?? {}
const feedVersion = feedInfo.feed_version || null
// Normalised to ISO YYYY-MM-DD. Postgres accepts GTFS's compact YYYYMMDD too,
// but the emitted SQL is read by people during an apply, and an unpunctuated
// date is the kind of thing that gets misread once and then trusted.
const rawFeedEnd = feedInfo.feed_end_date || null
const feedEnd = rawFeedEnd && /^\d{8}$/.test(rawFeedEnd)
  ? `${rawFeedEnd.slice(0, 4)}-${rawFeedEnd.slice(4, 6)}-${rawFeedEnd.slice(6, 8)}`
  : rawFeedEnd
const asOf = asOfArg || new Date().toISOString().slice(0, 10).replace(/-/g, '')

// ── Active calendar ──────────────────────────────────────────────
type ServiceDays = { weekday: boolean; saturday: boolean; sunday: boolean }
const activeService = new Map<string, ServiceDays>()
for (const c of readTable('calendar.txt')) {
  if (c.start_date <= asOf && asOf <= c.end_date) {
    activeService.set(c.service_id, {
      weekday: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].some((d) => c[d] === '1'),
      saturday: c.saturday === '1',
      sunday: c.sunday === '1',
    })
  }
}
if (activeService.size === 0) {
  console.error(`No service_id in calendar.txt is active on ${asOf} — refusing to emit an empty feed.`)
  process.exit(1)
}

// ── Routes and fares ─────────────────────────────────────────────
const fareAttrs = new Map(readTable('fare_attributes.txt').map((f) => [f.fare_id, f]))
const fareForRoute = new Map<string, Record<string, string>>()
for (const r of readTable('fare_rules.txt')) {
  const fa = fareAttrs.get(r.fare_id)
  if (fa) fareForRoute.set(r.route_id, fa)
}
const routes = new Map(readTable('routes.txt').map((r) => [r.route_id, r]))

// ── Trips on active service ──────────────────────────────────────
const tripMeta = new Map<string, { routeId: string; days: ServiceDays }>()
for (const t of readTable('trips.txt')) {
  const days = activeService.get(t.service_id)
  if (days) tripMeta.set(t.trip_id, { routeId: t.route_id, days })
}

// ── Stream stop_times ────────────────────────────────────────────
interface StopAgg {
  routeIds: Set<string>
  weekday: boolean; saturday: boolean; sunday: boolean
  first: number | null; last: number | null
}
const agg = new Map<string, StopAgg>()

/**
 * GTFS clock time to minutes past midnight.
 *
 * Two real-world details, both of which bite:
 *
 *  • Times legitimately exceed 24:00:00. A trip departing 00:32 after a
 *    Monday service day is published as `24:32:49`, and it belongs to
 *    Monday's service, not Tuesday's. The hour is NOT taken modulo 24 here —
 *    that happens only at display time — so a late trip still sorts as the
 *    last departure of its own day rather than jumping to first.
 *  • HART right-aligns the hour, so single-digit hours arrive as ` 5:01:41`
 *    with a leading space. An anchored \d+ pattern rejects those, which
 *    silently discards every departure before 10am and makes the first bus of
 *    the day look like a mid-morning one. Hence the trim.
 */
function toMinutes(hms: string): number | null {
  const m = /^(\d+):(\d{2}):(\d{2})$/.exec(hms.trim())
  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}

const rl = createInterface({ input: createReadStream(join(dir, 'stop_times.txt')), crlfDelay: Infinity })
let header: string[] | null = null
let idx: Record<string, number> = {}
for await (const line of rl) {
  if (!line.trim()) continue
  if (!header) {
    header = parseCsvLine(line)
    idx = Object.fromEntries(header.map((h, i) => [h, i]))
    continue
  }
  const cells = parseCsvLine(line)
  const meta = tripMeta.get(cells[idx.trip_id])
  if (!meta) continue
  const stopId = cells[idx.stop_id]
  let a = agg.get(stopId)
  if (!a) {
    a = { routeIds: new Set(), weekday: false, saturday: false, sunday: false, first: null, last: null }
    agg.set(stopId, a)
  }
  a.routeIds.add(meta.routeId)
  a.weekday ||= meta.days.weekday
  a.saturday ||= meta.days.saturday
  a.sunday ||= meta.days.sunday
  // pickup_type '1' means no boarding here — a drop-off-only call cannot be
  // the "first bus" for someone standing at the stop. Trimmed for the same
  // right-alignment reason as the times above.
  if (meta.days.weekday && cells[idx.pickup_type]?.trim() !== '1') {
    const t = toMinutes(cells[idx.departure_time] || cells[idx.arrival_time])
    if (t != null) {
      a.first = a.first == null ? t : Math.min(a.first, t)
      a.last = a.last == null ? t : Math.max(a.last, t)
    }
  }
}

const hhmm = (m: number | null) =>
  m == null ? null : `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

// ── Emit ─────────────────────────────────────────────────────────
const stops = readTable('stops.txt').filter((s) => agg.has(s.stop_id))
const usedRouteIds = new Set<string>()
for (const a of agg.values()) for (const r of a.routeIds) usedRouteIds.add(r)

const out: string[] = []
out.push(`-- Generated by scripts/build-transit-sql.ts from ${agencySlug} GTFS feed ${feedVersion ?? '(no feed_version)'}`)
out.push(`-- Active service as of ${asOf}; feed valid until ${feedEnd ?? 'unknown'}.`)
out.push(`-- ${stops.length} stops, ${usedRouteIds.size} routes. DO NOT EDIT BY HAND — re-run the script.`)
out.push('')

out.push('INSERT INTO transit_routes (')
out.push('  id, agency, route_id, short_name, long_name, route_type, color,')
out.push('  fare_price, fare_currency, is_fare_free, feed_version, feed_valid_until')
out.push(') VALUES')
const routeRows: string[] = []
for (const rid of [...usedRouteIds].sort()) {
  const r = routes.get(rid)
  if (!r) continue
  const fa = fareForRoute.get(rid)
  const price = fa?.price ?? null
  const free = price != null && Number(price) === 0
  routeRows.push(
    `  (${q(`${agencySlug}:${rid}`)}, ${q(agencySlug)}, ${q(rid)}, ${q(r.route_short_name)}, ` +
    `${q(r.route_long_name)}, ${r.route_type || 'NULL'}, ${q(r.route_color)}, ` +
    `${price == null ? 'NULL' : price}, ${q(fa?.currency_type)}, ${free ? 'TRUE' : 'FALSE'}, ` +
    `${q(feedVersion)}, ${feedEnd ? `DATE ${q(feedEnd)}` : 'NULL'})`,
  )
}
out.push(routeRows.join(',\n'))
out.push('ON CONFLICT (id) DO UPDATE SET')
out.push('  short_name = EXCLUDED.short_name, long_name = EXCLUDED.long_name,')
out.push('  route_type = EXCLUDED.route_type, color = EXCLUDED.color,')
out.push('  fare_price = EXCLUDED.fare_price, fare_currency = EXCLUDED.fare_currency,')
out.push('  is_fare_free = EXCLUDED.is_fare_free, feed_version = EXCLUDED.feed_version,')
out.push('  feed_valid_until = EXCLUDED.feed_valid_until, updated_at = NOW();')
out.push('')

out.push('INSERT INTO transit_stops (')
out.push('  id, agency, stop_id, stop_code, stop_name, lat, lng,')
out.push('  route_short_names, route_ids, serves_weekday, serves_saturday, serves_sunday,')
out.push('  weekday_first, weekday_last, feed_version, feed_valid_until')
out.push(') VALUES')
const stopRows: string[] = []
for (const s of stops) {
  const a = agg.get(s.stop_id)!
  const ids = [...a.routeIds].sort()
  const shorts = ids.map((r) => routes.get(r)?.route_short_name || r)
  stopRows.push(
    `  (${q(`${agencySlug}:${s.stop_id}`)}, ${q(agencySlug)}, ${q(s.stop_id)}, ${q(s.stop_code)}, ` +
    `${q(s.stop_name)}, ${s.stop_lat}, ${s.stop_lon}, ${arr(shorts)}, ${arr(ids)}, ` +
    `${a.weekday ? 'TRUE' : 'FALSE'}, ${a.saturday ? 'TRUE' : 'FALSE'}, ${a.sunday ? 'TRUE' : 'FALSE'}, ` +
    `${q(hhmm(a.first))}, ${q(hhmm(a.last))}, ${q(feedVersion)}, ${feedEnd ? `DATE ${q(feedEnd)}` : 'NULL'})`,
  )
}
out.push(stopRows.join(',\n'))
out.push('ON CONFLICT (id) DO UPDATE SET')
out.push('  stop_code = EXCLUDED.stop_code, stop_name = EXCLUDED.stop_name,')
out.push('  lat = EXCLUDED.lat, lng = EXCLUDED.lng,')
out.push('  route_short_names = EXCLUDED.route_short_names, route_ids = EXCLUDED.route_ids,')
out.push('  serves_weekday = EXCLUDED.serves_weekday, serves_saturday = EXCLUDED.serves_saturday,')
out.push('  serves_sunday = EXCLUDED.serves_sunday, weekday_first = EXCLUDED.weekday_first,')
out.push('  weekday_last = EXCLUDED.weekday_last, feed_version = EXCLUDED.feed_version,')
out.push('  feed_valid_until = EXCLUDED.feed_valid_until, updated_at = NOW();')
out.push('')

// A stop that vanished from the new feed must not linger: it would keep
// claiming service that no longer exists. Scoped to this agency so a
// PSTA import can never delete HART's stops.
out.push(`DELETE FROM transit_stops`)
out.push(`WHERE agency = ${q(agencySlug)} AND feed_version IS DISTINCT FROM ${q(feedVersion)};`)
out.push(`DELETE FROM transit_routes`)
out.push(`WHERE agency = ${q(agencySlug)} AND feed_version IS DISTINCT FROM ${q(feedVersion)};`)

console.log(out.join('\n'))
console.error(`emitted ${stops.length} stops, ${routeRows.length} routes (feed ${feedVersion}, active as of ${asOf})`)
