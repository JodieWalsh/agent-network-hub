/**
 * NotificationBell Component
 *
 * Bell icon with unread count badge and dropdown panel
 * showing recent notifications.
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Bell,
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
  Check,
  MessageSquare,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Notification,
  NotificationType,
  fetchNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  getNotificationColor,
  getNotificationLink,
  formatNotificationTime,
} from '@/lib/notifications';

// Icon mapping
const NOTIFICATION_ICONS: Record<NotificationType, React.ElementType> = {
  bid_received: Sparkles,
  bid_accepted: CheckCircle,
  bid_declined: XCircle,
  bid_edited: Edit,
  job_assigned: Briefcase,
  report_submitted: FileText,
  report_approved: CheckCircle,
  payment_released: DollarSign,
  payment_refunded: RefreshCw,
  review_received: Star,
  badge_earned: Award,
  job_expired: Clock,
  job_cancelled: XCircle,
  new_message: MessageSquare,
};

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch unread count on mount and periodically
  useEffect(() => {
    if (!user) return;

    const fetchCount = async () => {
      const count = await getUnreadCount();
      setUnreadCount(count);
    };

    fetchCount();

    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchCount, 30000);

    return () => clearInterval(interval);
  }, [user]);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen && user) {
      setLoading(true);
      fetchNotifications(10).then((data) => {
        setNotifications(data);
        setLoading(false);
      });
    }
  }, [isOpen, user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      await markAsRead(notification.id);
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
      );
    }

    // Navigate to relevant page
    const link = getNotificationLink(notification);
    setIsOpen(false);
    navigate(link);
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'relative p-2 rounded-lg transition-colors',
          isOpen
            ? 'bg-forest/10 text-forest'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
        aria-label="Notifications"
      >
        <Bell size={20} />

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-xs font-semibold bg-red-500 text-white rounded-full px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="fixed left-64 bottom-16 w-80 sm:w-96 bg-card border border-border rounded-lg shadow-lg z-[100] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <h3 className="font-semibold text-foreground">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-muted-foreground hover:text-forest flex items-center gap-1"
              >
                <Check size={12} />
                Mark all read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-forest border-t-transparent rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                <Bell className="h-10 w-10 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No notifications yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  We'll notify you when something happens
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifications.map((notification) => {
                  const Icon = NOTIFICATION_ICONS[notification.type] || Bell;
                  const colorClasses = getNotificationColor(notification.type);

                  return (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={cn(
                        'w-full flex items-start gap-3 p-4 text-left transition-colors hover:bg-muted/50',
                        !notification.read && 'bg-forest/5'
                      )}
                    >
                      {/* Icon */}
                      <div
                        className={cn(
                          'flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center',
                          colorClasses
                        )}
                      >
                        <Icon size={16} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={cn(
                              'text-sm font-medium truncate',
                              !notification.read ? 'text-foreground' : 'text-muted-foreground'
                            )}
                          >
                            {notification.title}
                          </p>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {formatNotificationTime(notification.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                          {notification.message}
                        </p>
                      </div>

                      {/* Unread indicator */}
                      {!notification.read && (
                        <div className="flex-shrink-0 w-2 h-2 rounded-full bg-forest mt-2" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-border px-4 py-2 bg-muted/30">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setIsOpen(false);
                  // Future: navigate to full notifications page
                  // navigate('/notifications');
                }}
              >
                See all notifications
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
