import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bookmark } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { PostCard } from '@/components/forum/PostCard';
import { ForumPost, fetchUserBookmarks, toggleForumBookmark } from '@/lib/forum';
import { toast } from 'sonner';

export default function ForumMyBookmarks() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadBookmarks();
  }, [user]);

  const loadBookmarks = async () => {
    if (!user) return;
    setLoading(true);
    const data = await fetchUserBookmarks(user.id, 50);
    setPosts(data);
    setLoading(false);
  };

  const handleRemoveBookmark = async (postId: string) => {
    if (!user) return;
    await toggleForumBookmark(user.id, postId);
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    toast.success('Bookmark removed');
  };

  if (!user) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto px-4 py-12 text-center">
          <p className="text-muted-foreground mb-4">Sign in to see your bookmarks.</p>
          <Button onClick={() => navigate('/auth')}>Sign In</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/forums')}>
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-2xl lg:text-3xl font-serif font-bold flex items-center gap-2">
              <Bookmark size={22} className="text-amber-500" />
              My Bookmarks
            </h1>
            <p className="text-sm text-muted-foreground">{posts.length} saved posts</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="mb-4">You haven't bookmarked any posts yet.</p>
            <Button
              variant="outline"
              onClick={() => navigate('/forums')}
            >
              Browse Forums
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <div key={post.id} className="relative">
                <PostCard post={post} />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveBookmark(post.id);
                  }}
                  className="absolute top-3 right-3 text-xs text-muted-foreground hover:text-red-500 bg-background/80 rounded px-2 py-1"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
