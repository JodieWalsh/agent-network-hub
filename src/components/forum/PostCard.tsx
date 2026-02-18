import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Eye, Pin, CheckCircle2, Camera, Lock, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ForumPost, formatPostDate, truncateContent, getUserTypeLabel } from '@/lib/forum';
import { UserBadges } from './UserBadges';

interface PostCardProps {
  post: ForumPost;
  mediaCount?: number;
}

export function PostCard({ post, mediaCount }: PostCardProps) {
  const navigate = useNavigate();

  const authorInitials = post.author?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || '?';

  return (
    <Card
      className="p-4 hover:bg-muted/30 transition-colors cursor-pointer"
      onClick={() => navigate(`/forums/post/${post.id}`)}
    >
      <div className="flex gap-3">
        {/* Author Avatar */}
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarImage src={post.author?.avatar_url || undefined} />
          <AvatarFallback className="bg-forest/10 text-forest text-sm">
            {authorInitials}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-start gap-2">
            {post.is_pinned && (
              <Pin size={14} className="text-amber-500 flex-shrink-0 mt-1" />
            )}
            {post.is_locked && (
              <Lock size={14} className="text-red-500 flex-shrink-0 mt-1" />
            )}
            {post.is_featured && (
              <Star size={14} className="text-yellow-500 flex-shrink-0 mt-1" />
            )}
            <h3 className="font-semibold text-foreground line-clamp-1 flex-1">
              {post.title}
            </h3>
            {post.post_type === 'question' && (
              <Badge
                variant="outline"
                className={cn(
                  'flex-shrink-0 text-xs',
                  post.is_solved
                    ? 'border-green-300 text-green-700 bg-green-50'
                    : 'border-amber-300 text-amber-700 bg-amber-50'
                )}
              >
                {post.is_solved ? (
                  <><CheckCircle2 size={12} className="mr-1" /> Solved</>
                ) : (
                  'Question'
                )}
              </Badge>
            )}
            {post.post_type === 'poll' && (
              <Badge
                variant="outline"
                className="flex-shrink-0 text-xs border-purple-300 text-purple-700 bg-purple-50"
              >
                Poll
              </Badge>
            )}
            {post.post_type === 'case_study' && (
              <Badge
                variant="outline"
                className="flex-shrink-0 text-xs border-indigo-300 text-indigo-700 bg-indigo-50"
              >
                Case Study
              </Badge>
            )}
            {post.is_endorsed && (
              <Badge
                variant="outline"
                className="flex-shrink-0 text-xs border-green-300 text-green-700 bg-green-50"
              >
                Staff Endorsed
              </Badge>
            )}
            {post.like_count >= 10 && post.is_solved && (
              <Badge
                variant="outline"
                className="flex-shrink-0 text-xs border-blue-300 text-blue-700 bg-blue-50"
              >
                Community Validated
              </Badge>
            )}
          </div>

          {/* Preview */}
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {truncateContent(post.content, 150)}
          </p>

          {/* Meta row */}
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="font-medium text-foreground/80">
                {post.author?.full_name || 'Unknown'}
              </span>
              {post.author && <UserBadges userId={post.author.id} />}
              <span className="hidden sm:inline">
                · {getUserTypeLabel(post.author?.user_type || '')}
              </span>
            </span>

            <span>{formatPostDate(post.created_at)}</span>

            <div className="flex items-center gap-3 ml-auto">
              {(mediaCount ?? post.media_count ?? 0) > 0 && (
                <span className="flex items-center gap-1 text-forest">
                  <Camera size={13} />
                  {mediaCount ?? post.media_count}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Heart size={13} />
                {post.like_count}
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle size={13} />
                {post.reply_count}
              </span>
              <span className="flex items-center gap-1 hidden sm:flex">
                <Eye size={13} />
                {post.view_count}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
