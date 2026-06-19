-- ================================================================
-- StreetRise — Migration 015: Fix Conversations RLS & Add Trigger
-- Corrects restrictive admin read/update policies and adds the
-- bump-parent-on-message trigger that should have been in 014.
-- ================================================================

-- ── Drop old buggy policies ──────────────────────────────────────

DROP POLICY IF EXISTS conversations_read ON conversations;
DROP POLICY IF EXISTS conversations_insert ON conversations;
DROP POLICY IF EXISTS conversations_update ON conversations;

-- ── Create corrected policies ────────────────────────────────────

-- Admins can now see ALL conversations (not just ones they're assigned to).
-- This fixes the bug where provider-initiated conversations were invisible.
CREATE POLICY conversations_read ON conversations
  FOR SELECT USING (
    provider_id = my_provider_id() OR is_admin()
  );

-- Either the provider or an admin can start a conversation.
CREATE POLICY conversations_insert ON conversations
  FOR INSERT WITH CHECK (
    provider_id = my_provider_id() OR is_admin()
  );

-- Either the provider or an admin can update a conversation
-- (e.g., claim it, mark resolved/closed).
CREATE POLICY conversations_update ON conversations
  FOR UPDATE USING (
    provider_id = my_provider_id() OR is_admin()
  ) WITH CHECK (
    provider_id = my_provider_id() OR is_admin()
  );

-- ── Create trigger (idempotent): bump parent conversation ────────

-- If the trigger was not created in 014 (or was dropped), recreate it.
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

DROP TRIGGER IF EXISTS conversation_messages_bump_parent ON conversation_messages;

CREATE TRIGGER conversation_messages_bump_parent
  AFTER INSERT ON conversation_messages
  FOR EACH ROW EXECUTE FUNCTION bump_conversation_on_message();
