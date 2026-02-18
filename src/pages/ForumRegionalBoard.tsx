import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, MapPin, Users } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { useAuth } from '@/contexts/AuthContext';
import { PostCard } from '@/components/forum/PostCard';
import {
  ForumRegionalBoard as RegionalBoard,
  ForumPost,
  PostSortOption,
  TimeRangeOption,
  fetchRegionalBoardBySlug,
  fetchPosts,
  toggleBoardMembership,
  checkBoardMembership,
} from '@/lib/forum';
import { toast } from 'sonner';

export default function ForumRegionalBoard() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [board, setBoard] = useState<RegionalBoard | null>(null);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [togglingMembership, setTogglingMembership] = useState(false);
  const [sort, setSort] = useState<PostSortOption>('latest');
  const [timeRange, setTimeRange] = useState<TimeRangeOption>('all');
  const [postType, setPostType] = useState<string>('all');
  const PAGE_SIZE = 10;

  useEffect(() => {
    if (slug) loadBoard();
  }, [slug]);

  useEffect(() => {
    if (board) loadPosts();
  }, [board, sort, timeRange, postType]);

  useEffect(() => {
    if (board && user) {
      checkBoardMembership(user.id, board.id).then(setIsMember);
    }
  }, [board, user]);

  const loadBoard = async () => {
    setLoading(true);
    const b = await fetchRegionalBoardBySlug(slug!);
    setBoard(b);
    if (!b) setLoading(false);
  };

  const loadPosts = async () => {
    if (!board) return;
    setLoading(true);
    const result = await fetchPosts({
      regionalBoardId: board.id,
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
    if (!board || loadingMore) return;
    setLoadingMore(true);
    const result = await fetchPosts({
      regionalBoardId: board.id,
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

  const handleToggleMembership = async () => {
    if (!user || !board) return;
    setTogglingMembership(true);
    const result = await toggleBoardMembership(user.id, board.id);
    setIsMember(result.joined);
    toast.success(result.joined ? `Joined ${board.name} board` : `Left ${board.name} board`);
    setTogglingMembership(false);
  };

  if (!loading && !board) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <h1 className="text-xl font-bold mb-2">Board not found</h1>
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
            <BreadcrumbItem>
              <BreadcrumbPage>{board?.name || 'Loading...'}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Board Header */}
        {board && (
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <MapPin size={24} className="text-forest" />
                {board.name}
              </h1>
              <p className="text-muted-foreground mt-1">{board.description}</p>
              <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users size={14} />
                  {board.member_count} members
                </span>
                <span>{board.post_count} posts</span>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {user && (
                <>
                  <Button
                    variant={isMember ? 'outline' : 'default'}
                    onClick={handleToggleMembership}
                    disabled={togglingMembership}
                    className={isMember ? '' : 'bg-forest hover:bg-forest/90'}
                  >
                    {isMember ? 'Leave Board' : 'Join Board'}
                  </Button>
                  <Button
                    onClick={() => navigate(`/forums/new?board=${board.slug}`)}
                    className="bg-forest hover:bg-forest/90"
                  >
                    <Plus size={16} className="mr-1" />
                    New Post
                  </Button>
                </>
              )}
            </div>
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
                Be the first to post in the {board?.name} board!
              </p>
              {user && (
                <Button
                  onClick={() => navigate(`/forums/new?board=${board?.slug}`)}
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
