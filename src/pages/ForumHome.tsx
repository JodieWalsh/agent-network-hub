import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  TrendingUp,
  MapPin,
  MessagesSquare,
  Scale,
  ClipboardCheck,
  Target,
  Laptop,
  Calendar,
  Banknote,
  Palette,
  Briefcase,
  MessageCircle,
  Crown,
  Star,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { PostCard } from '@/components/forum/PostCard';
import { ForumSidebar } from '@/components/forum/ForumSidebar';
import {
  ForumCategory,
  ForumRegionalBoard,
  ForumPost,
  ForumUserStats,
  PostAuthor,
  fetchCategories,
  fetchRegionalBoards,
  fetchPosts,
  fetchUserStats,
  fetchTopContributors,
  searchPosts,
} from '@/lib/forum';
import { cn } from '@/lib/utils';

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  TrendingUp,
  Scale,
  ClipboardCheck,
  Target,
  Laptop,
  Calendar,
  Banknote,
  Palette,
  Briefcase,
  MessageCircle,
};

export default function ForumHome() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [boards, setBoards] = useState<ForumRegionalBoard[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<ForumPost[]>([]);
  const [unansweredPosts, setUnansweredPosts] = useState<ForumPost[]>([]);
  const [userStats, setUserStats] = useState<ForumUserStats | null>(null);
  const [topContributors, setTopContributors] = useState<(ForumUserStats & { author?: PostAuthor })[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ForumPost[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [loadingMoreTrending, setLoadingMoreTrending] = useState(false);
  const [hasMoreTrending, setHasMoreTrending] = useState(true);
  const TRENDING_PAGE_SIZE = 10;

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    const [cats, bds, trending, unanswered, contributors] = await Promise.all([
      fetchCategories(),
      fetchRegionalBoards(),
      fetchPosts({ sort: 'popular', limit: 10, timeRange: 'week' }),
      fetchPosts({ sort: 'unanswered', limit: 5 }),
      fetchTopContributors(5),
    ]);

    setCategories(cats);
    setBoards(bds);
    setTrendingPosts(trending);
    setHasMoreTrending(trending.length >= TRENDING_PAGE_SIZE);
    setUnansweredPosts(unanswered);
    setTopContributors(contributors);

    if (user) {
      const stats = await fetchUserStats(user.id);
      setUserStats(stats);
    }

    setLoading(false);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    setSearching(true);
    const results = await searchPosts(searchQuery.trim());
    setSearchResults(results);
    setSearching(false);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const loadMoreTrending = async () => {
    if (loadingMoreTrending) return;
    setLoadingMoreTrending(true);
    const more = await fetchPosts({
      sort: 'popular',
      limit: TRENDING_PAGE_SIZE,
      offset: trendingPosts.length,
      timeRange: 'week',
    });
    setTrendingPosts((prev) => [...prev, ...more]);
    setHasMoreTrending(more.length >= TRENDING_PAGE_SIZE);
    setLoadingMoreTrending(false);
  };

  const totalPosts = categories.reduce((sum, c) => sum + c.post_count, 0);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <MessagesSquare className="text-forest" size={28} />
              Community Forums
            </h1>
            <p className="text-muted-foreground mt-1">
              Connect, share knowledge, and grow with fellow professionals
            </p>
          </div>
          {user && (
            <Button
              onClick={() => navigate('/forums/new')}
              className="bg-forest hover:bg-forest/90"
            >
              <Plus size={16} className="mr-1" />
              New Post
            </Button>
          )}
        </div>

        {/* Stats Bar */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
          <span>{totalPosts} posts</span>
          <span>·</span>
          <span>{categories.length} categories</span>
          <span>·</span>
          <span>{boards.length} regional boards</span>
        </div>

        {/* Search */}
        <div className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!e.target.value.trim()) setSearchResults(null);
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search forums..."
              className="pl-9"
            />
          </div>
          <Button variant="outline" onClick={handleSearch} disabled={searching}>
            {searching ? 'Searching...' : 'Search'}
          </Button>
        </div>

        {/* Search Results */}
        {searchResults !== null ? (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">
                Search Results ({searchResults.length})
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchResults(null);
                  setSearchQuery('');
                }}
              >
                Clear search
              </Button>
            </div>
            {searchResults.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No posts found matching "{searchQuery}"
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {searchResults.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Main Content */
          <div className="flex gap-6">
            <div className="flex-1 min-w-0">
              <Tabs defaultValue="categories">
                <TabsList className="mb-4">
                  <TabsTrigger value="categories">Categories</TabsTrigger>
                  <TabsTrigger value="regional">Regional</TabsTrigger>
                  <TabsTrigger value="trending">Trending</TabsTrigger>
                </TabsList>

                {/* Categories Tab */}
                <TabsContent value="categories">
                  {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <Card key={i}><CardContent className="p-4"><Skeleton className="h-16" /></CardContent></Card>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {categories.map((category) => {
                        const Icon = CATEGORY_ICONS[category.icon] || MessageCircle;
                        return (
                          <Card
                            key={category.id}
                            className="hover:bg-muted/30 transition-colors cursor-pointer"
                            onClick={() => navigate(`/forums/category/${category.slug}`)}
                          >
                            <CardContent className="p-4 flex items-start gap-3">
                              <div className={cn('p-2 rounded-lg bg-muted/50', category.color)}>
                                <Icon size={20} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <h3 className="font-semibold text-sm">{category.name}</h3>
                                  {category.is_premium_only && (
                                    <Crown size={13} className="text-amber-500 flex-shrink-0" />
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                  {category.description}
                                </p>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {category.post_count} posts
                                  {category.is_premium_only && <span className="ml-1 text-amber-600 font-medium">· Premium</span>}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>

                {/* Regional Tab */}
                <TabsContent value="regional">
                  {loading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Card key={i}><CardContent className="p-4"><Skeleton className="h-12" /></CardContent></Card>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {boards.map((board) => (
                        <Card
                          key={board.id}
                          className="hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => navigate(`/forums/region/${board.slug}`)}
                        >
                          <CardContent className="p-4 flex items-center gap-3">
                            <MapPin size={18} className="text-forest flex-shrink-0" />
                            <div className="flex-1">
                              <h3 className="font-semibold text-sm">{board.name}</h3>
                              <p className="text-xs text-muted-foreground">
                                {board.description}
                              </p>
                            </div>
                            <div className="text-right text-xs text-muted-foreground flex-shrink-0">
                              <div>{board.post_count} posts</div>
                              <div>{board.member_count} members</div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Trending Tab */}
                <TabsContent value="trending">
                  {loading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Card key={i}><CardContent className="p-4"><Skeleton className="h-20" /></CardContent></Card>
                      ))}
                    </div>
                  ) : trendingPosts.length === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <MessagesSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                        <h3 className="font-semibold text-foreground mb-1">No posts yet</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Be the first to start a discussion!
                        </p>
                        {user && (
                          <Button
                            onClick={() => navigate('/forums/new')}
                            className="bg-forest hover:bg-forest/90"
                          >
                            <Plus size={16} className="mr-1" />
                            Create Post
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      {trendingPosts.map((post) => (
                        <PostCard key={post.id} post={post} />
                      ))}
                      {hasMoreTrending && (
                        <div className="text-center pt-4">
                          <Button
                            variant="outline"
                            onClick={loadMoreTrending}
                            disabled={loadingMoreTrending}
                          >
                            {loadingMoreTrending ? 'Loading...' : 'Load More'}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            {/* Sidebar (desktop only) */}
            <div className="hidden lg:block w-72 flex-shrink-0">
              <ForumSidebar
                userStats={userStats}
                topContributors={topContributors}
                unansweredPosts={unansweredPosts}
                loading={loading}
              />
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
