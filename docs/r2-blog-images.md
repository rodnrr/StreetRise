# Blog cover images — R2 upload runbook

> **Status 2026-08-05:** The two launch covers are ALSO shipped in
> `public/images/blog/` and served by Pages at
> `https://app.streetrise.org/images/blog/<name>.jpg` — this is the path the
> live posts' `cover_image_url` should use for now. It was added because
> iPhone-dashboard uploads to R2 kept corrupting the files (Photos/Files
> conversions); the R2 flow below still works and remains the plan for future
> covers uploaded from a desktop, or for anything too big to ship with the app.

The R2 bucket `assets-streetrise` (created 2026-07-30, location ENAM) hosts blog
cover images. Web-optimized covers live in this repo under `assets/r2/blog/`
(1536×1024 progressive JPEGs, ~170 KB each, converted from the original PNGs):

| File | Blog post slug |
|---|---|
| `assets/r2/blog/welcome-to-streetrise-cover.jpg` | `welcome-to-streetrise-one-step-closer-to-help` |
| `assets/r2/blog/meet-the-founder-cover.jpg` | `meet-the-founder-behind-streetrise` |

The frontend already renders `cover_image_url` (hero on `BlogPostPage`,
thumbnail on `BlogIndexPage`, og:image + BlogPosting schema), so once the steps
below are done the covers appear with no further code changes.

## 1. Enable public access on the bucket (one-time)

Objects in R2 are private by default — a public base URL is required before
`cover_image_url` can point at them. In the Cloudflare dashboard:
**R2 → assets-streetrise → Settings → Public access**, then either:

- **Custom domain (recommended for production):** connect e.g.
  `assets.streetrise.org` (the zone must be on Cloudflare). Base URL becomes
  `https://assets.streetrise.org`. Served through Cloudflare's cache/CDN.
- **r2.dev dev URL (quick start):** enable "R2.dev subdomain". Base URL looks
  like `https://pub-<hash>.r2.dev`. Rate-limited and uncached — fine to start,
  switch to a custom domain later (object keys don't change).

As of 2026-08-01 neither is enabled (no `assets.`/`cdn.` subdomain resolves).

## 2. Upload the images

Needs the same credentials as `npm run deploy`: `CLOUDFLARE_API_TOKEN` (with an
R2 edit permission) and `CLOUDFLARE_ACCOUNT_ID`. From the repo root:

```bash
npx wrangler r2 object put assets-streetrise/blog/welcome-to-streetrise-cover.jpg \
  --file assets/r2/blog/welcome-to-streetrise-cover.jpg \
  --content-type image/jpeg \
  --cache-control "public, max-age=31536000, immutable" \
  --remote

npx wrangler r2 object put assets-streetrise/blog/meet-the-founder-cover.jpg \
  --file assets/r2/blog/meet-the-founder-cover.jpg \
  --content-type image/jpeg \
  --cache-control "public, max-age=31536000, immutable" \
  --remote
```

(`--remote` targets the live bucket — without it newer wrangler versions write
to a local simulation. The long cache-control is safe because a changed image
should get a new key, e.g. `-cover-v2.jpg`.)

Verify: `curl -sI <BASE_URL>/blog/welcome-to-streetrise-cover.jpg` → expect
`200` and `content-type: image/jpeg`.

## 3. Point the blog posts at the images

In the Supabase SQL editor (project `mldatfcwnmvrmxumzxyb`), with `<BASE_URL>`
replaced by the public base URL from step 1:

```sql
update blog_posts
set cover_image_url = '<BASE_URL>/blog/welcome-to-streetrise-cover.jpg'
where slug = 'welcome-to-streetrise-one-step-closer-to-help';

update blog_posts
set cover_image_url = '<BASE_URL>/blog/meet-the-founder-cover.jpg'
where slug = 'meet-the-founder-behind-streetrise';
```

The third published post (`new-to-streetrise-start-here`) has no cover image
yet; drop a new JPEG in `assets/r2/blog/`, upload with the same pattern, and
set its `cover_image_url` the same way.

## Adding future covers

1. Export/convert to JPEG, ~1536×1024 (3:2 — both blog pages render a 3:2 box),
   quality ≈ 80, target under ~250 KB.
2. Commit to `assets/r2/blog/` (kept in-repo as the source of truth; this
   folder is NOT served by the app — `public/` is not involved).
3. Upload to the bucket under the `blog/` prefix (step 2 above).
4. Set the post's `cover_image_url` (step 3 above) — also editable per-post in
   `/admin/blog`.

## AI-generated covers

The Worker in `workers/blog-publisher/` generates a 3:2 cover alongside the
draft it writes and stores it in the **Supabase Storage `blog-images` bucket**
(migration 031) — the same place the Upload button on `/admin/blog` writes to,
not the R2 bucket above.

It uses Supabase Storage rather than R2 for two reasons: the bucket is already
public-read with an `is_admin()` write policy, so the Worker needs no extra
binding and no credentials of its own; and R2 still has no public base URL
connected (step 1 above), so an object written there would not resolve.

If a public R2 domain is connected later, moving generated covers back is a
one-function change in `workers/blog-publisher/src/index.ts` — the bucket to
bind is `assets-streetrise`.
