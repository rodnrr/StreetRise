const TEXT_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast'
const IMAGE_MODEL = '@cf/black-forest-labs/flux-2-klein-4b'
const MAX_TOPIC_LENGTH = 240
const MAX_CONTEXT_LENGTH = 8_000

interface AiBinding {
  run(model: string, input: Record<string, unknown>): Promise<unknown>
}

interface R2Binding {
  put(
    key: string,
    value: ArrayBuffer | ArrayBufferView | Blob | string,
    options?: {
      httpMetadata?: {
        contentType?: string
        cacheControl?: string
      }
      customMetadata?: Record<string, string>
    },
  ): Promise<unknown>
}

interface Env {
  AI: AiBinding
  BLOG_ASSETS: R2Binding
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  ASSET_BASE_URL: string
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

function stringArray(value: unknown, maxItems = 20): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map(item => item.trim())
    .filter(Boolean)
    .slice(0, maxItems)
}

function safeText(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function validateInput(raw: unknown): GenerateRequest {
  if (!raw || typeof raw !== 'object') throw new Error('Request body must be a JSON object.')
  const input = raw as Record<string, unknown>
  const topic = safeText(input.topic, MAX_TOPIC_LENGTH)
  if (topic.length < 3) throw new Error('topic is required and must be at least 3 characters.')

  return {
    topic,
    angle: safeText(input.angle, 500) || undefined,
    audience: safeText(input.audience, 500) || undefined,
    location: safeText(input.location, 200) || undefined,
    facts: stringArray(input.facts, 25).map(item => item.slice(0, 600)),
    keywords: stringArray(input.keywords, 15).map(item => item.slice(0, 80)),
    author_name: safeText(input.author_name, 120) || undefined,
    generate_hero: typeof input.generate_hero === 'boolean' ? input.generate_hero : true,
  }
}

async function verifyAdmin(token: string, env: Env): Promise<boolean> {
  const response = await fetch(`${cleanBaseUrl(env.SUPABASE_URL)}/rest/v1/rpc/is_admin`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: '{}',
  })

  if (!response.ok) return false
  try {
    return (await response.json()) === true
  } catch {
    return false
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

STYLE:
- 650-1,000 words unless the topic clearly calls for a shorter announcement.
- Strong opening, short readable paragraphs, 4-7 useful sections, and a concise call to action.
- Plain text body only. Section headings may appear on their own line, but do not use Markdown # headings, bold markers, HTML, emojis, or fenced code.
- Hyphen bullets are allowed when they improve scanability.
- End naturally; do not append an SEO checklist or writing notes.
- Excerpt should be 130-180 characters and make sense as a meta description.

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

Return only the structured fields requested by the response schema.`.slice(0, MAX_CONTEXT_LENGTH)
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
    parsed = JSON.parse(response)
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

  return { title, excerpt, body_text: bodyText, hero_prompt: heroPrompt }
}

async function generateDraft(input: GenerateRequest, env: Env): Promise<GeneratedDraft> {
  const result = await env.AI.run(TEXT_MODEL, {
    messages: [
      {
        role: 'system',
        content: 'You are the StreetRise editorial assistant. Follow the provided accuracy rules exactly.',
      },
      { role: 'user', content: buildWriterPrompt(input) },
    ],
    max_tokens: 3200,
    temperature: 0.55,
    response_format: {
      type: 'json_schema',
      json_schema: BLOG_SCHEMA,
    },
  })

  return parseGeneratedDraft(result)
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function generateHeroImage(
  draft: GeneratedDraft,
  slug: string,
  env: Env,
): Promise<{ url: string; key: string }> {
  const form = new FormData()
  form.append(
    'prompt',
    `${draft.hero_prompt}\n\nWide 3:2 composition, 1536x1024. No text, no letters, no logos, no watermark, no readable signage. Keep important subjects away from the extreme edges so the image crops cleanly on mobile.`,
  )
  form.append('width', '1536')
  form.append('height', '1024')
  form.append('guidance', '4.5')
  form.append('seed', String(Math.floor(Math.random() * 2_000_000_000)))

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

  const key = `blog/${slug}-cover-${Date.now()}.jpg`
  await env.BLOG_ASSETS.put(key, base64ToBytes(image), {
    httpMetadata: {
      contentType: 'image/jpeg',
      cacheControl: 'public, max-age=31536000, immutable',
    },
    customMetadata: {
      generatedBy: 'streetrise-blog-publisher',
      model: IMAGE_MODEL,
    },
  })

  return {
    key,
    url: `${cleanBaseUrl(env.ASSET_BASE_URL)}/${key}`,
  }
}

async function insertDraft(
  draft: GeneratedDraft,
  input: GenerateRequest,
  coverImageUrl: string | null,
  token: string,
  env: Env,
): Promise<BlogPostRow> {
  const baseSlug = slugify(draft.title) || `streetrise-update-${randomSuffix()}`
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
  if (!admin) return json({ error: 'Admin access required.' }, 403, origin)

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
        const hero = await generateHeroImage(draft, slug, env)
        coverImageUrl = hero.url
        heroKey = hero.key
      } catch (error) {
        heroError = error instanceof Error ? error.message : 'Hero image generation failed.'
      }
    }

    const post = await insertDraft(draft, input, coverImageUrl, token, env)

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
    const allowedOrigin = env.ALLOWED_ORIGIN || 'https://app.streetrise.org'
    const origin = requestOrigin === allowedOrigin ? requestOrigin : undefined

    if (request.method === 'OPTIONS') {
      if (!origin) return new Response(null, { status: 403 })
      return new Response(null, { status: 204, headers: corsHeaders(origin) })
    }

    if (request.method === 'GET' && url.pathname === '/health') {
      return json({ ok: true, service: 'streetrise-blog-publisher' }, 200, origin)
    }

    if (request.method === 'POST' && url.pathname === '/draft') {
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
