import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Filter, Crown, Lock } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { PostCard } from '@/components/forum/PostCard';
import {
  ForumCategory,
  ForumPost,
  PostSortOption,
  TimeRangeOption,
  fetchCategoryBySlug,
  fetchPosts,
  isPremiumCategory,
  userHasPremium,
} from '@/lib/forum';

export default function ForumCategoryView() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [category, setCategory] = useState<ForumCategory | null>(null);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [sort, setSort] = useState<PostSortOption>('latest');
  const [timeRange, setTimeRange] = useState<TimeRangeOption>('all');
  const [postType, setPostType] = useState<string>('all');
  const PAGE_SIZE = 10;

  useEffect(() => {
    if (slug) loadCategory();
  }, [slug]);

  useEffect(() => {
    if (category) loadPosts();
  }, [category, sort, timeRange, postType]);

  const loadCategory = async () => {
    setLoading(true);
    const cat = await fetchCategoryBySlug(slug!);
    setCategory(cat);
    if (!cat) setLoading(false);
  };

  const loadPosts = async () => {
    if (!category) return;
    setLoading(true);
    const result = await fetchPosts({
      categoryId: category.id,
      sort,
      timeRange,
      postType: postType !== 'all' ? postType : undefined,
      limit: PAGE_SIZE,
      offset: 0,
    });
    setPosts(result);
    setHasMore(result.length >= PAGE_SIZE);
    setLoading(false);
  };

  const loadMore = async () => {
    if (!category || loadingMore) return;
    setLoadingMore(true);
    const result = await fetchPosts({
      categoryId: category.id,
      sort,
      timeRange,
      postType: postType !== 'all' ? postType : undefined,
      limit: PAGE_SIZE,
      offset: posts.length,
    });
    setPosts((prev) => [...prev, ...result]);
    setHasMore(result.length >= PAGE_SIZE);
    setLoadingMore(false);
  };

  const isPremium = isPremiumCategory(category);
  const hasAccess = !isPremium || userHasPremium(profile?.subscription_tier) || profile?.role === 'admin';

  if (!loading && !category) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <h1 className="text-xl font-bold mb-2">Category not found</h1>
          <Button variant="outline" onClick={() => navigate('/forums')}>
            Back to Forums
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  if (!loading && isPremium && !hasAccess) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <Crown className="mx-auto mb-4 text-amber-500" size={48} />
          <h1 className="text-xl font-bold mb-2">Premium Category</h1>
          <p className="text-muted-foreground mb-6">
            <strong>{category?.name}</strong> is a Premium category. Upgrade your subscription to access exclusive content and discussions.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate('/forums')}>
              Back to Forums
            </Button>
            <Button onClick={() => navigate('/pricing')} className="bg-amber-500 hover:bg-amber-600">
              <Crown size={16} className="mr-1" />
              Upgrade to Premium
            </Button>
          </div>
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
            <BreadcrumbItem>
              <BreadcrumbPage>{category?.name || 'Loading...'}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Category Header */}
        {category && (
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{category.name}</h1>
                {category.is_premium_only && (
                  <Badge className="bg-amber-100 text-amber-700 border-amber-300 gap-1">
                    <Crown size={12} /> Premium
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground mt-1">{category.description}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {category.post_count} posts
              </p>
            </div>
            {user && (
              <Button
                onClick={() => navigate(`/forums/new?category=${category.slug}`)}
                className="bg-forest hover:bg-forest/90 flex-shrink-0"
              >
                <Plus size={16} className="mr-1" />
                New Post
              </Button>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Select value={sort} onValueChange={(v) => setSort(v as PostSortOption)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">Latest</SelectItem>
              <SelectItem value="popular">Popular</SelectItem>
              <SelectItem value="unanswered">Unanswered</SelectItem>
            </SelectContent>
          </Select>

          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRangeOption)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>

          <Select value={postType} onValueChange={setPostType}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="discussion">Discussions</SelectItem>
              <SelectItem value="question">Questions</SelectItem>
              <SelectItem value="poll">Polls</SelectItem>
              <SelectItem value="case_study">Case Studies</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Posts */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-20" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <h3 className="font-semibold mb-1">No posts yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Be the first to post in {category?.name}!
              </p>
              {user && (
                <Button
                  onClick={() => navigate(`/forums/new?category=${category?.slug}`)}
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
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
            {hasMore && (
              <div className="text-center pt-4">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? 'Loading...' : 'Load More'}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
