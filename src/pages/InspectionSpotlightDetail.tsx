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
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type UrgencyLevel = 'standard' | 'urgent' | 'express';
type PropertyType = 'house' | 'apartment' | 'townhouse' | 'land' | 'other';
type JobStatus = 'draft' | 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
type BidStatus = 'pending' | 'accepted' | 'declined' | 'withdrawn';

interface InspectionJob {
  id: string;
  creator_id: string;
  property_address: string;
  property_type: PropertyType;
  property_access_notes: string | null;
  urgency_level: UrgencyLevel;
  budget_amount: number;
  status: JobStatus;
  created_at: string;
  preferred_inspection_dates: string[] | null;
  scope_requirements: string | null;
  special_instructions: string | null;
}

interface InspectionBid {
  id: string;
  job_id: string;
  inspector_id: string;
  proposed_amount: number;
  proposed_inspection_date: string | null;
  message: string | null;
  status: BidStatus;
  created_at: string;
  inspector?: {
    full_name: string | null;
    user_type: string;
  };
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

export default function InspectionSpotlightDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [job, setJob] = useState<InspectionJob | null>(null);
  const [creator, setCreator] = useState<Creator | null>(null);
  const [bids, setBids] = useState<InspectionBid[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBidDialog, setShowBidDialog] = useState(false);
  const [submittingBid, setSubmittingBid] = useState(false);

  // Bid form state
  const [proposedAmount, setProposedAmount] = useState<number | null>(null);
  const [proposedDate, setProposedDate] = useState('');
  const [bidMessage, setBidMessage] = useState('');

  const [existingBid, setExistingBid] = useState<InspectionBid | null>(null);

  useEffect(() => {
    if (id) {
      fetchJobDetails();
    }
  }, [id]);

  const fetchJobDetails = async () => {
    if (!id) return;

    setLoading(true);
    try {
      // Fetch job details
      const { data: jobData, error: jobError } = await supabase
        .from('inspection_jobs')
        .select('*')
        .eq('id', id)
        .single();

      if (jobError) throw jobError;
      setJob(jobData);

      // Fetch creator details
      const { data: creatorData, error: creatorError } = await supabase
        .from('profiles')
        .select('full_name, user_type')
        .eq('id', jobData.creator_id)
        .single();

      if (creatorError) throw creatorError;
      setCreator(creatorData);

      // Fetch bids (only if user is creator or admin)
      if (user && (user.id === jobData.creator_id || profile?.role === 'admin')) {
        const { data: bidsData, error: bidsError } = await supabase
          .from('inspection_bids')
          .select(`
            *,
            inspector:profiles!inspection_bids_inspector_id_fkey(full_name, user_type)
          `)
          .eq('job_id', id)
          .order('created_at', { ascending: false });

        if (bidsError) throw bidsError;
        setBids(bidsData || []);
      }

      // Check if current user has already bid
      if (user && user.id !== jobData.creator_id) {
        const { data: existingBidData } = await supabase
          .from('inspection_bids')
          .select('*')
          .eq('job_id', id)
          .eq('inspector_id', user.id)
          .single();

        setExistingBid(existingBidData || null);
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
      const { error } = await supabase.from('inspection_bids').insert({
        job_id: job.id,
        inspector_id: user.id,
        proposed_amount: proposedAmount,
        proposed_inspection_date: proposedDate || null,
        message: bidMessage || null,
        status: 'pending',
      });

      if (error) throw error;

      toast.success('🎉 Interest submitted! The job creator will review your bid.');
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

  if (loading || !job) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="h-12 w-12 text-forest animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Loading job details...</p>
        </div>
      </div>
    );
  }

  const urgencyConfig = URGENCY_CONFIG[job.urgency_level];
  const UrgencyIcon = urgencyConfig.icon;
  const isJobCreator = user && user.id === job.creator_id;
  const canViewBids = isJobCreator || profile?.role === 'admin';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className={cn('border-b', urgencyConfig.bgColor)}>
        <div className="max-w-5xl mx-auto px-6 py-6">
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
              <div className="flex items-center gap-3 mb-3">
                <Badge className={cn('flex items-center gap-1', urgencyConfig.bgColor, urgencyConfig.color)}>
                  <UrgencyIcon className="h-3 w-3" />
                  {urgencyConfig.label}
                </Badge>
                <Badge variant="outline">
                  {PROPERTY_TYPE_LABELS[job.property_type]}
                </Badge>
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
                  <h1 className="text-3xl font-bold text-foreground">
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
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
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
              <p className="font-medium">{creator.full_name || 'Anonymous'}</p>
              <p className="text-sm text-muted-foreground capitalize">
                {creator.user_type.replace('_', ' ')}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Inspection Scope */}
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
                      <p className="font-medium">{bid.inspector?.full_name || 'Anonymous'}</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {bid.inspector?.user_type?.replace('_', ' ')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-forest">
                        ${bid.proposed_amount.toLocaleString('en-AU')}
                      </p>
                      <Badge variant="outline" className="mt-1">
                        {bid.status}
                      </Badge>
                    </div>
                  </div>

                  {bid.proposed_inspection_date && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Proposed:{' '}
                      {new Date(bid.proposed_inspection_date).toLocaleDateString('en-AU', {
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

                  <p className="text-xs text-muted-foreground">
                    Submitted {new Date(bid.created_at).toLocaleDateString('en-AU')}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* User's Own Bid Status */}
        {existingBid && !isJobCreator && (
          <Card className="border-forest/30 bg-forest/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-5 w-5 text-forest" />
                Your Bid
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Amount:</span>
                <span className="font-semibold text-forest">
                  ${existingBid.proposed_amount.toLocaleString('en-AU')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge variant="outline">{existingBid.status}</Badge>
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
    </div>
  );
}
