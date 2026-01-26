import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  getUnreadCount as fetchMessagingUnreadCount,
  subscribeToConversationUpdates,
  subscribeToAllNewMessages,
  type Message,
} from '@/lib/messaging';

interface MessageNotificationContextType {
  unreadCount: number;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  refreshUnreadCount: () => void;
}

const MessageNotificationContext = createContext<MessageNotificationContextType>({
  unreadCount: 0,
  activeConversationId: null,
  setActiveConversationId: () => {},
  refreshUnreadCount: () => {},
});

export function useMessageNotifications() {
  return useContext(MessageNotificationContext);
}

export function MessageNotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const activeConversationRef = useRef<string | null>(null);

  // Keep ref in sync so subscription callbacks have latest value
  useEffect(() => {
    activeConversationRef.current = activeConversationId;
  }, [activeConversationId]);

  // Clear active conversation when navigating away from messages
  useEffect(() => {
    if (!location.pathname.startsWith('/messages')) {
      setActiveConversationId(null);
    }
  }, [location.pathname]);

  // Fetch unread count
  const refreshUnreadCount = useCallback(async () => {
    if (!user?.id) return;
    try {
      const count = await fetchMessagingUnreadCount(user.id);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error fetching unread message count:', error);
    }
  }, [user?.id]);

  // Initial fetch + subscribe to conversation updates for count refresh
  useEffect(() => {
    if (!user?.id) {
      setUnreadCount(0);
      return;
    }

    refreshUnreadCount();

    const unsubscribe = subscribeToConversationUpdates(user.id, () => {
      refreshUnreadCount();
    });

    return () => unsubscribe();
  }, [user?.id, refreshUnreadCount]);

  // Request browser notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      // Delay the request slightly so it doesn't fire immediately on page load
      const timer = setTimeout(() => {
        Notification.requestPermission();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Subscribe to new messages for toast + browser notifications
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = subscribeToAllNewMessages(user.id, (message: Message) => {
      // Don't notify if user is actively viewing this conversation
      if (activeConversationRef.current === message.conversation_id) return;

      const senderName = message.sender?.full_name || 'Someone';
      const preview = message.content.length > 60
        ? message.content.substring(0, 60) + '...'
        : message.content;

      // Show sonner toast notification
      toast(senderName, {
        description: preview,
        action: {
          label: 'View',
          onClick: () => {
            navigate(`/messages?conversation=${message.conversation_id}`);
          },
        },
        duration: 5000,
      });

      // Show browser notification if tab is not focused
      if (
        'Notification' in window &&
        Notification.permission === 'granted' &&
        document.hidden
      ) {
        const notification = new Notification(`New message from ${senderName}`, {
          body: preview,
          icon: '/images/logo/logo-icon.png',
          tag: `message-${message.conversation_id}`,
        });

        notification.onclick = () => {
          window.focus();
          navigate(`/messages?conversation=${message.conversation_id}`);
          notification.close();
        };

        // Auto-close after 5 seconds
        setTimeout(() => notification.close(), 5000);
      }
    });

    return () => unsubscribe();
  }, [user?.id, navigate]);

  return (
    <MessageNotificationContext.Provider
      value={{
        unreadCount,
        activeConversationId,
        setActiveConversationId,
        refreshUnreadCount,
      }}
    >
      {children}
    </MessageNotificationContext.Provider>
  );
}
