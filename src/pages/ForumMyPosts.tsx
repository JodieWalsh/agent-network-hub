import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { PostCard } from '@/components/forum/PostCard';
import { ForumPost, fetchUserPosts } from '@/lib/forum';

export default function ForumMyPosts() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [postType, setPostType] = useState('all');
  const [sort, setSort] = useState('latest');

  useEffect(() => {
    if (user) loadPosts();
  }, [user, postType, sort]);

  const loadPosts = async () => {
    if (!user) return;
    setLoading(true);
    const data = await fetchUserPosts(user.id, {
      postType: postType === 'all' ? undefined : postType,
      sort,
      limit: 50,
    });
    setPosts(data);
    setLoading(false);
  };

  if (!user) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto px-4 py-12 text-center">
          <p className="text-muted-foreground mb-4">Sign in to see your posts.</p>
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
            <h1 className="text-xl font-bold flex items-center gap-2">
              <FileText size={22} className="text-forest" />
              My Posts
            </h1>
            <p className="text-sm text-muted-foreground">{posts.length} posts</p>
          </div>
        </div>

        <div className="flex gap-2 mb-4 flex-wrap">
          <Select value={postType} onValueChange={setPostType}>
            <SelectTrigger className="w-[140px]">
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

          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">Newest</SelectItem>
              <SelectItem value="replies">Most Replies</SelectItem>
              <SelectItem value="likes">Most Likes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="mb-4">You haven't created any posts yet.</p>
            <Button
              onClick={() => navigate('/forums/new')}
              className="bg-forest hover:bg-forest/90"
            >
              Create Your First Post
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
