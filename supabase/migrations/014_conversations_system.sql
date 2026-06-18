-- ================================================================
-- StreetRise — Migration 014: Conversations & Messaging System
-- Admin-Provider communication with persistent message threads
-- ================================================================

-- ── Table: conversations ─────────────────────────────────────────

CREATE TABLE conversations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id         UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  admin_id            UUID REFERENCES providers(id) ON DELETE SET NULL,
  subject             TEXT NOT NULL,
  description         TEXT,
  status              TEXT NOT NULL DEFAULT 'open', -- 'open', 'resolved', 'closed'
  created_by_admin    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at     TIMESTAMPTZ
);

CREATE INDEX idx_conversations_provider_id ON conversations(provider_id);
CREATE INDEX idx_conversations_admin_id ON conversations(admin_id);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_conversations_updated_at ON conversations(updated_at DESC);

-- Auto-update updated_at
CREATE TRIGGER conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Table: conversation_messages ─────────────────────────────────

CREATE TABLE conversation_messages (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id     UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id           UUID REFERENCES providers(id) ON DELETE SET NULL,
  message             TEXT NOT NULL,
  is_admin            BOOLEAN NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversation_messages_conversation_id ON conversation_messages(conversation_id);
CREATE INDEX idx_conversation_messages_sender_id ON conversation_messages(sender_id);
CREATE INDEX idx_conversation_messages_created_at ON conversation_messages(created_at DESC);

-- Auto-update updated_at
CREATE TRIGGER conversation_messages_updated_at
  BEFORE UPDATE ON conversation_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Trigger: bump parent conversation when a message is added ─────
-- Keeps conversation list ordering accurate (sorts by updated_at DESC)
-- and records last_message_at.

CREATE OR REPLACE FUNCTION bump_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET last_message_at = NEW.created_at,
      updated_at      = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER conversation_messages_bump_parent
  AFTER INSERT ON conversation_messages
  FOR EACH ROW EXECUTE FUNCTION bump_conversation_on_message();

-- ── RLS Policies ─────────────────────────────────────────────────

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;

-- Conversations: a provider sees only their own; an admin sees all.
CREATE POLICY conversations_read ON conversations
  FOR SELECT USING (
    provider_id = my_provider_id() OR is_admin()
  );

-- A provider can open a conversation for themselves; an admin can open
-- a conversation with any provider.
CREATE POLICY conversations_insert ON conversations
  FOR INSERT WITH CHECK (
    provider_id = my_provider_id() OR is_admin()
  );

-- A provider can update their own conversation; an admin can update any
-- (e.g. claim it, mark resolved/closed).
CREATE POLICY conversations_update ON conversations
  FOR UPDATE USING (
    provider_id = my_provider_id() OR is_admin()
  ) WITH CHECK (
    provider_id = my_provider_id() OR is_admin()
  );

-- Messages: readable by participants of the parent conversation.
CREATE POLICY conversation_messages_read ON conversation_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
        AND (c.provider_id = my_provider_id() OR is_admin())
    )
  );

-- Messages: a participant may post, and only as themselves.
CREATE POLICY conversation_messages_insert ON conversation_messages
  FOR INSERT WITH CHECK (
    sender_id = my_provider_id()
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
        AND (c.provider_id = my_provider_id() OR is_admin())
    )
  );
