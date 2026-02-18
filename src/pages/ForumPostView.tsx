import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Heart,
  Bookmark,
  Eye,
  Bell,
  BellOff,
  Share2,
  Flag,
  CheckCircle2,
  MessageCircle,
  ArrowLeft,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useAuth } from '@/contexts/AuthContext';
import { ReplyThread } from '@/components/forum/ReplyThread';
import { ReplyEditor } from '@/components/forum/ReplyEditor';
import { PollDisplay } from '@/components/forum/PollDisplay';
import {
  ForumPost,
  ForumReply,
  fetchPostById,
  fetchReplies,
  createReply,
  toggleForumLike,
  toggleForumBookmark,
  toggleForumFollow,
  markAsSolution,
  incrementViewCount,
  reportContent,
  formatPostDate,
  getUserTypeLabel,
  notifyForumReply,
  notifyForumLike,
  notifyForumSolution,
  notifyForumFollowReply,
} from '@/lib/forum';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function ForumPostView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [post, setPost] = useState<ForumPost | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState('spam');
  const [reportDetails, setReportDetails] = useState('');

  useEffect(() => {
    if (id) {
      loadPost();
      incrementViewCount(id);
    }
  }, [id, user]);

  const loadPost = async () => {
    setLoading(true);
    const [p, r] = await Promise.all([
      fetchPostById(id!, user?.id),
      fetchReplies(id!, user?.id),
    ]);
    setPost(p);
    setReplies(r);
    setLoading(false);
  };

  const handleLikePost = async () => {
    if (!user || !post) return;
    const prev = post.user_has_liked;
    setPost({ ...post, user_has_liked: !prev, like_count: post.like_count + (prev ? -1 : 1) });

    const result = await toggleForumLike(user.id, post.id);

    if (result.liked && post.author_id !== user.id) {
      notifyForumLike(
        post.author_id,
        profile?.full_name || 'Someone',
        post.title,
        user.id
      );
    }
  };

  const handleBookmark = async () => {
    if (!user || !post) return;
    const prev = post.user_has_bookmarked;
    setPost({ ...post, user_has_bookmarked: !prev, bookmark_count: post.bookmark_count + (prev ? -1 : 1) });
    await toggleForumBookmark(user.id, post.id);
    toast.success(prev ? 'Bookmark removed' : 'Post bookmarked');
  };

  const handleFollow = async () => {
    if (!user || !post) return;
    const prev = post.user_is_following;
    setPost({ ...post, user_is_following: !prev });
    await toggleForumFollow(user.id, post.id);
    toast.success(prev ? 'Unfollowed post' : 'Following post — you\'ll be notified of new replies');
  };

  const handleLikeReply = async (replyId: string) => {
    if (!user) return;

    // Optimistic update
    setReplies((prev) =>
      prev.map((r) => {
        if (r.id === replyId) {
          return {
            ...r,
            user_has_liked: !r.user_has_liked,
            like_count: r.like_count + (r.user_has_liked ? -1 : 1),
          };
        }
        if (r.children) {
          return {
            ...r,
            children: r.children.map((c) =>
              c.id === replyId
                ? { ...c, user_has_liked: !c.user_has_liked, like_count: c.like_count + (c.user_has_liked ? -1 : 1) }
                : c
            ),
          };
        }
        return r;
      })
    );

    await toggleForumLike(user.id, undefined, replyId);
  };

  const handleReply = async (content: string, parentReplyId?: string) => {
    if (!user || !post) return;

    const reply = await createReply(post.id, user.id, content, parentReplyId);
    if (reply) {
      toast.success('Reply posted');
      // Reload replies
      const updated = await fetchReplies(post.id, user.id);
      setReplies(updated);
      setPost({ ...post, reply_count: post.reply_count + 1 });

      // Notify post author (if not self)
      if (post.author_id !== user.id) {
        notifyForumReply(
          post.author_id,
          profile?.full_name || 'Someone',
          post.title,
          post.id,
          user.id
        );
      }

      // Notify followers (handled server-side ideally, but for now client-side)
      // This would need a fetch of followers - skipped for Phase 1
    } else {
      toast.error('Failed to post reply');
    }
  };

  const handleMarkSolution = async (replyId: string) => {
    if (!user || !post) return;

    const success = await markAsSolution(post.id, replyId, user.id);
    if (success) {
      toast.success('Reply marked as solution');

      // Find reply author for notification
      const flatReplies = replies.flatMap((r) => [r, ...(r.children || [])]);
      const solutionReply = flatReplies.find((r) => r.id === replyId);

      if (solutionReply && solutionReply.author_id !== user.id) {
        notifyForumSolution(solutionReply.author_id, post.title, user.id);
      }

      // Reload
      loadPost();
    } else {
      toast.error('Failed to mark solution');
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard');
  };

  const handleReport = async () => {
    if (!user || !post) return;
    const success = await reportContent(user.id, reportReason, post.id, undefined, reportDetails);
    if (success) {
      toast.success('Report submitted. Thank you.');
      setShowReportDialog(false);
      setReportReason('spam');
      setReportDetails('');
    } else {
      toast.error('Failed to submit report');
    }
  };

  const authorInitials = post?.author?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || '?';

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Skeleton className="h-8 w-48 mb-4" />
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-8 w-3/4 mb-4" />
              <Skeleton className="h-4 w-1/2 mb-6" />
              <Skeleton className="h-32 mb-4" />
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!post) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <h1 className="text-xl font-bold mb-2">Post not found</h1>
          <Button variant="outline" onClick={() => navigate('/forums')}>
            Back to Forums
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <Breadcrumb className="mb-4">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/forums">Forums</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            {post.category && (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink href={`/forums/category/${post.category.slug}`}>
                    {post.category.name}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
              </>
            )}
            {post.regional_board && (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink href={`/forums/region/${post.regional_board.slug}`}>
                    {post.regional_board.name}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
              </>
            )}
            <BreadcrumbItem>
              <BreadcrumbPage className="truncate max-w-[200px]">
                {post.title}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Post Card */}
        <Card className="mb-6">
          <CardContent className="p-6">
            {/* Solved banner */}
            {post.is_solved && (
              <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg px-3 py-2 mb-4 text-sm font-medium">
                <CheckCircle2 size={16} />
                This question has an accepted solution
              </div>
            )}

            {/* Title */}
            <h1 className="text-xl font-bold mb-2">{post.title}</h1>

            {/* Post type badge + tags */}
            <div className="flex items-center gap-2 flex-wrap mb-4">
              <Badge variant="outline" className={cn(
                'text-xs',
                post.post_type === 'poll' && 'border-purple-300 text-purple-700 bg-purple-50',
                post.post_type === 'case_study' && 'border-indigo-300 text-indigo-700 bg-indigo-50',
              )}>
                {post.post_type === 'question' ? 'Question' : post.post_type === 'poll' ? 'Poll' : post.post_type === 'case_study' ? 'Case Study' : 'Discussion'}
              </Badge>
              {post.tags?.map((tag) => (
                <Badge key={tag.id} variant="secondary" className="text-xs">
                  {tag.name}
                </Badge>
              ))}
            </div>

            {/* Author */}
            <div className="flex items-center gap-3 mb-4">
              <Avatar className="h-10 w-10">
                <AvatarImage src={post.author?.avatar_url || undefined} />
                <AvatarFallback className="bg-forest/10 text-forest">
                  {authorInitials}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium text-sm">
                  {post.author?.full_name || 'Unknown'}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <span>{getUserTypeLabel(post.author?.user_type || '')}</span>
                  <span>·</span>
                  <span>{formatPostDate(post.created_at)}</span>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap mb-4">
              {post.content}
            </div>

            {/* Poll (if poll post) */}
            {post.post_type === 'poll' && (
              <PollDisplay postId={post.id} userId={user?.id} />
            )}

            {/* Stats */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
              <span className="flex items-center gap-1">
                <Eye size={13} />
                {post.view_count} views
              </span>
              <span className="flex items-center gap-1">
                <Heart size={13} />
                {post.like_count} likes
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle size={13} />
                {post.reply_count} replies
              </span>
            </div>

            <Separator className="mb-4" />

            {/* Action Bar */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'gap-1',
                  post.user_has_liked ? 'text-red-500' : 'text-muted-foreground'
                )}
                onClick={handleLikePost}
                disabled={!user}
              >
                <Heart size={16} fill={post.user_has_liked ? 'currentColor' : 'none'} />
                {post.user_has_liked ? 'Liked' : 'Like'}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'gap-1',
                  post.user_has_bookmarked ? 'text-amber-500' : 'text-muted-foreground'
                )}
                onClick={handleBookmark}
                disabled={!user}
              >
                <Bookmark size={16} fill={post.user_has_bookmarked ? 'currentColor' : 'none'} />
                {post.user_has_bookmarked ? 'Saved' : 'Save'}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'gap-1',
                  post.user_is_following ? 'text-forest' : 'text-muted-foreground'
                )}
                onClick={handleFollow}
                disabled={!user}
              >
                {post.user_is_following ? <BellOff size={16} /> : <Bell size={16} />}
                {post.user_is_following ? 'Unfollow' : 'Follow'}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-muted-foreground"
                onClick={handleShare}
              >
                <Share2 size={16} />
                Share
              </Button>

              {user && post.author_id !== user.id && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-muted-foreground ml-auto"
                  onClick={() => setShowReportDialog(true)}
                >
                  <Flag size={16} />
                  Report
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Replies Section */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4">
            {replies.length > 0
              ? `${post.reply_count} ${post.reply_count === 1 ? 'Reply' : 'Replies'}`
              : 'No replies yet'}
          </h2>

          {/* Reply list */}
          {replies.length > 0 && (
            <Card className="mb-6">
              <CardContent className="p-4 divide-y divide-border">
                {replies.map((reply) => (
                  <ReplyThread
                    key={reply.id}
                    reply={reply}
                    postAuthorId={post.author_id}
                    currentUserId={user?.id}
                    isQuestion={post.post_type === 'question'}
                    onLike={handleLikeReply}
                    onReply={handleReply}
                    onMarkSolution={handleMarkSolution}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Reply Editor */}
          {user ? (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-medium mb-3">Write a reply</h3>
                <ReplyEditor
                  onSubmit={(content) => handleReply(content)}
                  placeholder="Share your thoughts..."
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground mb-3">
                  Sign in to join the discussion
                </p>
                <Button
                  variant="outline"
                  onClick={() => navigate('/auth')}
                >
                  Sign In
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Report Dialog */}
        <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Report Post</DialogTitle>
              <DialogDescription>
                Please select a reason for reporting this post.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Select value={reportReason} onValueChange={setReportReason}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spam">Spam</SelectItem>
                  <SelectItem value="harassment">Harassment</SelectItem>
                  <SelectItem value="misinformation">Misinformation</SelectItem>
                  <SelectItem value="off_topic">Off Topic</SelectItem>
                  <SelectItem value="inappropriate">Inappropriate</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <Textarea
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Additional details (optional)"
                rows={3}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowReportDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleReport}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Submit Report
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
