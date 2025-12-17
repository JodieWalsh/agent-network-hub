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

const colorMap = {
  message: "bg-blue-100 text-blue-600",
  property: "bg-emerald-100 text-emerald-600",
  connection: "bg-purple-100 text-purple-600",
  review: "bg-amber-100 text-amber-600",
  brief: "bg-rose-100 text-rose-600",
};

export function RecentActivity() {
  return (
    <div className="card-elegant p-6 opacity-0 animate-fade-in" style={{ animationDelay: "400ms" }}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-serif font-semibold text-foreground">
          Recent Activity
        </h2>
        <button className="text-sm text-primary hover:text-primary/80 font-medium transition-colors">
          View All
        </button>
      </div>

      <div className="space-y-4">
        {activityData.map((item, index) => {
          const Icon = iconMap[item.type];
          return (
            <div
              key={item.id}
              className={cn(
                "flex items-start gap-4 p-3 rounded-lg transition-all duration-200 cursor-pointer",
                "hover:bg-muted/50",
                item.unread && "bg-rose-gold/5"
              )}
              style={{ animationDelay: `${500 + index * 50}ms` }}
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                  colorMap[item.type]
                )}
              >
                <Icon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p
                    className={cn(
                      "text-sm font-medium text-foreground truncate",
                      item.unread && "font-semibold"
                    )}
                  >
                    {item.title}
                  </p>
                  {item.unread && (
                    <span className="w-2 h-2 rounded-full bg-rose-gold flex-shrink-0 mt-1.5" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate mt-0.5">
                  {item.description}
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
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
