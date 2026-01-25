/**
 * Messaging System - Core Functions
 *
 * Phase 1: Basic messaging functionality
 * - Get conversations with last message and participant info
 * - Get messages with pagination
 * - Send messages
 * - Get or create 1:1 conversations
 * - Mark conversations as read
 *
 * Future phases will add:
 * - Typing indicators (Phase 2)
 * - Online presence (Phase 2)
 * - Read receipts (Phase 2)
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
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: Participant;
}

export interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  participants: Participant[];
  last_message: Message | null;
  unread_count: number;
  last_read_at: string | null;
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
 */
export async function getConversations(userId: string): Promise<ConversationWithOther[]> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const headers = getAuthHeaders();

  // Step 1: Get all conversations the user is part of
  const participantsResponse = await fetch(
    `${supabaseUrl}/rest/v1/conversation_participants?user_id=eq.${userId}&select=conversation_id,last_read_at`,
    { headers }
  );

  if (!participantsResponse.ok) {
    throw new Error('Failed to fetch conversations');
  }

  const userParticipations = await participantsResponse.json();

  if (userParticipations.length === 0) {
    return [];
  }

  const conversationIds = userParticipations.map((p: any) => p.conversation_id);
  const lastReadMap = new Map(userParticipations.map((p: any) => [p.conversation_id, p.last_read_at]));

  // Step 2: Get conversation details with all participants
  const conversationsResponse = await fetch(
    `${supabaseUrl}/rest/v1/conversations?id=in.(${conversationIds.join(',')})&select=*&order=updated_at.desc`,
    { headers }
  );

  if (!conversationsResponse.ok) {
    throw new Error('Failed to fetch conversation details');
  }

  const conversations = await conversationsResponse.json();

  // Step 3: Get all participants for these conversations
  const allParticipantsResponse = await fetch(
    `${supabaseUrl}/rest/v1/conversation_participants?conversation_id=in.(${conversationIds.join(',')})&select=conversation_id,user_id`,
    { headers }
  );

  if (!allParticipantsResponse.ok) {
    throw new Error('Failed to fetch participants');
  }

  const allParticipants = await allParticipantsResponse.json();

  // Step 4: Get profile info for all participants
  const participantUserIds = [...new Set(allParticipants.map((p: any) => p.user_id))];
  const profilesResponse = await fetch(
    `${supabaseUrl}/rest/v1/profiles?id=in.(${participantUserIds.join(',')})&select=id,full_name,avatar_url,user_type`,
    { headers }
  );

  if (!profilesResponse.ok) {
    throw new Error('Failed to fetch profiles');
  }

  const profiles = await profilesResponse.json();
  const profileMap = new Map(profiles.map((p: any) => [p.id, p]));

  // Step 5: Get last message for each conversation
  const messagesResponse = await fetch(
    `${supabaseUrl}/rest/v1/messages?conversation_id=in.(${conversationIds.join(',')})&select=*&order=created_at.desc`,
    { headers }
  );

  if (!messagesResponse.ok) {
    throw new Error('Failed to fetch messages');
  }

  const allMessages = await messagesResponse.json();

  // Group messages by conversation and get the last one
  const lastMessageMap = new Map<string, Message>();
  const unreadCountMap = new Map<string, number>();

  for (const msg of allMessages) {
    // Track last message
    if (!lastMessageMap.has(msg.conversation_id)) {
      lastMessageMap.set(msg.conversation_id, msg);
    }

    // Count unread messages
    const lastRead = lastReadMap.get(msg.conversation_id);
    if (!lastRead || new Date(msg.created_at) > new Date(lastRead)) {
      if (msg.sender_id !== userId) {
        const current = unreadCountMap.get(msg.conversation_id) || 0;
        unreadCountMap.set(msg.conversation_id, current + 1);
      }
    }
  }

  // Step 6: Build the final conversation objects
  const result: ConversationWithOther[] = conversations.map((conv: any) => {
    const conversationParticipants = allParticipants
      .filter((p: any) => p.conversation_id === conv.id)
      .map((p: any) => profileMap.get(p.user_id))
      .filter(Boolean) as Participant[];

    const otherParticipant = conversationParticipants.find(p => p.id !== userId) || conversationParticipants[0];

    return {
      id: conv.id,
      created_at: conv.created_at,
      updated_at: conv.updated_at,
      participants: conversationParticipants,
      other_participant: otherParticipant,
      last_message: lastMessageMap.get(conv.id) || null,
      unread_count: unreadCountMap.get(conv.id) || 0,
      last_read_at: lastReadMap.get(conv.id) || null,
    };
  });

  // Sort by updated_at (most recent first)
  result.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  return result;
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
  content: string
): Promise<Message> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const headers = getAuthHeaders();

  const response = await fetch(
    `${supabaseUrl}/rest/v1/messages`,
    {
      method: 'POST',
      headers: {
        ...headers,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        conversation_id: conversationId,
        sender_id: senderId,
        content: content.trim(),
      }),
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
 */
export async function getOrCreateConversation(
  userId1: string,
  userId2: string
): Promise<string> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const headers = getAuthHeaders();

  // Step 1: Find existing conversation between these two users
  // Get all conversations for user1
  const user1ConvsResponse = await fetch(
    `${supabaseUrl}/rest/v1/conversation_participants?user_id=eq.${userId1}&select=conversation_id`,
    { headers }
  );

  if (!user1ConvsResponse.ok) {
    throw new Error('Failed to fetch user conversations');
  }

  const user1Convs = await user1ConvsResponse.json();

  if (user1Convs.length > 0) {
    const convIds = user1Convs.map((c: any) => c.conversation_id);

    // Check if user2 is in any of these conversations
    const user2InConvsResponse = await fetch(
      `${supabaseUrl}/rest/v1/conversation_participants?user_id=eq.${userId2}&conversation_id=in.(${convIds.join(',')})&select=conversation_id`,
      { headers }
    );

    if (!user2InConvsResponse.ok) {
      throw new Error('Failed to check existing conversations');
    }

    const sharedConvs = await user2InConvsResponse.json();

    // For each shared conversation, check if it's a 1:1 (only 2 participants)
    for (const conv of sharedConvs) {
      const participantCountResponse = await fetch(
        `${supabaseUrl}/rest/v1/conversation_participants?conversation_id=eq.${conv.conversation_id}&select=id`,
        { headers }
      );

      if (participantCountResponse.ok) {
        const participants = await participantCountResponse.json();
        if (participants.length === 2) {
          // Found existing 1:1 conversation
          return conv.conversation_id;
        }
      }
    }
  }

  // Step 2: Create new conversation
  const createConvResponse = await fetch(
    `${supabaseUrl}/rest/v1/conversations`,
    {
      method: 'POST',
      headers: {
        ...headers,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({}),
    }
  );

  if (!createConvResponse.ok) {
    throw new Error('Failed to create conversation');
  }

  const [newConversation] = await createConvResponse.json();

  // Step 3: Add both participants
  const addParticipantsResponse = await fetch(
    `${supabaseUrl}/rest/v1/conversation_participants`,
    {
      method: 'POST',
      headers: {
        ...headers,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify([
        { conversation_id: newConversation.id, user_id: userId1 },
        { conversation_id: newConversation.id, user_id: userId2 },
      ]),
    }
  );

  if (!addParticipantsResponse.ok) {
    throw new Error('Failed to add participants');
  }

  return newConversation.id;
}

/**
 * Mark a conversation as read (update last_read_at to now)
 */
export async function markConversationRead(
  conversationId: string,
  userId: string
): Promise<void> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const headers = getAuthHeaders();

  const response = await fetch(
    `${supabaseUrl}/rest/v1/conversation_participants?conversation_id=eq.${conversationId}&user_id=eq.${userId}`,
    {
      method: 'PATCH',
      headers: {
        ...headers,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        last_read_at: new Date().toISOString(),
      }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to mark conversation as read');
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
    `${supabaseUrl}/rest/v1/profiles?full_name=ilike.*${encodeURIComponent(query)}*&id=neq.${currentUserId}&select=id,full_name,avatar_url,user_type&limit=${limit}`,
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
