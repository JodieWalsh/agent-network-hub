import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Flag,
  Search,
  Eye,
  XCircle,
  Trash2,
  BarChart3,
  Users,
  FileText,
  AlertTriangle,
  ExternalLink,
  Pin,
  Lock,
  Star,
  CheckCircle2,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import {
  ForumReport,
  ForumPost,
  fetchAllReports,
  dismissReport,
  actionReport,
  fetchForumStats,
  fetchReportedUsers,
  adminSearchPosts,
  adminUpdatePost,
  formatPostDate,
  getUserTypeLabel,
  PostAuthor,
} from '@/lib/forum';
import { toast } from 'sonner';

export default function ForumAdmin() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [reports, setReports] = useState<ForumReport[]>([]);
  const [stats, setStats] = useState({ postsThisWeek: 0, postsThisMonth: 0, pendingReports: 0, totalUsers: 0 });
  const [reportedUsers, setReportedUsers] = useState<Array<{ user_id: string; report_count: number; author?: PostAuthor }>>([]);
  const [searchResults, setSearchResults] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [reportFilter, setReportFilter] = useState('pending');

  useEffect(() => {
    if (profile?.role !== 'admin') {
      toast.error('Access denied');
      navigate('/forums');
      return;
    }
    loadData();
  }, [profile]);

  const loadData = async () => {
    setLoading(true);
    const [reps, st, users] = await Promise.all([
      fetchAllReports(reportFilter),
      fetchForumStats(),
      fetchReportedUsers(),
    ]);
    setReports(reps);
    setStats(st);
    setReportedUsers(users);
    setLoading(false);
  };

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchAllReports(reportFilter).then(setReports);
    }
  }, [reportFilter]);

  const handleDismiss = async (reportId: string) => {
    if (!user) return;
    const success = await dismissReport(reportId, user.id);
    if (success) {
      toast.success('Report dismissed');
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      setStats((s) => ({ ...s, pendingReports: Math.max(0, s.pendingReports - 1) }));
    } else {
      toast.error('Failed to dismiss report');
    }
  };

  const handleAction = async (reportId: string) => {
    if (!user) return;
    const success = await actionReport(reportId, user.id);
    if (success) {
      toast.success('Content removed and report resolved');
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      setStats((s) => ({ ...s, pendingReports: Math.max(0, s.pendingReports - 1) }));
    } else {
      toast.error('Failed to action report');
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    const results = await adminSearchPosts(searchQuery.trim());
    setSearchResults(results);
    setSearching(false);
  };

  const handleQuickAction = async (postId: string, action: string) => {
    let updates: Record<string, boolean | string> = {};
    switch (action) {
      case 'pin': updates = { is_pinned: true }; break;
      case 'unpin': updates = { is_pinned: false }; break;
      case 'lock': updates = { is_locked: true }; break;
      case 'unlock': updates = { is_locked: false }; break;
      case 'feature': updates = { is_featured: true }; break;
      case 'unfeature': updates = { is_featured: false }; break;
      case 'remove': updates = { status: 'removed' }; break;
      default: return;
    }
    const success = await adminUpdatePost(postId, updates);
    if (success) {
      toast.success(`Post ${action}${action.endsWith('e') ? 'd' : 'ed'}`);
      if (searchResults.length > 0) handleSearch();
    } else {
      toast.error('Failed to update post');
    }
  };

  const reasonLabel = (r: string) => ({
    spam: 'Spam',
    harassment: 'Harassment',
    misinformation: 'Misinformation',
    off_topic: 'Off Topic',
    inappropriate: 'Inappropriate',
    other: 'Other',
  }[r] || r);

  if (profile?.role !== 'admin') return null;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Shield className="text-purple-600" size={28} />
          <div>
            <h1 className="text-2xl lg:text-3xl font-serif font-bold">Forum Moderation</h1>
            <p className="text-muted-foreground text-sm">Manage reports, content, and community health</p>
          </div>
        </div>

        {/* Stats */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><CardContent className="p-4"><Skeleton className="h-16" /></CardContent></Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <FileText className="mx-auto mb-1 text-forest" size={20} />
                <div className="text-2xl font-bold">{stats.postsThisWeek}</div>
                <div className="text-xs text-muted-foreground">Posts this week</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <BarChart3 className="mx-auto mb-1 text-blue-500" size={20} />
                <div className="text-2xl font-bold">{stats.postsThisMonth}</div>
                <div className="text-xs text-muted-foreground">Posts this month</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <AlertTriangle className="mx-auto mb-1 text-amber-500" size={20} />
                <div className="text-2xl font-bold">{stats.pendingReports}</div>
                <div className="text-xs text-muted-foreground">Pending reports</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Users className="mx-auto mb-1 text-purple-500" size={20} />
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
                <div className="text-xs text-muted-foreground">Forum users</div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="reports">
          <TabsList className="mb-4">
            <TabsTrigger value="reports" className="gap-1">
              <Flag size={14} /> Reports {stats.pendingReports > 0 && <Badge variant="destructive" className="ml-1 text-xs px-1.5">{stats.pendingReports}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="content" className="gap-1">
              <Search size={14} /> Content
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-1">
              <Users size={14} /> Users
            </TabsTrigger>
          </TabsList>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <div className="flex items-center gap-3 mb-4">
              <Select value={reportFilter} onValueChange={setReportFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                  <SelectItem value="actioned">Actioned</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">{reports.length} reports</span>
            </div>

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}><CardContent className="p-4"><Skeleton className="h-20" /></CardContent></Card>
                ))}
              </div>
            ) : reports.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <CheckCircle2 className="mx-auto mb-2 text-green-500" size={32} />
                  <p>No {reportFilter === 'all' ? '' : reportFilter} reports</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {reports.map((report) => (
                  <Card key={report.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {reasonLabel(report.reason)}
                            </Badge>
                            <Badge variant={
                              report.status === 'pending' ? 'destructive' :
                              report.status === 'actioned' ? 'default' : 'secondary'
                            } className="text-xs">
                              {report.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatPostDate(report.created_at)}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground mb-1">
                            Reported by: <span className="font-medium text-foreground">{report.reporter?.full_name || 'Unknown'}</span>
                          </div>
                          {report.details && (
                            <p className="text-sm text-muted-foreground">{report.details}</p>
                          )}
                          <div className="text-xs text-muted-foreground mt-1">
                            {report.post_id ? `Post ID: ${report.post_id.substring(0, 8)}...` : ''}
                            {report.reply_id ? `Reply ID: ${report.reply_id.substring(0, 8)}...` : ''}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          {report.post_id && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1"
                              onClick={() => window.open(`/forums/post/${report.post_id}`, '_blank')}
                            >
                              <Eye size={14} />
                              View
                            </Button>
                          )}
                          {report.status === 'pending' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1"
                                onClick={() => handleDismiss(report.id)}
                              >
                                <XCircle size={14} />
                                Dismiss
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="gap-1"
                                onClick={() => handleAction(report.id)}
                              >
                                <Trash2 size={14} />
                                Remove
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="content">
            <div className="flex gap-2 mb-4">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search posts by keyword or author..."
                className="flex-1"
              />
              <Button variant="outline" onClick={handleSearch} disabled={searching}>
                {searching ? 'Searching...' : 'Search'}
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-3">
                {searchResults.map((post) => (
                  <Card key={post.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-sm truncate">{post.title}</h3>
                            {post.is_pinned && <Pin size={13} className="text-amber-500" />}
                            {post.is_locked && <Lock size={13} className="text-red-500" />}
                            {post.is_featured && <Star size={13} className="text-yellow-500" />}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            by {post.author?.full_name || 'Unknown'} · {formatPostDate(post.created_at)} · {post.like_count} likes · {post.reply_count} replies
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0 flex-wrap">
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs"
                            onClick={() => window.open(`/forums/post/${post.id}`, '_blank')}>
                            <ExternalLink size={12} />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs"
                            onClick={() => handleQuickAction(post.id, post.is_pinned ? 'unpin' : 'pin')}>
                            <Pin size={12} className={post.is_pinned ? 'text-amber-500' : ''} />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs"
                            onClick={() => handleQuickAction(post.id, post.is_locked ? 'unlock' : 'lock')}>
                            <Lock size={12} className={post.is_locked ? 'text-red-500' : ''} />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs"
                            onClick={() => handleQuickAction(post.id, post.is_featured ? 'unfeature' : 'feature')}>
                            <Star size={12} className={post.is_featured ? 'text-yellow-500' : ''} />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-red-500"
                            onClick={() => handleQuickAction(post.id, 'remove')}>
                            <Trash2 size={12} />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {searchResults.length === 0 && searchQuery && !searching && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No posts found
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Most Reported Users</CardTitle>
              </CardHeader>
              <CardContent>
                {reportedUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No reported users</p>
                ) : (
                  <div className="space-y-3">
                    {reportedUsers.map((u) => {
                      const initials = u.author?.full_name?.split(' ').map((n) => n[0]).join('').toUpperCase() || '?';
                      return (
                        <div key={u.user_id} className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={u.author?.avatar_url || undefined} />
                            <AvatarFallback className="bg-red-50 text-red-600 text-sm">{initials}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="text-sm font-medium">{u.author?.full_name || 'Unknown'}</div>
                            <div className="text-xs text-muted-foreground">
                              {getUserTypeLabel(u.author?.user_type || '')}
                            </div>
                          </div>
                          <Badge variant="destructive" className="text-xs">
                            {u.report_count} report{u.report_count !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
