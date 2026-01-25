-- =============================================
-- MESSAGING SYSTEM - Phase 1
-- =============================================
-- Creates the core messaging infrastructure:
-- - conversations: Container for message threads
-- - conversation_participants: Links users to conversations
-- - messages: Individual messages within conversations
-- =============================================

-- Table: conversations
-- Main container for message threads
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: conversation_participants
-- Links users to conversations they're part of
CREATE TABLE IF NOT EXISTS conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- Table: messages
-- Individual messages within conversations
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- INDEXES
-- =============================================

-- Index for fetching recent messages in a conversation
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
  ON messages(conversation_id, created_at DESC);

-- Index for finding user's conversations
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user
  ON conversation_participants(user_id);

-- Index for looking up participants in a conversation
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation
  ON conversation_participants(conversation_id);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on all tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Conversations: Users can only see conversations they're part of
CREATE POLICY "Users can view conversations they participate in"
  ON conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = conversations.id
      AND conversation_participants.user_id = auth.uid()
    )
  );

-- Conversations: Users can create new conversations
CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Conversations: Users can update conversations they're part of
CREATE POLICY "Users can update conversations they participate in"
  ON conversations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = conversations.id
      AND conversation_participants.user_id = auth.uid()
    )
  );

-- Conversation Participants: Users can see participants in their conversations
CREATE POLICY "Users can view participants in their conversations"
  ON conversation_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants AS cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()
    )
  );

-- Conversation Participants: Users can add participants (for creating conversations)
CREATE POLICY "Users can add participants to conversations"
  ON conversation_participants FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Conversation Participants: Users can update their own participant record
CREATE POLICY "Users can update their own participant record"
  ON conversation_participants FOR UPDATE
  USING (user_id = auth.uid());

-- Messages: Users can view messages in conversations they're part of
CREATE POLICY "Users can view messages in their conversations"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = messages.conversation_id
      AND conversation_participants.user_id = auth.uid()
    )
  );

-- Messages: Users can send messages to conversations they're part of
CREATE POLICY "Users can send messages to their conversations"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = messages.conversation_id
      AND conversation_participants.user_id = auth.uid()
    )
  );

-- =============================================
-- TRIGGERS
-- =============================================

-- Function to update conversation's updated_at when a new message is sent
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function after message insert
DROP TRIGGER IF EXISTS trigger_update_conversation_timestamp ON messages;
CREATE TRIGGER trigger_update_conversation_timestamp
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();

-- =============================================
-- ENABLE REALTIME
-- =============================================
-- Note: Realtime needs to be enabled in Supabase Dashboard
-- Go to Database > Replication and add the 'messages' table

-- Grant necessary permissions for realtime
GRANT SELECT ON messages TO authenticated;
GRANT SELECT ON conversations TO authenticated;
GRANT SELECT ON conversation_participants TO authenticated;

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON TABLE conversations IS 'Container for message threads between users';
COMMENT ON TABLE conversation_participants IS 'Links users to conversations, tracks read status';
COMMENT ON TABLE messages IS 'Individual messages within conversations';
COMMENT ON COLUMN conversation_participants.last_read_at IS 'Timestamp of when user last read this conversation (for unread indicators)';
