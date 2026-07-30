-- ================================================================
-- StreetRise — Migration 030: Conversation Read Tracking (additive)
--
-- Backs unread indicators in AdminChat/ProviderChat. Purely additive —
-- two new nullable timestamp columns on `conversations`, nothing else
-- touched. A conversation is unread for a given side when
-- last_message_at is not null and either <side>_last_read_at is null
-- or older than last_message_at. Each UI marks its own side's column
-- as now() when a conversation is opened.
--
-- NOT YET APPLIED to the live project as of authoring — review before
-- running against production (DDL against prod is blocked for this
-- session by the Claude Code auto-mode safety classifier).
-- ================================================================

ALTER TABLE conversations
  ADD COLUMN provider_last_read_at TIMESTAMPTZ,
  ADD COLUMN admin_last_read_at    TIMESTAMPTZ;
