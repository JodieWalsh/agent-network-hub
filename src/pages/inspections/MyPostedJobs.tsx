/**
 * MyPostedJobs.tsx
 *
 * Dashboard for buyers agents to manage their posted inspection jobs.
 * Shows jobs organized by status with bid management functionality.
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  MessageSquare,
  DollarSign,
  Calendar,
  MapPin,
  Home,
  FileText,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  Zap,
  Eye,
  Edit,
  Trash2,
  Star,
  User,
  History,
  Plus,
  ClipboardList,
  ChevronDown,
  Shield,
  Lock,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { notifyBidAccepted, notifyBidDeclined, notifyJobCancelled } from '@/lib/notifications';
import { getOrCreateConversation } from '@/lib/messaging';

// Types
type JobStatus = 'open' | 'in_negotiation' | 'assigned' | 'in_progress' | 'pending_review' | 'completed' | 'cancelled' | 'expired';
type BidStatus = 'pending' | 'shortlisted' | 'accepted' | 'declined' | 'withdrawn';
type PaymentStatus = 'pending' | 'paid' | 'released' | 'refunded';

interface InspectionJob {
  id: string;
  title: string;
  property_address: string;
  property_city: string;
  property_state: string;
  property_type: string;
  budget_min: number;
  budget_max: number;
  status: JobStatus;
  payment_status: PaymentStatus | null;
  created_at: string;
  inspection_date_from: string;
  inspection_date_to: string;
  expires_at: string | null;
  client_brief_id: string | null;
  assigned_inspector_id: string | null;
  agreed_price: number | null;
  agreed_date: string | null;
  bid_count?: number;
  bids?: InspectionBid[];
  client_brief?: {
    brief_name: string;
    client_name: string;
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
  updated_at: string;
  years_experience: number | null;
  local_knowledge_note: string | null;
  inspector?: {
    full_name: string | null;
    user_type: string;
    reputation_score: number;
    avatar_url: string | null;
  };
  history?: BidHistoryEntry[];
}

interface BidHistoryEntry {
  id: string;
  change_type: string;
  previous_price: number | null;
  new_price: number | null;
  previous_date: string | null;
  new_date: string | null;
  change_reason: string | null;
  changed_at: string;
}

// Tab configuration
const TABS = [
  { id: 'awaiting', label: 'Awaiting Bids', filter: (j: InspectionJob) => j.status === 'open' && (!j.bid_count || j.bid_count === 0) },
  { id: 'received', label: 'Bids Received', filter: (j: InspectionJob) => j.status === 'open' && j.bid_count && j.bid_count > 0, urgent: true },
  { id: 'progress', label: 'In Progress', filter: (j: InspectionJob) => ['assigned', 'in_progress'].includes(j.status) },
  { id: 'reports', label: 'Reports Ready', filter: (j: InspectionJob) => j.status === 'pending_review', urgent: true },
  { id: 'completed', label: 'Completed', filter: (j: InspectionJob) => j.status === 'completed' },
  { id: 'cancelled', label: 'Cancelled/Expired', filter: (j: InspectionJob) => ['cancelled', 'expired'].includes(j.status) },
];

// Status badge configuration
const STATUS_CONFIG: Record<JobStatus, { label: string; color: string; icon: typeof Clock }> = {
  open: { label: 'Open', color: 'bg-green-100 text-green-800 border-green-200', icon: Clock },
  in_negotiation: { label: 'Negotiating', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: MessageSquare },
  assigned: { label: 'Assigned', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: User },
  in_progress: { label: 'In Progress', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: Zap },
  pending_review: { label: 'Report Ready', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: FileText },
  completed: { label: 'Completed', color: 'bg-gray-100 text-gray-800 border-gray-200', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
  expired: { label: 'Expired', color: 'bg-gray-100 text-gray-500 border-gray-200', icon: AlertCircle },
};

// Helper to get auth headers for raw fetch
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

export default function MyPostedJobs() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [jobs, setJobs] = useState<InspectionJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() => {
    // Initialize from URL param if present, otherwise default to 'awaiting'
    const tabParam = searchParams.get('tab');
    const validTabs = ['awaiting', 'received', 'progress', 'reports', 'completed', 'cancelled'];
    return tabParam && validTabs.includes(tabParam) ? tabParam : 'awaiting';
  });

  // Bid management state
  const [selectedJob, setSelectedJob] = useState<InspectionJob | null>(null);
  const [bids, setBids] = useState<InspectionBid[]>([]);
  const [loadingBids, setLoadingBids] = useState(false);
  const [showBidsDialog, setShowBidsDialog] = useState(false);

  // Accept/Decline confirmation - now includes job for inline bid actions
  const [confirmAction, setConfirmAction] = useState<{ type: 'accept' | 'decline' | 'cancel'; bid?: InspectionBid; job: InspectionJob } | null>(null);

  // Bid detail view
  const [viewingBid, setViewingBid] = useState<{ bid: InspectionBid; job: InspectionJob } | null>(null);

  useEffect(() => {
    if (user) {
      fetchJobs();
    }
  }, [user]);

  const fetchJobs = async () => {
    if (!user) return;

    try {
      const { supabaseUrl, supabaseKey, accessToken } = getAuthHeaders();

      // Fetch jobs
      const response = await fetch(
        `${supabaseUrl}/rest/v1/inspection_jobs?select=*,client_briefs:client_brief_id(brief_name,client_name)&requesting_agent_id=eq.${user.id}&order=created_at.desc`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch jobs');

      const jobsData = await response.json();

      // Fetch bids with inspector profiles for each job
      const jobsWithBids = await Promise.all(
        jobsData.map(async (job: any) => {
          const bidResponse = await fetch(
            `${supabaseUrl}/rest/v1/inspection_bids?select=*,inspector:inspector_id(full_name,user_type,reputation_score,avatar_url)&job_id=eq.${job.id}&order=created_at.desc`,
            {
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${accessToken}`,
              },
            }
          );

          const bidsData = await bidResponse.json();
          const bids = Array.isArray(bidsData) ? bidsData : [];
          const pendingBids = bids.filter((b: any) => b.status === 'pending');

          return {
            ...job,
            client_brief: job.client_briefs,
            bids: bids,
            bid_count: pendingBids.length,
          };
        })
      );

      setJobs(jobsWithBids);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast.error('Failed to load your jobs');
    } finally {
      setLoading(false);
    }
  };

  const fetchBidsForJob = async (job: InspectionJob) => {
    setLoadingBids(true);
    setSelectedJob(job);
    setShowBidsDialog(true);

    try {
      const { supabaseUrl, supabaseKey, accessToken } = getAuthHeaders();

      // Fetch bids with inspector profile
      const response = await fetch(
        `${supabaseUrl}/rest/v1/inspection_bids?select=*,inspector:inspector_id(full_name,user_type,reputation_score,avatar_url)&job_id=eq.${job.id}&order=created_at.desc`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch bids');

      const bidsData = await response.json();

      // Fetch bid history for each bid
      const bidsWithHistory = await Promise.all(
        bidsData.map(async (bid: any) => {
          const historyResponse = await fetch(
            `${supabaseUrl}/rest/v1/inspection_bid_history?select=*&bid_id=eq.${bid.id}&order=changed_at.desc`,
            {
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${accessToken}`,
              },
            }
          );

          const historyData = await historyResponse.json();
          return {
            ...bid,
            history: Array.isArray(historyData) ? historyData : [],
          };
        })
      );

      setBids(bidsWithHistory);
    } catch (error) {
      console.error('Error fetching bids:', error);
      toast.error('Failed to load bids');
    } finally {
      setLoadingBids(false);
    }
  };

  const handleAcceptBid = async (bid: InspectionBid, job?: InspectionJob) => {
    const targetJob = job || selectedJob;
    if (!user || !targetJob) return;

    try {
      const { supabaseUrl, supabaseKey, accessToken } = getAuthHeaders();

      // 1. Update the accepted bid status
      await fetch(
        `${supabaseUrl}/rest/v1/inspection_bids?id=eq.${bid.id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'accepted', updated_at: new Date().toISOString() }),
        }
      );

      // 2. Decline other pending bids for this job
      await fetch(
        `${supabaseUrl}/rest/v1/inspection_bids?job_id=eq.${targetJob.id}&id=neq.${bid.id}&status=eq.pending`,
        {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'declined', updated_at: new Date().toISOString() }),
        }
      );

      // 3. Update the job status to assigned
      await fetch(
        `${supabaseUrl}/rest/v1/inspection_jobs?id=eq.${targetJob.id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'assigned',
            assigned_inspector_id: bid.inspector_id,
            agreed_price: bid.proposed_price,
            agreed_date: bid.proposed_date,
            assigned_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
        }
      );

      // 4. Send notifications
      try {
        // Notify the accepted inspector
        await notifyBidAccepted(
          bid.inspector_id,                              // inspectorId
          targetJob.property_address,                    // propertyAddress
          targetJob.id,                                  // jobId
          bid.id,                                        // bidId
          user?.id || ''                                 // jobCreatorId
        );

        // Notify other inspectors whose bids were declined
        const otherBids = targetJob.bids?.filter(b => b.id !== bid.id && b.status === 'pending') || [];
        for (const declinedBid of otherBids) {
          await notifyBidDeclined(
            declinedBid.inspector_id,
            targetJob.id,
            declinedBid.id,
            targetJob.title || targetJob.property_address,
            'Another bid was accepted'
          );
        }
      } catch (notifError) {
        console.error('Failed to send notifications:', notifError);
        // Don't fail the accept if notifications fail
      }

      toast.success('Bid accepted! The inspector has been assigned.');
      setShowBidsDialog(false);
      setConfirmAction(null);
      fetchJobs();
    } catch (error) {
      console.error('Error accepting bid:', error);
      toast.error('Failed to accept bid');
    }
  };

  const handleDeclineBid = async (bid: InspectionBid) => {
    try {
      const { supabaseUrl, supabaseKey, accessToken } = getAuthHeaders();

      await fetch(
        `${supabaseUrl}/rest/v1/inspection_bids?id=eq.${bid.id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'declined', updated_at: new Date().toISOString() }),
        }
      );

      // Notify the inspector
      try {
        const job = selectedJob || jobs.find(j => j.bids?.some(b => b.id === bid.id));
        if (job) {
          await notifyBidDeclined(
            bid.inspector_id,
            job.id,
            bid.id,
            job.title || job.property_address,
            'The job creator has chosen to decline your bid'
          );
        }
      } catch (notifError) {
        console.error('Failed to send notification:', notifError);
      }

      toast.success('Bid declined');
      setConfirmAction(null);

      // Refresh bids
      if (selectedJob) {
        fetchBidsForJob(selectedJob);
      }
    } catch (error) {
      console.error('Error declining bid:', error);
      toast.error('Failed to decline bid');
    }
  };

  const handleCancelJob = async (job: InspectionJob) => {
    try {
      const { supabaseUrl, supabaseKey, accessToken } = getAuthHeaders();

      // Determine if refund is applicable (paid but no bid accepted)
      const shouldRefund = job.payment_status === 'paid' && job.status === 'open';

      await fetch(
        `${supabaseUrl}/rest/v1/inspection_jobs?id=eq.${job.id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'cancelled',
            payment_status: shouldRefund ? 'refunded' : job.payment_status,
            updated_at: new Date().toISOString(),
          }),
        }
      );

      // Notify any bidders that the job has been cancelled
      try {
        const pendingBids = job.bids?.filter(b => b.status === 'pending') || [];
        for (const bid of pendingBids) {
          await notifyJobCancelled(
            bid.inspector_id,
            job.id,
            job.title || job.property_address
          );
        }
      } catch (notifError) {
        console.error('Failed to send cancellation notifications:', notifError);
      }

      if (shouldRefund) {
        toast.success('Job cancelled. Your escrowed payment will be refunded.');
      } else {
        toast.success('Job cancelled');
      }
      setConfirmAction(null);
      fetchJobs();
    } catch (error) {
      console.error('Error cancelling job:', error);
      toast.error('Failed to cancel job');
    }
  };

  const handleSendMessage = async (recipientId: string) => {
    if (!user) return;
    try {
      const conversationId = await getOrCreateConversation(user.id, recipientId);
      navigate(`/messages?conversation=${conversationId}`);
    } catch (error) {
      console.error('Failed to start conversation:', error);
      toast.error('Failed to start conversation');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
    }).format(amount); // Amount is stored in dollars, not cents
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getDaysRemaining = (expiresAt: string | null, inspectionDateTo: string) => {
    const endDate = expiresAt ? new Date(expiresAt) : new Date(inspectionDateTo);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Get counts for each tab
  const getTabCounts = () => {
    return TABS.reduce((acc, tab) => {
      acc[tab.id] = jobs.filter(tab.filter).length;
      return acc;
    }, {} as Record<string, number>);
  };

  const tabCounts = getTabCounts();

  // Empty state messages
  const emptyMessages: Record<string, { title: string; description: string; action?: { label: string; path: string } }> = {
    awaiting: {
      title: 'No jobs awaiting bids',
      description: 'Post your first inspection spotlight to find qualified inspectors!',
      action: { label: 'Post a Job', path: '/inspections/jobs/new' },
    },
    received: {
      title: 'No bids received yet',
      description: 'Good things take time! Your open jobs will attract bids soon.',
    },
    progress: {
      title: 'No inspections in progress',
      description: 'Accept a bid to get an inspection started.',
    },
    reports: {
      title: 'No reports ready for review',
      description: 'Reports will appear here once inspectors submit them.',
    },
    completed: {
      title: 'No completed inspections',
      description: 'Your completed inspections and reports will appear here.',
    },
    cancelled: {
      title: 'No cancelled or expired jobs',
      description: 'That\'s a good thing! All your jobs are active.',
    },
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-forest border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-muted-foreground">Loading your jobs...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-serif font-semibold text-foreground">My Posted Jobs</h1>
            <p className="text-muted-foreground">Manage your inspection requests and review bids</p>
          </div>
          <Button onClick={() => navigate('/inspections/jobs/new')} className="bg-forest hover:bg-forest/90">
            <Plus size={16} className="mr-2" />
            Post New Job
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6 mb-6">
            {TABS.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className="relative">
                {tab.label}
                {tabCounts[tab.id] > 0 && (
                  <Badge
                    variant="secondary"
                    className={cn(
                      'ml-2 h-5 min-w-[20px] px-1.5',
                      tab.urgent && tabCounts[tab.id] > 0
                        ? 'bg-red-500 text-white'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {tabCounts[tab.id]}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {TABS.map((tab) => {
            const filteredJobs = jobs.filter(tab.filter);

            return (
              <TabsContent key={tab.id} value={tab.id} className="space-y-4">
                {filteredJobs.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="py-12 text-center">
                      <ClipboardList size={48} className="mx-auto mb-4 text-muted-foreground/50" />
                      <h3 className="text-lg font-medium mb-2">{emptyMessages[tab.id].title}</h3>
                      <p className="text-muted-foreground mb-4">{emptyMessages[tab.id].description}</p>
                      {emptyMessages[tab.id].action && (
                        <Button onClick={() => navigate(emptyMessages[tab.id].action!.path)}>
                          {emptyMessages[tab.id].action!.label}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  filteredJobs.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      tabId={tab.id}
                      onViewBids={() => fetchBidsForJob(job)}
                      onEdit={() => navigate(`/inspections/jobs/${job.id}/edit`)}
                      onCancel={() => setConfirmAction({ type: 'cancel', job })}
                      onViewDetails={() => navigate(`/inspections/spotlights/${job.id}`)}
                      onViewReport={() => navigate(`/inspections/jobs/${job.id}/report/view`)}
                      onAcceptBid={(bid, j) => setConfirmAction({ type: 'accept', bid, job: j })}
                      onDeclineBid={(bid, j) => setConfirmAction({ type: 'decline', bid, job: j })}
                      onViewBidDetails={(bid, j) => setViewingBid({ bid, job: j })}
                      onMessage={handleSendMessage}
                      formatCurrency={formatCurrency}
                      formatDate={formatDate}
                      getDaysRemaining={getDaysRemaining}
                    />
                  ))
                )}
              </TabsContent>
            );
          })}
        </Tabs>

        {/* Bids Dialog */}
        <Dialog open={showBidsDialog} onOpenChange={setShowBidsDialog}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Review Bids</DialogTitle>
              <DialogDescription>
                {selectedJob?.title} - {selectedJob?.property_address}
              </DialogDescription>
            </DialogHeader>

            {loadingBids ? (
              <div className="py-8 text-center">
                <div className="animate-spin w-6 h-6 border-2 border-forest border-t-transparent rounded-full mx-auto mb-2" />
                <p className="text-muted-foreground">Loading bids...</p>
              </div>
            ) : bids.length === 0 ? (
              <div className="py-8 text-center">
                <Users size={40} className="mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground">No bids received yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {bids.map((bid) => (
                  <BidCard
                    key={bid.id}
                    bid={bid}
                    onAccept={() => setConfirmAction({ type: 'accept', bid })}
                    onDecline={() => setConfirmAction({ type: 'decline', bid })}
                    onMessage={() => handleSendMessage(bid.inspector_id)}
                    formatCurrency={formatCurrency}
                    formatDate={formatDate}
                  />
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Confirmation Dialog */}
        <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {confirmAction?.type === 'accept' && 'Accept This Bid?'}
                {confirmAction?.type === 'decline' && 'Decline This Bid?'}
                {confirmAction?.type === 'cancel' && 'Cancel This Job?'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {confirmAction?.type === 'accept' && confirmAction.bid && (
                  <div className="space-y-4">
                    <p>
                      You're accepting <strong>{confirmAction.bid.inspector?.full_name}</strong>'s bid of <strong>{formatCurrency(confirmAction.bid.proposed_price)}</strong> for this inspection.
                    </p>
                    {confirmAction.job?.payment_status === 'paid' && (
                      <div className="p-3 bg-emerald-100 rounded-lg text-sm border border-emerald-300">
                        <div className="flex items-center gap-2 mb-2">
                          <Shield className="h-4 w-4 text-emerald-700" />
                          <p className="font-medium text-emerald-800">Payment Already Secured</p>
                        </div>
                        <p className="text-emerald-700">
                          Your payment of {formatCurrency(confirmAction.bid.proposed_price)} is held in escrow and will be released to the inspector when you approve their report.
                        </p>
                      </div>
                    )}
                    <div className="p-3 bg-muted/50 rounded-lg text-sm">
                      <p className="font-medium text-muted-foreground mb-2">Payment breakdown when released:</p>
                      <div className="space-y-1 text-muted-foreground">
                        <div className="flex justify-between">
                          <span>├── {confirmAction.bid.inspector?.full_name} receives:</span>
                          <span>{formatCurrency(Math.round(confirmAction.bid.proposed_price * 0.90))}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>└── Platform fee:</span>
                          <span>{formatCurrency(Math.round(confirmAction.bid.proposed_price * 0.10))}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      All other pending bids will be automatically declined.
                    </p>
                  </div>
                )}
                {confirmAction?.type === 'decline' && (
                  <>
                    Are you sure you want to decline this bid from {confirmAction.bid?.inspector?.full_name}?
                    They will be notified of your decision.
                  </>
                )}
                {confirmAction?.type === 'cancel' && (
                  <div className="space-y-4">
                    <p>
                      Are you sure you want to cancel "{confirmAction.job?.title}"?
                    </p>
                    {confirmAction.job?.payment_status === 'paid' && (
                      <div className="p-3 bg-blue-50 rounded-lg text-sm border border-blue-200">
                        <div className="flex items-center gap-2 mb-2">
                          <RefreshCw className="h-4 w-4 text-blue-600" />
                          <p className="font-medium text-blue-800">Refund Eligible</p>
                        </div>
                        <p className="text-blue-700">
                          Since no bid has been accepted yet, you will receive a <strong>full refund</strong> of your escrowed payment.
                        </p>
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Any pending bids will be notified. This action cannot be undone.
                    </p>
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className={cn(
                  confirmAction?.type === 'accept' && 'bg-green-600 hover:bg-green-700',
                  confirmAction?.type === 'decline' && 'bg-amber-600 hover:bg-amber-700',
                  confirmAction?.type === 'cancel' && 'bg-red-600 hover:bg-red-700'
                )}
                onClick={() => {
                  if (confirmAction?.type === 'accept' && confirmAction.bid && confirmAction.job) {
                    handleAcceptBid(confirmAction.bid, confirmAction.job);
                  } else if (confirmAction?.type === 'decline' && confirmAction.bid) {
                    handleDeclineBid(confirmAction.bid);
                  } else if (confirmAction?.type === 'cancel' && confirmAction.job) {
                    handleCancelJob(confirmAction.job);
                  }
                }}
              >
                {confirmAction?.type === 'accept' && 'Accept Bid'}
                {confirmAction?.type === 'decline' && 'Decline Bid'}
                {confirmAction?.type === 'cancel' && 'Cancel Job'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Bid Detail Dialog */}
        <Dialog open={!!viewingBid} onOpenChange={() => setViewingBid(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Bid Details</DialogTitle>
              <DialogDescription>
                {viewingBid?.job.title}
              </DialogDescription>
            </DialogHeader>

            {viewingBid && (
              <div className="space-y-4">
                {/* Inspector Info */}
                <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
                  <div className="w-14 h-14 rounded-full bg-forest/10 flex items-center justify-center">
                    {viewingBid.bid.inspector?.avatar_url ? (
                      <img
                        src={viewingBid.bid.inspector.avatar_url}
                        alt={viewingBid.bid.inspector.full_name || 'Inspector'}
                        className="w-14 h-14 rounded-full object-cover"
                      />
                    ) : (
                      <User size={28} className="text-forest" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">
                      {viewingBid.bid.inspector?.full_name || 'Unknown Inspector'}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{viewingBid.bid.inspector?.user_type?.replace('_', ' ')}</span>
                      {viewingBid.bid.inspector?.reputation_score && viewingBid.bid.inspector.reputation_score > 0 && (
                        <span className="flex items-center gap-1 text-amber-600">
                          <Star size={14} fill="currentColor" />
                          {viewingBid.bid.inspector.reputation_score}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bid Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-xs text-green-600 font-medium mb-1">Proposed Price</p>
                    <p className="text-xl font-bold text-green-700">
                      {formatCurrency(viewingBid.bid.proposed_price)}
                    </p>
                  </div>
                  {viewingBid.bid.proposed_date && (
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-xs text-blue-600 font-medium mb-1">Proposed Date</p>
                      <p className="text-lg font-semibold text-blue-700">
                        {formatDate(viewingBid.bid.proposed_date)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Message */}
                {viewingBid.bid.message && (
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-1 uppercase">Message</p>
                    <p className="p-3 bg-muted/50 rounded-lg text-sm">
                      {viewingBid.bid.message}
                    </p>
                  </div>
                )}

                {/* Local Knowledge */}
                {viewingBid.bid.local_knowledge_note && (
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-1 uppercase">Local Knowledge</p>
                    <p className="p-3 bg-muted/50 rounded-lg text-sm">
                      {viewingBid.bid.local_knowledge_note}
                    </p>
                  </div>
                )}

                {/* Years Experience */}
                {viewingBid.bid.years_experience && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Years of experience:</span>
                    <span className="font-medium">{viewingBid.bid.years_experience} years</span>
                  </div>
                )}

                {/* Submitted Date */}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock size={14} />
                    <span>Submitted {formatDate(viewingBid.bid.created_at)}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSendMessage(viewingBid.bid.inspector_id)}
                    className="text-forest border-forest/30 hover:bg-forest/5"
                  >
                    <MessageSquare size={14} className="mr-1" />
                    Message
                  </Button>
                </div>

                {/* Actions */}
                {viewingBid.bid.status === 'pending' && (
                  <div className="flex gap-3 pt-2">
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        setConfirmAction({ type: 'accept', bid: viewingBid.bid, job: viewingBid.job });
                        setViewingBid(null);
                      }}
                    >
                      <CheckCircle size={16} className="mr-2" />
                      Accept Bid
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 text-red-600"
                      onClick={() => {
                        setConfirmAction({ type: 'decline', bid: viewingBid.bid, job: viewingBid.job });
                        setViewingBid(null);
                      }}
                    >
                      <XCircle size={16} className="mr-2" />
                      Decline
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

// Job Card Component
interface JobCardProps {
  job: InspectionJob;
  tabId: string;
  onViewBids: () => void;
  onEdit: () => void;
  onCancel: () => void;
  onViewDetails: () => void;
  onViewReport: () => void;
  onAcceptBid: (bid: InspectionBid, job: InspectionJob) => void;
  onDeclineBid: (bid: InspectionBid, job: InspectionJob) => void;
  onViewBidDetails: (bid: InspectionBid, job: InspectionJob) => void;
  onMessage: (recipientId: string) => void;
  formatCurrency: (amount: number) => string;
  formatDate: (date: string) => string;
  getDaysRemaining: (expiresAt: string | null, inspectionDateTo: string) => number;
}

function JobCard({
  job,
  tabId,
  onViewBids,
  onEdit,
  onCancel,
  onViewDetails,
  onViewReport,
  onAcceptBid,
  onDeclineBid,
  onViewBidDetails,
  onMessage,
  formatCurrency,
  formatDate,
  getDaysRemaining,
}: JobCardProps) {
  const [expanded, setExpanded] = useState(tabId === 'received'); // Auto-expand for bids received tab
  const statusConfig = STATUS_CONFIG[job.status];
  const StatusIcon = statusConfig.icon;
  const daysRemaining = getDaysRemaining(job.expires_at, job.inspection_date_to);
  const pendingBids = job.bids?.filter(b => b.status === 'pending') || [];
  const hasBids = pendingBids.length > 0;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          {/* Left: Job Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h3 className="font-semibold text-lg truncate">{job.title}</h3>
              <Badge className={cn('border', statusConfig.color)}>
                <StatusIcon size={12} className="mr-1" />
                {statusConfig.label}
              </Badge>
              {job.payment_status === 'paid' && (
                <Badge className="border-emerald-300 text-emerald-700 bg-emerald-50">
                  <Lock size={12} className="mr-1" />
                  Payment Secured
                </Badge>
              )}
              {job.payment_status === 'refunded' && (
                <Badge className="border-blue-300 text-blue-700 bg-blue-50">
                  <RefreshCw size={12} className="mr-1" />
                  Refunded
                </Badge>
              )}
              {job.client_brief && (
                <Badge variant="outline" className="border-purple-300 text-purple-700 bg-purple-50">
                  <FileText size={12} className="mr-1" />
                  {job.client_brief.brief_name}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
              <span className="flex items-center gap-1">
                <MapPin size={14} />
                {job.property_address}, {job.property_city}
              </span>
              <span className="flex items-center gap-1">
                <Home size={14} />
                {job.property_type}
              </span>
            </div>

            <div className="flex items-center gap-6 text-sm">
              <span className="flex items-center gap-1.5">
                <DollarSign size={14} className="text-green-600" />
                <span className="font-medium">
                  {formatCurrency(job.budget_min)} - {formatCurrency(job.budget_max)}
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar size={14} className="text-blue-600" />
                Posted {formatDate(job.created_at)}
              </span>
              {hasBids && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="flex items-center gap-1.5 hover:underline"
                >
                  <Users size={14} className="text-purple-600" />
                  <span className="font-medium text-purple-700">
                    {pendingBids.length} bid{pendingBids.length !== 1 ? 's' : ''} received
                  </span>
                  <ChevronDown
                    size={14}
                    className={cn(
                      'text-purple-600 transition-transform',
                      expanded && 'rotate-180'
                    )}
                  />
                </button>
              )}
              {job.status === 'open' && daysRemaining >= 0 && (
                <span className={cn(
                  'flex items-center gap-1.5',
                  daysRemaining <= 3 ? 'text-red-600' : 'text-muted-foreground'
                )}>
                  <Clock size={14} />
                  {daysRemaining === 0 ? 'Expires today' : `${daysRemaining} days left`}
                </span>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Awaiting Bids actions */}
            {tabId === 'awaiting' && (
              <>
                <Button variant="outline" size="sm" onClick={onEdit}>
                  <Edit size={14} className="mr-1" />
                  Edit
                </Button>
                <Button variant="outline" size="sm" onClick={onCancel} className="text-red-600 hover:text-red-700">
                  <Trash2 size={14} className="mr-1" />
                  Cancel
                </Button>
              </>
            )}

            {/* Bids Received actions */}
            {tabId === 'received' && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit size={14} className="mr-1" />
                Edit Job
              </Button>
            )}

            {/* In Progress actions */}
            {tabId === 'progress' && (
              <>
                <Button variant="outline" size="sm" onClick={onViewDetails}>
                  <Eye size={14} className="mr-1" />
                  View Details
                </Button>
                {job.assigned_inspector_id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onMessage(job.assigned_inspector_id!)}
                    className="text-forest border-forest/30 hover:bg-forest/5"
                  >
                    <MessageSquare size={14} className="mr-1" />
                    Contact
                  </Button>
                )}
              </>
            )}

            {/* Reports Ready actions */}
            {tabId === 'reports' && (
              <>
                <Button size="sm" onClick={onViewReport} className="bg-emerald-600 hover:bg-emerald-700">
                  <FileText size={14} className="mr-1" />
                  View Report
                </Button>
                <Button variant="outline" size="sm">
                  <DollarSign size={14} className="mr-1" />
                  Release Payment
                </Button>
              </>
            )}

            {/* Completed actions */}
            {tabId === 'completed' && (
              <>
                <Button variant="outline" size="sm" onClick={onViewReport}>
                  <FileText size={14} className="mr-1" />
                  View Report
                </Button>
                <Button variant="outline" size="sm">
                  <Star size={14} className="mr-1" />
                  Leave Review
                </Button>
              </>
            )}

            {/* Cancelled/Expired - just view */}
            {tabId === 'cancelled' && (
              <Button variant="outline" size="sm" onClick={onViewDetails}>
                <Eye size={14} className="mr-1" />
                View Details
              </Button>
            )}
          </div>
        </div>

        {/* Inline Bids Section */}
        {expanded && hasBids && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="space-y-3">
              {pendingBids.map((bid) => (
                <InlineBidCard
                  key={bid.id}
                  bid={bid}
                  job={job}
                  onAccept={() => onAcceptBid(bid, job)}
                  onDecline={() => onDeclineBid(bid, job)}
                  onViewDetails={() => onViewBidDetails(bid, job)}
                  onMessage={() => onMessage(bid.inspector_id)}
                  formatCurrency={formatCurrency}
                  formatDate={formatDate}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Inline Bid Card - Compact version for displaying in job cards
interface InlineBidCardProps {
  bid: InspectionBid;
  job: InspectionJob;
  onAccept: () => void;
  onDecline: () => void;
  onViewDetails: () => void;
  onMessage: () => void;
  formatCurrency: (cents: number) => string;
  formatDate: (date: string) => string;
}

function InlineBidCard({ bid, job, onAccept, onDecline, onViewDetails, onMessage, formatCurrency, formatDate }: InlineBidCardProps) {
  return (
    <div
      className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg border border-border/50 hover:border-forest/30 hover:bg-muted/50 transition-colors cursor-pointer"
      onClick={onViewDetails}
    >
      {/* Inspector Avatar */}
      <div className="w-10 h-10 rounded-full bg-forest/10 flex items-center justify-center flex-shrink-0">
        {bid.inspector?.avatar_url ? (
          <img
            src={bid.inspector.avatar_url}
            alt={bid.inspector.full_name || 'Inspector'}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <User size={20} className="text-forest" />
        )}
      </div>

      {/* Bid Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-medium truncate">{bid.inspector?.full_name || 'Unknown'}</span>
          {bid.inspector?.reputation_score && bid.inspector.reputation_score > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-amber-600">
              <Star size={12} fill="currentColor" />
              {bid.inspector.reputation_score}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="font-semibold text-green-700">{formatCurrency(bid.proposed_price)}</span>
          <span className="text-xs text-muted-foreground">
            (→{formatCurrency(Math.round(bid.proposed_price * 0.90))})
          </span>
          {bid.proposed_date && (
            <span className="text-muted-foreground flex items-center gap-1">
              <Calendar size={12} />
              {formatDate(bid.proposed_date)}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => { e.stopPropagation(); onMessage(); }}
          className="text-forest border-forest/30 hover:bg-forest/5 h-8 px-2"
          title="Message Inspector"
        >
          <MessageSquare size={14} />
        </Button>
        <Button
          size="sm"
          onClick={(e) => { e.stopPropagation(); onAccept(); }}
          className="bg-green-600 hover:bg-green-700 h-8 px-3"
        >
          <CheckCircle size={14} className="mr-1" />
          Accept
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => { e.stopPropagation(); onDecline(); }}
          className="text-red-600 h-8 px-3"
        >
          <XCircle size={14} className="mr-1" />
          Decline
        </Button>
      </div>
    </div>
  );
}

// Bid Card Component
interface BidCardProps {
  bid: InspectionBid;
  onAccept: () => void;
  onDecline: () => void;
  onMessage?: () => void;
  formatCurrency: (cents: number) => string;
  formatDate: (date: string) => string;
}

function BidCard({ bid, onAccept, onDecline, onMessage, formatCurrency, formatDate }: BidCardProps) {
  const [showHistory, setShowHistory] = useState(false);
  const hasHistory = bid.history && bid.history.length > 1;

  return (
    <Card className={cn(
      'border-2 transition-all',
      bid.status === 'accepted' && 'border-green-300 bg-green-50/50',
      bid.status === 'declined' && 'border-red-200 bg-red-50/30 opacity-60',
      bid.status === 'pending' && 'border-border hover:border-forest/30'
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Inspector Avatar */}
          <div className="w-12 h-12 rounded-full bg-forest/10 flex items-center justify-center flex-shrink-0">
            {bid.inspector?.avatar_url ? (
              <img
                src={bid.inspector.avatar_url}
                alt={bid.inspector.full_name || 'Inspector'}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <User size={24} className="text-forest" />
            )}
          </div>

          {/* Bid Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h4 className="font-semibold">{bid.inspector?.full_name || 'Unknown Inspector'}</h4>
              <Badge variant="outline" className="text-xs">
                {bid.inspector?.user_type?.replace('_', ' ')}
              </Badge>
              {bid.inspector?.reputation_score && bid.inspector.reputation_score > 0 && (
                <span className="flex items-center gap-1 text-sm text-amber-600">
                  <Star size={14} fill="currentColor" />
                  {bid.inspector.reputation_score}
                </span>
              )}
              {bid.status !== 'pending' && (
                <Badge className={cn(
                  bid.status === 'accepted' && 'bg-green-100 text-green-800',
                  bid.status === 'declined' && 'bg-red-100 text-red-800'
                )}>
                  {bid.status}
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm mb-2">
              <span className="flex items-center gap-1.5 font-semibold text-green-700">
                <DollarSign size={14} />
                Bid: {formatCurrency(bid.proposed_price)}
              </span>
              {bid.proposed_date && (
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar size={14} />
                  {formatDate(bid.proposed_date)}
                </span>
              )}
              <span className="text-muted-foreground">
                Submitted {formatDate(bid.created_at)}
              </span>
              {hasHistory && (
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="flex items-center gap-1 text-blue-600 hover:underline"
                >
                  <History size={14} />
                  {bid.history!.length - 1} edit{bid.history!.length - 1 !== 1 ? 's' : ''}
                </button>
              )}
            </div>

            {/* Fee Breakdown */}
            <div className="text-xs text-muted-foreground mb-2 pl-1">
              <span className="mr-3">├── They'll receive: {formatCurrency(Math.round(bid.proposed_price * 0.90))}</span>
              <span>└── Platform fee: {formatCurrency(Math.round(bid.proposed_price * 0.10))}</span>
            </div>

            {bid.message && (
              <p className="text-sm text-muted-foreground bg-muted/50 rounded p-2 mb-2">
                "{bid.message}"
              </p>
            )}

            {bid.local_knowledge_note && (
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">Local knowledge:</span> {bid.local_knowledge_note}
              </p>
            )}

            {/* Bid History */}
            {showHistory && bid.history && bid.history.length > 0 && (
              <div className="mt-3 pt-3 border-t border-dashed space-y-2">
                <h5 className="text-xs font-medium text-muted-foreground uppercase">Bid History</h5>
                {bid.history.map((entry, idx) => (
                  <div key={entry.id} className="text-xs text-muted-foreground flex items-start gap-2">
                    <Clock size={12} className="mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-foreground">{formatDate(entry.changed_at)}:</span>{' '}
                      {entry.change_type === 'created' ? (
                        <span>Initial bid: {formatCurrency(entry.new_price || 0)}</span>
                      ) : (
                        <>
                          {entry.previous_price !== entry.new_price && (
                            <span>
                              Price: {formatCurrency(entry.previous_price || 0)} → {formatCurrency(entry.new_price || 0)}
                            </span>
                          )}
                          {entry.change_reason && (
                            <span className="italic"> - "{entry.change_reason}"</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          {bid.status === 'pending' && (
            <div className="flex flex-col gap-2">
              <Button size="sm" onClick={onAccept} className="bg-green-600 hover:bg-green-700">
                <CheckCircle size={14} className="mr-1" />
                Accept
              </Button>
              <Button size="sm" variant="outline" onClick={onDecline} className="text-red-600">
                <XCircle size={14} className="mr-1" />
                Decline
              </Button>
              {onMessage && (
                <Button size="sm" variant="ghost" onClick={onMessage} className="text-forest">
                  <MessageSquare size={14} className="mr-1" />
                  Message
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
