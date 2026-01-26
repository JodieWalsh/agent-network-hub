/**
 * Notification System
 *
 * Multi-channel notification helpers for creating and managing notifications.
 * Currently supports in-app notifications with email support coming soon.
 */

// Helper to get auth headers for raw fetch
const getAuthHeaders = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  let accessToken = supabaseKey;
  try {
    const storageKey = `sb-${import.meta.env.VITE_SUPABASE_PROJECT_ID}-auth-token`;
    const storedSession = localStorage.getItem(storageKey);
    if (storedSession) {
      const parsed = JSON.parse(storedSession);
      accessToken = parsed?.access_token || supabaseKey;
    }
  } catch (e) {}

  return { supabaseUrl, supabaseKey, accessToken };
};

// ===========================================
// TYPES
// ===========================================

export type NotificationType =
  | 'bid_received'
  | 'bid_accepted'
  | 'bid_declined'
  | 'bid_edited'
  | 'job_assigned'
  | 'report_submitted'
  | 'report_approved'
  | 'payment_released'
  | 'payment_refunded'
  | 'review_received'
  | 'badge_earned'
  | 'job_expired'
  | 'job_cancelled'
  | 'new_message';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  job_id: string | null;
  bid_id: string | null;
  from_user_id: string | null;
  conversation_id: string | null;
  delivered_in_app: boolean;
  delivered_email: boolean;
  delivered_push: boolean;
  read: boolean;
  read_at: string | null;
  created_at: string;
  // Joined data
  from_user?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  // Email
  email_enabled: boolean;
  email_bid_received: boolean;
  email_bid_accepted: boolean;
  email_bid_declined: boolean;
  email_report_submitted: boolean;
  email_payment_released: boolean;
  email_review_received: boolean;
  email_badge_earned: boolean;
  email_weekly_digest: boolean;
  // Push (future)
  push_enabled: boolean;
  push_bid_received: boolean;
  push_bid_accepted: boolean;
  push_bid_declined: boolean;
  push_report_submitted: boolean;
  push_payment_released: boolean;
  push_review_received: boolean;
  push_badge_earned: boolean;
  push_subscription: object | null;
  push_device_tokens: object[];
  // SMS (future)
  sms_enabled: boolean;
  sms_phone_number: string | null;
  sms_bid_accepted: boolean;
  sms_payment_released: boolean;
  // Quiet hours
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  jobId?: string;
  bidId?: string;
  fromUserId?: string;
  conversationId?: string;
}

// ===========================================
// CORE FUNCTIONS
// ===========================================

/**
 * Create a notification and trigger delivery channels
 */
export async function createNotification(params: CreateNotificationParams): Promise<{ success: boolean; error?: string }> {
  const { supabaseUrl, supabaseKey, accessToken } = getAuthHeaders();

  try {
    // 1. Insert notification record
    const notificationData = {
      user_id: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      job_id: params.jobId || null,
      bid_id: params.bidId || null,
      from_user_id: params.fromUserId || null,
      conversation_id: params.conversationId || null,
      delivered_in_app: true,
      delivered_email: false, // Will be set when email is sent
      delivered_push: false,
      read: false,
    };

    const response = await fetch(`${supabaseUrl}/rest/v1/notifications`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(notificationData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Notifications] Failed to create notification:', errorText);
      return { success: false, error: errorText };
    }

    console.log('[Notifications] Successfully created notification:', {
      type: params.type,
      userId: params.userId,
      title: params.title,
    });

    // 2. Check user's preferences and send email if enabled
    // TODO: Implement email sending via Resend or similar
    // For now, we just create the in-app notification

    return { success: true };
  } catch (error) {
    console.error('Error creating notification:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Fetch notifications for the current user
 */
export async function fetchNotifications(limit = 20, unreadOnly = false): Promise<Notification[]> {
  const { supabaseUrl, supabaseKey, accessToken } = getAuthHeaders();

  try {
    // Note: Using left join syntax to handle null from_user_id
    let url = `${supabaseUrl}/rest/v1/notifications?select=*&order=created_at.desc&limit=${limit}`;

    if (unreadOnly) {
      url += '&read=eq.false';
    }

    const response = await fetch(url, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      console.error('[Notifications] Failed to fetch notifications:', response.status);
      return [];
    }

    const data = await response.json();
    console.log('[Notifications] Fetched notifications:', data.length, 'items');
    return data;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(): Promise<number> {
  const { supabaseUrl, supabaseKey, accessToken } = getAuthHeaders();

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/notifications?select=id&read=eq.false`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${accessToken}`,
          'Prefer': 'count=exact',
        },
      }
    );

    if (!response.ok) {
      return 0;
    }

    const countHeader = response.headers.get('content-range');
    if (countHeader) {
      const match = countHeader.match(/\/(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    }

    const data = await response.json();
    return Array.isArray(data) ? data.length : 0;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
}

/**
 * Mark a notification as read
 */
export async function markAsRead(notificationId: string): Promise<boolean> {
  const { supabaseUrl, supabaseKey, accessToken } = getAuthHeaders();

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/notifications?id=eq.${notificationId}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          read: true,
          read_at: new Date().toISOString(),
        }),
      }
    );

    return response.ok;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(): Promise<boolean> {
  const { supabaseUrl, supabaseKey, accessToken } = getAuthHeaders();

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/notifications?read=eq.false`,
      {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          read: true,
          read_at: new Date().toISOString(),
        }),
      }
    );

    return response.ok;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return false;
  }
}

// ===========================================
// NOTIFICATION PREFERENCES
// ===========================================

/**
 * Fetch user's notification preferences
 */
export async function fetchNotificationPreferences(userId: string): Promise<NotificationPreferences | null> {
  const { supabaseUrl, supabaseKey, accessToken } = getAuthHeaders();

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/notification_preferences?user_id=eq.${userId}`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.pgrst.object+json',
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    return null;
  }
}

/**
 * Create default notification preferences for a new user
 */
export async function createDefaultPreferences(userId: string): Promise<boolean> {
  const { supabaseUrl, supabaseKey, accessToken } = getAuthHeaders();

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/notification_preferences`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        user_id: userId,
        // Defaults are set in database, so just need user_id
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Error creating notification preferences:', error);
    return false;
  }
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(
  userId: string,
  updates: Partial<NotificationPreferences>
): Promise<boolean> {
  const { supabaseUrl, supabaseKey, accessToken } = getAuthHeaders();

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/notification_preferences?user_id=eq.${userId}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          ...updates,
          updated_at: new Date().toISOString(),
        }),
      }
    );

    return response.ok;
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return false;
  }
}

// ===========================================
// THEATRICAL NOTIFICATION HELPERS
// ===========================================

/**
 * Notify job creator when a new bid is received
 */
export async function notifyBidReceived(
  jobCreatorId: string,
  inspectorName: string,
  propertyAddress: string,
  bidAmount: number,
  jobId: string,
  bidId: string,
  inspectorId: string
) {
  return createNotification({
    userId: jobCreatorId,
    type: 'bid_received',
    title: 'New Interest!',
    message: `${inspectorName} wants to inspect ${propertyAddress} for $${bidAmount.toLocaleString()}`,
    jobId,
    bidId,
    fromUserId: inspectorId,
  });
}

/**
 * Notify inspector when their bid is accepted
 */
export async function notifyBidAccepted(
  inspectorId: string,
  propertyAddress: string,
  jobId: string,
  bidId: string,
  jobCreatorId: string
) {
  return createNotification({
    userId: inspectorId,
    type: 'bid_accepted',
    title: "You've got the gig!",
    message: `You've been chosen for the ${propertyAddress} inspection. Time to shine!`,
    jobId,
    bidId,
    fromUserId: jobCreatorId,
  });
}

/**
 * Notify inspector when their bid is declined
 */
export async function notifyBidDeclined(
  inspectorId: string,
  propertyAddress: string,
  jobId: string,
  bidId: string
) {
  return createNotification({
    userId: inspectorId,
    type: 'bid_declined',
    title: 'Bid Update',
    message: `Your bid for ${propertyAddress} wasn't selected this time. Keep going!`,
    jobId,
    bidId,
  });
}

/**
 * Notify inspector when their bid is edited (by job creator viewing history)
 */
export async function notifyBidEdited(
  jobCreatorId: string,
  inspectorName: string,
  propertyAddress: string,
  jobId: string,
  bidId: string,
  inspectorId: string
) {
  return createNotification({
    userId: jobCreatorId,
    type: 'bid_edited',
    title: 'Bid Updated',
    message: `${inspectorName} has updated their bid for ${propertyAddress}`,
    jobId,
    bidId,
    fromUserId: inspectorId,
  });
}

/**
 * Notify when a job is assigned
 */
export async function notifyJobAssigned(
  inspectorId: string,
  propertyAddress: string,
  jobId: string,
  jobCreatorId: string
) {
  return createNotification({
    userId: inspectorId,
    type: 'job_assigned',
    title: 'Job Confirmed!',
    message: `The ${propertyAddress} inspection is officially yours. Check the details and get ready!`,
    jobId,
    fromUserId: jobCreatorId,
  });
}

/**
 * Notify job creator when inspection report is submitted
 */
export async function notifyReportSubmitted(
  jobCreatorId: string,
  propertyAddress: string,
  jobId: string,
  inspectorId: string
) {
  return createNotification({
    userId: jobCreatorId,
    type: 'report_submitted',
    title: 'Report Ready!',
    message: `Your inspector has submitted findings for ${propertyAddress}. Approve to release escrow payment.`,
    jobId,
    fromUserId: inspectorId,
  });
}

/**
 * Notify inspector when their report is approved
 */
export async function notifyReportApproved(
  inspectorId: string,
  propertyAddress: string,
  jobId: string,
  jobCreatorId: string
) {
  return createNotification({
    userId: inspectorId,
    type: 'report_approved',
    title: 'Report Approved!',
    message: `Your report for ${propertyAddress} has been approved. Great job!`,
    jobId,
    fromUserId: jobCreatorId,
  });
}

/**
 * Notify inspector when payment is released from escrow
 */
export async function notifyPaymentReleased(
  inspectorId: string,
  amount: number,
  propertyAddress: string,
  jobId: string
) {
  return createNotification({
    userId: inspectorId,
    type: 'payment_released',
    title: 'Ka-ching!',
    message: `$${amount.toLocaleString()} released from escrow for ${propertyAddress}. Great work!`,
    jobId,
  });
}

/**
 * Notify job poster when their escrow payment is refunded
 */
export async function notifyPaymentRefunded(
  jobPosterId: string,
  amount: number,
  propertyAddress: string,
  jobId: string,
  reason: 'cancelled' | 'expired' | 'no_bids'
) {
  const reasonMessages = {
    cancelled: 'Your payment has been refunded because you cancelled the job.',
    expired: 'Your payment has been refunded because the job expired without an inspector.',
    no_bids: 'Your payment has been refunded because no bids were received.',
  };

  return createNotification({
    userId: jobPosterId,
    type: 'payment_refunded',
    title: 'Refund Processed',
    message: `$${amount.toLocaleString()} refunded for ${propertyAddress}. ${reasonMessages[reason]}`,
    jobId,
  });
}

/**
 * Notify user when they receive a review
 */
export async function notifyReviewReceived(
  revieweeId: string,
  reviewerName: string,
  rating: number,
  comment: string,
  jobId: string,
  reviewerId: string
) {
  const commentPreview = comment.length > 50 ? comment.substring(0, 50) + '...' : comment;
  return createNotification({
    userId: revieweeId,
    type: 'review_received',
    title: `${rating}-Star Review!`,
    message: `${reviewerName} says: "${commentPreview}"`,
    jobId,
    fromUserId: reviewerId,
  });
}

/**
 * Notify user when they earn a badge
 */
export async function notifyBadgeEarned(userId: string, badgeName: string) {
  return createNotification({
    userId,
    type: 'badge_earned',
    title: 'Achievement Unlocked!',
    message: `You've earned the "${badgeName}" badge!`,
  });
}

/**
 * Notify job creator when their job expires
 */
export async function notifyJobExpired(
  jobCreatorId: string,
  propertyAddress: string,
  jobId: string,
  wasPaymentRefunded: boolean = false
) {
  const message = wasPaymentRefunded
    ? `Your inspection request for ${propertyAddress} has expired. Your escrowed payment will be refunded.`
    : `Your inspection request for ${propertyAddress} has expired. You can repost it anytime.`;

  return createNotification({
    userId: jobCreatorId,
    type: 'job_expired',
    title: 'Job Expired',
    message,
    jobId,
  });
}

/**
 * Notify inspector when a job they bid on is cancelled
 */
export async function notifyJobCancelled(
  inspectorId: string,
  propertyAddress: string,
  jobId: string,
  bidId: string
) {
  return createNotification({
    userId: inspectorId,
    type: 'job_cancelled',
    title: 'Job Cancelled',
    message: `The inspection request for ${propertyAddress} has been cancelled by the requester.`,
    jobId,
    bidId,
  });
}

/**
 * Notify user when they receive a new message
 */
export async function notifyNewMessage(
  recipientId: string,
  senderName: string,
  messagePreview: string,
  conversationId: string,
  senderId: string
) {
  const preview = messagePreview.length > 60
    ? messagePreview.substring(0, 60) + '...'
    : messagePreview;

  return createNotification({
    userId: recipientId,
    type: 'new_message',
    title: `${senderName} sent you a message`,
    message: preview,
    fromUserId: senderId,
    conversationId,
  });
}

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

/**
 * Get icon name for notification type
 */
export function getNotificationIcon(type: NotificationType): string {
  const icons: Record<NotificationType, string> = {
    bid_received: 'Sparkles',
    bid_accepted: 'CheckCircle',
    bid_declined: 'XCircle',
    bid_edited: 'Edit',
    job_assigned: 'Briefcase',
    report_submitted: 'FileText',
    report_approved: 'CheckCircle2',
    payment_released: 'DollarSign',
    payment_refunded: 'RefreshCw',
    review_received: 'Star',
    badge_earned: 'Award',
    job_expired: 'Clock',
    job_cancelled: 'XCircle',
    new_message: 'MessageSquare',
  };
  return icons[type] || 'Bell';
}

/**
 * Get color for notification type
 */
export function getNotificationColor(type: NotificationType): string {
  const colors: Record<NotificationType, string> = {
    bid_received: 'text-blue-600 bg-blue-50',
    bid_accepted: 'text-green-600 bg-green-50',
    bid_declined: 'text-red-600 bg-red-50',
    bid_edited: 'text-amber-600 bg-amber-50',
    job_assigned: 'text-purple-600 bg-purple-50',
    report_submitted: 'text-indigo-600 bg-indigo-50',
    report_approved: 'text-emerald-600 bg-emerald-50',
    payment_released: 'text-green-600 bg-green-50',
    payment_refunded: 'text-blue-600 bg-blue-50',
    review_received: 'text-yellow-600 bg-yellow-50',
    badge_earned: 'text-pink-600 bg-pink-50',
    job_expired: 'text-gray-600 bg-gray-50',
    job_cancelled: 'text-red-600 bg-red-50',
    new_message: 'text-forest bg-forest/10',
  };
  return colors[type] || 'text-gray-600 bg-gray-50';
}

/**
 * Get link for notification (where to navigate when clicked)
 */
export function getNotificationLink(notification: Notification): string {
  // Route based on notification type
  switch (notification.type) {
    case 'new_message':
      // Go to the messages page with the conversation selected
      if (notification.conversation_id) {
        return `/messages?conversation=${notification.conversation_id}`;
      }
      return '/messages';

    case 'bid_received':
      // Job poster sees bids received - go to My Jobs "Bids Received" tab
      return '/inspections/my-jobs?tab=received';

    case 'bid_accepted':
    case 'bid_declined':
    case 'job_assigned':
    case 'report_approved':
      // Inspector notifications - go to the job spotlight
      if (notification.job_id) {
        return `/inspections/spotlights/${notification.job_id}`;
      }
      return '/inspections/spotlights';

    case 'report_submitted':
      // Job poster sees report - go to My Jobs "Reports Ready" tab
      return '/inspections/my-jobs?tab=reports';

    case 'job_expired':
    case 'job_cancelled':
      // Go to completed/cancelled jobs
      return '/inspections/my-jobs?tab=cancelled';

    default:
      // Default: go to job spotlight if job_id exists
      if (notification.job_id) {
        return `/inspections/spotlights/${notification.job_id}`;
      }
      return '/';
  }
}

/**
 * Format notification time (e.g., "2 hours ago")
 */
export function formatNotificationTime(createdAt: string): string {
  const now = new Date();
  const created = new Date(createdAt);
  const diffMs = now.getTime() - created.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return created.toLocaleDateString('en-AU', {
    month: 'short',
    day: 'numeric',
  });
}
