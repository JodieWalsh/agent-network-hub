-- =============================================
-- FIX MESSAGING RLS POLICIES
-- =============================================
-- The original policies were too restrictive.
-- Users need to be able to:
-- 1. SELECT their own participant records (to find their conversations)
-- 2. INSERT participants when creating a conversation
-- 3. Query conversations they're part of
-- =============================================

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update conversations they participate in" ON conversations;
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can add participants to conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can update their own participant record" ON conversation_participants;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON messages;

-- =============================================
-- CONVERSATIONS POLICIES
-- =============================================

-- Users can view conversations they're part of
CREATE POLICY "Users can view their conversations"
  ON conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = conversations.id
      AND conversation_participants.user_id = auth.uid()
    )
  );

-- Any authenticated user can create a conversation
CREATE POLICY "Authenticated users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update conversations they're part of
CREATE POLICY "Users can update their conversations"
  ON conversations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = conversations.id
      AND conversation_participants.user_id = auth.uid()
    )
  );

-- =============================================
-- CONVERSATION_PARTICIPANTS POLICIES
-- =============================================

-- Users can view their own participant records (to find their conversations)
-- AND they can view other participants in conversations they're part of
CREATE POLICY "Users can view participant records"
  ON conversation_participants FOR SELECT
  USING (
    -- User can see their own records
    user_id = auth.uid()
    OR
    -- User can see other participants in their conversations
    EXISTS (
      SELECT 1 FROM conversation_participants AS my_participation
      WHERE my_participation.conversation_id = conversation_participants.conversation_id
      AND my_participation.user_id = auth.uid()
    )
  );

-- Any authenticated user can add participants to a conversation
-- This is needed when creating new conversations
CREATE POLICY "Authenticated users can add participants"
  ON conversation_participants FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update their own participant record (for marking as read)
CREATE POLICY "Users can update own participant record"
  ON conversation_participants FOR UPDATE
  USING (user_id = auth.uid());

-- =============================================
-- MESSAGES POLICIES
-- =============================================

-- Users can view messages in conversations they're part of
CREATE POLICY "Users can view messages in their conversations"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = messages.conversation_id
      AND conversation_participants.user_id = auth.uid()
    )
  );

-- Users can send messages to conversations they're part of
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
-- ADDITIONAL GRANTS
-- =============================================

-- Ensure authenticated users have proper permissions
GRANT ALL ON conversations TO authenticated;
GRANT ALL ON conversation_participants TO authenticated;
GRANT ALL ON messages TO authenticated;
