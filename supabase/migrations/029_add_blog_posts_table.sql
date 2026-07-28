-- ================================================================
-- StreetRise — Migration 029: Blog Posts (additive)
--
-- Backs the new /blog marketing pages. Purely additive — does not touch
-- `resources`, its `category` column, or any existing table. Mirrors the
-- `faq` table's public-read / admin-write RLS pattern (see
-- 002_rls_policies.sql). No rows are seeded; the table starts empty and
-- the /blog UI renders an honest "coming soon" state until real posts
-- are authored.
--
-- NOT YET APPLIED to the live project as of authoring — review before
-- running against production.
-- ================================================================

CREATE TABLE blog_posts (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT        NOT NULL UNIQUE,
  title         TEXT        NOT NULL,
  excerpt       TEXT        NOT NULL,
  body_markdown TEXT        NOT NULL,
  cover_image_url TEXT,
  author_name   TEXT        NOT NULL DEFAULT 'StreetRise Team',
  is_published  BOOLEAN     NOT NULL DEFAULT FALSE,
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_blog_posts_slug         ON blog_posts(slug);
CREATE INDEX idx_blog_posts_is_published ON blog_posts(is_published);
CREATE INDEX idx_blog_posts_published_at ON blog_posts(published_at DESC);

CREATE TRIGGER blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blog_posts_public_read"
  ON blog_posts FOR SELECT
  USING (is_published = TRUE);

CREATE POLICY "blog_posts_admin_all"
  ON blog_posts FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
