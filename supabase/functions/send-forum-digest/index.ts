import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/stripe.ts';

/**
 * Forum Digest Email - Edge Function Stub
 *
 * This function prepares and sends a weekly/daily forum digest email.
 * Currently logs the email content. Resend integration to be added.
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

      // 3. User's stats changes
      const { data: stats } = await supabase
        .from('forum_user_stats')
        .select('*')
        .eq('user_id', uid)
        .single();

      // Get user email
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', uid)
        .single();

      const digestContent = {
        userId: uid,
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

      console.log('[Forum Digest] Content for user:', JSON.stringify(digestContent, null, 2));

      // TODO: Resend integration
      // const resend = new Resend(Deno.env.get('RESEND_API_KEY')!);
      // await resend.emails.send({
      //   from: 'Buyers Agent Hub <noreply@buyersagenthub.com>',
      //   to: [userEmail],
      //   subject: `Your Weekly Forum Digest - ${digestContent.newRepliesCount} new replies`,
      //   html: generateDigestHtml(digestContent),
      // });

      results.push({ userId: uid, status: 'logged' });
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
