# Blog cover images — R2 upload runbook

> **Status 2026-08-19:** StreetRise now has a production R2 asset host at
> `https://assets.streetrise.org`, backed by the `streetrise-assets` bucket.
> New blog covers should use this host. The launch covers also remain in
> `public/images/blog/` as a fallback from the earlier Pages-based workflow.

The R2 bucket `streetrise-assets` hosts blog cover images. Web-optimized source
covers can still be kept in this repo under `assets/r2/blog/` when a manually
created image needs a source-of-truth copy.

The frontend already renders `cover_image_url` as the hero on
`BlogPostPage`, the thumbnail on `BlogIndexPage`, and the social share image,
so a valid R2 URL requires no public-page code changes.

## Public access

The production custom domain is:

```text
https://assets.streetrise.org
```

The bucket's public development URL is not needed for production.

## Manual uploads

For an image already on disk, upload it under the `blog/` prefix:

```bash
npx wrangler r2 object put streetrise-assets/blog/<file-name>.jpg \
  --file assets/r2/blog/<file-name>.jpg \
  --content-type image/jpeg \
  --cache-control "public, max-age=31536000, immutable" \
  --remote
```

Verify:

```bash
curl -sI https://assets.streetrise.org/blog/<file-name>.jpg
```

Expect `200` and `content-type: image/jpeg`.

Use a new object key when replacing an image so the long immutable cache does
not serve the old file.

## Point a blog post at the image

The cover URL can be pasted directly into `/admin/blog`, for example:

```text
https://assets.streetrise.org/blog/new-to-streetrise-start-here-cover.jpg
```

Or update it through SQL when needed:

```sql
update blog_posts
set cover_image_url = 'https://assets.streetrise.org/blog/<file-name>.jpg'
where slug = '<blog-post-slug>';
```

## Recommended cover format

- 1536×1024 (3:2)
- JPEG
- quality around 80–85
- target under roughly 300 KB when practical
- important subjects kept away from extreme edges for responsive cropping

## AI-generated covers

The Cloudflare Worker in `workers/blog-publisher/` can now generate a matching
3:2 hero image with Workers AI, write it directly to the `streetrise-assets`
R2 binding, and set the resulting `https://assets.streetrise.org/blog/...`
URL on a newly generated **draft** blog post.

See `workers/blog-publisher/README.md` for deployment and usage.
