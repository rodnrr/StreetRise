# StreetRise AI blog formatting contract

The blog publisher Worker writes `body_markdown` for the public `BlogBody` renderer.

Generated article bodies should use the supported subset only:

- `##` and `###` headings
- short paragraphs
- `**bold**` and `*italic*` emphasis
- bulleted and numbered lists
- `>` callouts when justified by supplied facts
- `---` dividers when useful
- descriptive Markdown links
- `mailto:` links for supplied email addresses

The Worker must not put the article title, excerpt, hero-image prompt, SEO notes, keywords, writing notes, or model commentary into `body_markdown`.

Event announcements should favor concise, scannable logistics over generic filler or repeated event details. Educational articles may be longer, but every section should add new information.

The Worker remains draft-only: generated posts are saved with `is_published = false` for human review in `/admin/blog`.
