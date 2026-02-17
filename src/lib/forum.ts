/**
 * Forum System
 *
 * All types and API functions for the community forum.
 * Follows the same raw fetch pattern used in messaging.ts and notifications.ts.
 */

import { supabase } from '@/integrations/supabase/client';
import { createNotification } from './notifications';

// ===========================================
// AUTH HEADERS (shared pattern)
// ===========================================

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

export interface ForumCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  color: string;
  display_order: number;
  post_count: number;
  is_active: boolean;
  created_at: string;
}

export interface ForumRegionalBoard {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  country_code: string;
  state_code: string | null;
  member_count: number;
  post_count: number;
  is_active: boolean;
  created_at: string;
}

export interface ForumPost {
  id: string;
  author_id: string;
  category_id: string | null;
  regional_board_id: string | null;
  title: string;
  content: string;
  post_type: 'discussion' | 'question';
  status: 'draft' | 'published' | 'closed' | 'removed';
  is_pinned: boolean;
  is_solved: boolean;
  solved_reply_id: string | null;
  view_count: number;
  like_count: number;
  reply_count: number;
  bookmark_count: number;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
  // Joined data
  author?: PostAuthor;
  category?: ForumCategory;
  regional_board?: ForumRegionalBoard;
  tags?: ForumTag[];
  user_has_liked?: boolean;
  user_has_bookmarked?: boolean;
  user_is_following?: boolean;
}

export interface PostAuthor {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  user_type: string;
}

export interface ForumReply {
  id: string;
  post_id: string;
  author_id: string;
  parent_reply_id: string | null;
  content: string;
  is_solution: boolean;
  like_count: number;
  created_at: string;
  updated_at: string;
  // Joined data
  author?: PostAuthor;
  children?: ForumReply[];
  user_has_liked?: boolean;
}

export interface ForumTag {
  id: string;
  name: string;
  slug: string;
  usage_count: number;
}

export interface ForumUserStats {
  user_id: string;
  post_count: number;
  reply_count: number;
  likes_given: number;
  likes_received: number;
  solutions_count: number;
  reputation_points: number;
}

export interface CreatePostParams {
  title: string;
  content: string;
  post_type: 'discussion' | 'question';
  category_id?: string;
  regional_board_id?: string;
  tags?: string[];
}

export type PostSortOption = 'latest' | 'popular' | 'unanswered';
export type TimeRangeOption = 'all' | 'today' | 'week' | 'month';

// ===========================================
// CATEGORIES
// ===========================================

export async function fetchCategories(): Promise<ForumCategory[]> {
  const { supabaseUrl, supabaseKey, accessToken } = getAuthHeaders();

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/forum_categories?is_active=eq.true&order=display_order.asc`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.error('[Forum] Error fetching categories:', error);
    return [];
  }
}

export async function fetchCategoryBySlug(slug: string): Promise<ForumCategory | null> {
  const { supabaseUrl, supabaseKey, accessToken } = getAuthHeaders();

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/forum_categories?slug=eq.${encodeURIComponent(slug)}&limit=1`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.pgrst.object+json',
        },
      }
    );

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('[Forum] Error fetching category:', error);
    return null;
  }
}

// ===========================================
// REGIONAL BOARDS
// ===========================================

export async function fetchRegionalBoards(): Promise<ForumRegionalBoard[]> {
  const { supabaseUrl, supabaseKey, accessToken } = getAuthHeaders();

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/forum_regional_boards?is_active=eq.true&order=name.asc`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.error('[Forum] Error fetching regional boards:', error);
    return [];
  }
}

export async function fetchRegionalBoardBySlug(slug: string): Promise<ForumRegionalBoard | null> {
  const { supabaseUrl, supabaseKey, accessToken } = getAuthHeaders();

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/forum_regional_boards?slug=eq.${encodeURIComponent(slug)}&limit=1`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.pgrst.object+json',
        },
      }
    );

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('[Forum] Error fetching regional board:', error);
    return null;
  }
}

export async function toggleBoardMembership(
  userId: string,
  boardId: string
): Promise<{ joined: boolean }> {
  const { supabaseUrl, supabaseKey, accessToken } = getAuthHeaders();

  try {
    // Check if already a member
    const checkResponse = await fetch(
      `${supabaseUrl}/rest/v1/forum_user_regional_memberships?user_id=eq.${userId}&board_id=eq.${boardId}`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const existing = await checkResponse.json();

    if (existing.length > 0) {
      // Leave
      await fetch(
        `${supabaseUrl}/rest/v1/forum_user_regional_memberships?user_id=eq.${userId}&board_id=eq.${boardId}`,
        {
          method: 'DELETE',
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      // Decrement member count
      supabase.rpc('decrement_board_member_count', { p_board_id: boardId }).catch(() => {});
      return { joined: false };
    } else {
      // Join
      await fetch(
        `${supabaseUrl}/rest/v1/forum_user_regional_memberships`,
        {
          method: 'POST',
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({ user_id: userId, board_id: boardId }),
        }
      );
      // Increment member count
      supabase.rpc('increment_board_member_count', { p_board_id: boardId }).catch(() => {});
      return { joined: true };
    }
  } catch (error) {
    console.error('[Forum] Error toggling board membership:', error);
    return { joined: false };
  }
}

export async function checkBoardMembership(userId: string, boardId: string): Promise<boolean> {
  const { supabaseUrl, supabaseKey, accessToken } = getAuthHeaders();

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/forum_user_regional_memberships?user_id=eq.${userId}&board_id=eq.${boardId}&select=id`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await response.json();
    return data.length > 0;
  } catch {
    return false;
  }
}

// ===========================================
// POSTS
// ===========================================

export async function fetchPosts(options: {
  categoryId?: string;
  regionalBoardId?: string;
  sort?: PostSortOption;
  timeRange?: TimeRangeOption;
  postType?: string;
  limit?: number;
  offset?: number;
}): Promise<ForumPost[]> {
  const { supabaseUrl, supabaseKey, accessToken } = getAuthHeaders();
  const {
    categoryId,
    regionalBoardId,
    sort = 'latest',
    timeRange = 'all',
    postType,
    limit = 20,
    offset = 0,
  } = options;

  try {
    let url = `${supabaseUrl}/rest/v1/forum_posts?status=eq.published&limit=${limit}&offset=${offset}`;

    if (categoryId) url += `&category_id=eq.${categoryId}`;
    if (regionalBoardId) url += `&regional_board_id=eq.${regionalBoardId}`;
    if (postType) url += `&post_type=eq.${postType}`;

    // Time range filter
    if (timeRange !== 'all') {
      const now = new Date();
      let since: Date;
      switch (timeRange) {
        case 'today':
          since = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          since = new Date(0);
      }
      url += `&created_at=gte.${since.toISOString()}`;
    }

    // Sort
    switch (sort) {
      case 'popular':
        url += '&order=like_count.desc,last_activity_at.desc';
        break;
      case 'unanswered':
        url += '&reply_count=eq.0&post_type=eq.question&order=created_at.desc';
        break;
      default:
        url += '&order=is_pinned.desc,last_activity_at.desc';
    }

    const response = await fetch(url, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) return [];
    const posts: ForumPost[] = await response.json();

    // Fetch authors for all posts
    if (posts.length > 0) {
      const authorIds = [...new Set(posts.map((p) => p.author_id))];
      const authors = await fetchProfiles(authorIds);
      const authorMap = new Map(authors.map((a) => [a.id, a]));
      posts.forEach((p) => {
        p.author = authorMap.get(p.author_id);
      });
    }

    return posts;
  } catch (error) {
    console.error('[Forum] Error fetching posts:', error);
    return [];
  }
}

export async function fetchPostById(postId: string, userId?: string): Promise<ForumPost | null> {
  const { supabaseUrl, supabaseKey, accessToken } = getAuthHeaders();

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/forum_posts?id=eq.${postId}&limit=1`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.pgrst.object+json',
        },
      }
    );

    if (!response.ok) return null;
    const post: ForumPost = await response.json();

    // Fetch author
    const authors = await fetchProfiles([post.author_id]);
    if (authors.length > 0) post.author = authors[0];

    // Fetch category if present
    if (post.category_id) {
      const catResponse = await fetch(
        `${supabaseUrl}/rest/v1/forum_categories?id=eq.${post.category_id}&limit=1`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.pgrst.object+json',
          },
        }
      );
      if (catResponse.ok) post.category = await catResponse.json();
    }

    // Fetch regional board if present
    if (post.regional_board_id) {
      const boardResponse = await fetch(
        `${supabaseUrl}/rest/v1/forum_regional_boards?id=eq.${post.regional_board_id}&limit=1`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.pgrst.object+json',
          },
        }
      );
      if (boardResponse.ok) post.regional_board = await boardResponse.json();
    }

    // Fetch tags
    post.tags = await fetchPostTags(postId);

    // If user is logged in, check their interactions
    if (userId) {
      const [liked, bookmarked, following] = await Promise.all([
        checkUserLikedPost(userId, postId),
        checkUserBookmarkedPost(userId, postId),
        checkUserFollowingPost(userId, postId),
      ]);
      post.user_has_liked = liked;
      post.user_has_bookmarked = bookmarked;
      post.user_is_following = following;
    }

    return post;
  } catch (error) {
    console.error('[Forum] Error fetching post:', error);
    return null;
  }
}

export async function createPost(
  userId: string,
  params: CreatePostParams
): Promise<ForumPost | null> {
  const { supabaseUrl, supabaseKey, accessToken } = getAuthHeaders();

  try {
    const postData: Record<string, unknown> = {
      author_id: userId,
      title: params.title,
      content: params.content,
      post_type: params.post_type,
      status: 'published',
    };

    if (params.category_id) postData.category_id = params.category_id;
    if (params.regional_board_id) postData.regional_board_id = params.regional_board_id;

    const response = await fetch(`${supabaseUrl}/rest/v1/forum_posts`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(postData),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[Forum] Error creating post:', err);
      return null;
    }

    const [post] = await response.json();

    // Update category post count
    if (params.category_id) {
      supabase.rpc('increment_category_post_count', { cat_id: params.category_id }).catch(() => {});
    }

    // Update board post count
    if (params.regional_board_id) {
      supabase.rpc('increment_board_post_count', { p_board_id: params.regional_board_id }).catch(() => {});
    }

    // Handle tags
    if (params.tags && params.tags.length > 0) {
      await addTagsToPost(post.id, params.tags);
    }

    // Auto-follow the post
    await toggleForumFollow(userId, post.id);

    // Update user stats (+1 post, +5 reputation)
    supabase.rpc('increment_forum_user_stats', {
      p_user_id: userId,
      p_posts: 1,
      p_replies: 0,
      p_reputation: 5,
    }).catch(() => {});

    return post;
  } catch (error) {
    console.error('[Forum] Error creating post:', error);
    return null;
  }
}

// ===========================================
// REPLIES
// ===========================================

export async function fetchReplies(postId: string, userId?: string): Promise<ForumReply[]> {
  const { supabaseUrl, supabaseKey, accessToken } = getAuthHeaders();

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/forum_replies?post_id=eq.${postId}&order=created_at.asc`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) return [];
    const replies: ForumReply[] = await response.json();

    // Fetch authors
    if (replies.length > 0) {
      const authorIds = [...new Set(replies.map((r) => r.author_id))];
      const authors = await fetchProfiles(authorIds);
      const authorMap = new Map(authors.map((a) => [a.id, a]));
      replies.forEach((r) => {
        r.author = authorMap.get(r.author_id);
      });
    }

    // Check which replies user has liked
    if (userId && replies.length > 0) {
      const likedReplyIds = await fetchUserLikedReplyIds(userId, postId);
      const likedSet = new Set(likedReplyIds);
      replies.forEach((r) => {
        r.user_has_liked = likedSet.has(r.id);
      });
    }

    // Build tree structure (2-level nesting)
    const topLevel = replies.filter((r) => !r.parent_reply_id);
    const childMap = new Map<string, ForumReply[]>();
    replies
      .filter((r) => r.parent_reply_id)
      .forEach((r) => {
        const children = childMap.get(r.parent_reply_id!) || [];
        children.push(r);
        childMap.set(r.parent_reply_id!, children);
      });

    topLevel.forEach((r) => {
      r.children = childMap.get(r.id) || [];
    });

    return topLevel;
  } catch (error) {
    console.error('[Forum] Error fetching replies:', error);
    return [];
  }
}

export async function createReply(
  postId: string,
  userId: string,
  content: string,
  parentReplyId?: string
): Promise<ForumReply | null> {
  const { supabaseUrl, supabaseKey, accessToken } = getAuthHeaders();

  try {
    const replyData: Record<string, unknown> = {
      post_id: postId,
      author_id: userId,
      content,
    };

    if (parentReplyId) replyData.parent_reply_id = parentReplyId;

    const response = await fetch(`${supabaseUrl}/rest/v1/forum_replies`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(replyData),
    });

    if (!response.ok) {
      console.error('[Forum] Error creating reply:', await response.text());
      return null;
    }

    const [reply] = await response.json();

    // Increment reply_count + update last_activity_at via RPC
    supabase.rpc('increment_post_reply_count', { p_post_id: postId }).catch(() => {});

    // Update user stats (+1 reply, +2 reputation)
    supabase.rpc('increment_forum_user_stats', {
      p_user_id: userId,
      p_posts: 0,
      p_replies: 1,
      p_reputation: 2,
    }).catch(() => {});

    return reply;
  } catch (error) {
    console.error('[Forum] Error creating reply:', error);
    return null;
  }
}

// ===========================================
// LIKES, BOOKMARKS, FOLLOWS (via RPC)
// ===========================================

export async function toggleForumLike(
  userId: string,
  postId?: string,
  replyId?: string
): Promise<{ liked: boolean }> {
  const { data, error } = await supabase.rpc('toggle_forum_like', {
    p_user_id: userId,
    p_post_id: postId || null,
    p_reply_id: replyId || null,
  });

  if (error) {
    console.error('[Forum] Error toggling like:', error);
    return { liked: false };
  }

  return { liked: (data as { liked: boolean })?.liked ?? false };
}

export async function toggleForumBookmark(
  userId: string,
  postId: string
): Promise<{ bookmarked: boolean }> {
  const { data, error } = await supabase.rpc('toggle_forum_bookmark', {
    p_user_id: userId,
    p_post_id: postId,
  });

  if (error) {
    console.error('[Forum] Error toggling bookmark:', error);
    return { bookmarked: false };
  }

  return { bookmarked: (data as { bookmarked: boolean })?.bookmarked ?? false };
}

export async function toggleForumFollow(
  userId: string,
  postId: string
): Promise<{ following: boolean }> {
  const { data, error } = await supabase.rpc('toggle_forum_follow', {
    p_user_id: userId,
    p_post_id: postId,
  });

  if (error) {
    console.error('[Forum] Error toggling follow:', error);
    return { following: false };
  }

  return { following: (data as { following: boolean })?.following ?? false };
}

export async function markAsSolution(
  postId: string,
  replyId: string,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('mark_reply_as_solution', {
    p_post_id: postId,
    p_reply_id: replyId,
    p_user_id: userId,
  });

  if (error) {
    console.error('[Forum] Error marking solution:', error);
    return false;
  }

  return (data as { success?: boolean })?.success ?? false;
}

export async function incrementViewCount(postId: string): Promise<void> {
  await supabase.rpc('increment_post_view_count', { p_post_id: postId }).catch(() => {});
}

// ===========================================
// SEARCH
// ===========================================

export async function searchPosts(
  query: string,
  limit = 20,
  offset = 0
): Promise<ForumPost[]> {
  const { data, error } = await supabase.rpc('search_forum_posts', {
    p_query: query,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) {
    console.error('[Forum] Error searching posts:', error);
    return [];
  }

  const posts = (data || []) as ForumPost[];

  // Fetch authors
  if (posts.length > 0) {
    const authorIds = [...new Set(posts.map((p) => p.author_id))];
    const authors = await fetchProfiles(authorIds);
    const authorMap = new Map(authors.map((a) => [a.id, a]));
    posts.forEach((p) => {
      p.author = authorMap.get(p.author_id);
    });
  }

  return posts;
}

// ===========================================
// TAGS
// ===========================================

export async function fetchTags(query?: string, limit = 20): Promise<ForumTag[]> {
  const { supabaseUrl, supabaseKey, accessToken } = getAuthHeaders();

  try {
    let url = `${supabaseUrl}/rest/v1/forum_tags?order=usage_count.desc&limit=${limit}`;
    if (query) url += `&name=ilike.*${encodeURIComponent(query)}*`;

    const response = await fetch(url, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) return [];
    return await response.json();
  } catch {
    return [];
  }
}

export async function fetchPostTags(postId: string): Promise<ForumTag[]> {
  const { supabaseUrl, supabaseKey, accessToken } = getAuthHeaders();

  try {
    // Get tag IDs for this post
    const ptResponse = await fetch(
      `${supabaseUrl}/rest/v1/forum_post_tags?post_id=eq.${postId}&select=tag_id`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!ptResponse.ok) return [];
    const postTags = await ptResponse.json();
    if (postTags.length === 0) return [];

    const tagIds = postTags.map((pt: { tag_id: string }) => pt.tag_id);

    // Fetch tag details
    const tagsResponse = await fetch(
      `${supabaseUrl}/rest/v1/forum_tags?id=in.(${tagIds.join(',')})`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!tagsResponse.ok) return [];
    return await tagsResponse.json();
  } catch {
    return [];
  }
}

async function addTagsToPost(postId: string, tagNames: string[]): Promise<void> {
  const { supabaseUrl, supabaseKey, accessToken } = getAuthHeaders();

  for (const name of tagNames) {
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    try {
      // Upsert tag
      const tagResponse = await fetch(
        `${supabaseUrl}/rest/v1/forum_tags`,
        {
          method: 'POST',
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation,resolution=merge-duplicates',
          },
          body: JSON.stringify({ name, slug, usage_count: 1 }),
        }
      );

      if (tagResponse.ok) {
        const [tag] = await tagResponse.json();
        // Link tag to post
        await fetch(`${supabaseUrl}/rest/v1/forum_post_tags`, {
          method: 'POST',
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({ post_id: postId, tag_id: tag.id }),
        });
      }
    } catch {
      // Non-critical, continue
    }
  }
}

// ===========================================
// USER STATS
// ===========================================

export async function fetchUserStats(userId: string): Promise<ForumUserStats | null> {
  const { supabaseUrl, supabaseKey, accessToken } = getAuthHeaders();

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/forum_user_stats?user_id=eq.${userId}`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.pgrst.object+json',
        },
      }
    );

    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export async function fetchTopContributors(limit = 5): Promise<(ForumUserStats & { author?: PostAuthor })[]> {
  const { supabaseUrl, supabaseKey, accessToken } = getAuthHeaders();

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/forum_user_stats?order=reputation_points.desc&limit=${limit}`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) return [];
    const stats: (ForumUserStats & { author?: PostAuthor })[] = await response.json();

    if (stats.length > 0) {
      const userIds = stats.map((s) => s.user_id);
      const authors = await fetchProfiles(userIds);
      const authorMap = new Map(authors.map((a) => [a.id, a]));
      stats.forEach((s) => {
        s.author = authorMap.get(s.user_id);
      });
    }

    return stats;
  } catch {
    return [];
  }
}

// ===========================================
// FORUM NOTIFICATIONS
// ===========================================

export async function notifyForumReply(
  postAuthorId: string,
  replierName: string,
  postTitle: string,
  postId: string,
  replierId: string
) {
  return createNotification({
    userId: postAuthorId,
    type: 'forum_reply' as any,
    title: 'New reply to your post',
    message: `${replierName} replied to "${postTitle.substring(0, 50)}"`,
    fromUserId: replierId,
  });
}

export async function notifyForumLike(
  authorId: string,
  likerName: string,
  postTitle: string,
  likerId: string
) {
  return createNotification({
    userId: authorId,
    type: 'forum_like' as any,
    title: 'Someone liked your post',
    message: `${likerName} liked "${postTitle.substring(0, 50)}"`,
    fromUserId: likerId,
  });
}

export async function notifyForumSolution(
  replyAuthorId: string,
  postTitle: string,
  postAuthorId: string
) {
  return createNotification({
    userId: replyAuthorId,
    type: 'forum_solution' as any,
    title: 'Your answer was marked as the solution!',
    message: `Your reply to "${postTitle.substring(0, 50)}" was selected as the best answer`,
    fromUserId: postAuthorId,
  });
}

export async function notifyForumFollowReply(
  followerId: string,
  replierName: string,
  postTitle: string,
  replierId: string
) {
  return createNotification({
    userId: followerId,
    type: 'forum_follow_reply' as any,
    title: 'New reply on a post you follow',
    message: `${replierName} replied to "${postTitle.substring(0, 50)}"`,
    fromUserId: replierId,
  });
}

// ===========================================
// REPORTS
// ===========================================

export async function reportContent(
  reporterId: string,
  reason: string,
  postId?: string,
  replyId?: string,
  details?: string
): Promise<boolean> {
  const { supabaseUrl, supabaseKey, accessToken } = getAuthHeaders();

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/forum_reports`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        reporter_id: reporterId,
        post_id: postId || null,
        reply_id: replyId || null,
        reason,
        details: details || null,
      }),
    });

    return response.ok;
  } catch {
    return false;
  }
}

// ===========================================
// HELPER FUNCTIONS
// ===========================================

async function fetchProfiles(userIds: string[]): Promise<PostAuthor[]> {
  const { supabaseUrl, supabaseKey, accessToken } = getAuthHeaders();

  if (userIds.length === 0) return [];

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=in.(${userIds.join(',')})&select=id,full_name,avatar_url,user_type`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) return [];
    return await response.json();
  } catch {
    return [];
  }
}

async function checkUserLikedPost(userId: string, postId: string): Promise<boolean> {
  const { supabaseUrl, supabaseKey, accessToken } = getAuthHeaders();

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/forum_likes?user_id=eq.${userId}&post_id=eq.${postId}&select=id`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await response.json();
    return data.length > 0;
  } catch {
    return false;
  }
}

async function checkUserBookmarkedPost(userId: string, postId: string): Promise<boolean> {
  const { supabaseUrl, supabaseKey, accessToken } = getAuthHeaders();

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/forum_bookmarks?user_id=eq.${userId}&post_id=eq.${postId}&select=id`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await response.json();
    return data.length > 0;
  } catch {
    return false;
  }
}

async function checkUserFollowingPost(userId: string, postId: string): Promise<boolean> {
  const { supabaseUrl, supabaseKey, accessToken } = getAuthHeaders();

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/forum_follows?user_id=eq.${userId}&post_id=eq.${postId}&select=id`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await response.json();
    return data.length > 0;
  } catch {
    return false;
  }
}

async function fetchUserLikedReplyIds(userId: string, postId: string): Promise<string[]> {
  const { supabaseUrl, supabaseKey, accessToken } = getAuthHeaders();

  try {
    // Get all reply IDs for this post first
    const repliesResponse = await fetch(
      `${supabaseUrl}/rest/v1/forum_replies?post_id=eq.${postId}&select=id`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!repliesResponse.ok) return [];
    const replies = await repliesResponse.json();
    if (replies.length === 0) return [];

    const replyIds = replies.map((r: { id: string }) => r.id);

    const likesResponse = await fetch(
      `${supabaseUrl}/rest/v1/forum_likes?user_id=eq.${userId}&reply_id=in.(${replyIds.join(',')})&select=reply_id`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!likesResponse.ok) return [];
    const likes = await likesResponse.json();
    return likes.map((l: { reply_id: string }) => l.reply_id);
  } catch {
    return [];
  }
}

// ===========================================
// FORMAT HELPERS
// ===========================================

export function formatPostDate(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;

  return date.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export function truncateContent(content: string, maxLength = 200): string {
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength).replace(/\s+\S*$/, '') + '...';
}

export function getUserTypeLabel(userType: string): string {
  const labels: Record<string, string> = {
    buyers_agent: 'Buyers Agent',
    real_estate_agent: 'Real Estate Agent',
    building_inspector: 'Building Inspector',
    conveyancer: 'Conveyancer',
    mortgage_broker: 'Mortgage Broker',
    stylist: 'Stylist',
  };
  return labels[userType] || userType;
}
