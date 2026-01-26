-- =============================================
-- ADD MESSAGE ATTACHMENTS SUPPORT
-- =============================================
-- Phase 4: Image and document attachments for messaging
-- =============================================

-- 1. Add attachment columns to messages table
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachment_type TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachment_name TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachment_size INTEGER;

-- 2. Create the message-attachments storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-attachments', 'message-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage RLS policies for message-attachments bucket

-- Allow authenticated users to upload files to their own folder
CREATE POLICY "Users can upload message attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'message-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to read attachments from conversations they are a participant of
CREATE POLICY "Users can read message attachments from their conversations"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'message-attachments'
  AND (
    -- User owns the file
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- User is a participant in a conversation that references this file
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE cp.user_id = auth.uid()
      AND m.attachment_url LIKE '%' || storage.filename(name)
    )
  )
);

-- Allow users to delete their own uploaded attachments
CREATE POLICY "Users can delete their own message attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'message-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
