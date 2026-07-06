/**
 * Waitlist welcome email (Landing-Page Lead Capture, Piece 4).
 *
 * Sent once by geneva-lead-intake when a NEW contact joins the waitlist.
 * Quiet-luxury palette (CLAUDE.md DESIGN VISION): warm ivory #F6F1EA,
 * forest green #2D6350, champagne #D8C3B8, charcoal #1C1917.
 * Table-based layout, all CSS inline; email clients don't reliably load
 * web fonts, so the display heading falls back serif and body falls back
 * sans-serif.
 */

const SERIF = `'Cormorant Garamond', Georgia, 'Times New Roman', serif`;
const SANS = `'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif`;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const WAITLIST_WELCOME_SUBJECT =
  "You're on the list — welcome to Buyers Agent Hub";

export function waitlistWelcomeHtml(firstName: string): string {
  const name = escapeHtml(firstName);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Buyers Agent Hub</title>
</head>
<body style="margin:0;padding:0;background-color:#F6F1EA;font-family:${SANS};">
<div style="display:none;max-height:0;overflow:hidden;">Thank you for joining the waitlist — you'll hear from us as we get closer to launch.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F6F1EA;">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

<!-- Wordmark -->
<tr><td style="padding:0 8px 20px;text-align:center;">
<span style="font-family:${SANS};font-size:13px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:#2D6350;">Buyers Agent Hub</span>
</td></tr>

<!-- Card -->
<tr><td style="background-color:#FFFFFF;border:1px solid #D8C3B8;border-radius:14px;padding:44px 40px;">

<h1 style="margin:0 0 8px;font-family:${SERIF};font-size:34px;line-height:1.2;font-weight:500;color:#2D6350;">You&rsquo;re on the list.</h1>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 26px;"><tr>
<td style="width:56px;border-bottom:2px solid #D8C3B8;font-size:0;line-height:0;">&nbsp;</td>
</tr></table>

<p style="margin:0 0 18px;font-family:${SANS};font-size:16px;line-height:1.7;color:#1C1917;">Hi ${name},</p>

<p style="margin:0 0 18px;font-family:${SANS};font-size:16px;line-height:1.7;color:#1C1917;">Thank you for joining the Buyers Agent Hub waitlist &mdash; we&rsquo;re so glad you&rsquo;re here.</p>

<p style="margin:0 0 18px;font-family:${SANS};font-size:16px;line-height:1.7;color:#1C1917;">We&rsquo;re building a professional home for buyers agents and the specialists they work alongside &mdash; a considered place to connect, collaborate, and grow your practice.</p>

<p style="margin:0 0 18px;font-family:${SANS};font-size:16px;line-height:1.7;color:#1C1917;">There&rsquo;s nothing you need to do for now. As we get closer to launch, you&rsquo;ll hear from us &mdash; and you&rsquo;ll be among the first through the door.</p>

<p style="margin:28px 0 0;font-family:${SANS};font-size:16px;line-height:1.7;color:#1C1917;">Warm regards,<br>
<span style="color:#2D6350;font-weight:600;">The Buyers Agent Hub team</span></p>

</td></tr>

<!-- Footer -->
<tr><td style="padding:22px 24px 0;text-align:center;">
<p style="margin:0;font-family:${SANS};font-size:12px;line-height:1.6;color:#6B6560;">You&rsquo;re receiving this one-time note because you joined the Buyers Agent Hub waitlist.</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}
