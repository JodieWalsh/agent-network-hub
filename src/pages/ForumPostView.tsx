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
  Pencil,
  Trash2,
  Pin,
  Lock,
  Star,
  BadgeCheck,
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
import { Input } from '@/components/ui/input';
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
import { CaseStudyDisplay } from '@/components/forum/CaseStudyDisplay';
import { UserBadges } from '@/components/forum/UserBadges';
import { PhotoGallery } from '@/components/forum/PhotoGallery';
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
  checkAndAwardBadges,
  updatePost,
  deletePost,
  adminUpdatePost,
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
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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
        // Check if the reply author earned any badges
        checkAndAwardBadges(solutionReply.author_id);
      }

      // Reload
      loadPost();
    } else {
      toast.error('Failed to mark solution');
    }
  };

  const handleStartEdit = () => {
    if (!post) return;
    setEditTitle(post.title);
    setEditContent(post.content);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!user || !post) return;
    const success = await updatePost(post.id, user.id, {
      title: editTitle.trim(),
      content: editContent.trim(),
    });
    if (success) {
      toast.success('Post updated');
      setIsEditing(false);
      loadPost();
    } else {
      toast.error('Failed to update post');
    }
  };

  const handleDeletePost = async () => {
    if (!user || !post) return;
    const success = await deletePost(post.id, user.id);
    if (success) {
      toast.success('Post deleted');
      navigate('/forums');
    } else {
      toast.error('Failed to delete post');
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard');
  };

  const isAdmin = profile?.role === 'admin';

  const handleAdminToggle = async (field: 'is_pinned' | 'is_locked' | 'is_featured' | 'is_endorsed') => {
    if (!post) return;
    const newValue = !(post as any)[field];
    const success = await adminUpdatePost(post.id, { [field]: newValue });
    if (success) {
      setPost({ ...post, [field]: newValue } as any);
      const label = field.replace('is_', '');
      toast.success(`Post ${newValue ? label : `un${label}`}`);
    } else {
      toast.error('Failed to update post');
    }
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
            {/* Status banners */}
            {post.is_solved && (
              <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg px-3 py-2 mb-4 text-sm font-medium">
                <CheckCircle2 size={16} />
                This question has an accepted solution
              </div>
            )}
            {post.is_locked && (
              <div className="flex items-center gap-2 text-red-700 bg-red-50 rounded-lg px-3 py-2 mb-4 text-sm font-medium">
                <Lock size={16} />
                This post is locked — no new replies
              </div>
            )}
            {post.is_featured && (
              <div className="flex items-center gap-2 text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mb-4 text-sm font-medium">
                <Star size={16} />
                Featured by Staff
              </div>
            )}
            {post.is_endorsed && (
              <div className="flex items-center gap-2 text-forest bg-green-50 rounded-lg px-3 py-2 mb-4 text-sm font-medium">
                <BadgeCheck size={16} />
                Staff Endorsed
              </div>
            )}

            {/* Title */}
            {isEditing ? (
              <div className="space-y-3 mb-4">
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="text-xl font-bold"
                />
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={8}
                  className="resize-y"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-forest hover:bg-forest/90"
                    onClick={handleSaveEdit}
                    disabled={!editTitle.trim() || !editContent.trim()}
                  >
                    Save Changes
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
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
                  {post.edited_at && (
                    <span className="text-xs text-muted-foreground italic">
                      (edited {formatPostDate(post.edited_at)})
                    </span>
                  )}
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
                    <div className="font-medium text-sm flex items-center gap-1.5">
                      {post.author?.full_name || 'Unknown'}
                      {post.author && <UserBadges userId={post.author.id} />}
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

                {/* Photo Gallery */}
                {post.media && post.media.length > 0 && (
                  <PhotoGallery photos={post.media} />
                )}
              </>
            )}

            {/* Poll (if poll post) */}
            {post.post_type === 'poll' && (
              <PollDisplay postId={post.id} userId={user?.id} />
            )}

            {/* Case Study (if case_study post) */}
            {post.post_type === 'case_study' && (
              <CaseStudyDisplay post={post} />
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

              {user && post.author_id === user.id && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-muted-foreground"
                    onClick={handleStartEdit}
                  >
                    <Pencil size={16} />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-red-500 hover:text-red-700"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 size={16} />
                    Delete
                  </Button>
                </>
              )}

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

              {/* Admin actions */}
              {isAdmin && (
                <div className="flex items-center gap-1 ml-auto border-l pl-2">
                  <Button
                    variant="ghost" size="sm"
                    className={cn('gap-1 text-xs', post.is_pinned ? 'text-amber-500' : 'text-muted-foreground')}
                    onClick={() => handleAdminToggle('is_pinned')}
                  >
                    <Pin size={14} />
                    {post.is_pinned ? 'Unpin' : 'Pin'}
                  </Button>
                  <Button
                    variant="ghost" size="sm"
                    className={cn('gap-1 text-xs', post.is_locked ? 'text-red-500' : 'text-muted-foreground')}
                    onClick={() => handleAdminToggle('is_locked')}
                  >
                    <Lock size={14} />
                    {post.is_locked ? 'Unlock' : 'Lock'}
                  </Button>
                  <Button
                    variant="ghost" size="sm"
                    className={cn('gap-1 text-xs', post.is_featured ? 'text-yellow-500' : 'text-muted-foreground')}
                    onClick={() => handleAdminToggle('is_featured')}
                  >
                    <Star size={14} />
                    {post.is_featured ? 'Unfeature' : 'Feature'}
                  </Button>
                  <Button
                    variant="ghost" size="sm"
                    className={cn('gap-1 text-xs', post.is_endorsed ? 'text-forest' : 'text-muted-foreground')}
                    onClick={() => handleAdminToggle('is_endorsed')}
                  >
                    <BadgeCheck size={14} />
                    {post.is_endorsed ? 'Unendorse' : 'Endorse'}
                  </Button>
                </div>
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
                    onReplyUpdated={loadPost}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Reply Editor */}
          {post.is_locked ? (
            <Card>
              <CardContent className="py-6 text-center text-muted-foreground">
                <Lock size={20} className="mx-auto mb-2" />
                <p className="text-sm">This post is locked. No new replies can be added.</p>
              </CardContent>
            </Card>
          ) : user ? (
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

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Post</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this post? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleDeletePost}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete Post
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
