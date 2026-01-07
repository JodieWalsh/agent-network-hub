import {
  MessageSquare,
  Building2,
  UserPlus,
  Star,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ActivityItem {
  id: string;
  type: "message" | "property" | "connection" | "review" | "brief";
  title: string;
  description: string;
  time: string;
  unread?: boolean;
}

const activityData: ActivityItem[] = [
  {
    id: "1",
    type: "message",
    title: "New message from John Doe",
    description: "Regarding the Bondi property inspection request",
    time: "5 min ago",
    unread: true,
  },
  {
    id: "2",
    type: "property",
    title: "New property matching your client profile",
    description: "4BR House in Sydney's Northern Beaches - $2.1M",
    time: "1 hour ago",
    unread: true,
  },
  {
    id: "3",
    type: "connection",
    title: "Emma Wilson accepted your connection",
    description: "Conveyancer • Sydney CBD",
    time: "2 hours ago",
  },
  {
    id: "4",
    type: "review",
    title: "You received a 5-star review",
    description: "From Michael Chen for the Mosman inspection",
    time: "Yesterday",
  },
  {
    id: "5",
    type: "brief",
    title: "Client brief updated",
    description: "The Thompson Family brief has new requirements",
    time: "Yesterday",
  },
];

const iconMap = {
  message: MessageSquare,
  property: Building2,
  connection: UserPlus,
  review: Star,
  brief: FileText,
};

export function RecentActivity() {
  return (
    <div className="p-6 rounded-md border border-border bg-white">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-semibold text-foreground">
          Recent Activity
        </h2>
        <button className="text-xs text-forest hover:text-forest/80 font-medium transition-colors">
          View All
        </button>
      </div>

      <div className="space-y-3">
        {activityData.map((item) => {
          const Icon = iconMap[item.type];
          return (
            <div
              key={item.id}
              className={cn(
                "flex items-start gap-3 p-2.5 rounded-md transition-colors duration-150 cursor-pointer",
                "hover:bg-muted/30"
              )}
            >
              <Icon size={14} className="text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-medium text-foreground truncate">
                    {item.title}
                  </p>
                  {item.unread && (
                    <span className="w-1.5 h-1.5 rounded-full bg-forest flex-shrink-0 mt-1" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {item.description}
                </p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">
                  {item.time}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
