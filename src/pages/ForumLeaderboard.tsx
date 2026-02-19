import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Medal } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ForumUserStats,
  PostAuthor,
  fetchLeaderboard,
  getUserTypeLabel,
} from '@/lib/forum';
import { UserBadges } from '@/components/forum/UserBadges';
import { cn } from '@/lib/utils';

export default function ForumLeaderboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'all' | 'month'>('all');
  const [leaders, setLeaders] = useState<(ForumUserStats & { author?: PostAuthor })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, [tab]);

  const loadLeaderboard = async () => {
    setLoading(true);
    const data = await fetchLeaderboard(tab, 25);
    setLeaders(data);
    setLoading(false);
  };

  const rankColors = ['text-yellow-500', 'text-gray-400', 'text-amber-600'];

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/forums')}>
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-2xl lg:text-3xl font-serif font-bold flex items-center gap-2">
              <Trophy size={22} className="text-amber-500" />
              Leaderboard
            </h1>
            <p className="text-sm text-muted-foreground">Top community contributors</p>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <Button
            variant={tab === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTab('all')}
            className={tab === 'all' ? 'bg-forest hover:bg-forest/90' : ''}
          >
            All Time
          </Button>
          <Button
            variant={tab === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTab('month')}
            className={tab === 'month' ? 'bg-forest hover:bg-forest/90' : ''}
          >
            This Month
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-14" />
                ))}
              </div>
            ) : leaders.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No contributors yet
              </div>
            ) : (
              <div className="divide-y">
                {leaders.map((leader, index) => {
                  const initials = leader.author?.full_name
                    ?.split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase() || '?';

                  return (
                    <div
                      key={leader.user_id}
                      className={cn(
                        'flex items-center gap-4 px-4 py-3',
                        index < 3 && 'bg-amber-50/50'
                      )}
                    >
                      <div className="w-8 text-center">
                        {index < 3 ? (
                          <Medal size={20} className={rankColors[index]} />
                        ) : (
                          <span className="text-sm font-medium text-muted-foreground">
                            {index + 1}
                          </span>
                        )}
                      </div>

                      <Avatar className="h-10 w-10">
                        <AvatarImage src={leader.author?.avatar_url || undefined} />
                        <AvatarFallback className="bg-forest/10 text-forest">
                          {initials}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm flex items-center gap-1.5">
                          {leader.author?.full_name || 'Unknown'}
                          <UserBadges userId={leader.user_id} />
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {getUserTypeLabel(leader.author?.user_type || '')}
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-4 text-center hidden sm:grid">
                        <div>
                          <div className="text-sm font-bold">{leader.post_count}</div>
                          <div className="text-xs text-muted-foreground">Posts</div>
                        </div>
                        <div>
                          <div className="text-sm font-bold">{leader.reply_count}</div>
                          <div className="text-xs text-muted-foreground">Replies</div>
                        </div>
                        <div>
                          <div className="text-sm font-bold">{leader.solutions_count}</div>
                          <div className="text-xs text-muted-foreground">Solutions</div>
                        </div>
                        <div>
                          <div className="text-sm font-bold text-forest">{leader.reputation_points}</div>
                          <div className="text-xs text-muted-foreground">Rep</div>
                        </div>
                      </div>

                      <div className="sm:hidden">
                        <span className="text-sm font-bold text-forest">{leader.reputation_points}</span>
                        <span className="text-xs text-muted-foreground ml-1">pts</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
