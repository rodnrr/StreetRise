-- ================================================================
-- StreetRise — Migration 018: Admin-Only Notes Table
-- Separates sensitive admin notes from provider-readable conversation context
-- ================================================================

-- Problem: conversations.description was readable by providers via RLS, even though
-- intended as admin-only triage notes. This creates a data leakage vulnerability.
-- Solution: Move admin notes to a separate table with strict RLS (admin-read-only).

-- ── Table: conversation_admin_notes ──────────────────────────

CREATE TABLE conversation_admin_notes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id     UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  admin_id            UUID NOT NULL REFERENCES providers(id) ON DELETE SET NULL,
  notes               TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversation_admin_notes_conversation_id ON conversation_admin_notes(conversation_id);
CREATE INDEX idx_conversation_admin_notes_admin_id ON conversation_admin_notes(admin_id);

-- Auto-update updated_at
CREATE TRIGGER conversation_admin_notes_updated_at
  BEFORE UPDATE ON conversation_admin_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── RLS Policies: Admin-only access ──────────────────────────

ALTER TABLE conversation_admin_notes ENABLE ROW LEVEL SECURITY;

-- Only admins can view admin notes
CREATE POLICY conversation_admin_notes_read ON conversation_admin_notes
  FOR SELECT USING (is_admin());

-- Only admins can insert admin notes
CREATE POLICY conversation_admin_notes_insert ON conversation_admin_notes
  FOR INSERT WITH CHECK (is_admin() AND admin_id = my_provider_id());

-- Only the admin who created the note can update it
CREATE POLICY conversation_admin_notes_update ON conversation_admin_notes
  FOR UPDATE USING (is_admin() AND admin_id = my_provider_id())
  WITH CHECK (is_admin() AND admin_id = my_provider_id());

-- ── Data Migration: Move existing admin notes ────────────────

-- For admin-initiated conversations that have a description,
-- move it to conversation_admin_notes and clear the description.
INSERT INTO conversation_admin_notes (conversation_id, admin_id, notes, created_at)
SELECT
  c.id,
  c.admin_id,
  c.description,
  c.created_at
FROM conversations c
WHERE c.created_by_admin = TRUE
  AND c.description IS NOT NULL
  AND c.admin_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Clear description for admin-initiated conversations
-- (providers retain their description for provider-initiated conversations)
UPDATE conversations
SET description = NULL
WHERE created_by_admin = TRUE;

-- ── Documentation ──────────────────────────────────────────────
-- conversations.description is now ONLY for provider-visible context:
--   - For provider-initiated conversations: what the provider entered
--   - For admin-initiated conversations: NULL (admins should use conversation_admin_notes)
--
-- conversation_admin_notes stores sensitive internal triage/admin-only notes.
-- Strict RLS policy: only admins can read/write. Providers cannot access.
-- This prevents data leakage via direct Supabase queries.
