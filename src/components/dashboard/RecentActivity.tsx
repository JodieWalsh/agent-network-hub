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
  MessageSquare,
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

// Color classes for notification types
const NOTIFICATION_COLORS: Record<NotificationType, string> = {
  bid_received: 'text-blue-600 bg-blue-50',
  bid_accepted: 'text-green-600 bg-green-50',
  bid_declined: 'text-amber-600 bg-amber-50',
  bid_edited: 'text-purple-600 bg-purple-50',
  job_assigned: 'text-forest bg-forest/10',
  report_submitted: 'text-emerald-600 bg-emerald-50',
  payment_released: 'text-green-600 bg-green-50',
  review_received: 'text-amber-500 bg-amber-50',
  badge_earned: 'text-purple-600 bg-purple-50',
  job_expired: 'text-gray-600 bg-gray-100',
  job_cancelled: 'text-red-600 bg-red-50',
};

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
      <div className="p-6 rounded-md border border-border bg-white">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-foreground">
            Recent Activity
          </h2>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-3 p-2.5 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-muted" />
              <div className="flex-1">
                <div className="h-3 bg-muted rounded w-3/4 mb-2" />
                <div className="h-2 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Not logged in state
  if (!user) {
    return (
      <div className="p-6 rounded-md border border-border bg-white">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-foreground">
            Recent Activity
          </h2>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Bell className="h-8 w-8 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">
            Sign in to see your activity
          </p>
        </div>
      </div>
    );
  }

  // Empty state
  if (notifications.length === 0) {
    return (
      <div className="p-6 rounded-md border border-border bg-white">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-foreground">
            Recent Activity
          </h2>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Bell className="h-8 w-8 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">
            No activity yet
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Your notifications will appear here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-md border border-border bg-white">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-semibold text-foreground">
          Recent Activity
        </h2>
        <button
          onClick={() => navigate('/activity')}
          className="text-xs text-forest hover:text-forest/80 font-medium transition-colors flex items-center gap-1"
        >
          View All
          <ArrowRight size={12} />
        </button>
      </div>

      <div className="space-y-2">
        {notifications.map((notification) => {
          const Icon = NOTIFICATION_ICONS[notification.type] || Bell;
          const colorClasses = NOTIFICATION_COLORS[notification.type] || 'text-gray-600 bg-gray-100';

          return (
            <button
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={cn(
                "w-full flex items-start gap-3 p-3 rounded-lg transition-colors duration-150 text-left",
                "hover:bg-muted/50",
                !notification.read && "bg-forest/5"
              )}
            >
              {/* Icon */}
              <div className={cn(
                "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                colorClasses
              )}>
                <Icon size={14} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={cn(
                    "text-sm truncate",
                    !notification.read ? "font-medium text-foreground" : "text-muted-foreground"
                  )}>
                    {notification.title}
                  </p>
                  {!notification.read && (
                    <span className="w-2 h-2 rounded-full bg-forest flex-shrink-0 mt-1.5" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                  {notification.message}
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  {formatNotificationTime(notification.created_at)}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
