-- =============================================
-- JOB-LINKED CONTEXTUAL CONVERSATIONS
-- =============================================
-- Allows multiple conversations between the same two users,
-- each linked to a different inspection job.
-- =============================================

-- 1. Add context columns to conversations table
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES inspection_jobs(id) ON DELETE SET NULL;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS context_type TEXT NOT NULL DEFAULT 'general';

-- 2. Index for looking up conversations by job
CREATE INDEX IF NOT EXISTS idx_conversations_job_id ON conversations(job_id) WHERE job_id IS NOT NULL;

-- 3. Drop and recreate create_conversation with job support
-- Need to drop because we're changing the signature
DROP FUNCTION IF EXISTS create_conversation(UUID);

CREATE OR REPLACE FUNCTION create_conversation(
  other_user_id UUID,
  p_job_id UUID DEFAULT NULL,
  p_title TEXT DEFAULT NULL,
  p_context_type TEXT DEFAULT 'general'
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  current_user_id UUID;
  existing_conv_id UUID;
  new_conv_id UUID;
  auto_title TEXT;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Look for existing conversation between these users for this specific job (or general)
  IF p_job_id IS NOT NULL THEN
    -- Job-specific: find conversation with matching job_id
    SELECT cp1.conversation_id INTO existing_conv_id
    FROM conversation_participants cp1
    JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
    JOIN conversations c ON c.id = cp1.conversation_id
    WHERE cp1.user_id = current_user_id
      AND cp2.user_id = other_user_id
      AND c.job_id = p_job_id
      AND (
        SELECT COUNT(*) FROM conversation_participants cp3
        WHERE cp3.conversation_id = cp1.conversation_id
      ) = 2;
  ELSE
    -- General: find conversation with NULL job_id
    SELECT cp1.conversation_id INTO existing_conv_id
    FROM conversation_participants cp1
    JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
    JOIN conversations c ON c.id = cp1.conversation_id
    WHERE cp1.user_id = current_user_id
      AND cp2.user_id = other_user_id
      AND c.job_id IS NULL
      AND (
        SELECT COUNT(*) FROM conversation_participants cp3
        WHERE cp3.conversation_id = cp1.conversation_id
      ) = 2;
  END IF;

  -- If conversation exists, return it
  IF existing_conv_id IS NOT NULL THEN
    RETURN existing_conv_id;
  END IF;

  -- Auto-generate title from job if not provided
  IF p_job_id IS NOT NULL AND p_title IS NULL THEN
    SELECT 'Re: ' || ij.property_address INTO auto_title
    FROM inspection_jobs ij
    WHERE ij.id = p_job_id;
  END IF;

  -- Create new conversation
  INSERT INTO conversations (job_id, title, context_type)
  VALUES (p_job_id, COALESCE(p_title, auto_title), p_context_type)
  RETURNING id INTO new_conv_id;

  -- Add both participants
  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES
    (new_conv_id, current_user_id),
    (new_conv_id, other_user_id);

  RETURN new_conv_id;
END;
$$;

-- 4. Drop and recreate get_user_conversations with job context
DROP FUNCTION IF EXISTS get_user_conversations();

CREATE OR REPLACE FUNCTION get_user_conversations()
RETURNS TABLE (
  conversation_id UUID,
  conversation_created_at TIMESTAMPTZ,
  conversation_updated_at TIMESTAMPTZ,
  last_read_at TIMESTAMPTZ,
  other_user_id UUID,
  other_user_name TEXT,
  other_user_avatar TEXT,
  other_user_type TEXT,
  other_user_suburb TEXT,
  other_last_read_at TIMESTAMPTZ,
  last_message_id UUID,
  last_message_content TEXT,
  last_message_sender_id UUID,
  last_message_created_at TIMESTAMPTZ,
  unread_count BIGINT,
  conv_job_id UUID,
  conv_title TEXT,
  conv_context_type TEXT,
  job_address TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  WITH user_conversations AS (
    SELECT
      cp.conversation_id,
      cp.last_read_at
    FROM conversation_participants cp
    WHERE cp.user_id = current_user_id
  ),
  other_participants AS (
    SELECT DISTINCT ON (cp.conversation_id)
      cp.conversation_id,
      p.id AS other_id,
      p.full_name,
      p.avatar_url,
      p.user_type::TEXT AS user_type,
      p.home_base_address,
      cp.last_read_at AS other_read_at
    FROM conversation_participants cp
    JOIN profiles p ON p.id = cp.user_id
    WHERE cp.conversation_id IN (SELECT uc.conversation_id FROM user_conversations uc)
      AND cp.user_id != current_user_id
  ),
  last_messages AS (
    SELECT DISTINCT ON (m.conversation_id)
      m.conversation_id,
      m.id AS message_id,
      m.content,
      m.sender_id,
      m.created_at
    FROM messages m
    WHERE m.conversation_id IN (SELECT uc.conversation_id FROM user_conversations uc)
    ORDER BY m.conversation_id, m.created_at DESC
  ),
  unread_counts AS (
    SELECT
      m.conversation_id,
      COUNT(*) AS cnt
    FROM messages m
    JOIN user_conversations uc ON m.conversation_id = uc.conversation_id
    WHERE m.sender_id != current_user_id
      AND (uc.last_read_at IS NULL OR m.created_at > uc.last_read_at)
    GROUP BY m.conversation_id
  )
  SELECT
    c.id AS conversation_id,
    c.created_at AS conversation_created_at,
    c.updated_at AS conversation_updated_at,
    uc.last_read_at,
    op.other_id AS other_user_id,
    op.full_name AS other_user_name,
    op.avatar_url AS other_user_avatar,
    op.user_type AS other_user_type,
    op.home_base_address AS other_user_suburb,
    op.other_read_at AS other_last_read_at,
    lm.message_id AS last_message_id,
    lm.content AS last_message_content,
    lm.sender_id AS last_message_sender_id,
    lm.created_at AS last_message_created_at,
    COALESCE(urc.cnt, 0) AS unread_count,
    c.job_id AS conv_job_id,
    c.title AS conv_title,
    c.context_type AS conv_context_type,
    ij.property_address AS job_address
  FROM user_conversations uc
  JOIN conversations c ON c.id = uc.conversation_id
  LEFT JOIN other_participants op ON op.conversation_id = uc.conversation_id
  LEFT JOIN last_messages lm ON lm.conversation_id = uc.conversation_id
  LEFT JOIN unread_counts urc ON urc.conversation_id = uc.conversation_id
  LEFT JOIN inspection_jobs ij ON ij.id = c.job_id
  ORDER BY c.updated_at DESC;
END;
$$;

-- 5. Drop and recreate get_conversation_details with job context
DROP FUNCTION IF EXISTS get_conversation_details(UUID);

CREATE OR REPLACE FUNCTION get_conversation_details(conv_id UUID)
RETURNS TABLE (
  conversation_id UUID,
  other_user_id UUID,
  other_user_name TEXT,
  other_user_avatar TEXT,
  other_user_type TEXT,
  other_user_suburb TEXT,
  other_last_read_at TIMESTAMPTZ,
  conv_job_id UUID,
  conv_title TEXT,
  conv_context_type TEXT,
  job_address TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conv_id AND user_id = current_user_id
  ) THEN
    RAISE EXCEPTION 'Not a participant in this conversation';
  END IF;

  RETURN QUERY
  SELECT
    conv_id AS conversation_id,
    p.id AS other_user_id,
    p.full_name AS other_user_name,
    p.avatar_url AS other_user_avatar,
    p.user_type::TEXT AS other_user_type,
    p.home_base_address AS other_user_suburb,
    cp.last_read_at AS other_last_read_at,
    c.job_id AS conv_job_id,
    c.title AS conv_title,
    c.context_type AS conv_context_type,
    ij.property_address AS job_address
  FROM conversation_participants cp
  JOIN profiles p ON p.id = cp.user_id
  JOIN conversations c ON c.id = cp.conversation_id
  LEFT JOIN inspection_jobs ij ON ij.id = c.job_id
  WHERE cp.conversation_id = conv_id
    AND cp.user_id != current_user_id
  LIMIT 1;
END;
$$;

-- 6. Re-grant permissions
GRANT EXECUTE ON FUNCTION create_conversation(UUID, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_conversations() TO authenticated;
GRANT EXECUTE ON FUNCTION get_conversation_details(UUID) TO authenticated;
