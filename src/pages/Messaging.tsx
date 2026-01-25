import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  getConversations,
  getMessages,
  sendMessage,
  markConversationRead,
  subscribeToMessages,
  subscribeToConversationUpdates,
  type ConversationWithOther,
  type Message,
} from "@/lib/messaging";
import { NewMessageModal } from "@/components/messaging/NewMessageModal";
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
}

function ConversationItem({
  conversation,
  isActive,
  onClick,
  currentUserId,
}: ConversationItemProps) {
  const other = conversation.other_participant;
  const lastMessage = conversation.last_message;
  const hasUnread = conversation.unread_count > 0;

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
            {truncateMessage(lastMessage.content)}
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
}

function MessageBubble({ message, isSent, showAvatar }: MessageBubbleProps) {
  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

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
          "max-w-[70%] px-4 py-2.5 rounded-2xl",
          isSent
            ? "bg-[#0D9488] text-white rounded-br-md"
            : "bg-[#F3F4F6] text-gray-900 rounded-bl-md"
        )}
      >
        <p className="text-sm whitespace-pre-wrap break-words">
          {message.content}
        </p>
        <p
          className={cn(
            "text-xs mt-1",
            isSent ? "text-white/70" : "text-gray-500"
          )}
        >
          {formatMessageTime(message.created_at)}
        </p>
      </div>
    </div>
  );
}

// =============================================
// MAIN MESSAGING PAGE
// =============================================

export default function Messaging() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [conversations, setConversations] = useState<ConversationWithOther[]>(
    []
  );
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewMessageModalOpen, setIsNewMessageModalOpen] = useState(false);

  // Loading states
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  // Mobile view state
  const [showConversation, setShowConversation] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Get selected conversation
  const selectedConversation = conversations.find(
    (c) => c.id === selectedConversationId
  );

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
      const data = await getMessages(selectedConversationId);
      setMessages(data);

      // Mark as read
      await markConversationRead(selectedConversationId, user.id);

      // Update unread count in local state
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedConversationId ? { ...c, unread_count: 0 } : c
        )
      );
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error("Failed to load messages");
    } finally {
      setLoadingMessages(false);
    }
  }, [selectedConversationId, user?.id]);

  // Handle sending a message
  const handleSendMessage = async () => {
    if (!selectedConversationId || !user?.id || !newMessage.trim()) return;

    setSendingMessage(true);
    try {
      const message = await sendMessage(
        selectedConversationId,
        user.id,
        newMessage.trim()
      );

      // Add message to local state with sender info
      const messageWithSender: Message = {
        ...message,
        sender: {
          id: user.id,
          full_name: user.user_metadata?.full_name || user.email || "You",
          avatar_url: null,
          user_type: null,
        },
      };

      setMessages((prev) => [...prev, messageWithSender]);
      setNewMessage("");

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
      handleSendMessage();
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
    fetchConversations();
    setSearchParams({ conversation: conversationId });
  };

  // Handle back button (mobile)
  const handleBack = () => {
    setShowConversation(false);
    setSelectedConversationId(null);
    setSearchParams({});
  };

  // Filter conversations by search
  const filteredConversations = conversations.filter((c) =>
    c.other_participant?.full_name
      ?.toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

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
    }
  }, [searchParams, selectedConversationId]);

  // Fetch messages when conversation changes
  useEffect(() => {
    if (selectedConversationId) {
      fetchMessages();
    }
  }, [selectedConversationId, fetchMessages]);

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
          markConversationRead(selectedConversationId, user.id);

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
                  <h1 className="text-xl font-semibold flex items-center gap-2">
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
              {!selectedConversation ? (
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

                    {/* Participant info */}
                    {selectedConversation.other_participant?.avatar_url ? (
                      <img
                        src={selectedConversation.other_participant.avatar_url}
                        alt={
                          selectedConversation.other_participant.full_name ||
                          "User"
                        }
                        className="w-10 h-10 rounded-full object-cover border border-border"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-forest/10 flex items-center justify-center border border-border">
                        <User className="w-5 h-5 text-forest" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h2 className="font-semibold truncate">
                        {selectedConversation.other_participant?.full_name ||
                          "Unknown User"}
                      </h2>
                      {selectedConversation.other_participant?.user_type && (
                        <p className="text-xs text-muted-foreground">
                          {selectedConversation.other_participant.user_type
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                        </p>
                      )}
                    </div>
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

                                return (
                                  <MessageBubble
                                    key={message.id}
                                    message={message}
                                    isSent={isSent}
                                    showAvatar={showAvatar}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </ScrollArea>

                  {/* Message Input */}
                  <div className="p-4 border-t border-border">
                    <div className="flex items-end gap-2">
                      <textarea
                        ref={inputRef}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
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
                        disabled={!newMessage.trim() || sendingMessage}
                        className="bg-forest hover:bg-forest/90 text-white h-10"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Press Enter to send, Shift+Enter for new line
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* New Message Modal */}
      <NewMessageModal
        open={isNewMessageModalOpen}
        onOpenChange={setIsNewMessageModalOpen}
        onConversationStarted={handleNewConversation}
        currentUserId={user.id}
      />
    </DashboardLayout>
  );
}
