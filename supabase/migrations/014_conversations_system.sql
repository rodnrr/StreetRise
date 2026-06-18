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
  sender_id           UUID NOT NULL REFERENCES providers(id) ON DELETE SET NULL,
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

-- ── RLS Policies ─────────────────────────────────────────────────

-- Providers can see their own conversations and messages
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY conversations_provider_read ON conversations
  FOR SELECT USING (
    my_provider_id() = provider_id OR
    (is_admin() AND my_provider_id() = admin_id)
  );

CREATE POLICY conversations_provider_insert ON conversations
  FOR INSERT WITH CHECK (provider_id = my_provider_id() OR is_admin());

CREATE POLICY conversations_provider_update ON conversations
  FOR UPDATE USING (
    my_provider_id() = provider_id OR is_admin()
  ) WITH CHECK (
    my_provider_id() = provider_id OR is_admin()
  );

-- Messages RLS: can read messages in conversations you're part of, can insert new messages
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY conversation_messages_read ON conversation_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE id = conversation_id AND (
        my_provider_id() = provider_id OR
        (is_admin() AND my_provider_id() = admin_id)
      )
    )
  );

CREATE POLICY conversation_messages_insert ON conversation_messages
  FOR INSERT WITH CHECK (
    sender_id = my_provider_id() AND
    EXISTS (
      SELECT 1 FROM conversations
      WHERE id = conversation_id AND (
        my_provider_id() = provider_id OR
        (is_admin() AND my_provider_id() = admin_id)
      )
    )
  );
