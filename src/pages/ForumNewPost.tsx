import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, X } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import {
  ForumCategory,
  ForumRegionalBoard,
  ForumTag,
  fetchCategories,
  fetchRegionalBoards,
  fetchTags,
  createPost,
} from '@/lib/forum';
import { toast } from 'sonner';

export default function ForumNewPost() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const preselectedCategory = searchParams.get('category');
  const preselectedBoard = searchParams.get('board');

  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [boards, setBoards] = useState<ForumRegionalBoard[]>([]);
  const [suggestedTags, setSuggestedTags] = useState<ForumTag[]>([]);

  const [postType, setPostType] = useState<'discussion' | 'question'>('discussion');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedBoardId, setSelectedBoardId] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadOptions();
  }, []);

  const loadOptions = async () => {
    const [cats, bds, defaultTags] = await Promise.all([
      fetchCategories(),
      fetchRegionalBoards(),
      fetchTags(undefined, 10),
    ]);
    setCategories(cats);
    setBoards(bds);
    setSuggestedTags(defaultTags);

    // Pre-select from URL params
    if (preselectedCategory) {
      const cat = cats.find((c) => c.slug === preselectedCategory);
      if (cat) setSelectedCategoryId(cat.id);
    }
    if (preselectedBoard) {
      const board = bds.find((b) => b.slug === preselectedBoard);
      if (board) setSelectedBoardId(board.id);
    }
  };

  const handleTagInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput.trim());
    }
  };

  const addTag = (tag: string) => {
    if (!tag || tags.length >= 5) return;
    const normalized = tag.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim();
    if (normalized && !tags.includes(normalized)) {
      setTags([...tags, normalized]);
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Please sign in to create a post');
      return;
    }
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }
    if (!content.trim()) {
      toast.error('Please enter some content');
      return;
    }
    if (!selectedCategoryId && !selectedBoardId) {
      toast.error('Please select a category or regional board');
      return;
    }

    setSubmitting(true);
    const post = await createPost(user.id, {
      title: title.trim(),
      content: content.trim(),
      post_type: postType,
      category_id: selectedCategoryId || undefined,
      regional_board_id: selectedBoardId || undefined,
      tags: tags.length > 0 ? tags : undefined,
    });

    if (post) {
      toast.success('Post created!');
      navigate(`/forums/post/${post.id}`);
    } else {
      toast.error('Failed to create post');
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto px-4 py-12 text-center">
          <h1 className="text-xl font-bold mb-2">Sign in required</h1>
          <p className="text-muted-foreground mb-4">
            You need to be signed in to create a post.
          </p>
          <Button onClick={() => navigate('/auth')}>Sign In</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/forums')}
          >
            <ArrowLeft size={20} />
          </Button>
          <h1 className="text-xl font-bold">Create New Post</h1>
        </div>

        <Card>
          <CardContent className="p-6 space-y-6">
            {/* Post Type */}
            <div className="space-y-2">
              <Label>Post Type</Label>
              <div className="flex gap-2">
                <Button
                  variant={postType === 'discussion' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPostType('discussion')}
                  className={postType === 'discussion' ? 'bg-forest hover:bg-forest/90' : ''}
                >
                  Discussion
                </Button>
                <Button
                  variant={postType === 'question' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPostType('question')}
                  className={postType === 'question' ? 'bg-forest hover:bg-forest/90' : ''}
                >
                  Question
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {postType === 'question'
                  ? 'Questions can have a reply marked as the accepted solution.'
                  : 'Discussions are open-ended conversations on a topic.'}
              </p>
            </div>

            {/* Category / Board selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={selectedCategoryId}
                  onValueChange={(v) => {
                    setSelectedCategoryId(v);
                    if (v) setSelectedBoardId('');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Regional Board</Label>
                <Select
                  value={selectedBoardId}
                  onValueChange={(v) => {
                    setSelectedBoardId(v);
                    if (v) setSelectedCategoryId('');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select board" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {boards.map((board) => (
                      <SelectItem key={board.id} value={board.id}>
                        {board.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  postType === 'question'
                    ? 'What would you like to know?'
                    : 'Give your post a descriptive title'
                }
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground text-right">
                {title.length}/200
              </p>
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Share your thoughts, insights, or question details..."
                rows={10}
                className="resize-y"
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label>Tags (up to 5)</Label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-0.5 hover:text-red-500"
                    >
                      <X size={12} />
                    </button>
                  </Badge>
                ))}
              </div>
              {tags.length < 5 && (
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagInput}
                  placeholder="Type a tag and press Enter"
                  className="text-sm"
                />
              )}
              {suggestedTags.length > 0 && tags.length < 5 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  <span className="text-xs text-muted-foreground mr-1">Popular:</span>
                  {suggestedTags
                    .filter((t) => !tags.includes(t.name))
                    .slice(0, 6)
                    .map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => addTag(tag.name)}
                        className="text-xs text-forest hover:underline"
                      >
                        {tag.name}
                      </button>
                    ))}
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => navigate('/forums')}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !title.trim() || !content.trim()}
                className="bg-forest hover:bg-forest/90"
              >
                {submitting ? 'Posting...' : 'Publish Post'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
