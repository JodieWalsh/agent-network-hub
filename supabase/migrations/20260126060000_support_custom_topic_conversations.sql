-- =============================================
-- SUPPORT CUSTOM TOPIC CONVERSATIONS
-- =============================================
-- When context_type = 'custom' and a title is provided,
-- always create a new conversation (skip existing lookup).
-- =============================================

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

  -- Custom-titled conversations always create a new one (no dedup)
  IF p_context_type = 'custom' AND p_title IS NOT NULL THEN
    INSERT INTO conversations (job_id, title, context_type)
    VALUES (NULL, p_title, 'custom')
    RETURNING id INTO new_conv_id;

    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES
      (new_conv_id, current_user_id),
      (new_conv_id, other_user_id);

    RETURN new_conv_id;
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
    -- General: find conversation with NULL job_id and general context
    SELECT cp1.conversation_id INTO existing_conv_id
    FROM conversation_participants cp1
    JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
    JOIN conversations c ON c.id = cp1.conversation_id
    WHERE cp1.user_id = current_user_id
      AND cp2.user_id = other_user_id
      AND c.job_id IS NULL
      AND c.context_type = 'general'
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
