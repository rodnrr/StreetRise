/**
 * Regenerate the published housing-organization URLs in public/sitemap.xml.
 *
 *   npm run housing:sitemap
 *
 * The 51 state pages are static and hand-maintained in the file — they exist
 * whether or not they have listings. Organization pages are not: /housing/org/x
 * 404s until that organization is published, and a sitemap that promises a
 * 404 costs crawl budget and trust.
 *
 * So this reads the live published set and rewrites only the block between the
 * HOUSING_ORG_URLS markers. It uses the ANON key on purpose: the anon role can
 * only see published organizations (migration 056 §12), which means the sitemap
 * is generated through exactly the same gate the public sees. Running it with a
 * service-role key would happily list unpublished orgs and leak them.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const SITE_URL = process.env.VITE_APP_URL ?? 'https://app.streetrise.org'
const SITEMAP = 'public/sitemap.xml'
const START = '<!-- HOUSING_ORG_URLS:START -->'
const END = '<!-- HOUSING_ORG_URLS:END -->'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Load .env.local first.')
  process.exit(1)
}

if (process.env.SUPABASE_SERVICE_ROLE_KEY && key === process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Refusing to run with the service-role key — it bypasses RLS and would list unpublished organizations.')
  process.exit(1)
}

const supabase = createClient(url, key)

async function main() {
  const { data, error } = await supabase
    .from('housing_organizations')
    .select('slug, updated_at')
    .order('slug')

  if (error) {
    console.error('Query failed:', error.message)
    process.exit(1)
  }

  const rows = (data ?? []) as { slug: string; updated_at: string }[]

  const entries = rows.map((r) =>
    [
      '  <url>',
      `    <loc>${SITE_URL}/housing/org/${r.slug}</loc>`,
      `    <lastmod>${r.updated_at.slice(0, 10)}</lastmod>`,
      '    <changefreq>monthly</changefreq>',
      '    <priority>0.6</priority>',
      '  </url>',
    ].join('\n')
  )

  const xml = readFileSync(SITEMAP, 'utf8')
  const startIdx = xml.indexOf(START)
  const endIdx = xml.indexOf(END)

  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    console.error(`Could not find the ${START} / ${END} markers in ${SITEMAP}.`)
    process.exit(1)
  }

  const next =
    xml.slice(0, startIdx + START.length) +
    (entries.length ? '\n' + entries.join('\n') + '\n  ' : '\n  ') +
    xml.slice(endIdx)

  writeFileSync(SITEMAP, next)
  console.log(`Wrote ${entries.length} published organization URL(s) to ${SITEMAP}.`)
  if (entries.length === 0) {
    console.log('None published yet — that is expected until a listing has been verified.')
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
