# StreetRise Blog Publisher Worker

Generates a **draft** StreetRise blog post and, by default, a matching cover
image. The draft lands in `blog_posts` with `is_published = false`.

It never publishes. An admin reviews and publishes it from `/admin/blog`, the
same as a hand-written post.

## What it uses

- Workers AI text model: `@cf/meta/llama-3.3-70b-instruct-fp8-fast`
- Workers AI image model: `@cf/black-forest-labs/flux-2-klein-4b`
- Supabase Storage bucket `blog-images` for the cover (migration 031)
- Supabase `blog_posts` table and the `is_admin()` RLS helper

Covers are generated at 1536×1024 (3:2) to match the ratio both blog pages
render. The prompt asks for **no text or logos inside the image** — titles are
drawn by the site, not by the image model.

Cover storage is Supabase, not R2, because that bucket is already public-read
with an admin-only write policy and R2 has no public base URL connected. See
`docs/r2-blog-images.md`.

## Security model

`/draft` requires the caller's **Supabase access token** in the `Authorization`
header. The Worker calls `is_admin()` with that token, and then does the image
upload and the `blog_posts` insert with the same token — so RLS is the real
gate, and a leaked Worker URL grants nothing to a non-admin.

The Worker holds **no service-role key**.

## Setup

Two values must be set on the Worker: `SUPABASE_URL` and `SUPABASE_ANON_KEY`
(the same pair the app uses — both are public values, but they are set as
Worker secrets rather than committed).

**From the Cloudflare dashboard (no terminal needed):**

1. **Workers & Pages → streetrise-blog-publisher → Settings → Variables and
   Secrets**
2. Add `SUPABASE_URL`, then `SUPABASE_ANON_KEY`, and deploy.

**From a terminal:**

```bash
npx wrangler secret put SUPABASE_URL   --config workers/blog-publisher/wrangler.jsonc
npx wrangler secret put SUPABASE_ANON_KEY --config workers/blog-publisher/wrangler.jsonc
npm run worker:blog:deploy
```

The first deploy has to come from a terminal, or from **Workers Builds**
(Workers & Pages → Create → connect this repo, root directory
`workers/blog-publisher`), which then redeploys on every push to `main` and can
be set up entirely from a phone.

`ALLOWED_ORIGIN` in `wrangler.jsonc` is a comma-separated allowlist for CORS.
Add a Pages preview host or `http://localhost:5173` there when testing the
admin panel outside production.

## Connecting the admin panel

Set `VITE_BLOG_WORKER_URL` to the deployed Worker's origin (no trailing slash)
in **Cloudflare Pages → streetrise → Settings → Environment variables**, then
redeploy the app. An **AI Draft** button appears on `/admin/blog`.

With the variable unset the panel stays hidden, so an app deployed without the
Worker shows no button that cannot work.

## Health check

```bash
curl https://<worker-host>/health
```

`{"ok":true,...}` means both config values are set. If one is missing the
response says which, with status 500.

## Create a draft directly

```bash
curl -X POST https://<worker-host>/draft \
  -H "Authorization: Bearer <SUPABASE_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "StreetRise is now live in Miami",
    "angle": "Expansion announcement and invitation for local providers",
    "location": "Miami, Florida",
    "facts": [
      "StreetRise is now live in Miami, Florida.",
      "The public app is available at https://app.streetrise.org."
    ],
    "keywords": ["Miami community resources"],
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
| `facts` | no | The only claims the model may assert; supply these for anything involving launches, partnerships, counts, dates, or current status |
| `keywords` | no | SEO terms to weave in naturally |
| `author_name` | no | Defaults to `StreetRise Team` |
| `generate_hero` | no | Defaults to `true` |

## Response

```json
{
  "ok": true,
  "post": { "id": "…", "slug": "…", "title": "…", "is_published": false },
  "hero": { "generated": true, "key": "covers/ai-…jpg", "error": null },
  "note": "Draft created. Review it in /admin/blog before publishing."
}
```

If the cover fails, the text draft is still created and `hero.error` says why —
losing a draft over a missing image would be the worse trade. The admin panel
surfaces that message and the cover can be uploaded by hand.

## Editorial safeguards

The writing prompt tells the model to:

- treat the supplied `facts` as the only basis for concrete claims;
- invent no statistics, quotes, provider names, or impact numbers;
- never imply a booking request guarantees a bed, admission, or placement;
- use respectful, non-sensational language;
- produce plain text, which is what `BlogPostPage` currently renders
  (`body_markdown` is shown as-is, not parsed as markdown);
- describe a human-centered 3:2 cover with no embedded text or logos.

These constrain the model; they do not verify it. Every generated draft still
needs a human to check its claims before publishing.
