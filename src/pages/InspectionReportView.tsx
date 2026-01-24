/**
 * InspectionReportView.tsx
 *
 * Read-only view of a submitted inspection report for the job poster.
 * Allows viewing the complete report and approving/releasing payment.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
  Eye,
  Home,
  Building,
  TreePine,
  AlertTriangle,
  Star,
  FileCheck,
  MessageSquare,
  ArrowLeft,
  MapPin,
  Utensils,
  Bath,
  Bed,
  Car,
  ShoppingBag,
  Coffee,
  Trees,
  GraduationCap,
  Bus,
  Dumbbell,
  ThumbsUp,
  ThumbsDown,
  Camera,
  CheckCircle2,
  FileText,
  Clock,
  CloudSun,
  TrendingUp,
  User,
  AlertCircle,
  Zap,
  DollarSign,
  Target,
  Award,
  Check,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { notifyReportApproved } from '@/lib/notifications';

// Types (matching InspectionReportBuilder)
type MatchStatus = 'meets' | 'partial' | 'doesnt';
type ConditionRating = 'excellent' | 'good' | 'fair' | 'poor';
type RenovationEstimate = 'none' | 'minor' | 'major' | 'full';
type Recommendation = 'highly_recommend' | 'worth_considering' | 'not_recommended';
type Urgency = 'act_fast' | 'normal' | 'take_time';
type WouldBuy = 'yes' | 'maybe' | 'no';

interface BriefMatch {
  requirement: string;
  status: MatchStatus | null;
  notes: string;
}

interface SectionPhotos {
  [sectionId: string]: string[];
}

interface InspectionReport {
  id: string;
  job_id: string;
  inspector_id: string;
  submitted_at: string | null;
  inspection_date: string;
  inspection_time: string;
  weather: string;
  shown_by: string;
  duration_minutes: number | null;
  areas_not_accessed: string;
  brief_matches: BriefMatch[] | string;
  brief_overall_assessment: string;
  first_impression_vibe: number;
  matches_photos: 'yes' | 'mostly' | 'no' | null;
  gut_feeling_rating: number;
  first_impression_comments: string;
  exterior_street_appeal: number;
  exterior_roof_condition: ConditionRating | null;
  exterior_walls_condition: ConditionRating | null;
  exterior_windows_condition: ConditionRating | null;
  exterior_garden_condition: string | null;
  exterior_parking: string;
  exterior_fencing: string;
  exterior_comments: string;
  interior_living_condition: ConditionRating | null;
  interior_living_natural_light: string | null;
  interior_living_size_accuracy: string | null;
  interior_living_layout_flow: string;
  interior_living_comments: string;
  kitchen_condition: ConditionRating | null;
  kitchen_age_style: string;
  kitchen_appliances: string | null;
  kitchen_bench_space: string | null;
  kitchen_storage: string | null;
  kitchen_renovation_estimate: RenovationEstimate | null;
  kitchen_comments: string;
  bathroom_count: number | null;
  bathroom_ensuite_count: number | null;
  bathroom_condition: ConditionRating | null;
  bathroom_style: string;
  bathroom_ventilation: string | null;
  bathroom_renovation_estimate: RenovationEstimate | null;
  bathroom_comments: string;
  bedroom_count: number | null;
  bedroom_master_size: string | null;
  bedroom_other_sizes: string | null;
  bedroom_storage: string | null;
  bedroom_comments: string;
  other_spaces: string[];
  other_spaces_comments: string;
  neighbourhood_street_feel: string | null;
  neighbourhood_traffic: string;
  neighbourhood_parking_ease: string | null;
  neighbourhood_safety_rating: number;
  neighbourhood_neighbour_properties: string;
  neighbourhood_amenities: string[];
  neighbourhood_walking_distances: string;
  neighbourhood_comments: string;
  red_flags: string[];
  red_flags_comments: string;
  standout_features: string[];
  best_single_feature: string;
  would_personally_buy: WouldBuy | null;
  standout_comments: string;
  days_on_market: string;
  price_guide: string;
  pricing_opinion: string | null;
  competition_level: string | null;
  seller_motivation: string;
  market_comments: string;
  overall_score: number;
  recommendation: Recommendation | null;
  urgency: Urgency | null;
  summary_comments: string;
  questions_to_ask_agent: string;
  second_visit_tips: string;
  negotiation_suggestions: string;
  section_photos: SectionPhotos | string;
  inspector?: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface InspectionJob {
  id: string;
  title: string;
  property_address: string;
  property_city: string;
  property_state: string;
  property_type: string;
  requesting_agent_id: string;
  assigned_inspector_id: string | null;
  status: string;
  agreed_price: number | null;
  client_brief_id: string | null;
}

interface ClientBrief {
  id: string;
  brief_name: string;
  client_name: string;
}

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

// Format helpers
const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0 }).format(amount);

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });

// Rating display helpers
const getConditionColor = (rating: ConditionRating | null) => {
  switch (rating) {
    case 'excellent': return 'bg-green-100 text-green-800 border-green-200';
    case 'good': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'fair': return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'poor': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-gray-100 text-gray-600';
  }
};

const getRenovationLabel = (estimate: RenovationEstimate | null) => {
  switch (estimate) {
    case 'none': return 'No renovation needed';
    case 'minor': return 'Minor updates ($5-15k)';
    case 'major': return 'Major renovation ($15-50k)';
    case 'full': return 'Full renovation ($50k+)';
    default: return 'Not assessed';
  }
};

const getRecommendationConfig = (rec: Recommendation | null) => {
  switch (rec) {
    case 'highly_recommend':
      return { label: 'Highly Recommend', color: 'bg-green-100 text-green-800 border-green-300', icon: ThumbsUp };
    case 'worth_considering':
      return { label: 'Worth Considering', color: 'bg-amber-100 text-amber-800 border-amber-300', icon: AlertCircle };
    case 'not_recommended':
      return { label: 'Not Recommended', color: 'bg-red-100 text-red-800 border-red-300', icon: ThumbsDown };
    default:
      return { label: 'Not Provided', color: 'bg-gray-100 text-gray-600', icon: AlertCircle };
  }
};

const getUrgencyConfig = (urgency: Urgency | null) => {
  switch (urgency) {
    case 'act_fast': return { label: 'Act Fast', color: 'bg-red-100 text-red-700' };
    case 'normal': return { label: 'Normal Timeline', color: 'bg-blue-100 text-blue-700' };
    case 'take_time': return { label: 'Take Your Time', color: 'bg-green-100 text-green-700' };
    default: return { label: 'Not Provided', color: 'bg-gray-100 text-gray-600' };
  }
};

const getMatchStatusIcon = (status: MatchStatus | null) => {
  switch (status) {
    case 'meets': return <Check size={16} className="text-green-600" />;
    case 'partial': return <AlertCircle size={16} className="text-amber-600" />;
    case 'doesnt': return <X size={16} className="text-red-600" />;
    default: return <AlertCircle size={16} className="text-gray-400" />;
  }
};

export default function InspectionReportView() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  console.log('[ReportView] Component mounted, jobId:', jobId, 'user:', user?.id);

  const [job, setJob] = useState<InspectionJob | null>(null);
  const [report, setReport] = useState<InspectionReport | null>(null);
  const [clientBrief, setClientBrief] = useState<ClientBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    console.log('[ReportView] useEffect triggered, jobId:', jobId, 'user:', !!user);
    if (jobId && user) {
      fetchJobAndReport();
    } else if (!user) {
      console.log('[ReportView] No user, stopping loading');
      setLoading(false);
    }
  }, [jobId, user]);

  const fetchJobAndReport = async () => {
    console.log('[ReportView] fetchJobAndReport called');
    if (!jobId || !user) return;
    setLoading(true);

    try {
      const { supabaseUrl, supabaseKey, accessToken } = getAuthHeaders();
      console.log('[ReportView] Fetching job:', jobId);

      // Fetch job
      const jobResponse = await fetch(
        `${supabaseUrl}/rest/v1/inspection_jobs?select=*&id=eq.${jobId}`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.pgrst.object+json',
          },
        }
      );

      if (!jobResponse.ok) {
        const errorText = await jobResponse.text();
        console.error('[ReportView] Job fetch failed:', jobResponse.status, errorText);
        throw new Error('Failed to fetch job');
      }
      const jobData = await jobResponse.json();
      console.log('[ReportView] Job data:', jobData);
      console.log('[ReportView] Job requesting_agent_id:', jobData.requesting_agent_id);
      console.log('[ReportView] Current user.id:', user.id);
      console.log('[ReportView] Profile role:', profile?.role);
      setJob(jobData);

      // Authorization check - only job creator or admin can view
      if (jobData.requesting_agent_id !== user.id && profile?.role !== 'admin') {
        console.error('[ReportView] AUTH FAILED - user is not job creator or admin');
        toast.error('You are not authorized to view this report');
        navigate('/inspections/my-jobs');
        return;
      }
      console.log('[ReportView] Auth check passed');

      // Fetch report
      const reportResponse = await fetch(
        `${supabaseUrl}/rest/v1/inspection_reports?select=*&job_id=eq.${jobId}`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      const reportStatus = reportResponse.status;
      const reportText = await reportResponse.text();

      // Show alert with debug info
      alert(`DEBUG: Report query status: ${reportStatus}\nJob ID: ${jobId}\nResponse: ${reportText.substring(0, 200)}`);

      if (!reportResponse.ok) {
        toast.error('Failed to fetch report: ' + reportStatus);
        navigate('/inspections/my-jobs?tab=reports');
        return;
      }

      const reports = JSON.parse(reportText);

      if (!reports || reports.length === 0) {
        alert(`DEBUG: No reports found!\nJob ID: ${jobId}\nQuery returned empty array.\nThis could be an RLS policy issue.`);
        toast.error('No report found for this job');
        navigate('/inspections/my-jobs?tab=reports');
        return;
      }

      // Fetch inspector profile separately
      const reportData = reports[0];
      try {
        const inspectorResponse = await fetch(
          `${supabaseUrl}/rest/v1/profiles?select=full_name,avatar_url&id=eq.${reportData.inspector_id}`,
          {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${accessToken}`,
              'Accept': 'application/vnd.pgrst.object+json',
            },
          }
        );
        if (inspectorResponse.ok) {
          reportData.inspector = await inspectorResponse.json();
        }
      } catch (e) {
        console.log('[ReportView] Could not fetch inspector profile:', e);
      }

      const reportData = reports[0];
      // Parse JSON fields
      reportData.brief_matches = reportData.brief_matches ?
        (typeof reportData.brief_matches === 'string' ? JSON.parse(reportData.brief_matches) : reportData.brief_matches)
        : [];
      reportData.section_photos = reportData.section_photos ?
        (typeof reportData.section_photos === 'string' ? JSON.parse(reportData.section_photos) : reportData.section_photos)
        : {};

      setReport(reportData);

      // Fetch client brief if linked
      if (jobData.client_brief_id) {
        const briefResponse = await fetch(
          `${supabaseUrl}/rest/v1/client_briefs?select=id,brief_name,client_name&id=eq.${jobData.client_brief_id}`,
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

    } catch (error) {
      console.error('Error fetching report:', error);
      toast.error('Failed to load inspection report');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveReport = async () => {
    if (!job || !report || !user) return;
    setApproving(true);

    try {
      const { supabaseUrl, supabaseKey, accessToken } = getAuthHeaders();

      // Update job status to completed
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
            status: 'completed',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
        }
      );

      // Notify inspector
      try {
        if (job.assigned_inspector_id) {
          await notifyReportApproved(
            job.assigned_inspector_id,
            job.property_address,
            job.id,
            user.id
          );
        }
      } catch (notifError) {
        console.error('Failed to send notification:', notifError);
      }

      toast.success('Report approved! The job is now complete.');
      setShowApproveDialog(false);
      navigate('/inspections/my-jobs?tab=completed');
    } catch (error) {
      console.error('Error approving report:', error);
      toast.error('Failed to approve report');
    } finally {
      setApproving(false);
    }
  };

  // Calculate brief match score
  const calculateBriefScore = () => {
    if (!report) return null;
    const matches = report.brief_matches as BriefMatch[];
    if (!matches || matches.length === 0) return null;

    const assessed = matches.filter(m => m.status !== null);
    if (assessed.length === 0) return null;

    const score = assessed.reduce((acc, m) => {
      if (m.status === 'meets') return acc + 100;
      if (m.status === 'partial') return acc + 50;
      return acc;
    }, 0);

    return Math.round(score / assessed.length);
  };

  const briefScore = calculateBriefScore();

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-forest border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-muted-foreground">Loading inspection report...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!job || !report) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto py-12 text-center">
          <FileText size={48} className="mx-auto mb-4 text-muted-foreground/50" />
          <h2 className="text-xl font-semibold mb-2">Report Not Found</h2>
          <p className="text-muted-foreground mb-4">The inspection report could not be found.</p>
          <Button onClick={() => navigate('/inspections/my-jobs')}>
            <ArrowLeft size={16} className="mr-2" />
            Back to My Jobs
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const recConfig = getRecommendationConfig(report.recommendation);
  const urgencyConfig = getUrgencyConfig(report.urgency);
  const RecIcon = recConfig.icon;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/inspections/my-jobs?tab=reports')} className="mb-4">
            <ArrowLeft size={16} className="mr-2" />
            Back to My Jobs
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-serif font-semibold text-foreground">
                Inspection Report
              </h1>
              <div className="flex items-center gap-2 text-muted-foreground mt-1">
                <MapPin size={16} />
                <span>{job.property_address}, {job.property_city}</span>
              </div>
              {report.inspector && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                  <User size={14} />
                  <span>Inspected by {report.inspector.full_name}</span>
                  {report.inspection_date && (
                    <span className="text-muted-foreground/60">on {formatDate(report.inspection_date)}</span>
                  )}
                </div>
              )}
            </div>

            {job.status === 'pending_review' && (
              <Button
                onClick={() => setShowApproveDialog(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 size={16} className="mr-2" />
                Approve Report
              </Button>
            )}
            {job.status === 'completed' && (
              <Badge className="bg-green-100 text-green-800 border-green-200">
                <CheckCircle2 size={14} className="mr-1" />
                Approved
              </Badge>
            )}
          </div>
        </div>

        {/* Overall Verdict Card - Top Summary */}
        <Card className="mb-6 border-2 border-forest/20 bg-gradient-to-br from-forest/5 to-transparent">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Award className="text-forest" size={24} />
              <h2 className="text-lg font-semibold">Final Verdict</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {/* Overall Score */}
              <div className="text-center p-4 bg-white rounded-lg border">
                <div className="text-3xl font-bold text-forest">{report.overall_score}/10</div>
                <div className="text-xs text-muted-foreground uppercase mt-1">Overall Score</div>
              </div>

              {/* Recommendation */}
              <div className={cn('text-center p-4 rounded-lg border', recConfig.color)}>
                <RecIcon size={24} className="mx-auto mb-1" />
                <div className="text-sm font-semibold">{recConfig.label}</div>
              </div>

              {/* Urgency */}
              <div className={cn('text-center p-4 rounded-lg border', urgencyConfig.color)}>
                <Zap size={24} className="mx-auto mb-1" />
                <div className="text-sm font-semibold">{urgencyConfig.label}</div>
              </div>

              {/* Brief Match Score */}
              {briefScore !== null && (
                <div className="text-center p-4 bg-white rounded-lg border">
                  <div className={cn(
                    'text-3xl font-bold',
                    briefScore >= 70 ? 'text-green-600' : briefScore >= 40 ? 'text-amber-600' : 'text-red-600'
                  )}>
                    {briefScore}%
                  </div>
                  <div className="text-xs text-muted-foreground uppercase mt-1">Brief Match</div>
                </div>
              )}
            </div>

            {report.summary_comments && (
              <div className="p-4 bg-white rounded-lg border">
                <p className="text-sm leading-relaxed">{report.summary_comments}</p>
              </div>
            )}

            {/* Would Personally Buy */}
            {report.would_personally_buy && (
              <div className="mt-4 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Inspector would personally buy:</span>
                <Badge className={cn(
                  report.would_personally_buy === 'yes' && 'bg-green-100 text-green-700',
                  report.would_personally_buy === 'maybe' && 'bg-amber-100 text-amber-700',
                  report.would_personally_buy === 'no' && 'bg-red-100 text-red-700',
                )}>
                  {report.would_personally_buy === 'yes' && 'Yes'}
                  {report.would_personally_buy === 'maybe' && 'Maybe'}
                  {report.would_personally_buy === 'no' && 'No'}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Client Brief Match */}
        {clientBrief && report.brief_matches && (report.brief_matches as BriefMatch[]).length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target size={20} className="text-purple-600" />
                Client Brief Match
              </CardTitle>
              <CardDescription>
                How well does this property match {clientBrief.client_name}'s requirements?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(report.brief_matches as BriefMatch[]).map((match, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                    {getMatchStatusIcon(match.status)}
                    <div className="flex-1">
                      <div className="font-medium text-sm">{match.requirement}</div>
                      {match.notes && (
                        <div className="text-sm text-muted-foreground mt-1">{match.notes}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {report.brief_overall_assessment && (
                <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-sm">{report.brief_overall_assessment}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* First Impressions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye size={20} className="text-blue-600" />
              First Impressions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="text-2xl font-bold text-forest">{report.first_impression_vibe}/10</div>
                <div className="text-xs text-muted-foreground">Initial Vibe</div>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="text-2xl font-bold text-forest">{report.gut_feeling_rating}/10</div>
                <div className="text-xs text-muted-foreground">Gut Feeling</div>
              </div>
              {report.matches_photos && (
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className={cn(
                    'text-lg font-semibold capitalize',
                    report.matches_photos === 'yes' && 'text-green-600',
                    report.matches_photos === 'mostly' && 'text-amber-600',
                    report.matches_photos === 'no' && 'text-red-600',
                  )}>
                    {report.matches_photos}
                  </div>
                  <div className="text-xs text-muted-foreground">Matches Photos</div>
                </div>
              )}
            </div>
            {report.first_impression_comments && (
              <p className="text-sm text-muted-foreground">{report.first_impression_comments}</p>
            )}
          </CardContent>
        </Card>

        {/* Exterior */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home size={20} className="text-amber-600" />
              Exterior
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="p-3 bg-muted/30 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Street Appeal</div>
                <div className="font-semibold">{report.exterior_street_appeal}/10</div>
              </div>
              {report.exterior_roof_condition && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">Roof</div>
                  <Badge className={getConditionColor(report.exterior_roof_condition)}>
                    {report.exterior_roof_condition}
                  </Badge>
                </div>
              )}
              {report.exterior_walls_condition && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">Walls</div>
                  <Badge className={getConditionColor(report.exterior_walls_condition)}>
                    {report.exterior_walls_condition}
                  </Badge>
                </div>
              )}
              {report.exterior_windows_condition && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">Windows</div>
                  <Badge className={getConditionColor(report.exterior_windows_condition)}>
                    {report.exterior_windows_condition}
                  </Badge>
                </div>
              )}
            </div>
            {report.exterior_comments && (
              <p className="text-sm text-muted-foreground">{report.exterior_comments}</p>
            )}
          </CardContent>
        </Card>

        {/* Kitchen */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Utensils size={20} className="text-orange-600" />
              Kitchen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              {report.kitchen_condition && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">Condition</div>
                  <Badge className={getConditionColor(report.kitchen_condition)}>
                    {report.kitchen_condition}
                  </Badge>
                </div>
              )}
              {report.kitchen_renovation_estimate && (
                <div className="p-3 bg-muted/30 rounded-lg col-span-2">
                  <div className="text-xs text-muted-foreground mb-1">Renovation Estimate</div>
                  <div className="font-medium text-sm">{getRenovationLabel(report.kitchen_renovation_estimate)}</div>
                </div>
              )}
            </div>
            {report.kitchen_age_style && (
              <p className="text-sm mb-2"><strong>Style:</strong> {report.kitchen_age_style}</p>
            )}
            {report.kitchen_comments && (
              <p className="text-sm text-muted-foreground">{report.kitchen_comments}</p>
            )}
          </CardContent>
        </Card>

        {/* Bathrooms */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bath size={20} className="text-cyan-600" />
              Bathrooms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {report.bathroom_count && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">Total</div>
                  <div className="font-semibold">{report.bathroom_count}</div>
                </div>
              )}
              {report.bathroom_ensuite_count !== null && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">Ensuites</div>
                  <div className="font-semibold">{report.bathroom_ensuite_count}</div>
                </div>
              )}
              {report.bathroom_condition && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">Condition</div>
                  <Badge className={getConditionColor(report.bathroom_condition)}>
                    {report.bathroom_condition}
                  </Badge>
                </div>
              )}
              {report.bathroom_renovation_estimate && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">Renovation</div>
                  <div className="text-sm">{getRenovationLabel(report.bathroom_renovation_estimate)}</div>
                </div>
              )}
            </div>
            {report.bathroom_comments && (
              <p className="text-sm text-muted-foreground">{report.bathroom_comments}</p>
            )}
          </CardContent>
        </Card>

        {/* Bedrooms */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bed size={20} className="text-indigo-600" />
              Bedrooms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              {report.bedroom_count && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">Total Bedrooms</div>
                  <div className="font-semibold">{report.bedroom_count}</div>
                </div>
              )}
              {report.bedroom_master_size && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">Master Size</div>
                  <div className="font-medium capitalize">{report.bedroom_master_size}</div>
                </div>
              )}
              {report.bedroom_storage && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">Storage</div>
                  <div className="font-medium capitalize">{report.bedroom_storage}</div>
                </div>
              )}
            </div>
            {report.bedroom_comments && (
              <p className="text-sm text-muted-foreground">{report.bedroom_comments}</p>
            )}
          </CardContent>
        </Card>

        {/* Neighbourhood */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TreePine size={20} className="text-green-600" />
              Neighbourhood
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              <div className="p-3 bg-muted/30 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Safety Rating</div>
                <div className="font-semibold">{report.neighbourhood_safety_rating}/5</div>
              </div>
              {report.neighbourhood_street_feel && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">Street Feel</div>
                  <div className="font-medium capitalize">{report.neighbourhood_street_feel}</div>
                </div>
              )}
              {report.neighbourhood_parking_ease && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">Parking</div>
                  <div className="font-medium capitalize">{report.neighbourhood_parking_ease}</div>
                </div>
              )}
            </div>

            {report.neighbourhood_amenities && report.neighbourhood_amenities.length > 0 && (
              <div className="mb-4">
                <div className="text-xs text-muted-foreground mb-2">Nearby Amenities</div>
                <div className="flex flex-wrap gap-2">
                  {report.neighbourhood_amenities.map((amenity) => (
                    <Badge key={amenity} variant="outline">{amenity}</Badge>
                  ))}
                </div>
              </div>
            )}

            {report.neighbourhood_comments && (
              <p className="text-sm text-muted-foreground">{report.neighbourhood_comments}</p>
            )}
          </CardContent>
        </Card>

        {/* Red Flags & Standouts Side by Side */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Red Flags */}
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <AlertTriangle size={20} />
                Red Flags
              </CardTitle>
            </CardHeader>
            <CardContent>
              {report.red_flags && report.red_flags.length > 0 ? (
                <div className="space-y-2">
                  {report.red_flags.map((flag) => (
                    <div key={flag} className="flex items-center gap-2 text-sm">
                      <X size={14} className="text-red-500 flex-shrink-0" />
                      <span>{flag}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No red flags identified</p>
              )}
              {report.red_flags_comments && (
                <div className="mt-4 p-3 bg-red-50 rounded-lg">
                  <p className="text-sm">{report.red_flags_comments}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Standout Features */}
          <Card className="border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <Star size={20} />
                Standout Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              {report.standout_features && report.standout_features.length > 0 ? (
                <div className="space-y-2">
                  {report.standout_features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-sm">
                      <Check size={14} className="text-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No standout features noted</p>
              )}
              {report.best_single_feature && (
                <div className="mt-4 p-3 bg-green-50 rounded-lg">
                  <div className="text-xs text-green-600 font-medium mb-1">Best Feature</div>
                  <p className="text-sm font-medium">{report.best_single_feature}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Market Context */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp size={20} className="text-blue-600" />
              Market Context
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              {report.days_on_market && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">Days on Market</div>
                  <div className="font-semibold">{report.days_on_market}</div>
                </div>
              )}
              {report.price_guide && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">Price Guide</div>
                  <div className="font-semibold">{report.price_guide}</div>
                </div>
              )}
              {report.pricing_opinion && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">Price Opinion</div>
                  <div className={cn(
                    'font-medium capitalize',
                    report.pricing_opinion === 'under' && 'text-green-600',
                    report.pricing_opinion === 'fair' && 'text-blue-600',
                    report.pricing_opinion === 'over' && 'text-red-600',
                  )}>
                    {report.pricing_opinion === 'under' && 'Underpriced'}
                    {report.pricing_opinion === 'fair' && 'Fair Price'}
                    {report.pricing_opinion === 'over' && 'Overpriced'}
                  </div>
                </div>
              )}
            </div>
            {report.market_comments && (
              <p className="text-sm text-muted-foreground">{report.market_comments}</p>
            )}
          </CardContent>
        </Card>

        {/* Tips for Agent */}
        <Card className="mb-6 border-purple-200 bg-purple-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-700">
              <MessageSquare size={20} />
              Tips for You
            </CardTitle>
            <CardDescription>Recommendations from the inspector</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {report.questions_to_ask_agent && (
              <div>
                <div className="text-sm font-medium text-purple-700 mb-1">Questions to Ask the Selling Agent</div>
                <p className="text-sm p-3 bg-white rounded-lg">{report.questions_to_ask_agent}</p>
              </div>
            )}
            {report.second_visit_tips && (
              <div>
                <div className="text-sm font-medium text-purple-700 mb-1">Second Visit Tips</div>
                <p className="text-sm p-3 bg-white rounded-lg">{report.second_visit_tips}</p>
              </div>
            )}
            {report.negotiation_suggestions && (
              <div>
                <div className="text-sm font-medium text-purple-700 mb-1">Negotiation Suggestions</div>
                <p className="text-sm p-3 bg-white rounded-lg">{report.negotiation_suggestions}</p>
              </div>
            )}
            {!report.questions_to_ask_agent && !report.second_visit_tips && !report.negotiation_suggestions && (
              <p className="text-sm text-muted-foreground">No additional tips provided.</p>
            )}
          </CardContent>
        </Card>

        {/* Inspection Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock size={20} className="text-gray-600" />
              Inspection Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {report.inspection_date && (
                <div>
                  <div className="text-muted-foreground">Date</div>
                  <div className="font-medium">{formatDate(report.inspection_date)}</div>
                </div>
              )}
              {report.inspection_time && (
                <div>
                  <div className="text-muted-foreground">Time</div>
                  <div className="font-medium">{report.inspection_time}</div>
                </div>
              )}
              {report.duration_minutes && (
                <div>
                  <div className="text-muted-foreground">Duration</div>
                  <div className="font-medium">{report.duration_minutes} minutes</div>
                </div>
              )}
              {report.weather && (
                <div>
                  <div className="text-muted-foreground">Weather</div>
                  <div className="font-medium">{report.weather}</div>
                </div>
              )}
              {report.shown_by && (
                <div>
                  <div className="text-muted-foreground">Shown By</div>
                  <div className="font-medium">{report.shown_by}</div>
                </div>
              )}
            </div>
            {report.areas_not_accessed && (
              <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <div className="text-sm font-medium text-amber-700 mb-1">Areas Not Accessed</div>
                <p className="text-sm">{report.areas_not_accessed}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bottom Action Bar */}
        {job.status === 'pending_review' && (
          <div className="sticky bottom-0 bg-white border-t p-4 -mx-4 flex justify-end gap-3">
            <Button variant="outline" onClick={() => navigate('/inspections/my-jobs?tab=reports')}>
              Back to Jobs
            </Button>
            <Button
              onClick={() => setShowApproveDialog(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 size={16} className="mr-2" />
              Approve Report
            </Button>
          </div>
        )}

        {/* Approve Confirmation Dialog */}
        <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Approve This Report?</AlertDialogTitle>
              <AlertDialogDescription>
                By approving this report, you confirm the inspection has been completed satisfactorily.
                The inspector will be notified and the job will be marked as complete.
                {job.agreed_price && (
                  <span className="block mt-2 font-medium">
                    Agreed payment: {formatCurrency(job.agreed_price)}
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={approving}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleApproveReport}
                disabled={approving}
                className="bg-green-600 hover:bg-green-700"
              >
                {approving ? 'Approving...' : 'Approve Report'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
