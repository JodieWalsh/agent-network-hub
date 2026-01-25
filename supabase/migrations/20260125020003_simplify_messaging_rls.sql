-- =============================================
-- SIMPLIFY MESSAGING RLS POLICIES
-- =============================================
-- The previous policies had circular reference issues
-- causing 500 errors. Simplifying to avoid self-referencing
-- queries in RLS policies.
-- =============================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update their conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view participant records" ON conversation_participants;
DROP POLICY IF EXISTS "Authenticated users can add participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can update own participant record" ON conversation_participants;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON messages;

-- =============================================
-- CONVERSATION_PARTICIPANTS POLICIES (SIMPLE)
-- =============================================

-- Users can only see their own participant records
-- This avoids the circular reference issue
CREATE POLICY "Users can view own participation"
  ON conversation_participants FOR SELECT
  USING (user_id = auth.uid());

-- Any authenticated user can insert participant records
CREATE POLICY "Users can create participation"
  ON conversation_participants FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update their own participant record
CREATE POLICY "Users can update own participation"
  ON conversation_participants FOR UPDATE
  USING (user_id = auth.uid());

-- =============================================
-- CONVERSATIONS POLICIES
-- =============================================

-- Users can view conversations where they have a participant record
CREATE POLICY "Users can view their conversations"
  ON conversations FOR SELECT
  USING (
    id IN (
      SELECT conversation_id
      FROM conversation_participants
      WHERE user_id = auth.uid()
    )
  );

-- Any authenticated user can create conversations
CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update conversations they're part of
CREATE POLICY "Users can update their conversations"
  ON conversations FOR UPDATE
  USING (
    id IN (
      SELECT conversation_id
      FROM conversation_participants
      WHERE user_id = auth.uid()
    )
  );

-- =============================================
-- MESSAGES POLICIES
-- =============================================

-- Users can view messages in their conversations
CREATE POLICY "Users can view their messages"
  ON messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT conversation_id
      FROM conversation_participants
      WHERE user_id = auth.uid()
    )
  );

-- Users can send messages to their conversations
CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND conversation_id IN (
      SELECT conversation_id
      FROM conversation_participants
      WHERE user_id = auth.uid()
    )
  );

-- =============================================
-- HELPER FUNCTION FOR FETCHING OTHER PARTICIPANTS
-- =============================================
-- Since RLS won't let us see other participants directly,
-- we create a security definer function to fetch them

CREATE OR REPLACE FUNCTION get_conversation_participants(conv_id UUID)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  user_type TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only return if the calling user is a participant
  IF EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = conv_id
    AND cp.user_id = auth.uid()
  ) THEN
    RETURN QUERY
    SELECT
      p.id,
      p.full_name,
      p.avatar_url,
      p.user_type
    FROM conversation_participants cp
    JOIN profiles p ON p.id = cp.user_id
    WHERE cp.conversation_id = conv_id;
  END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_conversation_participants(UUID) TO authenticated;
