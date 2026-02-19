import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MessageSquare,
  Send,
  Search,
  Plus,
  ArrowLeft,
  User,
  MessageCircle,
  CheckCheck,
  Paperclip,
  X,
  FileText,
  Download,
  Image as ImageIcon,
  FileSpreadsheet,
  File,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  getConversations,
  getConversationDetails,
  getMessages,
  sendMessage,
  markConversationRead,
  subscribeToMessages,
  subscribeToConversationUpdates,
  setupConversationChannel,
  setupPresenceChannel,
  uploadAttachment,
  validateAttachment,
  isImageFile,
  getAttachmentIconName,
  formatFileSize,
  type ConversationWithOther,
  type ConversationChannelHandle,
  type Message,
  type MessageAttachment,
  type Participant,
} from "@/lib/messaging";
import { NewMessageModal } from "@/components/messaging/NewMessageModal";
import { useMessageNotifications } from "@/contexts/MessageNotificationContext";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";

// =============================================
// HELPER COMPONENTS
// =============================================

function ConversationSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3">
      <Skeleton className="w-12 h-12 rounded-full" />
      <div className="flex-1">
        <Skeleton className="h-4 w-24 mb-2" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-3 w-12" />
    </div>
  );
}

function MessageSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <div className="flex justify-start">
        <Skeleton className="h-16 w-48 rounded-2xl" />
      </div>
      <div className="flex justify-end">
        <Skeleton className="h-12 w-40 rounded-2xl" />
      </div>
      <div className="flex justify-start">
        <Skeleton className="h-20 w-56 rounded-2xl" />
      </div>
    </div>
  );
}

function EmptyConversations() {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center p-6">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <MessageCircle className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-lg mb-2">No conversations yet</h3>
      <p className="text-sm text-muted-foreground">
        Start chatting with other agents!
      </p>
    </div>
  );
}

function EmptyConversation() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-6">
      <div className="w-20 h-20 rounded-full bg-forest/10 flex items-center justify-center mb-4">
        <MessageSquare className="w-10 h-10 text-forest" />
      </div>
      <h3 className="font-semibold text-xl mb-2">Select a conversation</h3>
      <p className="text-muted-foreground max-w-sm">
        Choose a conversation from the list or start a new one to begin
        messaging.
      </p>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 justify-start">
      <div className="w-8" />
      <div className="bg-[#F3F4F6] rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1">
        <span
          className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
          style={{ animationDelay: "0ms", animationDuration: "1s" }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
          style={{ animationDelay: "200ms", animationDuration: "1s" }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
          style={{ animationDelay: "400ms", animationDuration: "1s" }}
        />
      </div>
    </div>
  );
}

function formatMessageDate(dateString: string): string {
  const date = new Date(dateString);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMMM d, yyyy");
}

function formatMessageTime(dateString: string): string {
  return format(new Date(dateString), "h:mm a");
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return format(date, "MMM d");
}

// =============================================
// CONVERSATION LIST ITEM
// =============================================

interface ConversationItemProps {
  conversation: ConversationWithOther;
  isActive: boolean;
  onClick: () => void;
  currentUserId: string;
  isOnline?: boolean;
}

function ConversationItem({
  conversation,
  isActive,
  onClick,
  currentUserId,
  isOnline,
}: ConversationItemProps) {
  const other = conversation.other_participant;
  const lastMessage = conversation.last_message;
  const hasUnread = conversation.unread_count > 0;
  const jobTitle = conversation.title || conversation.job_address;
  const isJobLinked = !!conversation.job_id;

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const truncateMessage = (content: string, maxLength: number = 50) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + "...";
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-lg transition-colors duration-150 text-left",
        isActive
          ? "bg-forest/10 border border-forest/20"
          : "hover:bg-muted/50 border border-transparent"
      )}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {other?.avatar_url ? (
          <img
            src={other.avatar_url}
            alt={other.full_name || "User"}
            className="w-12 h-12 rounded-full object-cover border border-border"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-forest/10 flex items-center justify-center border border-border">
            <span className="text-sm font-semibold text-forest">
              {getInitials(other?.full_name)}
            </span>
          </div>
        )}
        {hasUnread && (
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-forest rounded-full border-2 border-background" />
        )}
        {isOnline && (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span
            className={cn(
              "font-medium truncate",
              hasUnread && "font-semibold"
            )}
          >
            {other?.full_name || "Unknown User"}
          </span>
          {lastMessage && (
            <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
              {formatRelativeTime(lastMessage.created_at)}
            </span>
          )}
        </div>
        {/* Job context subtitle */}
        {isJobLinked && jobTitle && (
          <p className="text-xs text-forest/80 truncate flex items-center gap-1 mb-0.5">
            <Briefcase className="w-3 h-3 flex-shrink-0" />
            {jobTitle}
          </p>
        )}
        {/* Custom topic subtitle */}
        {!isJobLinked && conversation.context_type === 'custom' && conversation.title && (
          <p className="text-xs text-forest/80 truncate flex items-center gap-1 mb-0.5">
            <MessageSquare className="w-3 h-3 flex-shrink-0" />
            {conversation.title}
          </p>
        )}
        {lastMessage && (
          <p
            className={cn(
              "text-sm truncate",
              hasUnread ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {lastMessage.sender_id === currentUserId && (
              <span className="text-muted-foreground">You: </span>
            )}
            {lastMessage.attachment_url && !lastMessage.content ? (
              <span className="flex items-center gap-1">
                <Paperclip className="w-3 h-3 inline" />
                {lastMessage.attachment_name || 'Attachment'}
              </span>
            ) : (
              truncateMessage(lastMessage.content)
            )}
          </p>
        )}
      </div>
    </button>
  );
}

// =============================================
// MESSAGE BUBBLE
// =============================================

interface MessageBubbleProps {
  message: Message;
  isSent: boolean;
  showAvatar: boolean;
  isRead?: boolean;
  onImageClick?: (url: string) => void;
}

function AttachmentIcon({ type }: { type: string }) {
  const iconName = getAttachmentIconName(type);
  switch (iconName) {
    case 'pdf':
      return <FileText className="w-5 h-5" />;
    case 'doc':
      return <FileText className="w-5 h-5" />;
    case 'spreadsheet':
      return <FileSpreadsheet className="w-5 h-5" />;
    case 'text':
      return <File className="w-5 h-5" />;
    default:
      return <File className="w-5 h-5" />;
  }
}

function MessageBubble({ message, isSent, showAvatar, isRead, onImageClick }: MessageBubbleProps) {
  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const hasAttachment = !!message.attachment_url;
  const isImage = hasAttachment && message.attachment_type && isImageFile(message.attachment_type);

  return (
    <div
      className={cn(
        "flex items-end gap-2 animate-in fade-in-0 slide-in-from-bottom-2 duration-200",
        isSent ? "justify-end" : "justify-start"
      )}
    >
      {/* Avatar for received messages */}
      {!isSent && showAvatar && (
        <div className="flex-shrink-0 w-8 h-8">
          {message.sender?.avatar_url ? (
            <img
              src={message.sender.avatar_url}
              alt={message.sender.full_name || "User"}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <span className="text-xs font-medium text-muted-foreground">
                {getInitials(message.sender?.full_name)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Spacer for alignment when no avatar */}
      {!isSent && !showAvatar && <div className="w-8" />}

      {/* Message bubble */}
      <div
        className={cn(
          "max-w-[70%] rounded-2xl overflow-hidden",
          isSent
            ? "bg-[#0D9488] text-white rounded-br-md"
            : "bg-[#F3F4F6] text-gray-900 rounded-bl-md"
        )}
      >
        {/* Image attachment */}
        {isImage && message.attachment_url && (
          <button
            onClick={() => onImageClick?.(message.attachment_url!)}
            className="block w-full cursor-pointer hover:opacity-90 transition-opacity"
          >
            <img
              src={message.attachment_url}
              alt={message.attachment_name || 'Image'}
              className="max-w-full max-h-64 object-cover"
              loading="lazy"
            />
          </button>
        )}

        {/* Document attachment */}
        {hasAttachment && !isImage && message.attachment_url && (
          <a
            href={message.attachment_url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-center gap-3 px-4 py-3 transition-colors",
              isSent
                ? "hover:bg-white/10 text-white"
                : "hover:bg-gray-200 text-gray-900"
            )}
          >
            <div className={cn(
              "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
              isSent ? "bg-white/20" : "bg-gray-300/50"
            )}>
              <AttachmentIcon type={message.attachment_type || ''} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {message.attachment_name || 'File'}
              </p>
              {message.attachment_size && (
                <p className={cn(
                  "text-xs",
                  isSent ? "text-white/70" : "text-gray-500"
                )}>
                  {formatFileSize(message.attachment_size)}
                </p>
              )}
            </div>
            <Download className={cn(
              "w-4 h-4 flex-shrink-0",
              isSent ? "text-white/70" : "text-gray-400"
            )} />
          </a>
        )}

        {/* Text content */}
        <div className="px-4 py-2.5">
          {message.content && (
            <p className="text-sm whitespace-pre-wrap break-words">
              {message.content}
            </p>
          )}
          <div
            className={cn(
              "flex items-center gap-1 mt-1",
              isSent ? "justify-end" : ""
            )}
          >
            <span
              className={cn(
                "text-xs",
                isSent ? "text-white/70" : "text-gray-500"
              )}
            >
              {formatMessageTime(message.created_at)}
            </span>
            {isSent && (
              <CheckCheck
                className={cn(
                  "w-3.5 h-3.5",
                  isRead ? "text-teal-300" : "text-white/50"
                )}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================
// MAIN MESSAGING PAGE
// =============================================

export default function Messaging() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { setActiveConversationId, refreshUnreadCount } = useMessageNotifications();

  // State
  const [conversations, setConversations] = useState<ConversationWithOther[]>(
    []
  );
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [currentParticipant, setCurrentParticipant] = useState<Participant | null>(null);
  const [conversationContext, setConversationContext] = useState<{
    job_id: string | null;
    title: string | null;
    context_type: string;
    job_address: string | null;
  } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewMessageModalOpen, setIsNewMessageModalOpen] = useState(false);

  // Loading states
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  // Attachment state
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lightbox state
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // New Topic preselected user
  const [newTopicUser, setNewTopicUser] = useState<Participant | null>(null);

  // Mobile view state
  const [showConversation, setShowConversation] = useState(false);

  // Phase 2: Typing indicator
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentRef = useRef<number>(0);
  const channelHandleRef = useRef<ConversationChannelHandle | null>(null);

  // Phase 2: Read receipts
  const [otherLastReadAt, setOtherLastReadAt] = useState<string | null>(null);

  // Phase 2: Online presence
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Get selected conversation from list or use current participant
  const selectedConversation = conversations.find(
    (c) => c.id === selectedConversationId
  );

  // Use the participant from conversations list or fallback to fetched details
  const otherParticipant = selectedConversation?.other_participant || currentParticipant;

  // Derive conversation context (from list or fetched details)
  const activeContext = selectedConversation
    ? {
        job_id: selectedConversation.job_id,
        title: selectedConversation.title,
        context_type: selectedConversation.context_type,
        job_address: selectedConversation.job_address,
      }
    : conversationContext;
  const activeJobTitle = activeContext?.title || activeContext?.job_address;

  // Scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!user?.id) return;

    try {
      const data = await getConversations(user.id);
      setConversations(data);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      toast.error("Failed to load conversations");
    } finally {
      setLoadingConversations(false);
    }
  }, [user?.id]);

  // Fetch messages for selected conversation
  const fetchMessages = useCallback(async () => {
    if (!selectedConversationId || !user?.id) return;

    setLoadingMessages(true);
    try {
      // Fetch messages
      const data = await getMessages(selectedConversationId);
      setMessages(data);

      // Fetch conversation details to get other participant info + read receipt data
      const details = await getConversationDetails(selectedConversationId);
      if (details?.other_participant) {
        setCurrentParticipant(details.other_participant);
      }
      setOtherLastReadAt(details?.other_last_read_at || null);
      setConversationContext(details ? {
        job_id: details.job_id,
        title: details.title,
        context_type: details.context_type,
        job_address: details.job_address,
      } : null);

      // Mark as read and broadcast read receipt
      await markConversationRead(selectedConversationId, user.id);
      const readAt = new Date().toISOString();
      channelHandleRef.current?.sendReadReceipt(readAt);

      // Update unread count in local state
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedConversationId ? { ...c, unread_count: 0 } : c
        )
      );

      // Refresh global unread badge count
      refreshUnreadCount();
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error("Failed to load messages");
    } finally {
      setLoadingMessages(false);
    }
  }, [selectedConversationId, user?.id]);

  // Handle file selection for attachment
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const error = validateAttachment(file);
    if (error) {
      toast.error(error);
      return;
    }

    setPendingFile(file);

    // Create preview for images
    if (isImageFile(file.type)) {
      const reader = new FileReader();
      reader.onload = (ev) => setAttachmentPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setAttachmentPreview(null);
    }

    // Reset the input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Remove pending attachment
  const handleRemoveAttachment = () => {
    setPendingFile(null);
    setAttachmentPreview(null);
  };

  // Handle sending a message
  const handleSendMessage = async () => {
    if (!selectedConversationId || !user?.id || (!newMessage.trim() && !pendingFile)) return;

    setSendingMessage(true);
    try {
      // Upload attachment if present
      let attachment: MessageAttachment | undefined;
      if (pendingFile) {
        attachment = await uploadAttachment(pendingFile, user.id);
      }

      const message = await sendMessage(
        selectedConversationId,
        user.id,
        newMessage.trim(),
        attachment
      );

      // Add message to local state with sender info
      const messageWithSender: Message = {
        ...message,
        sender: {
          id: user.id,
          full_name: user.user_metadata?.full_name || user.email || "You",
          avatar_url: null,
          user_type: null,
          home_base_address: null,
        },
      };

      setMessages((prev) => [...prev, messageWithSender]);
      setNewMessage("");
      setPendingFile(null);
      setAttachmentPreview(null);

      // Update conversation list
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedConversationId
            ? { ...c, last_message: messageWithSender, updated_at: new Date().toISOString() }
            : c
        ).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      );

      // Scroll to bottom
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setSendingMessage(false);
    }
  };

  // Handle key press in input
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (newMessage.trim() || pendingFile) {
        handleSendMessage();
      }
    }
  };

  // Handle conversation selection
  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setShowConversation(true);
    setSearchParams({ conversation: conversationId });
  };

  // Handle new conversation started
  const handleNewConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setShowConversation(true);
    setIsNewMessageModalOpen(false);
    setNewTopicUser(null);
    fetchConversations();
    setSearchParams({ conversation: conversationId });
  };

  // Handle "New Topic" button in conversation header
  const handleNewTopic = () => {
    if (otherParticipant) {
      setNewTopicUser(otherParticipant);
      setIsNewMessageModalOpen(true);
    }
  };

  // Handle back button (mobile)
  const handleBack = () => {
    setShowConversation(false);
    setSelectedConversationId(null);
    setSearchParams({});
  };

  // Filter conversations by search (name, job title, or job address)
  const filteredConversations = conversations.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.other_participant?.full_name?.toLowerCase().includes(q) ||
      c.title?.toLowerCase().includes(q) ||
      c.job_address?.toLowerCase().includes(q)
    );
  });

  // Group messages by date
  const groupedMessages: { date: string; messages: Message[] }[] = [];
  let currentDate = "";

  for (const message of messages) {
    const messageDate = formatMessageDate(message.created_at);
    if (messageDate !== currentDate) {
      currentDate = messageDate;
      groupedMessages.push({ date: messageDate, messages: [message] });
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(message);
    }
  }

  // Initial load
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Handle URL params for direct conversation access
  useEffect(() => {
    const conversationId = searchParams.get("conversation");
    if (conversationId && !selectedConversationId) {
      setSelectedConversationId(conversationId);
      setShowConversation(true);

      // Pre-fill message if provided (e.g. from job context)
      const prefill = searchParams.get("prefill");
      if (prefill) {
        setNewMessage(prefill);
        // Clear the prefill param so it doesn't re-apply
        setSearchParams({ conversation: conversationId }, { replace: true });
      }
    }
  }, [searchParams, selectedConversationId]);

  // Fetch messages when conversation changes
  useEffect(() => {
    if (selectedConversationId) {
      fetchMessages();
    }
  }, [selectedConversationId, fetchMessages]);

  // Sync active conversation with notification context (suppresses toasts for active conversation)
  useEffect(() => {
    setActiveConversationId(selectedConversationId);
    return () => setActiveConversationId(null);
  }, [selectedConversationId, setActiveConversationId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Subscribe to real-time messages
  useEffect(() => {
    if (!selectedConversationId || !user?.id) return;

    const unsubscribe = subscribeToMessages(
      selectedConversationId,
      (newMessage) => {
        // Only add if not from current user (we already added optimistically)
        if (newMessage.sender_id !== user.id) {
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });

          // Mark as read since we're viewing this conversation
          markConversationRead(selectedConversationId, user.id).then(() => {
            refreshUnreadCount();
            const readAt = new Date().toISOString();
            channelHandleRef.current?.sendReadReceipt(readAt);
          });

          // Scroll to bottom
          setTimeout(scrollToBottom, 100);
        }
      }
    );

    return () => unsubscribe();
  }, [selectedConversationId, user?.id, scrollToBottom]);

  // Subscribe to conversation updates (for updating the list)
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = subscribeToConversationUpdates(user.id, () => {
      fetchConversations();
    });

    return () => unsubscribe();
  }, [user?.id, fetchConversations]);

  // Focus input when conversation is selected
  useEffect(() => {
    if (selectedConversationId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [selectedConversationId]);

  // Phase 2: Set up conversation channel for typing + read receipts
  useEffect(() => {
    if (!selectedConversationId || !user?.id) return;

    // Reset typing state
    setIsOtherTyping(false);

    // Initialize other_last_read_at from conversation data
    const conv = conversations.find((c) => c.id === selectedConversationId);
    if (conv?.other_last_read_at) {
      setOtherLastReadAt(conv.other_last_read_at);
    }

    const handle = setupConversationChannel(
      selectedConversationId,
      user.id,
      {
        onTyping: () => {
          setIsOtherTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => {
            setIsOtherTyping(false);
          }, 3000);
        },
        onReadReceipt: (readAt) => {
          setOtherLastReadAt(readAt);
        },
      }
    );

    channelHandleRef.current = handle;

    return () => {
      handle.cleanup();
      channelHandleRef.current = null;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [selectedConversationId, user?.id]);

  // Phase 2: Set up presence channel for online status
  useEffect(() => {
    if (!user?.id) return;

    const cleanup = setupPresenceChannel(user.id, (onlineIds) => {
      setOnlineUserIds(new Set(onlineIds));
    });

    return cleanup;
  }, [user?.id]);

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">
            Please sign in to access messaging.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-8rem)] max-h-[800px]">
        <Card className="h-full overflow-hidden border-border/50">
          <div className="flex h-full">
            {/* Left Panel - Conversation List */}
            <div
              className={cn(
                "w-full md:w-80 lg:w-96 border-r border-border flex flex-col",
                showConversation && "hidden md:flex"
              )}
            >
              {/* Header */}
              <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between mb-4">
                  <h1 className="text-2xl lg:text-3xl font-serif font-semibold flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-forest" />
                    Messages
                  </h1>
                  <Button
                    size="sm"
                    onClick={() => setIsNewMessageModalOpen(true)}
                    className="bg-forest hover:bg-forest/90 text-white"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    New
                  </Button>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Conversation List */}
              <ScrollArea className="flex-1">
                <div className="p-2">
                  {loadingConversations ? (
                    <>
                      <ConversationSkeleton />
                      <ConversationSkeleton />
                      <ConversationSkeleton />
                    </>
                  ) : filteredConversations.length === 0 ? (
                    <EmptyConversations />
                  ) : (
                    filteredConversations.map((conversation) => (
                      <ConversationItem
                        key={conversation.id}
                        conversation={conversation}
                        isActive={conversation.id === selectedConversationId}
                        onClick={() =>
                          handleSelectConversation(conversation.id)
                        }
                        currentUserId={user.id}
                        isOnline={onlineUserIds.has(conversation.other_participant?.id)}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Right Panel - Conversation View */}
            <div
              className={cn(
                "flex-1 flex flex-col",
                !showConversation && "hidden md:flex"
              )}
            >
              {!selectedConversationId ? (
                <EmptyConversation />
              ) : (
                <>
                  {/* Conversation Header */}
                  <div className="p-4 border-b border-border flex items-center gap-3">
                    {/* Back button (mobile) */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="md:hidden"
                      onClick={handleBack}
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </Button>

                    {/* Participant info with online dot */}
                    <div className="relative flex-shrink-0">
                      {otherParticipant?.avatar_url ? (
                        <img
                          src={otherParticipant.avatar_url}
                          alt={otherParticipant.full_name || "User"}
                          className="w-10 h-10 rounded-full object-cover border border-border"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-forest/10 flex items-center justify-center border border-border">
                          <User className="w-5 h-5 text-forest" />
                        </div>
                      )}
                      {otherParticipant?.id && onlineUserIds.has(otherParticipant.id) && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="font-semibold truncate">
                        {otherParticipant?.full_name || "Unknown User"}
                      </h2>
                      {/* Job context subtitle */}
                      {activeContext?.job_id && activeJobTitle && (
                        <button
                          onClick={() => {
                            const jobId = activeContext.job_id;
                            if (jobId) navigate(`/inspections/spotlights/${jobId}`);
                          }}
                          className="text-xs text-forest hover:text-forest/80 truncate flex items-center gap-1 transition-colors"
                        >
                          <Briefcase className="w-3 h-3 flex-shrink-0" />
                          {activeJobTitle}
                        </button>
                      )}
                      {/* Custom topic subtitle */}
                      {activeContext?.context_type === 'custom' && activeContext?.title && (
                        <p className="text-xs text-forest/80 truncate flex items-center gap-1">
                          <MessageSquare className="w-3 h-3 flex-shrink-0" />
                          {activeContext.title}
                        </p>
                      )}
                      {/* Job deleted indicator */}
                      {activeContext?.job_id && !activeJobTitle && (
                        <p className="text-xs text-muted-foreground italic">
                          Job no longer available
                        </p>
                      )}
                      {isOtherTyping ? (
                        <p className="text-xs text-emerald-600 font-medium">
                          typing...
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground truncate">
                          {[
                            otherParticipant?.id && onlineUserIds.has(otherParticipant.id)
                              ? "Online"
                              : null,
                            otherParticipant?.user_type
                              ? otherParticipant.user_type
                                  .replace(/_/g, " ")
                                  .replace(/\b\w/g, (l: string) => l.toUpperCase())
                              : null,
                            otherParticipant?.home_base_address,
                          ].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>

                    {/* New Topic button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleNewTopic}
                      className="flex-shrink-0 text-xs text-forest hover:text-forest/80 hover:bg-forest/10"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      New Topic
                    </Button>
                  </div>

                  {/* Messages Area */}
                  <ScrollArea className="flex-1 p-4">
                    {loadingMessages ? (
                      <MessageSkeleton />
                    ) : messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <MessageCircle className="w-12 h-12 text-muted-foreground/50 mb-3" />
                        <p className="text-muted-foreground">
                          Start the conversation!
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {groupedMessages.map((group, groupIndex) => (
                          <div key={group.date}>
                            {/* Date separator */}
                            <div className="flex items-center justify-center my-4">
                              <div className="bg-muted px-3 py-1 rounded-full">
                                <span className="text-xs text-muted-foreground font-medium">
                                  {group.date}
                                </span>
                              </div>
                            </div>

                            {/* Messages */}
                            <div className="space-y-2">
                              {group.messages.map((message, messageIndex) => {
                                const isSent = message.sender_id === user.id;
                                const prevMessage =
                                  messageIndex > 0
                                    ? group.messages[messageIndex - 1]
                                    : null;
                                const showAvatar =
                                  !prevMessage ||
                                  prevMessage.sender_id !== message.sender_id;

                                const isRead = isSent && !!otherLastReadAt &&
                                  new Date(otherLastReadAt) >= new Date(message.created_at);

                                return (
                                  <MessageBubble
                                    key={message.id}
                                    message={message}
                                    isSent={isSent}
                                    showAvatar={showAvatar}
                                    isRead={isRead}
                                    onImageClick={setLightboxImage}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        ))}
                        {isOtherTyping && <TypingIndicator />}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </ScrollArea>

                  {/* Message Input */}
                  <div className="border-t border-border">
                    {/* Attachment Preview */}
                    {pendingFile && (
                      <div className="px-4 pt-3 pb-0">
                        <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-3 border border-border">
                          {/* Image thumbnail or file icon */}
                          {attachmentPreview ? (
                            <img
                              src={attachmentPreview}
                              alt="Preview"
                              className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                              <AttachmentIcon type={pendingFile.type} />
                            </div>
                          )}
                          {/* File info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{pendingFile.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(pendingFile.size)}
                            </p>
                          </div>
                          {/* Remove button */}
                          <button
                            onClick={handleRemoveAttachment}
                            className="flex-shrink-0 p-1 rounded-full hover:bg-muted transition-colors"
                          >
                            <X className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Hidden file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain"
                      onChange={handleFileSelect}
                      className="hidden"
                    />

                    <div className="p-4">
                      <div className="flex items-end gap-2">
                        {/* Paperclip button */}
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={sendingMessage}
                          className={cn(
                            "flex-shrink-0 p-2 rounded-lg transition-colors",
                            "text-muted-foreground hover:text-foreground hover:bg-muted",
                            sendingMessage && "opacity-50 cursor-not-allowed"
                          )}
                          title="Attach file"
                        >
                          <Paperclip className="w-5 h-5" />
                        </button>

                        <textarea
                          ref={inputRef}
                          value={newMessage}
                          onChange={(e) => {
                            setNewMessage(e.target.value);
                            // Phase 2: Broadcast typing (debounced to every 2s)
                            const now = Date.now();
                            if (now - lastTypingSentRef.current > 2000) {
                              channelHandleRef.current?.sendTyping();
                              lastTypingSentRef.current = now;
                            }
                          }}
                          onKeyDown={handleKeyPress}
                          placeholder="Type a message..."
                          rows={1}
                          className={cn(
                            "flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2",
                            "text-sm placeholder:text-muted-foreground",
                            "focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest",
                            "min-h-[40px] max-h-[120px]"
                          )}
                          style={{
                            height: "auto",
                            overflowY: newMessage.includes("\n")
                              ? "auto"
                              : "hidden",
                          }}
                        />
                        <Button
                          onClick={handleSendMessage}
                          disabled={(!newMessage.trim() && !pendingFile) || sendingMessage}
                          className="bg-forest hover:bg-forest/90 text-white h-10"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Press Enter to send, Shift+Enter for new line
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Image Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={lightboxImage}
            alt="Full size"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* New Message Modal */}
      <NewMessageModal
        open={isNewMessageModalOpen}
        onOpenChange={(open) => {
          setIsNewMessageModalOpen(open);
          if (!open) setNewTopicUser(null);
        }}
        onConversationStarted={handleNewConversation}
        currentUserId={user.id}
        preselectedUser={newTopicUser}
      />
    </DashboardLayout>
  );
}
