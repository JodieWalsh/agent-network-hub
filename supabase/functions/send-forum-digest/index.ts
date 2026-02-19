import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/stripe.ts';
import { getResendClient, FROM_EMAIL, getUserEmail } from '../_shared/email.ts';
import { weeklyDigestTemplate } from '../_shared/email-templates.ts';

/**
 * Forum Digest Email - Edge Function
 *
 * Prepares and sends a weekly/daily forum digest email via Resend.
 *
 * Call with: POST /functions/v1/send-forum-digest
 * Body: { "userId": "uuid" } or { "frequency": "weekly" | "daily" } for batch
 */

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { userId, frequency } = await req.json();

    // If batch mode, get all users with this frequency preference
    let userIds: string[] = [];
    if (frequency) {
      const { data: prefs } = await supabase
        .from('forum_email_preferences')
        .select('user_id')
        .eq('digest_frequency', frequency);
      userIds = (prefs || []).map((p: { user_id: string }) => p.user_id);
    } else if (userId) {
      userIds = [userId];
    }

    if (userIds.length === 0) {
      return new Response(JSON.stringify({ message: 'No users to send digest to' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resend = getResendClient();
    const results = [];

    for (const uid of userIds) {
      // Fetch digest content for this user
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

      // 1. New replies to user's posts
      const { data: userPosts } = await supabase
        .from('forum_posts')
        .select('id, title')
        .eq('author_id', uid)
        .eq('status', 'published');

      const postIds = (userPosts || []).map((p: { id: string }) => p.id);

      let newReplies: any[] = [];
      if (postIds.length > 0) {
        const { data: replies } = await supabase
          .from('forum_replies')
          .select('id, post_id, content, created_at')
          .in('post_id', postIds)
          .gte('created_at', sevenDaysAgo)
          .neq('author_id', uid)
          .order('created_at', { ascending: false })
          .limit(10);
        newReplies = replies || [];
      }

      // 2. Trending posts this week
      const { data: trending } = await supabase
        .from('forum_posts')
        .select('id, title, like_count, reply_count')
        .eq('status', 'published')
        .gte('created_at', sevenDaysAgo)
        .order('like_count', { ascending: false })
        .limit(5);

      // 3. User's stats
      const { data: stats } = await supabase
        .from('forum_user_stats')
        .select('*')
        .eq('user_id', uid)
        .single();

      // Get user profile name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', uid)
        .single();

      const digestData = {
        userName: profile?.full_name || 'User',
        newRepliesCount: newReplies.length,
        trendingPosts: (trending || []).map((p: any) => ({
          title: p.title,
          likes: p.like_count,
          replies: p.reply_count,
        })),
        reputation: stats?.reputation_points || 0,
        likesReceived: stats?.likes_received || 0,
      };

      // Get user email
      const userEmail = await getUserEmail(uid);
      if (!userEmail) {
        results.push({ userId: uid, status: 'skipped', reason: 'no_email' });
        continue;
      }

      // Generate template and send
      const template = weeklyDigestTemplate(digestData);

      try {
        const { error: sendError } = await resend.emails.send({
          from: FROM_EMAIL,
          to: [userEmail],
          subject: template.subject,
          html: template.html,
        });

        if (sendError) {
          console.error(`[Forum Digest] Resend error for ${uid}:`, sendError);
          results.push({ userId: uid, status: 'error', error: sendError.message });
        } else {
          console.log(`[Forum Digest] Sent to ${userEmail}`);
          results.push({ userId: uid, status: 'sent' });
        }
      } catch (sendErr) {
        console.error(`[Forum Digest] Send error for ${uid}:`, sendErr);
        results.push({ userId: uid, status: 'error', error: String(sendErr) });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Forum Digest] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
