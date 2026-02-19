import { useNavigate } from 'react-router-dom';
import { Trophy, HelpCircle, FileText, Bookmark, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ForumUserStats, ForumPost, PostAuthor, getUserTypeLabel } from '@/lib/forum';

interface ForumSidebarProps {
  userStats: ForumUserStats | null;
  topContributors: (ForumUserStats & { author?: PostAuthor })[];
  unansweredPosts: ForumPost[];
  loading?: boolean;
}

export function ForumSidebar({
  userStats,
  topContributors,
  unansweredPosts,
  loading = false,
}: ForumSidebarProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="space-y-4">
        <Card><CardContent className="p-4"><Skeleton className="h-24" /></CardContent></Card>
        <Card><CardContent className="p-4"><Skeleton className="h-32" /></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* My Activity */}
      {userStats && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Your Activity</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-muted/50 rounded-lg p-2">
                <div className="text-lg font-bold font-serif text-forest">{userStats.post_count}</div>
                <div className="text-xs text-muted-foreground">Posts</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-2">
                <div className="text-lg font-bold font-serif text-forest">{userStats.reply_count}</div>
                <div className="text-xs text-muted-foreground">Replies</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-2">
                <div className="text-lg font-bold text-forest">{userStats.reputation_points}</div>
                <div className="text-xs text-muted-foreground">Reputation</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-2">
                <div className="text-lg font-bold text-forest">{userStats.solutions_count}</div>
                <div className="text-xs text-muted-foreground">Solutions</div>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs gap-1"
                onClick={() => navigate('/forums/my-posts')}
              >
                <FileText size={13} />
                My Posts
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs gap-1"
                onClick={() => navigate('/forums/my-bookmarks')}
              >
                <Bookmark size={13} />
                Bookmarks
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs gap-1 mt-2"
              onClick={() => navigate('/forums/featured')}
            >
              <Star size={13} className="text-yellow-500" />
              Featured & Best Of
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Top Contributors */}
      {topContributors.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <Trophy size={14} className="text-amber-500" />
              Top Contributors
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {topContributors.map((contributor, index) => {
              const initials = contributor.author?.full_name
                ?.split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase() || '?';

              return (
                <div key={contributor.user_id} className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground w-4">
                    {index + 1}
                  </span>
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={contributor.author?.avatar_url || undefined} />
                    <AvatarFallback className="bg-forest/10 text-forest text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {contributor.author?.full_name || 'Unknown'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {contributor.reputation_points} pts
                    </div>
                  </div>
                </div>
              );
            })}
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-forest mt-1"
              onClick={() => navigate('/forums/leaderboard')}
            >
              View Full Leaderboard
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Unanswered Questions */}
      {unansweredPosts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <HelpCircle size={14} className="text-amber-500" />
              Needs an Answer
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {unansweredPosts.slice(0, 5).map((post) => (
              <button
                key={post.id}
                onClick={() => navigate(`/forums/post/${post.id}`)}
                className="w-full text-left hover:bg-muted/50 rounded p-1.5 transition-colors"
              >
                <div className="text-sm font-medium line-clamp-1">{post.title}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                  <span>{post.author?.full_name || 'Unknown'}</span>
                  <span>·</span>
                  <span>{post.view_count} views</span>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
