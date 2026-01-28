/**
 * MyInspectionWork.tsx
 *
 * Dashboard for inspectors to manage their inspection work:
 * - Bids submitted
 * - Jobs accepted and awaiting action
 * - Reports submitted awaiting payment
 * - Completed jobs
 * - Declined bids
 *
 * TODO: Future Enhancement - Earnings Dashboard
 * =============================================
 * Add a dedicated earnings section/tab showing:
 * - Total earned (after platform fees)
 * - Pending payments (submitted reports awaiting approval)
 * - Payment history with breakdown per job
 * - Total platform fees paid
 * - Monthly/yearly earnings reports
 * - CSV export functionality
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Clock,
  DollarSign,
  Calendar,
  MapPin,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Edit,
  Star,
  User,
  Sparkles,
  Target,
  TrendingUp,
  PartyPopper,
  Search,
  ClipboardList,
  Send,
  Trash2,
  MessageSquare,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getOrCreateConversation } from '@/lib/messaging';

// Types
type JobStatus = 'open' | 'pending_inspector_setup' | 'assigned' | 'in_progress' | 'pending_review' | 'completed' | 'cancelled';
type BidStatus = 'pending' | 'shortlisted' | 'accepted' | 'declined' | 'withdrawn';

interface InspectionJob {
  id: string;
  creator_id: string;
  property_address: string;
  property_type: string;
  budget_amount: number;
  status: JobStatus;
  created_at: string;
  agreed_price: number | null;
  agreed_date: string | null;
  assigned_inspector_id: string | null;
  client_brief_id: string | null;
  creator?: {
    full_name: string | null;
    reputation_score: number | null;
  };
  client_brief?: {
    brief_name: string;
  };
}

interface InspectionBid {
  id: string;
  job_id: string;
  inspector_id: string;
  proposed_price: number;
  proposed_date: string | null;
  message: string | null;
  status: BidStatus;
  created_at: string;
  job?: InspectionJob;
}

interface InspectorStats {
  completedJobs: number;
  averageRating: number;
  totalEarned: number;
}

// Tab configuration
const TABS = [
  { id: 'bids', label: 'My Bids', urgent: false },
  { id: 'accepted', label: 'Accepted - Action Required', urgent: true },
  { id: 'submitted', label: 'Reports Submitted', urgent: false },
  { id: 'completed', label: 'Completed', urgent: false },
  { id: 'declined', label: 'Declined', urgent: false },
];

// Helper to get auth headers
const getAuthHeaders = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  let accessToken = supabaseKey;
  try {
    const storageKey = `sb-${import.meta.env.VITE_SUPABASE_PROJECT_ID}-auth-token`;
    const storedSession = localStorage.getItem(storageKey);
    if (storedSession) {
      const parsed = JSON.parse(storedSession);
      accessToken = parsed?.access_token || supabaseKey;
    }
  } catch (e) {}

  return { supabaseUrl, supabaseKey, accessToken };
};

// Format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Calculate days difference
const getDaysDiff = (dateStr: string, fromNow = true) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffTime = fromNow ? now.getTime() - date.getTime() : date.getTime() - now.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

export default function MyInspectionWork() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('bids');

  // Data state
  const [myBids, setMyBids] = useState<InspectionBid[]>([]);
  const [acceptedJobs, setAcceptedJobs] = useState<InspectionJob[]>([]);
  const [submittedJobs, setSubmittedJobs] = useState<InspectionJob[]>([]);
  const [completedJobs, setCompletedJobs] = useState<InspectionJob[]>([]);
  const [declinedBids, setDeclinedBids] = useState<InspectionBid[]>([]);
  const [stats, setStats] = useState<InspectorStats>({ completedJobs: 0, averageRating: 0, totalEarned: 0 });

  // Dialog state
  const [withdrawBid, setWithdrawBid] = useState<InspectionBid | null>(null);

  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user]);

  const fetchAllData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { supabaseUrl, supabaseKey, accessToken } = getAuthHeaders();

      // Fetch all bids by this inspector
      const bidsResponse = await fetch(
        `${supabaseUrl}/rest/v1/inspection_bids?select=*,job:job_id(id,creator_id,property_address,property_type,budget_amount,status,created_at,agreed_price,agreed_date,assigned_inspector_id,client_brief_id)&inspector_id=eq.${user.id}&order=created_at.desc`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!bidsResponse.ok) throw new Error('Failed to fetch bids');
      const bidsData = await bidsResponse.json();

      // Fetch job creator profiles for the bids
      const bidsWithCreators = await Promise.all(
        (bidsData || []).map(async (bid: any) => {
          if (bid.job?.creator_id) {
            try {
              const creatorResponse = await fetch(
                `${supabaseUrl}/rest/v1/profiles?select=full_name,reputation_score&id=eq.${bid.job.creator_id}`,
                {
                  headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/vnd.pgrst.object+json',
                  },
                }
              );
              if (creatorResponse.ok) {
                const creator = await creatorResponse.json();
                bid.job.creator = creator;
              }
            } catch (e) {}

            // Fetch client brief if linked
            if (bid.job.client_brief_id) {
              try {
                const briefResponse = await fetch(
                  `${supabaseUrl}/rest/v1/client_briefs?select=brief_name&id=eq.${bid.job.client_brief_id}`,
                  {
                    headers: {
                      'apikey': supabaseKey,
                      'Authorization': `Bearer ${accessToken}`,
                      'Accept': 'application/vnd.pgrst.object+json',
                    },
                  }
                );
                if (briefResponse.ok) {
                  const brief = await briefResponse.json();
                  bid.job.client_brief = brief;
                }
              } catch (e) {}
            }
          }
          return bid;
        })
      );

      // Categorize bids
      const pendingBids = bidsWithCreators.filter(
        (b: InspectionBid) => b.status === 'pending' || b.status === 'shortlisted'
      );
      const declined = bidsWithCreators.filter((b: InspectionBid) => b.status === 'declined');

      setMyBids(pendingBids);
      setDeclinedBids(declined);

      // Fetch jobs assigned to this inspector
      const assignedJobsResponse = await fetch(
        `${supabaseUrl}/rest/v1/inspection_jobs?select=*&assigned_inspector_id=eq.${user.id}&order=created_at.desc`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (assignedJobsResponse.ok) {
        const assignedJobsData = await assignedJobsResponse.json();

        // Fetch creator info for each job
        const jobsWithCreators = await Promise.all(
          (assignedJobsData || []).map(async (job: any) => {
            if (job.creator_id) {
              try {
                const creatorResponse = await fetch(
                  `${supabaseUrl}/rest/v1/profiles?select=full_name,reputation_score&id=eq.${job.creator_id}`,
                  {
                    headers: {
                      'apikey': supabaseKey,
                      'Authorization': `Bearer ${accessToken}`,
                      'Accept': 'application/vnd.pgrst.object+json',
                    },
                  }
                );
                if (creatorResponse.ok) {
                  const creator = await creatorResponse.json();
                  job.creator = creator;
                }
              } catch (e) {}

              // Fetch client brief if linked
              if (job.client_brief_id) {
                try {
                  const briefResponse = await fetch(
                    `${supabaseUrl}/rest/v1/client_briefs?select=brief_name&id=eq.${job.client_brief_id}`,
                    {
                      headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${accessToken}`,
                        'Accept': 'application/vnd.pgrst.object+json',
                      },
                    }
                  );
                  if (briefResponse.ok) {
                    const brief = await briefResponse.json();
                    job.client_brief = brief;
                  }
                } catch (e) {}
              }
            }
            return job;
          })
        );

        // Categorize jobs
        const accepted = jobsWithCreators.filter(
          (j: InspectionJob) => j.status === 'pending_inspector_setup' || j.status === 'assigned' || j.status === 'in_progress'
        );
        const submitted = jobsWithCreators.filter((j: InspectionJob) => j.status === 'pending_review');
        const completed = jobsWithCreators.filter((j: InspectionJob) => j.status === 'completed');

        setAcceptedJobs(accepted);
        setSubmittedJobs(submitted);
        setCompletedJobs(completed);

        // Calculate stats (90% of agreed price after platform fee)
        const totalEarned = completed.reduce((sum: number, j: InspectionJob) => sum + Math.round((j.agreed_price || 0) * 0.90), 0);
        setStats({
          completedJobs: completed.length,
          averageRating: 4.8, // TODO: Calculate from actual reviews
          totalEarned,
        });
      }
    } catch (error) {
      console.error('Error fetching inspection work data:', error);
      toast.error('Failed to load your inspection work');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawBid = async () => {
    if (!withdrawBid || !user) return;

    try {
      const { supabaseUrl, supabaseKey, accessToken } = getAuthHeaders();

      const response = await fetch(
        `${supabaseUrl}/rest/v1/inspection_bids?id=eq.${withdrawBid.id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({ status: 'withdrawn' }),
        }
      );

      if (!response.ok) throw new Error('Failed to withdraw bid');

      toast.success('Bid withdrawn successfully');
      setWithdrawBid(null);
      fetchAllData();
    } catch (error) {
      console.error('Error withdrawing bid:', error);
      toast.error('Failed to withdraw bid');
    }
  };

  const handleSendMessage = async (recipientId: string, jobId?: string, jobAddress?: string) => {
    if (!user) return;
    try {
      const conversationId = await getOrCreateConversation(user.id, recipientId, jobId ? {
        jobId,
        contextType: 'inspection_job',
      } : undefined);
      const prefill = jobAddress
        ? encodeURIComponent(`Hi! I'm reaching out about the inspection job at ${jobAddress}.`)
        : '';
      const url = `/messages?conversation=${conversationId}${prefill ? `&prefill=${prefill}` : ''}`;
      navigate(url);
    } catch (error) {
      console.error('Failed to start conversation:', error);
      toast.error('Failed to start conversation');
    }
  };

  // Tab counts
  const tabCounts: Record<string, number> = {
    bids: myBids.length,
    accepted: acceptedJobs.length,
    submitted: submittedJobs.length,
    completed: completedJobs.length,
    declined: declinedBids.length,
  };

  // Empty state messages
  const emptyMessages: Record<string, { title: string; description: string; action?: { label: string; path: string } }> = {
    bids: {
      title: 'No pending bids',
      description: 'Browse Spotlights to find inspection opportunities!',
      action: { label: 'Browse Spotlights', path: '/inspections/spotlights' },
    },
    accepted: {
      title: 'No jobs waiting',
      description: 'Your next gig is out there! Keep an eye on the Spotlights board.',
    },
    submitted: {
      title: 'Nothing pending payment',
      description: 'Reports you submit will appear here while awaiting payment release.',
    },
    completed: {
      title: 'No completed work yet',
      description: 'Your first inspection awaits! Start by browsing available jobs.',
      action: { label: 'Find Jobs', path: '/inspections/spotlights' },
    },
    declined: {
      title: 'No declined bids',
      description: "That's great news! All your bids are still in the running.",
    },
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Sparkles className="h-12 w-12 text-forest animate-pulse mx-auto mb-4" />
            <p className="text-muted-foreground">Loading your inspection work...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-serif font-semibold text-foreground">My Inspection Work</h1>
        <p className="text-muted-foreground">Track your bids, jobs, and earnings</p>
      </div>

      {/* Payout Setup Reminder */}
      {profile && !profile.stripe_connect_onboarding_complete && (
        <Card className="mb-6 border-amber-200 bg-amber-50/50">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 rounded-lg flex-shrink-0">
                <Wallet className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-amber-800">Set up payouts to receive your earnings</p>
                <p className="text-sm text-amber-600 mt-1">
                  Connect your bank account so payments are sent directly to you when job posters approve your reports.
                </p>
              </div>
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white flex-shrink-0"
                onClick={() => navigate('/settings/billing')}
              >
                Set Up Payouts
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-forest/5 to-forest/10 border-forest/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-forest/10 rounded-lg">
                <Target className="h-5 w-5 text-forest" />
              </div>
              <div>
                <p className="text-2xl font-bold text-forest">{stats.completedJobs}</p>
                <p className="text-sm text-muted-foreground">Jobs completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Star className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-700">
                  {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '-'}
                </p>
                <p className="text-sm text-muted-foreground">Average rating</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-700">{formatCurrency(stats.totalEarned)}</p>
                <p className="text-sm text-muted-foreground">Total earned</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-6">
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className={cn(
                'relative',
                tab.urgent && tabCounts[tab.id] > 0 && 'data-[state=active]:bg-amber-100 data-[state=active]:text-amber-900'
              )}
            >
              <span className="truncate">{tab.label}</span>
              {tabCounts[tab.id] > 0 && (
                <Badge
                  variant="secondary"
                  className={cn(
                    'ml-2 h-5 min-w-[20px] px-1.5',
                    tab.urgent && tabCounts[tab.id] > 0
                      ? 'bg-amber-500 text-white'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {tabCounts[tab.id]}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* My Bids Tab */}
        <TabsContent value="bids" className="space-y-4">
          {myBids.length === 0 ? (
            <EmptyState {...emptyMessages.bids} />
          ) : (
            myBids.map((bid) => (
              <BidCard
                key={bid.id}
                bid={bid}
                onViewJob={() => navigate(`/inspections/spotlights/${bid.job_id}`)}
                onEditBid={() => navigate(`/inspections/spotlights/${bid.job_id}`)}
                onWithdraw={() => setWithdrawBid(bid)}
                onMessage={bid.job?.creator_id ? () => handleSendMessage(bid.job!.creator_id, bid.job_id, bid.job?.property_address) : undefined}
              />
            ))
          )}
        </TabsContent>

        {/* Accepted - Action Required Tab */}
        <TabsContent value="accepted" className="space-y-4">
          {acceptedJobs.length === 0 ? (
            <EmptyState {...emptyMessages.accepted} />
          ) : (
            acceptedJobs.map((job) => (
              <AcceptedJobCard
                key={job.id}
                job={job}
                onViewJob={() => navigate(`/inspections/spotlights/${job.id}`)}
                onCompleteReport={() => navigate(`/inspections/jobs/${job.id}/report`)}
                onMessage={() => handleSendMessage(job.creator_id, job.id, job.property_address)}
              />
            ))
          )}
        </TabsContent>

        {/* Reports Submitted Tab */}
        <TabsContent value="submitted" className="space-y-4">
          {submittedJobs.length === 0 ? (
            <EmptyState {...emptyMessages.submitted} />
          ) : (
            submittedJobs.map((job) => (
              <SubmittedJobCard
                key={job.id}
                job={job}
                onViewReport={() => navigate(`/inspections/jobs/${job.id}/report`)}
              />
            ))
          )}
        </TabsContent>

        {/* Completed Tab */}
        <TabsContent value="completed" className="space-y-4">
          {completedJobs.length === 0 ? (
            <EmptyState {...emptyMessages.completed} />
          ) : (
            completedJobs.map((job) => (
              <CompletedJobCard
                key={job.id}
                job={job}
                onViewReport={() => navigate(`/inspections/jobs/${job.id}/report`)}
                onLeaveReview={() => toast.info('Review feature coming soon!')}
              />
            ))
          )}
        </TabsContent>

        {/* Declined Tab */}
        <TabsContent value="declined" className="space-y-4">
          {declinedBids.length === 0 ? (
            <EmptyState {...emptyMessages.declined} />
          ) : (
            <>
              <div className="text-center py-2 px-4 bg-muted/50 rounded-lg mb-4">
                <p className="text-sm text-muted-foreground">
                  Don't be discouraged! Every inspector faces competition. Keep bidding and improving your profile.
                </p>
              </div>
              {declinedBids.map((bid) => (
                <DeclinedBidCard key={bid.id} bid={bid} />
              ))}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Withdraw Bid Dialog */}
      <AlertDialog open={!!withdrawBid} onOpenChange={() => setWithdrawBid(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Withdraw this bid?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to withdraw your bid of {withdrawBid && formatCurrency(withdrawBid.proposed_price)} for{' '}
              {withdrawBid?.job?.property_address}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleWithdrawBid} className="bg-red-600 hover:bg-red-700">
              Withdraw Bid
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

// ===========================================
// SUB-COMPONENTS
// ===========================================

function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: { label: string; path: string };
}) {
  const navigate = useNavigate();

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <Search className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
        {action && (
          <Button onClick={() => navigate(action.path)} className="bg-forest hover:bg-forest/90">
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function BidCard({
  bid,
  onViewJob,
  onEditBid,
  onWithdraw,
  onMessage,
}: {
  bid: InspectionBid;
  onViewJob: () => void;
  onEditBid: () => void;
  onWithdraw: () => void;
  onMessage?: () => void;
}) {
  const daysSinceBid = getDaysDiff(bid.created_at);
  const isShortlisted = bid.status === 'shortlisted';

  return (
    <Card className={cn(isShortlisted && 'border-amber-300 bg-amber-50/30')}>
      <CardContent className="pt-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Property Address */}
            <div className="flex items-start gap-2 mb-2">
              <MapPin className="h-4 w-4 text-forest mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-foreground line-clamp-1">
                  {bid.job?.property_address || 'Address not available'}
                </h3>
                <p className="text-sm text-muted-foreground capitalize">
                  {bid.job?.property_type?.replace('_', ' ')}
                </p>
              </div>
            </div>

            {/* Job Creator */}
            {bid.job?.creator && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <User className="h-4 w-4" />
                <span>{bid.job.creator.full_name || 'Anonymous'}</span>
                {bid.job.creator.reputation_score && (
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                    {bid.job.creator.reputation_score.toFixed(1)}
                  </span>
                )}
              </div>
            )}

            {/* Budget */}
            <div className="flex items-center gap-2 text-sm mb-3">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span>Budget: {formatCurrency(bid.job?.budget_amount || 0)}</span>
            </div>

            {/* Your Bid Details */}
            <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Your bid:</span>
                <span className="font-semibold text-forest">{formatCurrency(bid.proposed_price)}</span>
              </div>
              {bid.proposed_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {new Date(bid.proposed_date).toLocaleDateString('en-AU', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              )}
              <Badge
                variant="outline"
                className={cn(
                  isShortlisted
                    ? 'bg-amber-100 text-amber-700 border-amber-300'
                    : 'bg-gray-100 text-gray-600'
                )}
              >
                {isShortlisted ? 'Shortlisted' : 'Pending'}
              </Badge>
            </div>

            {/* Earnings Preview */}
            <div className="flex items-center gap-1.5 mt-2 text-sm text-emerald-700">
              <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
              <span>You'll earn <strong>{formatCurrency(Math.round(bid.proposed_price * 0.90))}</strong> if selected</span>
              <span className="text-emerald-600 text-xs">(10% platform fee)</span>
            </div>

            {/* Status Message */}
            <p className={cn('text-sm mt-1', isShortlisted ? 'text-amber-700 font-medium' : 'text-muted-foreground')}>
              {isShortlisted ? "You're being considered!" : 'Waiting for response'}
              <span className="text-muted-foreground font-normal"> · {daysSinceBid} day{daysSinceBid !== 1 ? 's' : ''} ago</span>
            </p>
          </div>

          {/* Actions */}
          <div className="flex sm:flex-col gap-2">
            <Button variant="outline" size="sm" onClick={onViewJob}>
              <Eye className="h-4 w-4 mr-1" />
              View Job
            </Button>
            <Button variant="outline" size="sm" onClick={onEditBid}>
              <Edit className="h-4 w-4 mr-1" />
              Edit Bid
            </Button>
            {onMessage && (
              <Button variant="outline" size="sm" onClick={onMessage} className="text-forest border-forest/30 hover:bg-forest/5">
                <MessageSquare className="h-4 w-4 mr-1" />
                Message
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onWithdraw} className="text-red-600 hover:text-red-700 hover:bg-red-50">
              <Trash2 className="h-4 w-4 mr-1" />
              Withdraw
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AcceptedJobCard({
  job,
  onViewJob,
  onCompleteReport,
  onMessage,
}: {
  job: InspectionJob;
  onViewJob: () => void;
  onCompleteReport: () => void;
  onMessage?: () => void;
}) {
  const navigate = useNavigate();
  const inspectionDate = job.agreed_date ? new Date(job.agreed_date) : null;
  const now = new Date();
  const isPastInspection = inspectionDate && inspectionDate < now;
  const daysUntil = inspectionDate ? getDaysDiff(job.agreed_date!, false) : null;
  const isPendingSetup = job.status === 'pending_inspector_setup';

  return (
    <Card className={cn(
      'overflow-hidden',
      isPendingSetup
        ? 'border-amber-300 bg-gradient-to-r from-amber-50 to-amber-100/30'
        : 'border-amber-300 bg-gradient-to-r from-amber-50 to-amber-100/30'
    )}>
      {/* Banner */}
      {isPendingSetup ? (
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 flex items-center gap-2">
          <Wallet className="h-4 w-4 text-white" />
          <span className="text-white font-medium text-sm">Almost there! Complete payout setup to start this job</span>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-2 flex items-center gap-2">
          <PartyPopper className="h-4 w-4 text-white" />
          <span className="text-white font-medium text-sm">You got the gig!</span>
        </div>
      )}

      <CardContent className="pt-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Property Address */}
            <button onClick={onViewJob} className="text-left group">
              <div className="flex items-start gap-2 mb-2">
                <MapPin className="h-4 w-4 text-forest mt-0.5 flex-shrink-0" />
                <h3 className="font-medium text-foreground group-hover:text-forest transition-colors line-clamp-1">
                  {job.property_address}
                </h3>
              </div>
            </button>

            {/* Client Brief Badge */}
            {job.client_brief && (
              <Badge variant="outline" className="mb-2 bg-purple-50 text-purple-700 border-purple-200">
                <FileText className="h-3 w-3 mr-1" />
                {job.client_brief.brief_name}
              </Badge>
            )}

            {/* Job Creator */}
            {job.creator && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <User className="h-4 w-4" />
                <span>{job.creator.full_name || 'Anonymous'}</span>
              </div>
            )}

            {/* Pending Setup Message */}
            {isPendingSetup && (
              <div className="p-3 bg-amber-100 border border-amber-300 rounded-lg mb-3">
                <div className="flex items-start gap-2">
                  <Wallet className="h-4 w-4 text-amber-700 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      Your bid was accepted! Set up your payout account to get officially assigned.
                    </p>
                    <p className="text-xs text-amber-600 mt-1">
                      Connect your bank account so you can receive payments when your reports are approved.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Agreed Terms with Earnings */}
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg mb-3">
              <div className="flex flex-wrap items-center gap-4 mb-2">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-muted-foreground">Agreed fee:</span>
                  <span className="font-medium text-green-700">{formatCurrency(job.agreed_price || 0)}</span>
                </div>
                {inspectionDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-forest" />
                    <span className="text-sm">
                      {inspectionDate.toLocaleDateString('en-AU', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                )}
              </div>
              <div className="text-sm">
                <span className="text-emerald-700 font-semibold">
                  Your earnings: {formatCurrency(Math.round((job.agreed_price || 0) * 0.90))}
                </span>
                <span className="text-emerald-600 text-xs ml-2">(after 10% platform fee)</span>
              </div>
            </div>

            {/* Inspection Date Status (only for fully assigned jobs) */}
            {!isPendingSetup && daysUntil !== null && (
              <p className={cn('text-sm', isPastInspection ? 'text-amber-700' : 'text-muted-foreground')}>
                {isPastInspection ? (
                  <>
                    <AlertCircle className="h-4 w-4 inline mr-1" />
                    Inspection was {Math.abs(daysUntil)} day{Math.abs(daysUntil) !== 1 ? 's' : ''} ago · Ready to submit your report?
                  </>
                ) : daysUntil === 0 ? (
                  'Inspection is today!'
                ) : (
                  `${daysUntil} day${daysUntil !== 1 ? 's' : ''} until inspection`
                )}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {isPendingSetup ? (
              <Button onClick={() => navigate('/settings/billing')} className="bg-amber-600 hover:bg-amber-700" size="lg">
                <Wallet className="h-4 w-4 mr-2" />
                Set Up Payouts
              </Button>
            ) : (
              <Button onClick={onCompleteReport} className="bg-forest hover:bg-forest/90" size="lg">
                <ClipboardList className="h-4 w-4 mr-2" />
                Complete Report
              </Button>
            )}
            {onMessage && (
              <Button variant="outline" size="sm" onClick={onMessage} className="text-forest border-forest/30 hover:bg-forest/5">
                <MessageSquare className="h-4 w-4 mr-2" />
                Message Client
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onViewJob} className="text-muted-foreground">
              View Job Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SubmittedJobCard({
  job,
  onViewReport,
}: {
  job: InspectionJob;
  onViewReport: () => void;
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Property Address */}
            <div className="flex items-start gap-2 mb-2">
              <MapPin className="h-4 w-4 text-forest mt-0.5 flex-shrink-0" />
              <h3 className="font-medium text-foreground line-clamp-1">{job.property_address}</h3>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <span>Awaiting payment release from {job.creator?.full_name || 'requester'}</span>
            </div>

            {/* Earnings */}
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-amber-600" />
              <span className="font-semibold text-amber-700">
                {formatCurrency(Math.round((job.agreed_price || 0) * 0.90))} pending
              </span>
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                Awaiting Approval
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Job total: {formatCurrency(job.agreed_price || 0)} &middot; 10% platform fee applies
            </p>
          </div>

          <Button variant="outline" onClick={onViewReport}>
            <FileText className="h-4 w-4 mr-1" />
            View Report
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CompletedJobCard({
  job,
  onViewReport,
  onLeaveReview,
}: {
  job: InspectionJob;
  onViewReport: () => void;
  onLeaveReview: () => void;
}) {
  // TODO: Fetch actual review data
  const hasReview = false;
  const review = null;

  return (
    <Card className="bg-green-50/30 border-green-200">
      <CardContent className="pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Property Address */}
            <div className="flex items-start gap-2 mb-2">
              <MapPin className="h-4 w-4 text-forest mt-0.5 flex-shrink-0" />
              <h3 className="font-medium text-foreground line-clamp-1">{job.property_address}</h3>
            </div>

            {/* Completion Date */}
            <p className="text-sm text-muted-foreground mb-2">
              Completed {new Date(job.created_at).toLocaleDateString('en-AU', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>

            {/* Earnings */}
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="font-semibold text-green-700">
                {formatCurrency(Math.round((job.agreed_price || 0) * 0.90))} earned
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Job total: {formatCurrency(job.agreed_price || 0)} &middot; Platform fee: {formatCurrency(Math.round((job.agreed_price || 0) * 0.10))}
            </p>

            {/* Review (if any) */}
            {hasReview && review && (
              <div className="flex items-center gap-2 text-sm">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="h-4 w-4 text-amber-500 fill-amber-500" />
                  ))}
                </div>
                <span className="text-muted-foreground">from {job.creator?.full_name}</span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onViewReport}>
              <FileText className="h-4 w-4 mr-1" />
              View Report
            </Button>
            {!hasReview && (
              <Button variant="outline" size="sm" onClick={onLeaveReview}>
                <Star className="h-4 w-4 mr-1" />
                Leave Review
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DeclinedBidCard({ bid }: { bid: InspectionBid }) {
  return (
    <Card className="bg-muted/30 border-muted">
      <CardContent className="pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 opacity-70">
          <div className="flex-1 min-w-0">
            {/* Property Address */}
            <div className="flex items-start gap-2 mb-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <h3 className="font-medium text-muted-foreground line-clamp-1">
                {bid.job?.property_address || 'Address not available'}
              </h3>
            </div>

            {/* Your Bid */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              <span>Your bid: {formatCurrency(bid.proposed_price)}</span>
            </div>

            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Not selected this time</span>
            </div>
          </div>

          <Badge variant="outline" className="bg-muted text-muted-foreground">
            Declined
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
