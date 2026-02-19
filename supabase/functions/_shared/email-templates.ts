/**
 * Email Templates for Buyers Agent Hub
 *
 * All HTML email templates as pure functions returning { subject, html }.
 * Uses table-based layout for email client compatibility.
 * All CSS is inline — no external stylesheets.
 */

import { APP_URL } from './email.ts';

interface EmailTemplate {
  subject: string;
  html: string;
}

// ===========================================
// BASE LAYOUT
// ===========================================

function wrapInLayout(content: string, preheaderText = ''): string {
  const unsubscribeUrl = `${APP_URL}/settings/notifications`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Buyers Agent Hub</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
${preheaderText ? `<div style="display:none;max-height:0;overflow:hidden;">${preheaderText}</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;">
<tr><td align="center" style="padding:24px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
<!-- Header -->
<tr><td style="background:linear-gradient(135deg,#0D9488,#0f766e);border-radius:12px 12px 0 0;padding:24px 32px;text-align:center;">
<h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Buyers Agent Hub</h1>
</td></tr>
<!-- Content -->
<tr><td style="background-color:#ffffff;padding:32px;border-left:1px solid #e4e4e7;border-right:1px solid #e4e4e7;">
${content}
</td></tr>
<!-- Footer -->
<tr><td style="background-color:#fafafa;border-radius:0 0 12px 12px;border:1px solid #e4e4e7;border-top:none;padding:20px 32px;text-align:center;">
<p style="margin:0 0 8px;font-size:13px;color:#71717a;">You're receiving this because of your notification settings.</p>
<a href="${unsubscribeUrl}" style="font-size:13px;color:#0D9488;text-decoration:underline;">Manage email preferences</a>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function ctaButton(text: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
<tr><td style="background-color:#0D9488;border-radius:8px;">
<a href="${url}" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
${text}
</a>
</td></tr>
</table>`;
}

// ===========================================
// MARKETPLACE TEMPLATES
// ===========================================

export function bidReceivedTemplate(data: {
  inspectorName: string;
  propertyAddress: string;
  bidAmount: number;
  jobId?: string;
}): EmailTemplate {
  const viewUrl = `${APP_URL}/inspections/my-jobs?tab=received`;
  const content = `
<h2 style="margin:0 0 16px;font-size:20px;color:#18181b;">New Bid Received</h2>
<p style="margin:0 0 8px;font-size:15px;color:#3f3f46;line-height:1.6;">
<strong>${data.inspectorName}</strong> has submitted a bid for your inspection job.
</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;width:100%;background-color:#f9fafb;border-radius:8px;">
<tr><td style="padding:16px;">
<p style="margin:0 0 4px;font-size:13px;color:#71717a;">Property</p>
<p style="margin:0 0 12px;font-size:15px;color:#18181b;font-weight:600;">${data.propertyAddress}</p>
<p style="margin:0 0 4px;font-size:13px;color:#71717a;">Bid Amount</p>
<p style="margin:0;font-size:15px;color:#18181b;font-weight:600;">$${data.bidAmount.toLocaleString()}</p>
</td></tr>
</table>
${ctaButton('View Bids', viewUrl)}`;

  return {
    subject: `New bid on your inspection job`,
    html: wrapInLayout(content, `${data.inspectorName} bid $${data.bidAmount} for ${data.propertyAddress}`),
  };
}

export function bidAcceptedTemplate(data: {
  propertyAddress: string;
  jobId?: string;
}): EmailTemplate {
  const viewUrl = data.jobId
    ? `${APP_URL}/inspections/spotlights/${data.jobId}`
    : `${APP_URL}/inspections/my-work`;
  const content = `
<h2 style="margin:0 0 16px;font-size:20px;color:#18181b;">Your Bid Was Accepted!</h2>
<p style="margin:0 0 8px;font-size:15px;color:#3f3f46;line-height:1.6;">
Congratulations! You've been selected for the inspection at <strong>${data.propertyAddress}</strong>.
</p>
<p style="margin:0 0 16px;font-size:15px;color:#3f3f46;line-height:1.6;">
You can now begin the inspection. Check the job details for requirements and deadlines.
</p>
${ctaButton('View Job Details', viewUrl)}`;

  return {
    subject: `Your bid was accepted!`,
    html: wrapInLayout(content, `You've been chosen for the ${data.propertyAddress} inspection`),
  };
}

export function bidDeclinedTemplate(data: {
  propertyAddress: string;
}): EmailTemplate {
  const content = `
<h2 style="margin:0 0 16px;font-size:20px;color:#18181b;">Bid Update</h2>
<p style="margin:0 0 8px;font-size:15px;color:#3f3f46;line-height:1.6;">
Another inspector was selected for the inspection at <strong>${data.propertyAddress}</strong>.
</p>
<p style="margin:0 0 16px;font-size:15px;color:#3f3f46;line-height:1.6;">
Don't be discouraged — new jobs are posted regularly. Keep an eye on the Spotlights board for your next opportunity.
</p>
${ctaButton('Browse Jobs', `${APP_URL}/inspections/spotlights`)}`;

  return {
    subject: `Bid update for ${data.propertyAddress}`,
    html: wrapInLayout(content),
  };
}

export function reportSubmittedTemplate(data: {
  propertyAddress: string;
  inspectorName: string;
}): EmailTemplate {
  const viewUrl = `${APP_URL}/inspections/my-jobs?tab=reports`;
  const content = `
<h2 style="margin:0 0 16px;font-size:20px;color:#18181b;">Inspection Report Ready</h2>
<p style="margin:0 0 8px;font-size:15px;color:#3f3f46;line-height:1.6;">
<strong>${data.inspectorName}</strong> has submitted their inspection report for <strong>${data.propertyAddress}</strong>.
</p>
<p style="margin:0 0 16px;font-size:15px;color:#3f3f46;line-height:1.6;">
Review and approve the report to release the escrow payment to the inspector.
</p>
${ctaButton('Review Report', viewUrl)}`;

  return {
    subject: `Inspection report ready for review`,
    html: wrapInLayout(content, `${data.inspectorName} submitted a report for ${data.propertyAddress}`),
  };
}

export function paymentConfirmedTemplate(data: {
  amount: string;
  propertyAddress: string;
  inspectorName?: string;
}): EmailTemplate {
  const content = `
<h2 style="margin:0 0 16px;font-size:20px;color:#18181b;">Payment Confirmed</h2>
<p style="margin:0 0 8px;font-size:15px;color:#3f3f46;line-height:1.6;">
Your payment of <strong>${data.amount}</strong> for the inspection at <strong>${data.propertyAddress}</strong> has been confirmed and is held in escrow.
</p>
${data.inspectorName ? `<p style="margin:0 0 16px;font-size:15px;color:#3f3f46;line-height:1.6;">${data.inspectorName} has been assigned and will begin the inspection soon.</p>` : ''}
${ctaButton('View My Jobs', `${APP_URL}/inspections/my-jobs`)}`;

  return {
    subject: `Payment confirmed — ${data.amount}`,
    html: wrapInLayout(content),
  };
}

export function payoutCompleteTemplate(data: {
  amount: string;
  propertyAddress: string;
}): EmailTemplate {
  const content = `
<h2 style="margin:0 0 16px;font-size:20px;color:#18181b;">Payout on the Way!</h2>
<p style="margin:0 0 8px;font-size:15px;color:#3f3f46;line-height:1.6;">
Your payout of <strong>${data.amount}</strong> for the inspection at <strong>${data.propertyAddress}</strong> has been processed.
</p>
<p style="margin:0 0 16px;font-size:15px;color:#3f3f46;line-height:1.6;">
The funds will appear in your connected bank account within 2-7 business days, depending on your bank.
</p>
${ctaButton('View Earnings', `${APP_URL}/settings/billing`)}`;

  return {
    subject: `Your payout of ${data.amount} is on the way`,
    html: wrapInLayout(content, `${data.amount} payout processed for ${data.propertyAddress}`),
  };
}

export function payoutSetupRequiredTemplate(data: {
  propertyAddress: string;
  jobId?: string;
}): EmailTemplate {
  const setupUrl = data.jobId
    ? `${APP_URL}/settings/payouts?job=${data.jobId}`
    : `${APP_URL}/settings/payouts`;
  const content = `
<h2 style="margin:0 0 16px;font-size:20px;color:#18181b;">Congratulations! Set Up Payouts to Start</h2>
<p style="margin:0 0 8px;font-size:15px;color:#3f3f46;line-height:1.6;">
Your bid for <strong>${data.propertyAddress}</strong> was accepted! To get officially assigned and start work, you need to set up your payout account.
</p>
<p style="margin:0 0 16px;font-size:15px;color:#3f3f46;line-height:1.6;">
This only takes a few minutes and ensures you get paid when your report is approved.
</p>
${ctaButton('Set Up Payouts', setupUrl)}`;

  return {
    subject: `Complete payout setup to start your inspection`,
    html: wrapInLayout(content, `Your bid was accepted — set up payouts for ${data.propertyAddress}`),
  };
}

// ===========================================
// FORUM TEMPLATES
// ===========================================

export function forumReplyTemplate(data: {
  replierName: string;
  postTitle: string;
  postId?: string;
}): EmailTemplate {
  const viewUrl = data.postId
    ? `${APP_URL}/forums/post/${data.postId}`
    : `${APP_URL}/forums`;
  const content = `
<h2 style="margin:0 0 16px;font-size:20px;color:#18181b;">New Reply to Your Post</h2>
<p style="margin:0 0 8px;font-size:15px;color:#3f3f46;line-height:1.6;">
<strong>${data.replierName}</strong> replied to your post: <strong>"${data.postTitle}"</strong>
</p>
${ctaButton('View Reply', viewUrl)}`;

  return {
    subject: `New reply to: ${data.postTitle.substring(0, 60)}`,
    html: wrapInLayout(content, `${data.replierName} replied to "${data.postTitle}"`),
  };
}

export function forumSolutionTemplate(data: {
  postTitle: string;
  postId?: string;
}): EmailTemplate {
  const viewUrl = data.postId
    ? `${APP_URL}/forums/post/${data.postId}`
    : `${APP_URL}/forums`;
  const content = `
<h2 style="margin:0 0 16px;font-size:20px;color:#18181b;">Your Reply Was Marked as the Solution!</h2>
<p style="margin:0 0 8px;font-size:15px;color:#3f3f46;line-height:1.6;">
Your answer to <strong>"${data.postTitle}"</strong> was selected as the best answer. Great job helping the community!
</p>
<p style="margin:0 0 16px;font-size:15px;color:#3f3f46;line-height:1.6;">
You've earned <strong>+10 reputation points</strong> for this contribution.
</p>
${ctaButton('View Post', viewUrl)}`;

  return {
    subject: `Your reply was marked as the solution!`,
    html: wrapInLayout(content, `Your answer to "${data.postTitle}" was chosen as the solution`),
  };
}

export function forumBadgeTemplate(data: {
  badgeName: string;
}): EmailTemplate {
  const content = `
<h2 style="margin:0 0 16px;font-size:20px;color:#18181b;">New Badge Earned!</h2>
<p style="margin:0 0 8px;font-size:15px;color:#3f3f46;line-height:1.6;">
Congratulations! You've earned the <strong>"${data.badgeName}"</strong> badge for your forum contributions.
</p>
<p style="margin:0 0 16px;font-size:15px;color:#3f3f46;line-height:1.6;">
Keep contributing to unlock more achievements!
</p>
${ctaButton('View Forum', `${APP_URL}/forums`)}`;

  return {
    subject: `You earned a badge: ${data.badgeName}`,
    html: wrapInLayout(content, `You earned the "${data.badgeName}" badge`),
  };
}

export function weeklyDigestTemplate(data: {
  userName: string;
  newRepliesCount: number;
  trendingPosts: Array<{ title: string; likes: number; replies: number }>;
  reputation: number;
  likesReceived: number;
}): EmailTemplate {
  const trendingHtml = data.trendingPosts.length > 0
    ? data.trendingPosts.map(p => `
<tr>
<td style="padding:8px 0;border-bottom:1px solid #f4f4f5;">
<p style="margin:0;font-size:14px;color:#18181b;font-weight:500;">${p.title}</p>
<p style="margin:2px 0 0;font-size:12px;color:#71717a;">${p.likes} likes &middot; ${p.replies} replies</p>
</td>
</tr>`).join('')
    : '<tr><td style="padding:8px 0;font-size:14px;color:#71717a;">No trending posts this week.</td></tr>';

  const content = `
<h2 style="margin:0 0 16px;font-size:20px;color:#18181b;">Your Weekly Forum Digest</h2>
<p style="margin:0 0 16px;font-size:15px;color:#3f3f46;line-height:1.6;">
Hi ${data.userName}, here's what happened in the community this week.
</p>

${data.newRepliesCount > 0 ? `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;width:100%;background-color:#ecfdf5;border-radius:8px;">
<tr><td style="padding:16px;">
<p style="margin:0;font-size:15px;color:#065f46;font-weight:600;">${data.newRepliesCount} new ${data.newRepliesCount === 1 ? 'reply' : 'replies'} to your posts</p>
</td></tr>
</table>` : ''}

<h3 style="margin:0 0 8px;font-size:16px;color:#18181b;">Trending This Week</h3>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;width:100%;">
${trendingHtml}
</table>

<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;width:100%;background-color:#f9fafb;border-radius:8px;">
<tr><td style="padding:16px;">
<p style="margin:0 0 4px;font-size:13px;color:#71717a;">Your Stats</p>
<p style="margin:0;font-size:15px;color:#18181b;"><strong>${data.reputation}</strong> reputation &middot; <strong>${data.likesReceived}</strong> likes received</p>
</td></tr>
</table>

${ctaButton('Visit the Forum', `${APP_URL}/forums`)}`;

  return {
    subject: `Your Weekly Forum Digest — ${data.newRepliesCount} new ${data.newRepliesCount === 1 ? 'reply' : 'replies'}`,
    html: wrapInLayout(content, `${data.newRepliesCount} new replies, trending posts, and more`),
  };
}

export function userApprovedTemplate(): EmailTemplate {
  const content = `
<h2 style="margin:0 0 16px;font-size:20px;color:#18181b;">Welcome to the Network!</h2>
<p style="margin:0 0 8px;font-size:15px;color:#3f3f46;line-height:1.6;">
Your professional account has been approved. You now have full access to:
</p>
<ul style="margin:0 0 16px;padding-left:20px;font-size:15px;color:#3f3f46;line-height:1.8;">
<li>Post and bid on inspection jobs</li>
<li>Message other professionals</li>
<li>Submit properties to the marketplace</li>
<li>Manage client briefs</li>
<li>Participate in the community forum</li>
</ul>
${ctaButton('Go to Dashboard', `${APP_URL}/`)}`;

  return {
    subject: `You're verified — welcome to Buyers Agent Hub!`,
    html: wrapInLayout(content, `Your professional account has been approved`),
  };
}

// ===========================================
// TEMPLATE ROUTER
// ===========================================

/**
 * Maps notification type to the appropriate template function.
 * Returns null for types that don't have email templates.
 */
export function getTemplateForType(
  type: string,
  data: Record<string, unknown>
): EmailTemplate | null {
  switch (type) {
    case 'bid_received':
      return bidReceivedTemplate({
        inspectorName: String(data.inspectorName || 'An inspector'),
        propertyAddress: String(data.propertyAddress || 'a property'),
        bidAmount: Number(data.bidAmount || 0),
        jobId: data.jobId as string | undefined,
      });

    case 'bid_accepted':
      return bidAcceptedTemplate({
        propertyAddress: String(data.propertyAddress || 'a property'),
        jobId: data.jobId as string | undefined,
      });

    case 'bid_declined':
      return bidDeclinedTemplate({
        propertyAddress: String(data.propertyAddress || 'a property'),
      });

    case 'report_submitted':
      return reportSubmittedTemplate({
        propertyAddress: String(data.propertyAddress || 'a property'),
        inspectorName: String(data.inspectorName || 'The inspector'),
      });

    case 'payment_confirmed':
      return paymentConfirmedTemplate({
        amount: String(data.amount || ''),
        propertyAddress: String(data.propertyAddress || 'a property'),
        inspectorName: data.inspectorName as string | undefined,
      });

    case 'payment_released':
      return payoutCompleteTemplate({
        amount: String(data.amount || ''),
        propertyAddress: String(data.propertyAddress || 'a property'),
      });

    case 'payout_setup_required':
      return payoutSetupRequiredTemplate({
        propertyAddress: String(data.propertyAddress || 'a property'),
        jobId: data.jobId as string | undefined,
      });

    case 'forum_reply':
    case 'forum_follow_reply':
      return forumReplyTemplate({
        replierName: String(data.replierName || 'Someone'),
        postTitle: String(data.postTitle || 'a post'),
        postId: data.postId as string | undefined,
      });

    case 'forum_solution':
      return forumSolutionTemplate({
        postTitle: String(data.postTitle || 'a post'),
        postId: data.postId as string | undefined,
      });

    case 'forum_badge_earned':
    case 'badge_earned':
      return forumBadgeTemplate({
        badgeName: String(data.badgeName || 'Achievement'),
      });

    case 'user_approved':
      return userApprovedTemplate();

    case 'weekly_digest':
      return weeklyDigestTemplate({
        userName: String(data.userName || 'User'),
        newRepliesCount: Number(data.newRepliesCount || 0),
        trendingPosts: (data.trendingPosts as Array<{ title: string; likes: number; replies: number }>) || [],
        reputation: Number(data.reputation || 0),
        likesReceived: Number(data.likesReceived || 0),
      });

    default:
      return null;
  }
}
