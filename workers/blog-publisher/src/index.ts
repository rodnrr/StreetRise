const TEXT_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast'
const IMAGE_MODEL = '@cf/black-forest-labs/flux-2-klein-4b'
const MAX_TOPIC_LENGTH = 240

/**
 * Ceiling on the caller-supplied part of the brief. The per-field caps above
 * it allow far more than this in aggregate (25 facts x 600 chars on their
 * own), so the total is checked before anything is sent to the model.
 *
 * An oversized brief is rejected rather than trimmed: trimming drops facts off
 * the end of the list, and the draft is only allowed to assert facts that were
 * supplied — so a silent trim would quietly narrow the post while looking like
 * a success. The prompt scaffold is ~2,000 characters, leaving the assembled
 * prompt well inside the model's 24,000-token window.
 */
const MAX_BRIEF_LENGTH = 6_000

/**
 * Covers go to the same Supabase Storage bucket the Upload button on
 * /admin/blog writes to (migration 031), so every blog cover lives in one
 * place and a generated post needs no extra hosting setup. The bucket is
 * public-read; writes are gated by is_admin(), which is the same check the
 * caller already passed.
 */
const COVER_BUCKET = 'blog-images'

/**
 * body_text is a public article field. If model-only material leaks into it,
 * reject the draft instead of asking an admin to notice a hidden prompt or SEO
 * note after the post has already been generated.
 */
const BODY_CONTAMINATION_RE = /(?:^|\n)\s*(?:hero(?:\s+image)?\s*(?:prompt)?|excerpt|seo\s+(?:notes?|checklist)|writing\s+notes?)\s*:|\bthe hero image for this article should\b/i

interface AiBinding {
  run(model: string, input: Record<string, unknown>): Promise<unknown>
}

interface Env {
  AI: AiBinding
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  DEFAULT_AUTHOR_NAME: string
  ALLOWED_ORIGIN?: string
}

interface GenerateRequest {
  topic: string
  angle?: string
  audience?: string
  location?: string
  facts?: string[]
  keywords?: string[]
  author_name?: string
  generate_hero?: boolean
}

interface GeneratedDraft {
  title: string
  excerpt: string
  body_text: string
  hero_prompt: string
}

interface BlogPostRow {
  id: string
  slug: string
  title: string
  excerpt: string
  body_markdown: string
  cover_image_url: string | null
  author_name: string
  is_published: boolean
  created_at: string
}

function json(data: unknown, status = 200, origin?: string): Response {
  const headers = new Headers({
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  if (origin) {
    headers.set('access-control-allow-origin', origin)
    headers.set('vary', 'Origin')
  }
  return new Response(JSON.stringify(data), { status, headers })
}

function corsHeaders(origin: string): Headers {
  return new Headers({
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'POST, GET, OPTIONS',
    'access-control-allow-headers': 'Authorization, Content-Type',
    'access-control-max-age': '86400',
    vary: 'Origin',
  })
}

function cleanBaseUrl(value: string): string {
  return value.replace(/\/+$/, '')
}

/**
 * Every deployment needs these two set. Without the check a missing value
 * surfaces as an opaque fetch failure against `undefined/rest/v1/...` — name
 * the binding instead, the way scripts/work-exchange-agent.ts does.
 */
function missingConfig(env: Env): string | null {
  if (!env.SUPABASE_URL) return 'SUPABASE_URL'
  if (!env.SUPABASE_ANON_KEY) return 'SUPABASE_ANON_KEY'
  return null
}

function bearerToken(request: Request): string | null {
  const auth = request.headers.get('authorization')
  if (!auth) return null
  const match = auth.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || null
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

function randomSuffix(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 7)
}

function safeText(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

/**
 * Caller input is never silently shortened — every cap below rejects instead.
 * `safeText` still truncates, but only where it is applied to *model* output,
 * which has no author to tell.
 */
function checkedText(value: unknown, field: string, maxLength: number): string {
  if (value === undefined || value === null) return ''
  if (typeof value !== 'string') throw new Error(`${field} must be a string.`)
  const trimmed = value.trim()
  if (trimmed.length > maxLength) {
    throw new Error(`${field} is ${trimmed.length} characters and the limit is ${maxLength}.`)
  }
  return trimmed
}

function checkedArray(
  value: unknown,
  field: string,
  maxItems: number,
  maxItemLength: number,
): string[] {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) throw new Error(`${field} must be an array of strings.`)
  if (value.length > maxItems) {
    throw new Error(`${field} has ${value.length} entries and the limit is ${maxItems}.`)
  }
  return value
    .map((item, index) => checkedText(item, `${field}[${index}]`, maxItemLength))
    .filter(Boolean)
}

function validateInput(raw: unknown): GenerateRequest {
  if (!raw || typeof raw !== 'object') throw new Error('Request body must be a JSON object.')
  const input = raw as Record<string, unknown>
  const topic = checkedText(input.topic, 'topic', MAX_TOPIC_LENGTH)
  if (topic.length < 3) throw new Error('topic is required and must be at least 3 characters.')

  const request: GenerateRequest = {
    topic,
    angle: checkedText(input.angle, 'angle', 500) || undefined,
    audience: checkedText(input.audience, 'audience', 500) || undefined,
    location: checkedText(input.location, 'location', 200) || undefined,
    facts: checkedArray(input.facts, 'facts', 25, 600),
    keywords: checkedArray(input.keywords, 'keywords', 15, 80),
    author_name: checkedText(input.author_name, 'author_name', 120) || undefined,
    generate_hero: typeof input.generate_hero === 'boolean' ? input.generate_hero : true,
  }

  const size = briefLength(request)
  if (size > MAX_BRIEF_LENGTH) {
    throw new Error(
      `The brief is ${size} characters and the limit is ${MAX_BRIEF_LENGTH}. ` +
        'Shorten the facts, or split the post in two — trimming it here would drop ' +
        'supplied facts, and the draft may only assert facts you supplied.',
    )
  }

  return request
}

/** Total caller-supplied text, measured the way buildWriterPrompt spends it. */
function briefLength(input: GenerateRequest): number {
  return (
    input.topic.length +
    (input.angle?.length ?? 0) +
    (input.audience?.length ?? 0) +
    (input.location?.length ?? 0) +
    (input.author_name?.length ?? 0) +
    (input.facts ?? []).reduce((total, fact) => total + fact.length + 4, 0) +
    (input.keywords ?? []).reduce((total, word) => total + word.length + 2, 0)
  )
}

/**
 * Only a clean `false` from is_admin() means denied. A stale session and an
 * unreachable Supabase are told apart from it and from each other, because all
 * three need different things from the admin: sign in again, try again later,
 * or stop trying. Answering "Admin access required" to any of them accuses a
 * real admin of not being one and sends them looking in the wrong place.
 */
type AdminCheck =
  | { status: 'ok' }
  | { status: 'denied' }
  | { status: 'expired' }
  | { status: 'unavailable'; upstream: number; unreadable?: true; unreachable?: true }

async function verifyAdmin(token: string, env: Env): Promise<AdminCheck> {
  let response: Response
  try {
    response = await fetch(`${cleanBaseUrl(env.SUPABASE_URL)}/rest/v1/rpc/is_admin`, {
      method: 'POST',
      headers: {
        apikey: env.SUPABASE_ANON_KEY,
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: '{}',
    })
  } catch {
    // DNS, TLS or connection failure — no HTTP response at all. Left to throw
    // it would escape handleGenerate's try block entirely and surface as an
    // opaque 500 with no CORS headers, which the panel reads as "the Worker is
    // unreachable" when the Worker is fine and Supabase is not.
    return { status: 'unavailable', upstream: 0, unreachable: true }
  }

  if (response.status === 401) return { status: 'expired' }
  // 403 is PostgREST refusing the token itself; anything else that is not ok
  // (429, 5xx, a gateway error) says nothing about who the caller is.
  if (response.status === 403) return { status: 'denied' }
  if (!response.ok) return { status: 'unavailable', upstream: response.status }
  try {
    return (await response.json()) === true ? { status: 'ok' } : { status: 'denied' }
  } catch {
    // A 2xx carrying something that is not JSON — a proxy or error page in
    // front of Supabase. Reporting the status alone would read as "returned
    // 200", which sends the reader looking in the wrong place.
    return { status: 'unavailable', upstream: response.status, unreadable: true }
  }
}

function buildWriterPrompt(input: GenerateRequest): string {
  const facts = input.facts?.length
    ? input.facts.map((fact, i) => `${i + 1}. ${fact}`).join('\n')
    : 'No additional factual claims were supplied.'
  const keywords = input.keywords?.length ? input.keywords.join(', ') : 'None supplied.'

  return `Write a polished StreetRise blog draft from the brief below.

StreetRise is a community-resource discovery platform. Its editorial voice is clear, humane, practical, hopeful, and professional. Avoid pity, sensationalism, savior language, stereotypes, or treating people experiencing homelessness as scenery. The post should be useful to people seeking help, outreach workers, service providers, donors, and community partners as appropriate to the topic.

NON-NEGOTIABLE ACCURACY RULES:
- Treat the supplied facts as the only factual claims you may assert about launches, coverage, partners, dates, counts, availability, features, or organizations.
- Do not invent statistics, provider names, quotes, partnerships, addresses, dates, service availability, or impact numbers.
- If a detail is not supplied, write around it instead of guessing.
- Never imply a booking request guarantees admission, a bed, or a service placement.
- Do not claim every resource is real-time or verified unless that claim is explicitly supplied in the facts.
- Never invent or alter a URL, email address, phone number, street address, date, or time.

ARTICLE LENGTH:
- Do not pad a thin brief just to reach a word count.
- Event announcements and time-sensitive notices should usually be about 350-650 words.
- Educational/how-to articles should usually be about 500-800 words.
- Other posts should usually be about 400-750 words, unless the supplied facts justify more.
- Concision is preferable to repeating the same fact in different words.

MARKDOWN FORMAT — body_text MUST use this supported subset:
- Do not include an H1 or repeat the article title; the website renders the title separately.
- Use 3-5 descriptive ## section headings. Use ### only when a real subsection improves navigation.
- Keep paragraphs short: usually 1-3 sentences.
- Use **bold** selectively for important dates, times, locations, actions, warnings, or key takeaways.
- Use *italics* sparingly for light emphasis only.
- Use - bullet lists for event details, requirements, resources, quick facts, or scannable takeaways.
- Use numbered lists only for genuinely sequential instructions.
- Use > blockquotes only for a supplied quotation or a genuinely useful callout; never fabricate a quote.
- You may use --- as a divider only when it genuinely improves a long article.
- Do not output HTML, emojis, tables, fenced code, or Markdown images in body_text.

LINKS AND CONTACT INFORMATION:
- Every supplied URL used in the article must be written as a descriptive Markdown link, for example [Register for the event](https://example.org/register), not as a bare URL.
- A raw URL should never be used as its own link label when a human-readable label is possible.
- Every supplied email address used in the article should be a Markdown mailto link, for example [volunteer@example.org](mailto:volunteer@example.org).
- Do not invent a URL, link target, email address, or link destination.
- Prefer one strong link placement. A registration/action link may appear once in a details section and once in the final CTA, but do not repeat it throughout the article.

EDITORIAL QUALITY:
- Every section must add new information. Do not create sections that merely paraphrase an earlier section.
- Do not repeat the same date, address, phone number, registration link, feature, or factual claim unless repetition is necessary for the final CTA.
- For an event, consolidate logistics into one compact ## Event Details section instead of repeating them throughout the post.
- Avoid filler and generic throat-clearing such as “community resources play a vital role,” “in today’s world,” or definitions of obvious concepts unless the brief specifically calls for education on that concept.
- Do not explain verification, service navigation, homelessness, resource discovery, or StreetRise merely to increase article length; include them only when relevant to the requested angle.
- Vary sentence structure and paragraph openings. Avoid repetitive transitions such as “This event,” “These resources,” or “By understanding” in consecutive paragraphs.
- Open with the most useful or interesting fact, not a generic introduction.
- End with one concise, practical call to action.
- Do not add an author signature, tagline, copyright line, or “StreetRise Team” sign-off inside body_text; the website can render consistent branding separately.

OUTPUT HYGIENE:
- body_text must contain only the article body in Markdown.
- Never put the title, excerpt, hero prompt, image-generation directions, SEO checklist, keywords, writing notes, or model commentary into body_text.
- hero_prompt belongs only in hero_prompt. excerpt belongs only in excerpt.
- Excerpt should be 130-180 characters and work as a standalone meta description without repeating the full title.

HERO IMAGE:
Create a detailed visual prompt for a 3:2 editorial hero photo. Match the established StreetRise look: cinematic natural light, dark navy/teal visual accents, warm human-centered documentary photography, polished nonprofit-tech editorial quality. The image must be respectful and dignified. Do not request any words, logos, captions, watermarks, UI text, or readable signage inside the generated image; the website supplies the article title separately.

BRIEF
Topic: ${input.topic}
Angle: ${input.angle ?? 'Choose the most useful angle for the topic.'}
Audience: ${input.audience ?? 'StreetRise users, service providers, outreach teams, supporters, and community partners.'}
Location: ${input.location ?? 'Use no specific location unless supported by the supplied facts.'}
SEO keywords: ${keywords}
Author: ${input.author_name ?? 'StreetRise Team'}

SUPPLIED FACTS
${facts}

Return only the structured fields requested by the response schema.`
}

const BLOG_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string', minLength: 5, maxLength: 120 },
    excerpt: { type: 'string', minLength: 80, maxLength: 220 },
    body_text: { type: 'string', minLength: 400, maxLength: 12000 },
    hero_prompt: { type: 'string', minLength: 80, maxLength: 1800 },
  },
  required: ['title', 'excerpt', 'body_text', 'hero_prompt'],
} as const

function parseGeneratedDraft(result: unknown): GeneratedDraft {
  const response = (result as { response?: unknown } | null)?.response
  let parsed: unknown = response

  if (typeof response === 'string') {
    try {
      parsed = JSON.parse(response)
    } catch {
      throw new Error('The writing model did not return valid JSON. Try again.')
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('The writing model returned an invalid draft payload.')
  }

  const obj = parsed as Record<string, unknown>
  const title = safeText(obj.title, 120)
  const excerpt = safeText(obj.excerpt, 220)
  const bodyText = safeText(obj.body_text, 12_000)
  const heroPrompt = safeText(obj.hero_prompt, 1_800)

  if (title.length < 5 || excerpt.length < 80 || bodyText.length < 400 || heroPrompt.length < 80) {
    throw new Error('The generated draft was incomplete. Please try again with a more specific brief.')
  }

  if (BODY_CONTAMINATION_RE.test(bodyText)) {
    throw new Error('The writing model mixed article content with generation metadata. Please try again.')
  }

  const sectionCount = (bodyText.match(/^##\s+\S.+$/gm) ?? []).length
  if (sectionCount < 2) {
    throw new Error('The writing model did not return a structured Markdown article. Please try again.')
  }

  if (/^#\s+/m.test(bodyText)) {
    throw new Error('The writing model repeated the article title as an H1. Please try again.')
  }

  return { title, excerpt, body_text: bodyText, hero_prompt: heroPrompt }
}

async function generateDraft(input: GenerateRequest, env: Env): Promise<GeneratedDraft> {
  const result = await env.AI.run(TEXT_MODEL, {
    messages: [
      {
        role: 'system',
        content: 'You are the StreetRise editorial assistant. Write clean, human-readable Markdown and follow the factual-grounding rules exactly.',
      },
      { role: 'user', content: buildWriterPrompt(input) },
    ],
    max_tokens: 3200,
    temperature: 0.45,
    response_format: {
      type: 'json_schema',
      json_schema: BLOG_SCHEMA,
    },
  })

  return parseGeneratedDraft(result)
}

/** Returns the raw buffer — a Uint8Array view is not a valid fetch body type. */
function base64ToBytes(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

async function generateHeroImage(
  draft: GeneratedDraft,
  slug: string,
  token: string,
  env: Env,
): Promise<{ url: string; key: string }> {
  const form = new FormData()
  form.append(
    'prompt',
    `${draft.hero_prompt}\n\nWide 3:2 composition, 1536x1024. No text, no letters, no logos, no watermark, no readable signage. Keep important subjects away from the extreme edges so the image crops cleanly on mobile.`,
  )
  form.append('width', '1536')
  form.append('height', '1024')

  // FormData does not expose its serialized body or boundary; passing it to a
  // Response constructor produces both, which is what the multipart binding
  // needs. `steps` is fixed at 4 on this distilled model and is not sent.
  const serialized = new Response(form)
  const contentType = serialized.headers.get('content-type')
  if (!serialized.body || !contentType) throw new Error('Could not prepare the image request.')

  const result = await env.AI.run(IMAGE_MODEL, {
    multipart: {
      body: serialized.body,
      contentType,
    },
  })

  const image = (result as { image?: unknown } | null)?.image
  if (typeof image !== 'string' || !image) throw new Error('The image model returned no image.')

  const key = `covers/ai-${Date.now()}-${slug}.jpg`
  const upload = await fetch(
    `${cleanBaseUrl(env.SUPABASE_URL)}/storage/v1/object/${COVER_BUCKET}/${key}`,
    {
      method: 'POST',
      headers: {
        apikey: env.SUPABASE_ANON_KEY,
        authorization: `Bearer ${token}`,
        'content-type': 'image/jpeg',
        'cache-control': 'max-age=31536000',
      },
      body: base64ToBytes(image),
    },
  )

  if (!upload.ok) {
    const detail = (await upload.text()).slice(0, 300)
    throw new Error(`Storing the hero image failed (${upload.status}): ${detail}`)
  }

  return {
    key,
    url: `${cleanBaseUrl(env.SUPABASE_URL)}/storage/v1/object/public/${COVER_BUCKET}/${key}`,
  }
}

/**
 * Best-effort cleanup for a cover whose draft never landed. A failure here is
 * swallowed on purpose: the caller is already handling a more important error,
 * and a leftover object is a smaller problem than masking it.
 */
async function deleteCover(key: string, token: string, env: Env): Promise<void> {
  try {
    await fetch(`${cleanBaseUrl(env.SUPABASE_URL)}/storage/v1/object/${COVER_BUCKET}/${key}`, {
      method: 'DELETE',
      headers: {
        apikey: env.SUPABASE_ANON_KEY,
        authorization: `Bearer ${token}`,
      },
    })
  } catch {
    /* nothing useful to do — the draft error is what the admin needs to see */
  }
}

async function insertDraft(
  draft: GeneratedDraft,
  input: GenerateRequest,
  baseSlug: string,
  coverImageUrl: string | null,
  token: string,
  env: Env,
): Promise<BlogPostRow> {
  const authorName = input.author_name?.trim() || env.DEFAULT_AUTHOR_NAME || 'StreetRise Team'

  const makePayload = (slug: string) => ({
    slug,
    title: draft.title,
    excerpt: draft.excerpt,
    body_markdown: draft.body_text,
    cover_image_url: coverImageUrl,
    author_name: authorName,
    is_published: false,
    published_at: null,
  })

  const write = async (slug: string): Promise<Response> =>
    fetch(`${cleanBaseUrl(env.SUPABASE_URL)}/rest/v1/blog_posts`, {
      method: 'POST',
      headers: {
        apikey: env.SUPABASE_ANON_KEY,
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        prefer: 'return=representation',
      },
      body: JSON.stringify(makePayload(slug)),
    })

  let response = await write(baseSlug)
  if (response.status === 409) response = await write(`${baseSlug}-${randomSuffix()}`)

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 600)
    throw new Error(`Supabase rejected the draft (${response.status}): ${detail}`)
  }

  const rows = (await response.json()) as BlogPostRow[]
  if (!rows[0]) throw new Error('Supabase created the draft but returned no row.')
  return rows[0]
}

async function handleGenerate(request: Request, env: Env, origin?: string): Promise<Response> {
  const token = bearerToken(request)
  if (!token) return json({ error: 'Missing Supabase access token.' }, 401, origin)

  const admin = await verifyAdmin(token, env)
  if (admin.status === 'expired') {
    return json({ error: 'Your session has expired — sign in again.' }, 401, origin)
  }
  if (admin.status === 'unavailable') {
    return json(
      {
        error: admin.unreachable
          ? 'Could not reach Supabase to check your account. The Worker is running; ' +
            'Supabase is not answering it. This is not a permissions problem — try again in a moment.'
          : admin.unreadable
            ? 'Could not check your account — Supabase returned an unreadable response. ' +
              'This is not a permissions problem — try again in a moment.'
            : `Could not check your account with Supabase (it returned ${admin.upstream}). ` +
              'This is not a permissions problem — try again in a moment.',
      },
      503,
      origin,
    )
  }
  if (admin.status === 'denied') return json({ error: 'Admin access required.' }, 403, origin)

  let input: GenerateRequest
  try {
    input = validateInput(await request.json())
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Invalid request.' }, 400, origin)
  }

  try {
    const draft = await generateDraft(input, env)
    const slug = slugify(draft.title) || `streetrise-update-${randomSuffix()}`

    let coverImageUrl: string | null = null
    let heroError: string | null = null
    let heroKey: string | null = null

    if (input.generate_hero !== false) {
      try {
        const hero = await generateHeroImage(draft, slug, token, env)
        coverImageUrl = hero.url
        heroKey = hero.key
      } catch (error) {
        // A missing cover is recoverable in /admin/blog; a lost draft is not.
        heroError = error instanceof Error ? error.message : 'Hero image generation failed.'
      }
    }

    let post: BlogPostRow
    try {
      post = await insertDraft(draft, input, slug, coverImageUrl, token, env)
    } catch (error) {
      // The cover is already in the bucket at this point and nothing will ever
      // reference it, so each retry would leave another public orphan behind.
      if (heroKey) await deleteCover(heroKey, token, env)
      throw error
    }

    return json(
      {
        ok: true,
        post: {
          id: post.id,
          slug: post.slug,
          title: post.title,
          excerpt: post.excerpt,
          author_name: post.author_name,
          cover_image_url: post.cover_image_url,
          is_published: post.is_published,
          created_at: post.created_at,
        },
        hero: {
          generated: Boolean(coverImageUrl),
          key: heroKey,
          error: heroError,
        },
        note: 'Draft created. Review it in /admin/blog before publishing.',
      },
      201,
      origin,
    )
  } catch (error) {
    console.error('blog generation failed', error instanceof Error ? error.message : error)
    return json(
      { error: error instanceof Error ? error.message : 'Blog generation failed.' },
      500,
      origin,
    )
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const requestOrigin = request.headers.get('origin') ?? ''
    // Comma-separated so a Pages preview or a local dev server can be added
    // without a code change.
    const allowed = (env.ALLOWED_ORIGIN || 'https://app.streetrise.org')
      .split(',')
      .map(value => value.trim())
      .filter(Boolean)
    const origin = allowed.includes(requestOrigin) ? requestOrigin : undefined

    if (request.method === 'OPTIONS') {
      if (!origin) return new Response(null, { status: 403 })
      return new Response(null, { status: 204, headers: corsHeaders(origin) })
    }

    const missing = missingConfig(env)

    if (request.method === 'GET' && url.pathname === '/health') {
      return json(
        missing
          ? { ok: false, service: 'streetrise-blog-publisher', error: `${missing} is not set.` }
          : { ok: true, service: 'streetrise-blog-publisher' },
        missing ? 500 : 200,
        origin,
      )
    }

    if (request.method === 'POST' && url.pathname === '/draft') {
      if (missing) {
        return json({ error: `${missing} is not set on this Worker.` }, 500, origin)
      }
      return handleGenerate(request, env, origin)
    }

    return json(
      {
        error: 'Not found.',
        routes: ['GET /health', 'POST /draft'],
      },
      404,
      origin,
    )
  },
}