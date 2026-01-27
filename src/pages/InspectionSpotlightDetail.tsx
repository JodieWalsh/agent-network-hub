/**
 * InspectionSpotlightDetail.tsx
 *
 * 🎭 SINGLE JOB SPOTLIGHT VIEW
 *
 * View full job details and express interest:
 * - Complete property and inspection details
 * - Express Interest dialog for inspectors
 * - Bid submission form
 * - List of bids (for job creator)
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  MapPin,
  DollarSign,
  Clock,
  AlertCircle,
  Zap,
  Users,
  Calendar,
  Home,
  FileText,
  ArrowLeft,
  Sparkles,
  User,
  MessageSquare,
  MapPinned,
  ExternalLink,
  Shield,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { notifyBidReceived } from '@/lib/notifications';
import { getOrCreateConversation } from '@/lib/messaging';

type UrgencyLevel = 'standard' | 'urgent' | 'express';
type PropertyType = 'house' | 'apartment' | 'townhouse' | 'land' | 'other';
type JobStatus = 'draft' | 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
type BidStatus = 'pending' | 'accepted' | 'declined' | 'withdrawn';

type PaymentStatus = 'pending' | 'paid' | 'released' | 'refunded';

interface InspectionJob {
  id: string;
  creator_id: string;
  property_address: string;
  property_type: PropertyType;
  property_access_notes: string | null;
  urgency_level: UrgencyLevel;
  budget_amount: number;
  status: JobStatus;
  payment_status: PaymentStatus | null;
  assigned_inspector_id: string | null;
  created_at: string;
  preferred_inspection_dates: string[] | null;
  scope_requirements: string | null;
  special_instructions: string | null;
  client_brief_id: string | null;
}

interface ClientBrief {
  id: string;
  brief_name: string;
  client_name: string;
  bedrooms_min: number | null;
  bedrooms_max: number | null;
  bathrooms_min: number | null;
  budget_min: number | null;
  budget_max: number | null;
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
  inspector_name?: string;
  inspector_type?: string;
}

interface Creator {
  full_name: string | null;
  user_type: string;
}

const URGENCY_CONFIG = {
  standard: {
    label: 'Standard',
    icon: Clock,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  urgent: {
    label: 'Urgent',
    icon: AlertCircle,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
  },
  express: {
    label: 'Express',
    icon: Zap,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
};

const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  house: 'House',
  apartment: 'Apartment',
  townhouse: 'Townhouse',
  land: 'Land',
  other: 'Other',
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

  return {
    supabaseUrl,
    supabaseKey,
    accessToken,
  };
};

export default function InspectionSpotlightDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [job, setJob] = useState<InspectionJob | null>(null);
  const [creator, setCreator] = useState<Creator | null>(null);
  const [clientBrief, setClientBrief] = useState<ClientBrief | null>(null);
  const [bids, setBids] = useState<InspectionBid[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBidDialog, setShowBidDialog] = useState(false);
  const [showEditBidDialog, setShowEditBidDialog] = useState(false);
  const [submittingBid, setSubmittingBid] = useState(false);

  // Bid form state
  const [proposedAmount, setProposedAmount] = useState<number | null>(null);
  const [proposedDate, setProposedDate] = useState('');
  const [bidMessage, setBidMessage] = useState('');

  // Edit bid form state
  const [editProposedAmount, setEditProposedAmount] = useState<number | null>(null);
  const [editProposedDate, setEditProposedDate] = useState('');
  const [editBidMessage, setEditBidMessage] = useState('');
  const [editChangeReason, setEditChangeReason] = useState('');

  const [existingBid, setExistingBid] = useState<InspectionBid | null>(null);

  useEffect(() => {
    if (id) {
      fetchJobDetails();
    }
  }, [id, user]);

  const fetchJobDetails = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const { supabaseUrl, supabaseKey, accessToken } = getAuthHeaders();

      // Fetch job details
      const jobResponse = await fetch(
        `${supabaseUrl}/rest/v1/inspection_jobs?select=*&id=eq.${id}`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.pgrst.object+json',
          },
        }
      );

      if (!jobResponse.ok) {
        throw new Error(`Failed to fetch job: ${jobResponse.status}`);
      }

      const jobData = await jobResponse.json();
      setJob(jobData);

      // Fetch creator details
      const creatorResponse = await fetch(
        `${supabaseUrl}/rest/v1/profiles?select=full_name,user_type&id=eq.${jobData.creator_id}`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.pgrst.object+json',
          },
        }
      );

      if (creatorResponse.ok) {
        const creatorData = await creatorResponse.json();
        setCreator(creatorData);
      }

      // Fetch client brief if linked
      if (jobData.client_brief_id) {
        const briefResponse = await fetch(
          `${supabaseUrl}/rest/v1/client_briefs?select=id,brief_name,client_name,bedrooms_min,bedrooms_max,bathrooms_min,budget_min,budget_max&id=eq.${jobData.client_brief_id}`,
          {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${accessToken}`,
              'Accept': 'application/vnd.pgrst.object+json',
            },
          }
        );

        if (briefResponse.ok) {
          const briefData = await briefResponse.json();
          setClientBrief(briefData);
        }
      }

      // Fetch bids (only if user is creator or admin)
      if (user && (user.id === jobData.creator_id || profile?.role === 'admin')) {
        const bidsResponse = await fetch(
          `${supabaseUrl}/rest/v1/inspection_bids?select=*&job_id=eq.${id}&order=created_at.desc`,
          {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );

        if (bidsResponse.ok) {
          const bidsData = await bidsResponse.json();

          // Fetch inspector names for each bid
          const bidsWithNames = await Promise.all(
            (bidsData || []).map(async (bid: any) => {
              try {
                const inspectorResponse = await fetch(
                  `${supabaseUrl}/rest/v1/profiles?select=full_name,user_type&id=eq.${bid.inspector_id}`,
                  {
                    headers: {
                      'apikey': supabaseKey,
                      'Authorization': `Bearer ${accessToken}`,
                      'Accept': 'application/vnd.pgrst.object+json',
                    },
                  }
                );
                if (inspectorResponse.ok) {
                  const inspector = await inspectorResponse.json();
                  return {
                    ...bid,
                    inspector_name: inspector.full_name,
                    inspector_type: inspector.user_type,
                  };
                }
              } catch (e) {}
              return bid;
            })
          );

          setBids(bidsWithNames);
        }
      }

      // Check if current user has already bid
      if (user && user.id !== jobData.creator_id) {
        const existingBidResponse = await fetch(
          `${supabaseUrl}/rest/v1/inspection_bids?select=*&job_id=eq.${id}&inspector_id=eq.${user.id}`,
          {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );

        if (existingBidResponse.ok) {
          const existingBidsData = await existingBidResponse.json();
          setExistingBid(existingBidsData?.[0] || null);
        }
      }
    } catch (error: any) {
      console.error('Error fetching job details:', error);
      toast.error('Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const handleExpressInterest = () => {
    if (!user) {
      toast.error('Please sign in to express interest');
      navigate('/auth');
      return;
    }

    if (job && user.id === job.creator_id) {
      toast.error('You cannot bid on your own job');
      return;
    }

    if (existingBid) {
      toast.info('You have already expressed interest in this job');
      return;
    }

    setShowBidDialog(true);
  };

  const handleSubmitBid = async () => {
    if (!user || !job) return;

    if (!proposedAmount || proposedAmount <= 0) {
      toast.error('Please enter a valid proposed amount');
      return;
    }

    if (proposedAmount > job.budget_amount) {
      toast.error('Your bid exceeds the maximum budget');
      return;
    }

    setSubmittingBid(true);
    try {
      const { supabaseUrl, supabaseKey, accessToken } = getAuthHeaders();

      const bidData = {
        job_id: job.id,
        inspector_id: user.id,
        proposed_price: proposedAmount,
        proposed_date: proposedDate || null,
        message: bidMessage || null,
        status: 'pending',
      };

      const response = await fetch(`${supabaseUrl}/rest/v1/inspection_bids`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify(bidData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Insert failed: ${response.status}`);
      }

      // Notify the job creator about the new bid
      try {
        await notifyBidReceived(
          job.creator_id,                                    // jobCreatorId
          profile?.full_name || user.email || 'An inspector', // inspectorName
          job.property_address,                              // propertyAddress
          proposedAmount,                                    // bidAmount
          job.id,                                            // jobId
          '',                                                // bidId (not returned from insert)
          user.id                                            // inspectorId
        );
      } catch (notifError) {
        console.error('Failed to send notification:', notifError);
        // Don't fail the bid submission if notification fails
      }

      toast.success('Interest submitted! The job creator will review your bid.');
      setShowBidDialog(false);

      // Reset form
      setProposedAmount(null);
      setProposedDate('');
      setBidMessage('');

      // Refresh job details to update bid status
      fetchJobDetails();
    } catch (error: any) {
      console.error('Error submitting bid:', error);
      toast.error(error.message || 'Failed to submit bid');
    } finally {
      setSubmittingBid(false);
    }
  };

  const handleSendMessage = async (recipientId: string) => {
    if (!user) {
      toast.error('Please sign in to send messages');
      navigate('/auth');
      return;
    }
    try {
      const conversationId = await getOrCreateConversation(user.id, recipientId, job ? {
        jobId: job.id,
        contextType: 'inspection_job',
      } : undefined);
      const prefill = job
        ? encodeURIComponent(`Hi! I'm reaching out about the inspection job at ${job.property_address}.`)
        : '';
      const url = `/messages?conversation=${conversationId}${prefill ? `&prefill=${prefill}` : ''}`;
      navigate(url);
    } catch (error) {
      console.error('Failed to start conversation:', error);
      toast.error('Failed to start conversation');
    }
  };

  const handleOpenEditBid = () => {
    if (!existingBid) return;
    setEditProposedAmount(existingBid.proposed_price);
    setEditProposedDate(existingBid.proposed_date || '');
    setEditBidMessage(existingBid.message || '');
    setEditChangeReason('');
    setShowEditBidDialog(true);
  };

  const handleUpdateBid = async () => {
    if (!existingBid || !user || !editProposedAmount) {
      toast.error('Please fill in the required fields');
      return;
    }

    if (!editChangeReason.trim()) {
      toast.error('Please provide a reason for this change');
      return;
    }

    setSubmittingBid(true);
    try {
      const { supabaseUrl, supabaseKey, accessToken } = getAuthHeaders();

      // First, log the change to history
      const historyData = {
        bid_id: existingBid.id,
        changed_by: user.id,
        change_type: 'updated',
        previous_price: existingBid.proposed_price,
        new_price: editProposedAmount,
        previous_date: existingBid.proposed_date,
        new_date: editProposedDate || null,
        previous_message: existingBid.message,
        new_message: editBidMessage || null,
        change_reason: editChangeReason,
      };

      const historyResponse = await fetch(`${supabaseUrl}/rest/v1/inspection_bid_history`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify(historyData),
      });

      if (!historyResponse.ok) {
        const errorText = await historyResponse.text();
        console.error('History insert failed:', errorText);
        // Continue anyway - don't fail the update if history logging fails
      }

      // Now update the bid
      const updateData = {
        proposed_price: editProposedAmount,
        proposed_date: editProposedDate || null,
        message: editBidMessage || null,
        updated_at: new Date().toISOString(),
      };

      const updateResponse = await fetch(`${supabaseUrl}/rest/v1/inspection_bids?id=eq.${existingBid.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify(updateData),
      });

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        throw new Error(errorText || `Update failed: ${updateResponse.status}`);
      }

      toast.success('Bid updated successfully! The change has been recorded.');
      setShowEditBidDialog(false);

      // Refresh job details to get updated bid
      fetchJobDetails();
    } catch (error: any) {
      console.error('Error updating bid:', error);
      toast.error(error.message || 'Failed to update bid');
    } finally {
      setSubmittingBid(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Sparkles className="h-12 w-12 text-forest animate-pulse mx-auto mb-4" />
            <p className="text-muted-foreground">Loading job details...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!job) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-muted-foreground mb-4">Job not found</p>
          <Button onClick={() => navigate('/inspections/spotlights')}>Back to Spotlights</Button>
        </div>
      </DashboardLayout>
    );
  }

  const urgencyConfig = URGENCY_CONFIG[job.urgency_level];
  const UrgencyIcon = urgencyConfig.icon;
  const isJobCreator = user && user.id === job.creator_id;
  const canViewBids = isJobCreator || profile?.role === 'admin';

  return (
    <DashboardLayout>
      {/* Header */}
      <div className={cn('border-b rounded-t-lg -mx-4 -mt-4 px-6 py-6 mb-6', urgencyConfig.bgColor)}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/inspections/spotlights')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Spotlights
        </Button>

        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <Badge className={cn('flex items-center gap-1', urgencyConfig.bgColor, urgencyConfig.color)}>
                <UrgencyIcon className="h-3 w-3" />
                {urgencyConfig.label}
              </Badge>
              <Badge variant="outline">
                {PROPERTY_TYPE_LABELS[job.property_type]}
              </Badge>
              {job.payment_status === 'paid' && (
                <Badge className="flex items-center gap-1 bg-emerald-100 text-emerald-700 border-emerald-300">
                  <Shield className="h-3 w-3" />
                  Payment Secured
                </Badge>
              )}
              {bids.length > 0 && canViewBids && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {bids.length} bid{bids.length > 1 ? 's' : ''}
                </Badge>
              )}
            </div>

            <div className="flex items-start gap-3 mb-2">
              {job.property_address.startsWith('Area:') ? (
                <MapPinned className="h-6 w-6 text-blue-600 mt-0.5" />
              ) : (
                <MapPin className="h-6 w-6 text-forest mt-0.5" />
              )}
              <div className="flex-1">
                {job.property_address.startsWith('Area:') && (
                  <Badge variant="outline" className="mb-2 bg-blue-50 text-blue-700 border-blue-200">
                    General Area Booking
                  </Badge>
                )}
                <h1 className="text-2xl font-bold text-foreground">
                  {job.property_address.startsWith('Area:') ? job.property_address.replace('Area: ', '') : job.property_address}
                </h1>
              </div>
            </div>

            <p className="text-lg font-semibold text-forest">
              Budget: ${job.budget_amount.toLocaleString('en-AU')}
            </p>
          </div>

          {!isJobCreator && job.status === 'open' && (
            <Button
              onClick={handleExpressInterest}
              className="bg-forest hover:bg-forest/90"
              size="lg"
              disabled={!!existingBid}
            >
              {existingBid ? 'Already Submitted' : 'Express Interest'}
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* Posted By */}
        {creator && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-5 w-5 text-forest" />
                Posted By
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{creator.full_name || 'Anonymous'}</p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {creator.user_type.replace('_', ' ')}
                  </p>
                </div>
                {!isJobCreator && job.creator_id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSendMessage(job.creator_id)}
                    className="text-forest border-forest/30 hover:bg-forest/5"
                  >
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Message
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Status - For Job Creator */}
        {isJobCreator && (
          <Card className={cn(
            'border',
            job.status === 'completed' ? 'border-green-200 bg-green-50/50' : 'border-amber-200 bg-amber-50/50'
          )}>
            <CardContent className="pt-5 pb-5">
              {job.status === 'completed' ? (
                <div className="flex items-start gap-3">
                  <DollarSign className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-green-800">
                      Payment complete &mdash; ${Math.round(job.budget_amount * 0.90).toLocaleString('en-AU')} sent to inspector
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      Platform fee: ${Math.round(job.budget_amount * 0.10).toLocaleString('en-AU')} (10%)
                    </p>
                  </div>
                </div>
              ) : job.payment_status === 'paid' ? (
                <div className="flex items-start gap-3">
                  <DollarSign className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      ${job.budget_amount.toLocaleString('en-AU')} held in escrow
                    </p>
                    <p className="text-xs text-amber-600 mt-1">
                      Released when you approve the inspection report
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <DollarSign className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm font-medium text-amber-800">
                    Payment required to publish job
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Your Earnings - For Inspectors */}
        {!isJobCreator && job.status === 'open' && (
          <Card className="border-emerald-200 bg-emerald-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-emerald-800">
                <DollarSign className="h-5 w-5 text-emerald-600" />
                Your Earnings
                {job.payment_status === 'paid' && (
                  <Badge className="ml-2 bg-emerald-100 text-emerald-700 border-emerald-300 text-xs">
                    <Lock className="h-3 w-3 mr-1" />
                    Funded
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-emerald-800">
                  <span>Job budget:</span>
                  <span className="font-semibold">${job.budget_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Platform fee:</span>
                  <span>10%</span>
                </div>
                <div className="pt-2 border-t border-emerald-200 flex justify-between text-emerald-900">
                  <span className="font-medium">You'll receive:</span>
                  <span className="font-bold">${(job.budget_amount * 0.90).toFixed(2)}</span>
                </div>
              </div>
              {job.payment_status === 'paid' ? (
                <div className="mt-3 p-2 bg-emerald-100 border border-emerald-300 rounded text-xs text-emerald-700">
                  <div className="flex items-start gap-2">
                    <Shield className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>Payment is secured in escrow.</strong> The funds have been paid by the job poster and will be released to you when they approve your completed report.
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-emerald-600 mt-3">
                  Payment is released when the job poster approves your report.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Your Earnings - Inspector Assigned/In-Progress */}
        {!isJobCreator && (job.status === 'assigned' || job.status === 'in_progress' || job.status === 'pending_review') && job.assigned_inspector_id === user?.id && (
          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-amber-800">
                <DollarSign className="h-5 w-5 text-amber-600" />
                Earnings Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-amber-800 font-medium">
                ${Math.round((job.budget_amount) * 0.90).toLocaleString('en-AU')} will be released when your report is approved
              </p>
              <p className="text-xs text-amber-600 mt-1">
                10% platform fee applies &middot; Job total: ${job.budget_amount.toLocaleString('en-AU')}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Your Earnings - Inspector Completed */}
        {!isJobCreator && job.status === 'completed' && job.assigned_inspector_id === user?.id && (
          <Card className="border-green-200 bg-green-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-green-800">
                <DollarSign className="h-5 w-5 text-green-600" />
                Payment Complete
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-green-800 font-medium">
                ${Math.round((job.budget_amount) * 0.90).toLocaleString('en-AU')} has been sent to your account
              </p>
              <p className="text-xs text-green-600 mt-1">
                10% platform fee: ${Math.round(job.budget_amount * 0.10).toLocaleString('en-AU')} &middot; Job total: ${job.budget_amount.toLocaleString('en-AU')}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Client Brief OR Inspection Scope */}
        {clientBrief ? (
          <Card className="border-purple-200 bg-purple-50/50">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-purple-600" />
                    Evaluate Against Client Brief
                  </CardTitle>
                  <CardDescription>
                    This property should be assessed against the following client requirements
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-purple-300 text-purple-700 hover:bg-purple-100"
                  onClick={() => navigate(`/briefs/${clientBrief.id}`)}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  View Full Brief
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-white rounded-lg border border-purple-200">
                <h4 className="font-semibold text-lg text-purple-900 mb-1">{clientBrief.brief_name}</h4>
                <p className="text-sm text-muted-foreground mb-4">Client: {clientBrief.client_name}</p>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  {clientBrief.bedrooms_min && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Bedrooms</Label>
                      <p className="font-medium">
                        {clientBrief.bedrooms_min}
                        {clientBrief.bedrooms_max ? `-${clientBrief.bedrooms_max}` : '+'}
                      </p>
                    </div>
                  )}
                  {clientBrief.bathrooms_min && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Bathrooms</Label>
                      <p className="font-medium">{clientBrief.bathrooms_min}+</p>
                    </div>
                  )}
                  {clientBrief.budget_max && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Budget</Label>
                      <p className="font-medium">
                        {clientBrief.budget_min ? `$${clientBrief.budget_min.toLocaleString()}` : 'Up to'} - ${clientBrief.budget_max.toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-sm text-muted-foreground bg-purple-100 p-3 rounded-lg">
                <strong>Inspector Task:</strong> Assess whether this property meets the client's requirements and provide detailed feedback on how well it aligns with their brief.
              </div>

              {job.special_instructions && (
                <div>
                  <Label className="text-sm text-muted-foreground">Additional Instructions</Label>
                  <p className="mt-1 text-sm">{job.special_instructions}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-forest" />
                Inspection Scope
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground">Requirements</Label>
                <p className="mt-1">{job.scope_requirements || 'Not specified'}</p>
              </div>

              {job.special_instructions && (
                <div>
                  <Label className="text-sm text-muted-foreground">Special Instructions</Label>
                  <p className="mt-1">{job.special_instructions}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Property Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5 text-forest" />
              Property Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">Property Type</Label>
                <p className="mt-1">{PROPERTY_TYPE_LABELS[job.property_type]}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">
                  {job.property_address.startsWith('Area:') ? 'General Area' : 'Address'}
                </Label>
                <p className="mt-1">
                  {job.property_address.startsWith('Area:') ? job.property_address.replace('Area: ', '') : job.property_address}
                </p>
                {job.property_address.startsWith('Area:') && (
                  <p className="text-xs text-blue-600 mt-1">
                    Exact property address to be confirmed later
                  </p>
                )}
              </div>
            </div>

            {job.property_access_notes && (
              <div>
                <Label className="text-sm text-muted-foreground">Access Notes</Label>
                <p className="mt-1 text-sm">{job.property_access_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preferred Dates */}
        {job.preferred_inspection_dates && job.preferred_inspection_dates.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-forest" />
                Preferred Inspection Dates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {job.preferred_inspection_dates.map((date, idx) => (
                  <Badge key={idx} variant="outline" className="text-sm">
                    {new Date(date).toLocaleDateString('en-AU', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                These are suggested dates. You can propose alternatives when expressing interest.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Bids Section (Only for Job Creator & Admin) */}
        {canViewBids && bids.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-forest" />
                Bids Received ({bids.length})
              </CardTitle>
              <CardDescription>
                Review and manage bids from inspectors
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {bids.map((bid) => (
                <div
                  key={bid.id}
                  className="p-4 border rounded-lg space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{bid.inspector_name || 'Anonymous'}</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {bid.inspector_type?.replace('_', ' ')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-forest">
                        ${bid.proposed_price.toLocaleString('en-AU')}
                      </p>
                      <Badge variant="outline" className="mt-1">
                        {bid.status}
                      </Badge>
                    </div>
                  </div>

                  {bid.proposed_date && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Proposed:{' '}
                      {new Date(bid.proposed_date).toLocaleDateString('en-AU', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                  )}

                  {bid.message && (
                    <div className="flex items-start gap-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <p className="text-sm text-muted-foreground flex-1">{bid.message}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Submitted {new Date(bid.created_at).toLocaleDateString('en-AU')}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSendMessage(bid.inspector_id)}
                      className="text-forest hover:bg-forest/5 h-7 px-2"
                    >
                      <MessageSquare className="h-3.5 w-3.5 mr-1" />
                      Message
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* User's Own Bid Status */}
        {existingBid && !isJobCreator && (
          <Card className="border-forest/30 bg-forest/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-5 w-5 text-forest" />
                  Your Bid
                </CardTitle>
                {existingBid.status === 'pending' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenEditBid}
                    className="border-forest text-forest hover:bg-forest/10"
                  >
                    Edit Bid
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Amount:</span>
                  <span className="font-semibold text-forest">
                    ${existingBid.proposed_price.toLocaleString('en-AU')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Badge variant="outline">{existingBid.status}</Badge>
                </div>
                {existingBid.proposed_date && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Proposed Date:</span>
                    <span className="text-sm">
                      {new Date(existingBid.proposed_date).toLocaleDateString('en-AU', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                )}
              </div>
              {existingBid.message && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground">Your message:</p>
                  <p className="text-sm mt-1">{existingBid.message}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Express Interest Dialog */}
      <Dialog open={showBidDialog} onOpenChange={setShowBidDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-forest" />
              Express Your Interest
            </DialogTitle>
            <DialogDescription>
              Submit your proposal for this inspection job
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Proposed Amount */}
            <div className="space-y-2">
              <Label>
                Proposed Amount * <span className="text-xs text-muted-foreground">(Max: ${job.budget_amount})</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  min="0"
                  max={job.budget_amount}
                  step="50"
                  placeholder="500"
                  value={proposedAmount || ''}
                  onChange={(e) => setProposedAmount(e.target.value ? parseFloat(e.target.value) : null)}
                  className="pl-7"
                  required
                />
              </div>
            </div>

            {/* Earnings Breakdown - Live Calculation */}
            {proposedAmount && proposedAmount > 0 && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <p className="text-sm font-medium text-emerald-800 mb-2">📊 Earnings Breakdown</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between text-emerald-800">
                    <span>Your bid:</span>
                    <span className="font-semibold">${proposedAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 pl-4">
                    <span>├── You receive (90%):</span>
                    <span className="font-medium">${(proposedAmount * 0.90).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 pl-4">
                    <span>└── Platform fee (10%):</span>
                    <span className="font-medium">${(proposedAmount * 0.10).toFixed(2)}</span>
                  </div>
                </div>
                {job.payment_status === 'paid' ? (
                  <p className="text-xs text-emerald-600 mt-2">
                    <Lock className="h-3 w-3 inline mr-1" />
                    <strong>Payment is already secured in escrow.</strong> You'll receive your portion when the job poster approves your report.
                  </p>
                ) : (
                  <p className="text-xs text-emerald-600 mt-2">
                    You'll receive your portion when the job poster approves your report.
                  </p>
                )}
              </div>
            )}

            {/* Proposed Date */}
            <div className="space-y-2">
              <Label>Proposed Inspection Date (Optional)</Label>
              <Input
                type="date"
                value={proposedDate}
                onChange={(e) => setProposedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label>Message to Job Creator (Optional)</Label>
              <Textarea
                placeholder="Introduce yourself, highlight your experience, or provide additional information..."
                value={bidMessage}
                onChange={(e) => setBidMessage(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBidDialog(false)} disabled={submittingBid}>
              Cancel
            </Button>
            <Button onClick={handleSubmitBid} disabled={submittingBid} className="bg-forest hover:bg-forest/90">
              {submittingBid ? 'Submitting...' : 'Submit Bid'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Bid Dialog */}
      <Dialog open={showEditBidDialog} onOpenChange={setShowEditBidDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-forest" />
              Edit Your Bid
            </DialogTitle>
            <DialogDescription>
              Update your bid details. All changes are recorded for transparency.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="editAmount">Your Proposed Amount ($) *</Label>
              <Input
                id="editAmount"
                type="number"
                placeholder="e.g., 250"
                value={editProposedAmount || ''}
                onChange={(e) => setEditProposedAmount(e.target.value ? Number(e.target.value) : null)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="editDate">Proposed Inspection Date</Label>
              <Input
                id="editDate"
                type="date"
                value={editProposedDate}
                onChange={(e) => setEditProposedDate(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="editMessage">Message (Optional)</Label>
              <Textarea
                id="editMessage"
                placeholder="Any updates to your previous message..."
                value={editBidMessage}
                onChange={(e) => setEditBidMessage(e.target.value)}
                rows={3}
                className="mt-1"
              />
            </div>

            <div className="border-t pt-4">
              <Label htmlFor="changeReason" className="text-amber-700">Reason for Change *</Label>
              <Textarea
                id="changeReason"
                placeholder="Please explain why you're updating this bid (e.g., 'Adjusting price based on property complexity', 'Updated availability')..."
                value={editChangeReason}
                onChange={(e) => setEditChangeReason(e.target.value)}
                rows={2}
                className="mt-1 border-amber-200 focus:border-amber-400"
              />
              <p className="text-xs text-muted-foreground mt-1">
                This reason will be recorded in the change history and visible to the job creator.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditBidDialog(false)} disabled={submittingBid}>
              Cancel
            </Button>
            <Button onClick={handleUpdateBid} disabled={submittingBid} className="bg-forest hover:bg-forest/90">
              {submittingBid ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
