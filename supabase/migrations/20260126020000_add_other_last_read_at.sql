-- =============================================
-- ADD OTHER_LAST_READ_AT TO MESSAGING FUNCTIONS
-- =============================================
-- Phase 2: Read receipts need the other participant's last_read_at
-- to determine which sent messages have been read.
-- =============================================

DROP FUNCTION IF EXISTS get_user_conversations();
DROP FUNCTION IF EXISTS get_conversation_details(UUID);

-- Recreate get_user_conversations with other_last_read_at
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
  unread_count BIGINT
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
    COALESCE(urc.cnt, 0) AS unread_count
  FROM user_conversations uc
  JOIN conversations c ON c.id = uc.conversation_id
  LEFT JOIN other_participants op ON op.conversation_id = uc.conversation_id
  LEFT JOIN last_messages lm ON lm.conversation_id = uc.conversation_id
  LEFT JOIN unread_counts urc ON urc.conversation_id = uc.conversation_id
  ORDER BY c.updated_at DESC;
END;
$$;

-- Recreate get_conversation_details with other_last_read_at
CREATE OR REPLACE FUNCTION get_conversation_details(conv_id UUID)
RETURNS TABLE (
  conversation_id UUID,
  other_user_id UUID,
  other_user_name TEXT,
  other_user_avatar TEXT,
  other_user_type TEXT,
  other_user_suburb TEXT,
  other_last_read_at TIMESTAMPTZ
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
    cp.last_read_at AS other_last_read_at
  FROM conversation_participants cp
  JOIN profiles p ON p.id = cp.user_id
  WHERE cp.conversation_id = conv_id
    AND cp.user_id != current_user_id
  LIMIT 1;
END;
$$;

-- Re-grant permissions
GRANT EXECUTE ON FUNCTION get_user_conversations() TO authenticated;
GRANT EXECUTE ON FUNCTION get_conversation_details(UUID) TO authenticated;
