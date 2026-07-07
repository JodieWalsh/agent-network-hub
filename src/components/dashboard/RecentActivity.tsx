/**
 * RecentActivity Component
 *
 * Displays recent notifications and activity on the Dashboard.
 * Fetches real data from the notifications table.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sparkles,
  CheckCircle,
  XCircle,
  Edit,
  Briefcase,
  FileText,
  DollarSign,
  Star,
  Award,
  Clock,
  Bell,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Notification,
  NotificationType,
  fetchNotifications,
  markAsRead,
  getNotificationLink,
  formatNotificationTime,
} from '@/lib/notifications';

// Icon mapping for notification types
const NOTIFICATION_ICONS: Record<NotificationType, React.ElementType> = {
  bid_received: Sparkles,
  bid_accepted: CheckCircle,
  bid_declined: XCircle,
  bid_edited: Edit,
  job_assigned: Briefcase,
  report_submitted: FileText,
  payment_released: DollarSign,
  review_received: Star,
  badge_earned: Award,
  job_expired: Clock,
  job_cancelled: XCircle,
};

function ActivityShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[24px] border border-[#2D6350]/15 bg-[#FBF8F3] p-7 shadow-[0_6px_24px_rgba(94,70,55,0.07)]">
      {children}
    </div>
  );
}

function ActivityHeader({ onViewAll }: { onViewAll?: () => void }) {
  return (
    <div className="mb-5 flex items-center justify-between">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-[#8F4E58]">
          Recent activity
        </p>
        <h2 className="mt-2 font-serif text-2xl font-semibold text-[#173A31]">
          Activity Snapshot
        </h2>
      </div>
      {onViewAll && (
        <button
          onClick={onViewAll}
          className="flex min-h-[44px] items-center gap-1 px-2 -mx-2 text-xs font-medium text-[#2D6350] transition-colors hover:text-[#B76E79]"
        >
          View All
          <ArrowRight size={12} />
        </button>
      )}
    </div>
  );
}

export function RecentActivity() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const loadNotifications = async () => {
      try {
        const data = await fetchNotifications(5); // Get last 5
        setNotifications(data);
      } catch (error) {
        console.error('Failed to load notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, [user]);

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.read) {
      await markAsRead(notification.id);
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
      );
    }

    // Navigate to relevant page
    const link = getNotificationLink(notification);
    navigate(link);
  };

  // Loading state
  if (loading) {
    return (
      <ActivityShell>
        <ActivityHeader />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex animate-pulse items-start gap-3 p-2.5">
              <div className="h-8 w-8 rounded-full bg-[#2D6350]/10" />
              <div className="flex-1">
                <div className="mb-2 h-3 w-3/4 rounded bg-[#2D6350]/10" />
                <div className="h-2 w-1/2 rounded bg-[#2D6350]/10" />
              </div>
            </div>
          ))}
        </div>
      </ActivityShell>
    );
  }

  // Not logged in state
  if (!user) {
    return (
      <ActivityShell>
        <ActivityHeader />
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Bell className="mb-2 h-8 w-8 text-[#2D6350]/30" />
          <p className="text-sm text-[#1C1917]">
            Sign in to see your activity
          </p>
        </div>
      </ActivityShell>
    );
  }

  // Empty state
  if (notifications.length === 0) {
    return (
      <ActivityShell>
        <ActivityHeader />
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Bell className="mb-2 h-8 w-8 text-[#2D6350]/30" />
          <p className="text-sm text-[#1C1917]">
            No activity yet
          </p>
          <p className="mt-1 text-xs text-[#1C1917]/70">
            Your notifications will appear here
          </p>
        </div>
      </ActivityShell>
    );
  }

  return (
    <ActivityShell>
      <ActivityHeader onViewAll={() => navigate('/activity')} />

      <div className="space-y-1.5">
        {notifications.map((notification) => {
          const Icon = NOTIFICATION_ICONS[notification.type] || Bell;

          return (
            <button
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={cn(
                "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors duration-150",
                "hover:bg-white",
                !notification.read
                  ? "border-[#2D6350]/15 bg-white"
                  : "border-transparent"
              )}
            >
              {/* Icon */}
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-[#2D6350]/12 bg-[#F6F1EA] text-[#2D6350]">
                <Icon size={14} />
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className={cn(
                    "truncate text-sm text-[#1C1917]",
                    !notification.read && "font-semibold"
                  )}>
                    {notification.title}
                  </p>
                  {!notification.read && (
                    <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-[#B76E79]" />
                  )}
                </div>
                <p className="mt-0.5 line-clamp-1 text-xs text-[#1C1917]/70">
                  {notification.message}
                </p>
                <p className="mt-1 text-xs tabular-nums text-[#1C1917]/55">
                  {formatNotificationTime(notification.created_at)}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </ActivityShell>
  );
}
