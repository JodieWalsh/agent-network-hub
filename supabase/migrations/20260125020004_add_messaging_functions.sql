-- =============================================
-- MESSAGING HELPER FUNCTIONS
-- =============================================
-- Using SECURITY DEFINER functions to handle conversation
-- creation and participant management, bypassing RLS
-- for these specific operations.
-- =============================================

-- Function to create a new conversation between two users
-- Returns the conversation ID
CREATE OR REPLACE FUNCTION create_conversation(other_user_id UUID)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  current_user_id UUID;
  existing_conv_id UUID;
  new_conv_id UUID;
BEGIN
  -- Get the current user
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check for existing 1:1 conversation between these users
  SELECT cp1.conversation_id INTO existing_conv_id
  FROM conversation_participants cp1
  JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
  WHERE cp1.user_id = current_user_id
    AND cp2.user_id = other_user_id
    AND (
      SELECT COUNT(*) FROM conversation_participants cp3
      WHERE cp3.conversation_id = cp1.conversation_id
    ) = 2;

  -- If conversation exists, return it
  IF existing_conv_id IS NOT NULL THEN
    RETURN existing_conv_id;
  END IF;

  -- Create new conversation
  INSERT INTO conversations DEFAULT VALUES
  RETURNING id INTO new_conv_id;

  -- Add both participants
  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES
    (new_conv_id, current_user_id),
    (new_conv_id, other_user_id);

  RETURN new_conv_id;
END;
$$;

-- Function to send a message
-- Returns the message record
CREATE OR REPLACE FUNCTION send_message(conv_id UUID, message_content TEXT)
RETURNS messages
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  current_user_id UUID;
  is_participant BOOLEAN;
  new_message messages;
BEGIN
  -- Get the current user
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if user is a participant
  SELECT EXISTS(
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conv_id
    AND user_id = current_user_id
  ) INTO is_participant;

  IF NOT is_participant THEN
    RAISE EXCEPTION 'Not a participant in this conversation';
  END IF;

  -- Insert message
  INSERT INTO messages (conversation_id, sender_id, content)
  VALUES (conv_id, current_user_id, message_content)
  RETURNING * INTO new_message;

  -- Update conversation timestamp
  UPDATE conversations
  SET updated_at = now()
  WHERE id = conv_id;

  RETURN new_message;
END;
$$;

-- Function to mark conversation as read
CREATE OR REPLACE FUNCTION mark_conversation_read(conv_id UUID)
RETURNS VOID
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

  UPDATE conversation_participants
  SET last_read_at = now()
  WHERE conversation_id = conv_id
  AND user_id = current_user_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_conversation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION send_message(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_conversation_read(UUID) TO authenticated;
