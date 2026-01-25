import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, User, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { searchUsers, getOrCreateConversation, type Participant } from "@/lib/messaging";

// User type labels for display
const userTypeLabels: Record<string, string> = {
  buyers_agent: "Buyers Agent",
  real_estate_agent: "Real Estate Agent",
  conveyancer: "Conveyancer",
  mortgage_broker: "Mortgage Broker",
  stylist: "Stylist",
  building_inspector: "Building Inspector",
};

interface NewMessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConversationStarted: (conversationId: string) => void;
  currentUserId: string;
}

function UserSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3">
      <Skeleton className="w-10 h-10 rounded-full" />
      <div className="flex-1">
        <Skeleton className="h-4 w-32 mb-1" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

export function NewMessageModal({
  open,
  onOpenChange,
  onConversationStarted,
  currentUserId,
}: NewMessageModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Participant[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isStartingConversation, setIsStartingConversation] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Debounced search
  const performSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchUsers(query, currentUserId);
      setSearchResults(results);
    } catch (error) {
      console.error("Error searching users:", error);
      toast.error("Failed to search users");
    } finally {
      setIsSearching(false);
    }
  }, [currentUserId]);

  // Debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, performSearch]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setSearchResults([]);
      setSelectedUserId(null);
    }
  }, [open]);

  // Handle user selection
  const handleUserSelect = async (userId: string) => {
    setSelectedUserId(userId);
    setIsStartingConversation(true);

    try {
      const conversationId = await getOrCreateConversation(currentUserId, userId);
      onConversationStarted(conversationId);
    } catch (error) {
      console.error("Error starting conversation:", error);
      toast.error("Failed to start conversation");
    } finally {
      setIsStartingConversation(false);
      setSelectedUserId(null);
    }
  };

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-forest" />
            New Message
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search for a user..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>

          {/* Search Results */}
          <ScrollArea className="h-64">
            {isSearching ? (
              <div className="space-y-1">
                <UserSkeleton />
                <UserSkeleton />
                <UserSkeleton />
              </div>
            ) : searchQuery.length < 2 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <Search className="w-10 h-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Type at least 2 characters to search
                </p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <User className="w-10 h-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No users found matching "{searchQuery}"
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleUserSelect(user.id)}
                    disabled={isStartingConversation}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left",
                      "hover:bg-muted/50",
                      selectedUserId === user.id && isStartingConversation
                        ? "bg-forest/10"
                        : ""
                    )}
                  >
                    {/* Avatar */}
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.full_name || "User"}
                        className="w-10 h-10 rounded-full object-cover border border-border"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-forest/10 flex items-center justify-center border border-border">
                        <span className="text-sm font-medium text-forest">
                          {getInitials(user.full_name)}
                        </span>
                      </div>
                    )}

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {user.full_name || "Unknown User"}
                      </p>
                      {user.user_type && (
                        <p className="text-xs text-muted-foreground">
                          {userTypeLabels[user.user_type] || user.user_type}
                        </p>
                      )}
                    </div>

                    {/* Loading indicator for selected user */}
                    {selectedUserId === user.id && isStartingConversation && (
                      <div className="w-5 h-5 border-2 border-forest border-t-transparent rounded-full animate-spin" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Help text */}
          <p className="text-xs text-muted-foreground text-center">
            Select a user to start a conversation
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
