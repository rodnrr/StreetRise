# StreetRise Blog Publisher Worker

Generates a **draft** StreetRise blog post and, by default, a matching hero image. The Worker then stores the image in the existing `streetrise-assets` R2 bucket and inserts the post into `blog_posts` with `is_published = false`.

It never publishes automatically. An admin still reviews and publishes the post from `/admin/blog`.

## What it uses

- Cloudflare Workers AI text model: `@cf/meta/llama-3.3-70b-instruct-fp8-fast`
- Cloudflare Workers AI image model: `@cf/black-forest-labs/flux-2-klein-4b`
- R2 bucket binding: `streetrise-assets`
- Public asset base: `https://assets.streetrise.org`
- Existing Supabase `blog_posts` table and `is_admin()` RLS helper

The hero image is generated at 1536×1024 (3:2) to match the blog's current cover ratio. The prompt deliberately asks for **no text or logos inside the generated image** so article titles are rendered by the site rather than relying on image-model typography.

## Security model

The `/draft` route requires the caller's **Supabase access token** in the `Authorization` header.

The Worker calls the existing `is_admin()` RPC with that token. Only a verified StreetRise admin/super-admin can continue. The same user token is then used for the `blog_posts` insert, so the existing RLS policy remains the final authorization gate.

This Worker does **not** contain a Supabase service-role key.

## One-time setup

From the repository root:

```bash
npm ci

npx wrangler secret put SUPABASE_URL \
  --config workers/blog-publisher/wrangler.jsonc

npx wrangler secret put SUPABASE_ANON_KEY \
  --config workers/blog-publisher/wrangler.jsonc
```

Use the same Supabase URL and anon key already configured for the StreetRise app.

The R2 binding is declared in `workers/blog-publisher/wrangler.jsonc` and points to `streetrise-assets`.

## Run locally

```bash
npx wrangler dev --config workers/blog-publisher/wrangler.jsonc
```

Cloudflare normally uses local simulations for bindings during `wrangler dev`. For a production-style test, deploy the Worker and call its deployed URL instead of writing test images into a local R2 simulation.

## Deploy

```bash
npx wrangler deploy --config workers/blog-publisher/wrangler.jsonc
```

After deployment, Cloudflare will return a `workers.dev` URL. You can optionally attach a custom domain such as:

```text
blog-agent.streetrise.org
```

Do not point `assets.streetrise.org` at the Worker; that domain is already the public R2 asset host.

## Health check

```bash
curl https://<worker-host>/health
```

Expected:

```json
{"ok":true,"service":"streetrise-blog-publisher"}
```

## Create a draft

Obtain the current admin user's Supabase access token from the authenticated StreetRise session, then call:

```bash
curl -X POST https://<worker-host>/draft \
  -H "Authorization: Bearer <SUPABASE_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "StreetRise is now live in Miami",
    "angle": "Expansion announcement and invitation for local providers to participate",
    "location": "Miami, Florida",
    "audience": "People seeking resources, outreach teams, providers, and supporters",
    "facts": [
      "StreetRise is now live in Miami, Florida.",
      "StreetRise helps people discover community resources.",
      "The public app is available at https://app.streetrise.org."
    ],
    "keywords": ["Miami community resources", "StreetRise Miami"],
    "author_name": "StreetRise Team",
    "generate_hero": true
  }'
```

### Request fields

| Field | Required | Notes |
|---|---:|---|
| `topic` | yes | Main subject of the post |
| `angle` | no | Editorial framing |
| `audience` | no | Who the post is for |
| `location` | no | City/region when relevant |
| `facts` | no | Facts the model is allowed to assert; strongly recommended for launches, partnerships, counts, dates, and current-status posts |
| `keywords` | no | SEO terms to weave in naturally |
| `author_name` | no | Defaults to `StreetRise Team` |
| `generate_hero` | no | Defaults to `true` |

## Response

On success the Worker returns the new draft metadata, including the R2 cover URL:

```json
{
  "ok": true,
  "post": {
    "id": "...",
    "slug": "streetrise-is-now-live-in-miami",
    "title": "StreetRise Is Now Live in Miami",
    "cover_image_url": "https://assets.streetrise.org/blog/streetrise-is-now-live-in-miami-cover-....jpg",
    "is_published": false
  },
  "hero": {
    "generated": true,
    "key": "blog/...jpg",
    "error": null
  },
  "note": "Draft created. Review it in /admin/blog before publishing."
}
```

If hero generation fails, the Worker still creates the text draft and returns the hero error. An admin can upload or paste a cover image later in `/admin/blog`.

## Editorial safeguards

The writing prompt instructs the model to:

- use supplied facts as the only basis for concrete launch, partner, date, count, availability, or service claims;
- avoid inventing statistics, quotes, provider names, or impact numbers;
- avoid implying a booking request guarantees a bed, admission, or placement;
- use respectful, non-sensational language;
- create plain-text body content that renders cleanly in the current `BlogPostPage` implementation;
- create a human-centered 3:2 hero prompt with no embedded text or logos.

## Recommended next step

Once the Worker is deployed and tested, wire a small **Generate with AI** panel into `/admin/blog`. The browser can pass the logged-in admin's Supabase access token directly to this Worker; no new shared secret needs to be exposed to the frontend.
