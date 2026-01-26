/**
 * Messaging System - Core Functions
 *
 * Phase 1: Basic messaging functionality
 * Phase 2: Typing indicators, read receipts, online presence
 */

import { supabase } from '@/integrations/supabase/client';

// =============================================
// TYPES
// =============================================

export interface Participant {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  user_type: string | null;
  home_base_address: string | null;
}

export interface MessageAttachment {
  url: string;
  type: string;
  name: string;
  size: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: Participant;
  attachment_url?: string | null;
  attachment_type?: string | null;
  attachment_name?: string | null;
  attachment_size?: number | null;
}

export interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  participants: Participant[];
  last_message: Message | null;
  unread_count: number;
  last_read_at: string | null;
  other_last_read_at: string | null;
}

export interface ConversationWithOther extends Conversation {
  other_participant: Participant;
}

// =============================================
// HELPER FUNCTIONS
// =============================================

/**
 * Get auth headers for Supabase REST API calls
 */
function getAuthHeaders(): Record<string, string> {
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

  let accessToken = supabaseKey;
  try {
    const storageKey = `sb-${projectId}-auth-token`;
    const storedSession = localStorage.getItem(storageKey);
    if (storedSession) {
      const parsed = JSON.parse(storedSession);
      accessToken = parsed?.access_token || supabaseKey;
    }
  } catch (e) {
    // Use default key
  }

  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
    'apikey': supabaseKey,
  };
}

// =============================================
// CORE FUNCTIONS
// =============================================

/**
 * Get all conversations for a user with last message and other participant info
 * Uses the get_user_conversations RPC function for reliable data fetching
 */
export async function getConversations(userId: string): Promise<ConversationWithOther[]> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const headers = getAuthHeaders();

  // Use the comprehensive RPC function that fetches everything in one query
  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_user_conversations`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Failed to fetch conversations:', errorText);
    throw new Error('Failed to fetch conversations');
  }

  const data = await response.json();

  // Transform the flat response into our ConversationWithOther structure
  const result: ConversationWithOther[] = data.map((row: any) => {
    const otherParticipant: Participant = {
      id: row.other_user_id,
      full_name: row.other_user_name,
      avatar_url: row.other_user_avatar,
      user_type: row.other_user_type,
      home_base_address: row.other_user_suburb || null,
    };

    const lastMessage: Message | null = row.last_message_id ? {
      id: row.last_message_id,
      conversation_id: row.conversation_id,
      sender_id: row.last_message_sender_id,
      content: row.last_message_content,
      created_at: row.last_message_created_at,
    } : null;

    return {
      id: row.conversation_id,
      created_at: row.conversation_created_at,
      updated_at: row.conversation_updated_at,
      participants: [otherParticipant],
      other_participant: otherParticipant,
      last_message: lastMessage,
      unread_count: Number(row.unread_count) || 0,
      last_read_at: row.last_read_at,
      other_last_read_at: row.other_last_read_at || null,
    };
  });

  return result;
}

/**
 * Get conversation details including other participant info
 * Useful when opening a conversation directly via URL
 */
export async function getConversationDetails(
  conversationId: string
): Promise<{ other_participant: Participant; other_last_read_at: string | null } | null> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const headers = getAuthHeaders();

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_conversation_details`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ conv_id: conversationId }),
    }
  );

  if (!response.ok) {
    console.error('Failed to fetch conversation details');
    return null;
  }

  const data = await response.json();

  if (!data || data.length === 0) {
    return null;
  }

  const row = data[0];
  return {
    other_participant: {
      id: row.other_user_id,
      full_name: row.other_user_name,
      avatar_url: row.other_user_avatar,
      user_type: row.other_user_type,
      home_base_address: row.other_user_suburb || null,
    },
    other_last_read_at: row.other_last_read_at || null,
  };
}

/**
 * Get messages for a conversation with pagination
 */
export async function getMessages(
  conversationId: string,
  limit: number = 50,
  offset: number = 0
): Promise<Message[]> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const headers = getAuthHeaders();

  // Get messages
  const messagesResponse = await fetch(
    `${supabaseUrl}/rest/v1/messages?conversation_id=eq.${conversationId}&select=*&order=created_at.asc&limit=${limit}&offset=${offset}`,
    { headers }
  );

  if (!messagesResponse.ok) {
    throw new Error('Failed to fetch messages');
  }

  const messages = await messagesResponse.json();

  // Get sender profiles
  const senderIds = [...new Set(messages.map((m: any) => m.sender_id))];
  if (senderIds.length === 0) {
    return [];
  }

  const profilesResponse = await fetch(
    `${supabaseUrl}/rest/v1/profiles?id=in.(${senderIds.join(',')})&select=id,full_name,avatar_url,user_type`,
    { headers }
  );

  if (!profilesResponse.ok) {
    throw new Error('Failed to fetch sender profiles');
  }

  const profiles = await profilesResponse.json();
  const profileMap = new Map(profiles.map((p: any) => [p.id, p]));

  // Attach sender info to messages
  return messages.map((msg: any) => ({
    ...msg,
    sender: profileMap.get(msg.sender_id) || null,
  }));
}

/**
 * Send a message to a conversation
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string,
  attachment?: MessageAttachment
): Promise<Message> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const headers = getAuthHeaders();

  const body: Record<string, unknown> = {
    conversation_id: conversationId,
    sender_id: senderId,
    content: content.trim() || (attachment ? '' : ''),
  };

  if (attachment) {
    body.attachment_url = attachment.url;
    body.attachment_type = attachment.type;
    body.attachment_name = attachment.name;
    body.attachment_size = attachment.size;
  }

  const response = await fetch(
    `${supabaseUrl}/rest/v1/messages`,
    {
      method: 'POST',
      headers: {
        ...headers,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send message: ${error}`);
  }

  const [message] = await response.json();
  return message;
}

/**
 * Get or create a 1:1 conversation between two users
 * Uses RPC function to bypass RLS restrictions
 */
export async function getOrCreateConversation(
  userId1: string,
  userId2: string
): Promise<string> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const headers = getAuthHeaders();

  // Use the create_conversation RPC function
  // It handles finding existing conversations or creating new ones
  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/create_conversation`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ other_user_id: userId2 }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create conversation: ${error}`);
  }

  const conversationId = await response.json();
  return conversationId;
}

/**
 * Mark a conversation as read (update last_read_at to now)
 * Uses RPC function for reliable updates
 */
export async function markConversationRead(
  conversationId: string,
  userId: string
): Promise<void> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const headers = getAuthHeaders();

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/mark_conversation_read`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ conv_id: conversationId }),
    }
  );

  if (!response.ok) {
    // Don't throw - marking as read is not critical
    console.error('Failed to mark conversation as read');
  }
}

/**
 * Search for users by name (for starting new conversations)
 */
export async function searchUsers(
  query: string,
  currentUserId: string,
  limit: number = 10
): Promise<Participant[]> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const headers = getAuthHeaders();

  const response = await fetch(
    `${supabaseUrl}/rest/v1/profiles?full_name=ilike.*${encodeURIComponent(query)}*&id=neq.${currentUserId}&select=id,full_name,avatar_url,user_type,home_base_address&limit=${limit}`,
    { headers }
  );

  if (!response.ok) {
    throw new Error('Failed to search users');
  }

  return response.json();
}

/**
 * Get total unread message count for a user (for sidebar badge)
 */
export async function getUnreadCount(userId: string): Promise<number> {
  try {
    const conversations = await getConversations(userId);
    return conversations.reduce((total, conv) => total + conv.unread_count, 0);
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
}

/**
 * Subscribe to new messages in a conversation (real-time)
 * Returns a cleanup function to unsubscribe
 */
export function subscribeToMessages(
  conversationId: string,
  onNewMessage: (message: Message) => void
): () => void {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      async (payload) => {
        const newMessage = payload.new as Message;

        // Fetch sender info
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const headers = getAuthHeaders();

        try {
          const response = await fetch(
            `${supabaseUrl}/rest/v1/profiles?id=eq.${newMessage.sender_id}&select=id,full_name,avatar_url,user_type`,
            { headers }
          );

          if (response.ok) {
            const [sender] = await response.json();
            newMessage.sender = sender;
          }
        } catch (e) {
          // Continue without sender info
        }

        onNewMessage(newMessage);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to conversation updates (new messages in any conversation)
 * Returns a cleanup function to unsubscribe
 */
export function subscribeToConversationUpdates(
  userId: string,
  onUpdate: () => void
): () => void {
  const channel = supabase
    .channel(`user_conversations:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      },
      () => {
        // Trigger a refresh of the conversation list
        onUpdate();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to all new messages across all conversations (with payload)
 * Used by the notification system to show toast/browser notifications
 * Returns a cleanup function to unsubscribe
 */
export function subscribeToAllNewMessages(
  userId: string,
  onNewMessage: (message: Message) => void
): () => void {
  const channel = supabase
    .channel(`all_messages_notify:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      },
      async (payload) => {
        const newMessage = payload.new as Message;

        // Skip messages from the current user
        if (newMessage.sender_id === userId) return;

        // Fetch sender info
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const headers = getAuthHeaders();

        try {
          const response = await fetch(
            `${supabaseUrl}/rest/v1/profiles?id=eq.${newMessage.sender_id}&select=id,full_name,avatar_url,user_type`,
            { headers }
          );

          if (response.ok) {
            const [sender] = await response.json();
            newMessage.sender = sender;
          }
        } catch (e) {
          // Continue without sender info
        }

        onNewMessage(newMessage);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// =============================================
// ATTACHMENTS
// =============================================

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
];
const ALLOWED_FILE_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Check if a file is an image type
 */
export function isImageFile(mimeType: string): boolean {
  return ALLOWED_IMAGE_TYPES.includes(mimeType);
}

/**
 * Validate a file for upload (type + size)
 */
export function validateAttachment(file: File): string | null {
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return 'Unsupported file type. Allowed: images (JPG, PNG, GIF, WebP), documents (PDF, DOC, DOCX, XLS, XLSX, TXT)';
  }
  if (file.size > MAX_FILE_SIZE) {
    return 'File is too large. Maximum size is 10MB.';
  }
  return null;
}

/**
 * Upload a file attachment to Supabase Storage
 * Returns the public URL of the uploaded file
 */
export async function uploadAttachment(
  file: File,
  userId: string
): Promise<MessageAttachment> {
  // Validate
  const error = validateAttachment(file);
  if (error) throw new Error(error);

  // Generate a unique filename
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `${userId}/${timestamp}_${safeName}`;

  const { data, error: uploadError } = await supabase.storage
    .from('message-attachments')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  // Get the URL (signed URL for private bucket)
  const { data: urlData } = await supabase.storage
    .from('message-attachments')
    .createSignedUrl(data.path, 60 * 60 * 24 * 365); // 1 year

  if (!urlData?.signedUrl) {
    throw new Error('Failed to get file URL');
  }

  return {
    url: urlData.signedUrl,
    type: file.type,
    name: file.name,
    size: file.size,
  };
}

/**
 * Get a display-friendly icon name for an attachment type
 */
export function getAttachmentIconName(mimeType: string): string {
  if (ALLOWED_IMAGE_TYPES.includes(mimeType)) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';
  if (
    mimeType === 'application/msword' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) return 'doc';
  if (
    mimeType === 'application/vnd.ms-excel' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ) return 'spreadsheet';
  if (mimeType === 'text/plain') return 'text';
  return 'file';
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// =============================================
// PHASE 2: TYPING INDICATORS & READ RECEIPTS
// =============================================

export interface ConversationChannelHandle {
  sendTyping: () => void;
  sendReadReceipt: (readAt: string) => void;
  cleanup: () => void;
}

/**
 * Set up a conversation channel for typing indicators and read receipt broadcasts.
 * Uses Supabase Broadcast (ephemeral, not stored in DB).
 */
export function setupConversationChannel(
  conversationId: string,
  userId: string,
  callbacks: {
    onTyping?: (typingUserId: string) => void;
    onReadReceipt?: (readAt: string) => void;
  }
): ConversationChannelHandle {
  const channel = supabase
    .channel(`conv-live:${conversationId}`)
    .on('broadcast', { event: 'typing' }, (payload) => {
      const senderId = payload.payload?.user_id;
      if (senderId && senderId !== userId) {
        callbacks.onTyping?.(senderId);
      }
    })
    .on('broadcast', { event: 'read' }, (payload) => {
      const readAt = payload.payload?.read_at;
      const readBy = payload.payload?.user_id;
      if (readBy && readBy !== userId && readAt) {
        callbacks.onReadReceipt?.(readAt);
      }
    })
    .subscribe();

  return {
    sendTyping: () => {
      channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { user_id: userId },
      });
    },
    sendReadReceipt: (readAt: string) => {
      channel.send({
        type: 'broadcast',
        event: 'read',
        payload: { user_id: userId, read_at: readAt },
      });
    },
    cleanup: () => {
      supabase.removeChannel(channel);
    },
  };
}

// =============================================
// PHASE 2: ONLINE PRESENCE
// =============================================

/**
 * Set up a presence channel to track which users are online.
 * Uses Supabase Presence (ephemeral, auto-removed on disconnect).
 */
export function setupPresenceChannel(
  userId: string,
  onSync: (onlineUserIds: string[]) => void
): () => void {
  const channel = supabase.channel('messaging-presence', {
    config: { presence: { key: userId } },
  });

  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const onlineIds = Object.keys(state);
      onSync(onlineIds);
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          user_id: userId,
          online_at: new Date().toISOString(),
        });
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}
