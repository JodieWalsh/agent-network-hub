import { useState } from 'react';
import { Heart, Reply, CheckCircle2, Pencil, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ForumReply, formatPostDate, getUserTypeLabel, updateReply, deleteReply } from '@/lib/forum';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ReplyEditor } from './ReplyEditor';
import { UserBadges } from './UserBadges';

interface ReplyThreadProps {
  reply: ForumReply;
  depth?: number;
  postAuthorId: string;
  currentUserId?: string;
  isQuestion?: boolean;
  onLike: (replyId: string) => void;
  onReply: (content: string, parentReplyId: string) => Promise<void>;
  onMarkSolution: (replyId: string) => void;
  onReplyUpdated?: () => void;
}

export function ReplyThread({
  reply,
  depth = 0,
  postAuthorId,
  currentUserId,
  isQuestion = false,
  onLike,
  onReply,
  onMarkSolution,
  onReplyUpdated,
}: ReplyThreadProps) {
  const [showReplyEditor, setShowReplyEditor] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const authorInitials = reply.author?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || '?';

  const isPostAuthor = reply.author_id === postAuthorId;
  const isOwnReply = currentUserId === reply.author_id;
  const canMarkSolution = isQuestion && currentUserId === postAuthorId && !reply.is_solution;
  const canReply = depth < 1; // Max 2-level nesting

  const handleSaveEdit = async () => {
    if (!currentUserId) return;
    const success = await updateReply(reply.id, currentUserId, editContent.trim());
    if (success) {
      toast.success('Reply updated');
      setIsEditing(false);
      onReplyUpdated?.();
    } else {
      toast.error('Failed to update reply');
    }
  };

  const handleDelete = async () => {
    if (!currentUserId) return;
    const success = await deleteReply(reply.id, currentUserId);
    if (success) {
      toast.success('Reply deleted');
      setShowDeleteConfirm(false);
      onReplyUpdated?.();
    } else {
      toast.error('Failed to delete reply');
    }
  };

  return (
    <div className={cn('relative', depth > 0 && 'ml-8 pl-4 border-l-2 border-muted')}>
      <div className={cn(
        'py-4',
        reply.is_solution && 'bg-green-50 rounded-lg px-4 -mx-2 border border-green-200'
      )}>
        {/* Solution badge */}
        {reply.is_solution && (
          <div className="flex items-center gap-1 text-green-700 text-sm font-medium mb-2">
            <CheckCircle2 size={16} />
            Accepted Solution
          </div>
        )}

        {/* Author row */}
        <div className="flex items-center gap-2 mb-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={reply.author?.avatar_url || undefined} />
            <AvatarFallback className="bg-forest/10 text-forest text-xs">
              {authorInitials}
            </AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">
              {reply.author?.full_name || 'Unknown'}
            </span>
            {reply.author && <UserBadges userId={reply.author.id} />}
            <span className="text-xs text-muted-foreground">
              {getUserTypeLabel(reply.author?.user_type || '')}
            </span>
            {isPostAuthor && (
              <Badge variant="outline" className="text-xs border-forest/30 text-forest">
                OP
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {formatPostDate(reply.created_at)}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="pl-10">
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={3}
                className="text-sm resize-y"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="h-7 text-xs bg-forest hover:bg-forest/90"
                  onClick={handleSaveEdit}
                  disabled={!editContent.trim()}
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-foreground whitespace-pre-wrap">
              {reply.content}
              {reply.edited_at && (
                <span className="text-xs text-muted-foreground italic ml-2">
                  (edited)
                </span>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-2 pl-10">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-7 text-xs gap-1',
              reply.user_has_liked ? 'text-red-500' : 'text-muted-foreground'
            )}
            onClick={() => onLike(reply.id)}
          >
            <Heart size={13} fill={reply.user_has_liked ? 'currentColor' : 'none'} />
            {reply.like_count > 0 && reply.like_count}
          </Button>

          {canReply && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1 text-muted-foreground"
              onClick={() => setShowReplyEditor(!showReplyEditor)}
            >
              <Reply size={13} />
              Reply
            </Button>
          )}

          {canMarkSolution && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1 text-green-600 hover:text-green-700"
              onClick={() => onMarkSolution(reply.id)}
            >
              <CheckCircle2 size={13} />
              Mark as Solution
            </Button>
          )}

          {isOwnReply && !isEditing && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1 text-muted-foreground"
                onClick={() => {
                  setEditContent(reply.content);
                  setIsEditing(true);
                }}
              >
                <Pencil size={13} />
              </Button>
              {showDeleteConfirm ? (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-red-500">Delete?</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-red-500"
                    onClick={handleDelete}
                  >
                    Yes
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    No
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1 text-muted-foreground hover:text-red-500"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 size={13} />
                </Button>
              )}
            </>
          )}
        </div>

        {/* Reply editor */}
        {showReplyEditor && (
          <div className="mt-3 pl-10">
            <ReplyEditor
              onSubmit={async (content) => {
                await onReply(content, reply.id);
                setShowReplyEditor(false);
              }}
              onCancel={() => setShowReplyEditor(false)}
              placeholder={`Reply to ${reply.author?.full_name || 'this reply'}...`}
              autoFocus
              compact
            />
          </div>
        )}
      </div>

      {/* Nested replies */}
      {reply.children && reply.children.length > 0 && (
        <div>
          {reply.children.map((child) => (
            <ReplyThread
              key={child.id}
              reply={child}
              depth={depth + 1}
              postAuthorId={postAuthorId}
              currentUserId={currentUserId}
              isQuestion={isQuestion}
              onLike={onLike}
              onReply={onReply}
              onMarkSolution={onMarkSolution}
              onReplyUpdated={onReplyUpdated}
            />
          ))}
        </div>
      )}
    </div>
  );
}
