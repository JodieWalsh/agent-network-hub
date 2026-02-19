/**
 * Activity Page
 *
 * Full paginated list of all notifications with filtering options.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Check,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Notification,
  NotificationType,
  fetchNotifications,
  markAsRead,
  markAllAsRead,
  getNotificationLink,
  formatNotificationTime,
  getUnreadCount,
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

// Filter categories
const FILTER_OPTIONS = [
  { id: 'all', label: 'All', types: null },
  { id: 'bids', label: 'Bids', types: ['bid_received', 'bid_accepted', 'bid_declined', 'bid_edited'] },
  { id: 'jobs', label: 'Jobs', types: ['job_assigned', 'job_expired', 'job_cancelled'] },
  { id: 'reports', label: 'Reports', types: ['report_submitted'] },
  { id: 'payments', label: 'Payments', types: ['payment_released'] },
  { id: 'reviews', label: 'Reviews', types: ['review_received'] },
  { id: 'badges', label: 'Badges', types: ['badge_earned'] },
];

export default function Activity() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        const [notifs, count] = await Promise.all([
          fetchNotifications(50), // Get last 50
          getUnreadCount(),
        ]);
        setNotifications(notifs);
        setUnreadCount(count);
      } catch (error) {
        console.error('Failed to load notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.read) {
      await markAsRead(notification.id);
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    // Navigate to relevant page
    const link = getNotificationLink(notification);
    navigate(link);
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  // Filter notifications
  const filteredNotifications = notifications.filter(notification => {
    const filter = FILTER_OPTIONS.find(f => f.id === activeFilter);
    if (!filter || !filter.types) return true;
    return filter.types.includes(notification.type);
  });

  // Loading state
  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-2 border-forest border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-muted-foreground">Loading activity...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Bell className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Sign in to view activity</h2>
            <p className="text-muted-foreground mb-4">
              Your notifications and activity will appear here
            </p>
            <Button onClick={() => navigate('/auth')}>Sign In</Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-serif font-semibold text-foreground">Activity</h1>
            <p className="text-muted-foreground">
              {unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
                : 'All caught up!'
              }
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              className="gap-2"
            >
              <Check size={14} />
              Mark all read
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          <Filter size={14} className="text-muted-foreground flex-shrink-0" />
          {FILTER_OPTIONS.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap",
                activeFilter === filter.id
                  ? "bg-forest text-white"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Bell className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium mb-2">No notifications</h3>
            <p className="text-muted-foreground">
              {activeFilter === 'all'
                ? "You don't have any notifications yet"
                : `No ${FILTER_OPTIONS.find(f => f.id === activeFilter)?.label.toLowerCase()} notifications`
              }
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredNotifications.map((notification) => {
              const Icon = NOTIFICATION_ICONS[notification.type] || Bell;
              const colorClasses = NOTIFICATION_COLORS[notification.type] || 'text-gray-600 bg-gray-100';

              return (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    "w-full flex items-start gap-4 p-4 rounded-lg border transition-all duration-150 text-left",
                    "hover:shadow-sm hover:border-forest/30",
                    !notification.read
                      ? "bg-forest/5 border-forest/20"
                      : "bg-white border-border"
                  )}
                >
                  {/* Icon */}
                  <div className={cn(
                    "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
                    colorClasses
                  )}>
                    <Icon size={18} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm",
                          !notification.read ? "font-semibold text-foreground" : "font-medium text-foreground/80"
                        )}>
                          {notification.title}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!notification.read && (
                          <span className="w-2 h-2 rounded-full bg-forest" />
                        )}
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatNotificationTime(notification.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
