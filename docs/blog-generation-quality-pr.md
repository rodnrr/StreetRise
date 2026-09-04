# Blog generation quality PR summary

This branch teaches the existing StreetRise blog publisher Worker to generate structured Markdown that the public `BlogBody` renderer can actually display.

Key behavior changes:

- concise article-length guidance by content type
- `##` / `###` headings and short paragraphs
- selective bold/italic emphasis
- lists for scannable details
- descriptive Markdown links for supplied URLs
- `mailto:` links for supplied email addresses
- repetition/filler avoidance
- contamination guards for hero prompts, excerpts, SEO notes, and H1 title duplication
- lower generation temperature for more consistent editorial structure

The Worker still creates unpublished drafts only and still uses the existing Supabase admin authorization path.
