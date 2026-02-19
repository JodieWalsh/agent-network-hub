import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Heart, CheckCircle2, TrendingUp, ArrowLeft } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PostCard } from '@/components/forum/PostCard';
import {
  ForumPost,
  fetchStaffPicks,
  fetchCommunityFavorites,
  fetchMostHelpful,
  fetchWeeksBest,
} from '@/lib/forum';

export default function ForumFeatured() {
  const navigate = useNavigate();

  const [staffPicks, setStaffPicks] = useState<ForumPost[]>([]);
  const [favorites, setFavorites] = useState<ForumPost[]>([]);
  const [helpful, setHelpful] = useState<ForumPost[]>([]);
  const [weeksBest, setWeeksBest] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [sp, fav, help, wb] = await Promise.all([
      fetchStaffPicks(),
      fetchCommunityFavorites(),
      fetchMostHelpful(),
      fetchWeeksBest(),
    ]);
    setStaffPicks(sp);
    setFavorites(fav);
    setHelpful(help);
    setWeeksBest(wb);
    setLoading(false);
  };

  const renderPostList = (posts: ForumPost[], emptyMsg: string) => {
    if (loading) {
      return (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-20" /></CardContent></Card>
          ))}
        </div>
      );
    }
    if (posts.length === 0) {
      return (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {emptyMsg}
          </CardContent>
        </Card>
      );
    }
    return (
      <div className="space-y-2">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/forums')}>
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-2xl lg:text-3xl font-serif font-bold flex items-center gap-2">
              <Star className="text-yellow-500" size={26} />
              Featured & Best Of
            </h1>
            <p className="text-muted-foreground text-sm">The best content from our community</p>
          </div>
        </div>

        <Tabs defaultValue="staff-picks">
          <TabsList className="mb-4">
            <TabsTrigger value="staff-picks" className="gap-1">
              <Star size={14} /> Staff Picks
            </TabsTrigger>
            <TabsTrigger value="favorites" className="gap-1">
              <Heart size={14} /> Community Favorites
            </TabsTrigger>
            <TabsTrigger value="helpful" className="gap-1">
              <CheckCircle2 size={14} /> Most Helpful
            </TabsTrigger>
            <TabsTrigger value="weeks-best" className="gap-1">
              <TrendingUp size={14} /> This Week
            </TabsTrigger>
          </TabsList>

          <TabsContent value="staff-picks">
            {renderPostList(staffPicks, 'No staff picks yet. Check back soon!')}
          </TabsContent>

          <TabsContent value="favorites">
            {renderPostList(favorites, 'No posts yet. Start a discussion!')}
          </TabsContent>

          <TabsContent value="helpful">
            {renderPostList(helpful, 'No solved questions yet. Ask a question and get answers!')}
          </TabsContent>

          <TabsContent value="weeks-best">
            {renderPostList(weeksBest, 'No posts this week yet.')}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
