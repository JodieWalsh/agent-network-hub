import { useState } from 'react';
import { Heart, Reply, CheckCircle2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ForumReply, formatPostDate, getUserTypeLabel } from '@/lib/forum';
import { ReplyEditor } from './ReplyEditor';

interface ReplyThreadProps {
  reply: ForumReply;
  depth?: number;
  postAuthorId: string;
  currentUserId?: string;
  isQuestion?: boolean;
  onLike: (replyId: string) => void;
  onReply: (content: string, parentReplyId: string) => Promise<void>;
  onMarkSolution: (replyId: string) => void;
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
}: ReplyThreadProps) {
  const [showReplyEditor, setShowReplyEditor] = useState(false);

  const authorInitials = reply.author?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || '?';

  const isPostAuthor = reply.author_id === postAuthorId;
  const canMarkSolution = isQuestion && currentUserId === postAuthorId && !reply.is_solution;
  const canReply = depth < 1; // Max 2-level nesting

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
        <div className="text-sm text-foreground whitespace-pre-wrap pl-10">
          {reply.content}
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
