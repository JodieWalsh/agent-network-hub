/**
 * InspectionReportBuilder.tsx
 *
 * 🎭 COMPREHENSIVE INSPECTION REPORT FORM (16 SECTIONS)
 *
 * Multi-section form for inspectors to submit detailed reports:
 * - 16 sections covering all aspects of the property
 * - Auto-save every 30 seconds
 * - Photo upload per section
 * - Client brief matching with live score
 * - Progress tracking and time spent
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Eye,
  Home,
  Building,
  TreePine,
  AlertTriangle,
  Star,
  FileCheck,
  MessageSquare,
  ArrowRight,
  ArrowLeft,
  Save,
  Send,
  MapPin,
  Sparkles,
  Utensils,
  Bath,
  Bed,
  Car,
  Shield,
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
  PartyPopper,
  Clock,
  CloudSun,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  User,
  X,
  Check,
  AlertCircle,
  Zap,
  Turtle,
  Upload,
  Image,
  DollarSign,
  Target,
  Award,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { notifyReportSubmitted } from '@/lib/notifications';
import { uploadInspectionPhotos, validateImageFile } from '@/lib/storage';
import { formatPrice } from '@/lib/currency';

// Types
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

interface ReportFormData {
  // Section 0: Inspection Details
  inspection_date: string;
  inspection_time: string;
  weather: string;
  shown_by: string;
  duration_minutes: number | null;
  areas_not_accessed: string;

  // Section 1: Client Brief Match
  brief_matches: BriefMatch[];
  brief_overall_assessment: string;

  // Section 2: First Impressions
  first_impression_vibe: number;
  matches_photos: 'yes' | 'mostly' | 'no' | null;
  gut_feeling_rating: number;
  first_impression_comments: string;

  // Section 3: Exterior
  exterior_street_appeal: number;
  exterior_roof_condition: ConditionRating | null;
  exterior_walls_condition: ConditionRating | null;
  exterior_windows_condition: ConditionRating | null;
  exterior_garden_condition: string | null;
  exterior_parking: string;
  exterior_fencing: string;
  exterior_comments: string;

  // Section 4: Interior - Living
  interior_living_condition: ConditionRating | null;
  interior_living_natural_light: string | null;
  interior_living_size_accuracy: string | null;
  interior_living_layout_flow: string;
  interior_living_comments: string;

  // Section 5: Kitchen
  kitchen_condition: ConditionRating | null;
  kitchen_age_style: string;
  kitchen_appliances: string | null;
  kitchen_bench_space: string | null;
  kitchen_storage: string | null;
  kitchen_renovation_estimate: RenovationEstimate | null;
  kitchen_comments: string;

  // Section 6: Bathrooms
  bathroom_count: number | null;
  bathroom_ensuite_count: number | null;
  bathroom_condition: ConditionRating | null;
  bathroom_style: string;
  bathroom_ventilation: string | null;
  bathroom_renovation_estimate: RenovationEstimate | null;
  bathroom_comments: string;

  // Section 7: Bedrooms
  bedroom_count: number | null;
  bedroom_master_size: string | null;
  bedroom_other_sizes: string | null;
  bedroom_storage: string | null;
  bedroom_comments: string;

  // Section 8: Other Spaces
  other_spaces: string[];
  other_spaces_comments: string;

  // Section 9: Neighbourhood
  neighbourhood_street_feel: string | null;
  neighbourhood_traffic: string;
  neighbourhood_parking_ease: string | null;
  neighbourhood_safety_rating: number;
  neighbourhood_neighbour_properties: string;
  neighbourhood_amenities: string[];
  neighbourhood_walking_distances: string;
  neighbourhood_comments: string;

  // Section 10: Red Flags
  red_flags: string[];
  red_flags_comments: string;

  // Section 11: Standout Features
  standout_features: string[];
  best_single_feature: string;
  would_personally_buy: WouldBuy | null;
  standout_comments: string;

  // Section 12: Market Context
  days_on_market: string;
  price_guide: string;
  pricing_opinion: string | null;
  competition_level: string | null;
  seller_motivation: string;
  market_comments: string;

  // Section 13: Final Verdict
  overall_score: number;
  recommendation: Recommendation | null;
  urgency: Urgency | null;
  summary_comments: string;

  // Section 14: For Requesting Agent
  questions_to_ask_agent: string;
  second_visit_tips: string;
  negotiation_suggestions: string;

  // Photos
  section_photos: SectionPhotos;
}

interface InspectionJob {
  id: string;
  property_address: string;
  property_type: string;
  requesting_agent_id: string;
  client_brief_id: string | null;
  status: string;
  agreed_price: number | null;
  budget_currency: string;
  assigned_inspector_id: string | null;
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
  property_types: string[] | null;
  must_have_features: string[] | null;
  deal_breakers: string[] | null;
  preferred_locations: string[] | null;
}

// Section configuration
const SECTIONS = [
  { id: 0, name: 'Inspection Details', icon: Clock, description: 'Date, time, access' },
  { id: 1, name: 'Client Brief Match', icon: Target, description: 'Requirements check', briefOnly: true },
  { id: 2, name: 'First Impressions', icon: Eye, description: 'Initial reactions' },
  { id: 3, name: 'Exterior', icon: Home, description: 'Outside assessment' },
  { id: 4, name: 'Living Areas', icon: Building, description: 'Living spaces' },
  { id: 5, name: 'Kitchen', icon: Utensils, description: 'Kitchen details' },
  { id: 6, name: 'Bathrooms', icon: Bath, description: 'Bathroom assessment' },
  { id: 7, name: 'Bedrooms', icon: Bed, description: 'Bedroom details' },
  { id: 8, name: 'Other Spaces', icon: Car, description: 'Garage, laundry, etc.' },
  { id: 9, name: 'Neighbourhood', icon: TreePine, description: 'Area assessment' },
  { id: 10, name: 'Red Flags', icon: AlertTriangle, description: 'Concerns & issues' },
  { id: 11, name: 'Standouts', icon: Star, description: 'Best features' },
  { id: 12, name: 'Market Context', icon: TrendingUp, description: 'Pricing & competition' },
  { id: 13, name: 'Final Verdict', icon: FileCheck, description: 'Overall assessment' },
  { id: 14, name: 'For Agent', icon: MessageSquare, description: 'Tips for requester' },
  { id: 15, name: 'Review & Submit', icon: Send, description: 'Final check' },
];

const OTHER_SPACES_OPTIONS = [
  'Garage', 'Laundry', 'Study', 'Storage', 'Balcony', 'Courtyard', 'Pool', 'Shed', 'Granny Flat',
];

const AMENITIES_OPTIONS = [
  { value: 'shops', label: 'Shops', icon: ShoppingBag },
  { value: 'cafes', label: 'Cafes', icon: Coffee },
  { value: 'parks', label: 'Parks', icon: Trees },
  { value: 'schools', label: 'Schools', icon: GraduationCap },
  { value: 'transport', label: 'Transport', icon: Bus },
  { value: 'gym', label: 'Gym', icon: Dumbbell },
];

const RED_FLAGS_OPTIONS = [
  'Structural concerns', 'Damp/mould', 'Unusual smells', 'Pest signs', 'Electrical issues',
  'Plumbing issues', 'Roof problems', 'Noise issues', 'Neighbour concerns', 'Access issues',
  'Flood/fire risk',
];

const STANDOUT_FEATURES_OPTIONS = [
  'Views', 'Garden', 'High ceilings', 'Original features', 'Quality renovation', 'Storage',
  'Layout', 'Natural light', 'Outdoor entertaining', 'Location', 'Quiet street', 'Pool', 'Potential',
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

const initialFormData: ReportFormData = {
  inspection_date: new Date().toISOString().split('T')[0],
  inspection_time: '',
  weather: '',
  shown_by: '',
  duration_minutes: null,
  areas_not_accessed: '',
  brief_matches: [],
  brief_overall_assessment: '',
  first_impression_vibe: 5,
  matches_photos: null,
  gut_feeling_rating: 5,
  first_impression_comments: '',
  exterior_street_appeal: 5,
  exterior_roof_condition: null,
  exterior_walls_condition: null,
  exterior_windows_condition: null,
  exterior_garden_condition: null,
  exterior_parking: '',
  exterior_fencing: '',
  exterior_comments: '',
  interior_living_condition: null,
  interior_living_natural_light: null,
  interior_living_size_accuracy: null,
  interior_living_layout_flow: '',
  interior_living_comments: '',
  kitchen_condition: null,
  kitchen_age_style: '',
  kitchen_appliances: null,
  kitchen_bench_space: null,
  kitchen_storage: null,
  kitchen_renovation_estimate: null,
  kitchen_comments: '',
  bathroom_count: null,
  bathroom_ensuite_count: null,
  bathroom_condition: null,
  bathroom_style: '',
  bathroom_ventilation: null,
  bathroom_renovation_estimate: null,
  bathroom_comments: '',
  bedroom_count: null,
  bedroom_master_size: null,
  bedroom_other_sizes: null,
  bedroom_storage: null,
  bedroom_comments: '',
  other_spaces: [],
  other_spaces_comments: '',
  neighbourhood_street_feel: null,
  neighbourhood_traffic: '',
  neighbourhood_parking_ease: null,
  neighbourhood_safety_rating: 3,
  neighbourhood_neighbour_properties: '',
  neighbourhood_amenities: [],
  neighbourhood_walking_distances: '',
  neighbourhood_comments: '',
  red_flags: [],
  red_flags_comments: '',
  standout_features: [],
  best_single_feature: '',
  would_personally_buy: null,
  standout_comments: '',
  days_on_market: '',
  price_guide: '',
  pricing_opinion: null,
  competition_level: null,
  seller_motivation: '',
  market_comments: '',
  overall_score: 5,
  recommendation: null,
  urgency: null,
  summary_comments: '',
  questions_to_ask_agent: '',
  second_visit_tips: '',
  negotiation_suggestions: '',
  section_photos: {},
};

export default function InspectionReportBuilder() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [job, setJob] = useState<InspectionJob | null>(null);
  const [clientBrief, setClientBrief] = useState<ClientBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSection, setCurrentSection] = useState(0);
  const [formData, setFormData] = useState<ReportFormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [existingReportId, setExistingReportId] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [disclaimerConfirmed, setDisclaimerConfirmed] = useState(false);
  const [startTime] = useState<Date>(new Date());
  const [timeSpent, setTimeSpent] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);
  const formDataRef = useRef(formData);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Keep ref updated
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  // Time tracker
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeSpent(Math.floor((new Date().getTime() - startTime.getTime()) / 1000));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startTime]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!user || !jobId) return;
    autoSaveRef.current = setInterval(() => {
      handleAutoSave();
    }, 30000);
    return () => {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    };
  }, [user, jobId, existingReportId]);

  const handleAutoSave = useCallback(async () => {
    if (!user || !jobId || saving || submitting) return;
    try {
      const { supabaseUrl, supabaseKey, accessToken } = getAuthHeaders();
      const { section_photos, brief_matches, ...restData } = formDataRef.current;
      const reportData = {
        job_id: jobId,
        inspector_id: user.id,
        ...restData,
        brief_matches: JSON.stringify(brief_matches),
        section_photos: JSON.stringify(section_photos),
      };

      if (existingReportId) {
        await fetch(`${supabaseUrl}/rest/v1/inspection_reports?id=eq.${existingReportId}`, {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify(reportData),
        });
      } else {
        const response = await fetch(`${supabaseUrl}/rest/v1/inspection_reports`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify(reportData),
        });
        if (response.ok) {
          const data = await response.json();
          if (data?.[0]?.id) setExistingReportId(data[0].id);
        }
      }
      setLastSaved(new Date());
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }, [user, jobId, existingReportId, saving, submitting]);

  useEffect(() => {
    if (jobId && user) {
      fetchJobAndReport();
    } else if (!user) {
      setLoading(false);
    }
  }, [jobId, user]);

  const fetchJobAndReport = async () => {
    if (!jobId || !user) return;
    setLoading(true);
    try {
      const { supabaseUrl, supabaseKey, accessToken } = getAuthHeaders();

      // Fetch job details
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
      if (!jobResponse.ok) throw new Error('Failed to fetch job');
      const jobData = await jobResponse.json();
      setJob(jobData);

      // Check authorization - only assigned inspector can access
      if (jobData.assigned_inspector_id !== user.id && profile?.role !== 'admin') {
        toast.error('You are not authorized to submit this report');
        navigate('/inspections/my-work');
        return;
      }

      // Update job status to in_progress if still assigned
      if (jobData.status === 'assigned') {
        await fetch(`${supabaseUrl}/rest/v1/inspection_jobs?id=eq.${jobId}`, {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({ status: 'in_progress' }),
        });
      }

      // Fetch client brief if linked
      if (jobData.client_brief_id) {
        const briefResponse = await fetch(
          `${supabaseUrl}/rest/v1/client_briefs?select=*&id=eq.${jobData.client_brief_id}`,
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

          // Initialize brief matches
          const requirements: string[] = [];
          if (briefData.bedrooms_min) requirements.push(`${briefData.bedrooms_min}+ bedrooms`);
          if (briefData.bathrooms_min) requirements.push(`${briefData.bathrooms_min}+ bathrooms`);
          if (briefData.must_have_features) requirements.push(...briefData.must_have_features);
          if (briefData.deal_breakers) requirements.push(...briefData.deal_breakers.map((d: string) => `No ${d}`));

          setFormData(prev => ({
            ...prev,
            brief_matches: requirements.map(req => ({ requirement: req, status: null, notes: '' })),
          }));
        }
      }

      // Check for existing report
      const reportResponse = await fetch(
        `${supabaseUrl}/rest/v1/inspection_reports?select=*&job_id=eq.${jobId}&inspector_id=eq.${user.id}`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );
      if (reportResponse.ok) {
        const reports = await reportResponse.json();
        if (reports?.[0]) {
          const reportData = reports[0];
          setExistingReportId(reportData.id);
          // Populate form with existing data
          setFormData(prev => ({
            ...prev,
            ...reportData,
            brief_matches: reportData.brief_matches ? JSON.parse(reportData.brief_matches) : prev.brief_matches,
            section_photos: reportData.section_photos ? JSON.parse(reportData.section_photos) : {},
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching job/report:', error);
      toast.error('Failed to load inspection details');
    } finally {
      setLoading(false);
    }
  };

  // Get available sections (filter out brief match if no brief)
  const availableSections = SECTIONS.filter(s => !s.briefOnly || clientBrief);

  // Progress calculation
  const completedSections = availableSections.filter(s => {
    // Simple check - has any data filled in for section
    if (s.id === 0) return !!formData.inspection_date && !!formData.inspection_time;
    if (s.id === 1) return formData.brief_matches.some(m => m.status !== null);
    if (s.id === 2) return !!formData.first_impression_comments;
    if (s.id === 3) return !!formData.exterior_comments;
    if (s.id === 4) return !!formData.interior_living_comments;
    if (s.id === 5) return !!formData.kitchen_comments;
    if (s.id === 6) return !!formData.bathroom_comments;
    if (s.id === 7) return !!formData.bedroom_comments;
    if (s.id === 8) return formData.other_spaces.length > 0;
    if (s.id === 9) return !!formData.neighbourhood_comments;
    if (s.id === 10) return formData.red_flags.length > 0 || formData.red_flags_comments.length > 0;
    if (s.id === 11) return formData.standout_features.length > 0;
    if (s.id === 12) return !!formData.market_comments;
    if (s.id === 13) return !!formData.summary_comments && !!formData.recommendation;
    if (s.id === 14) return !!formData.questions_to_ask_agent;
    return false;
  }).length;
  const progressPercentage = (completedSections / (availableSections.length - 1)) * 100; // -1 for Review section

  // Brief match score calculation
  const briefMatchScore = formData.brief_matches.filter(m => m.status === 'meets').length;
  const briefTotalRequirements = formData.brief_matches.length;
  const briefMatchPercentage = briefTotalRequirements > 0 ? Math.round((briefMatchScore / briefTotalRequirements) * 100) : 0;

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const handleSaveDraft = async () => {
    if (!user || !jobId) return;
    setSaving(true);
    try {
      await handleAutoSave();
      toast.success('Draft saved successfully');
    } catch (error) {
      toast.error('Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  const canSubmit = (): boolean => {
    return !!(
      formData.overall_score &&
      formData.recommendation &&
      formData.summary_comments.trim().length > 10 &&
      disclaimerConfirmed
    );
  };

  const handleSubmit = async () => {
    if (!user || !jobId || !job || !canSubmit()) return;
    setSubmitting(true);
    try {
      const { supabaseUrl, supabaseKey, accessToken } = getAuthHeaders();
      const { section_photos, brief_matches, ...restData } = formData;
      const reportData = {
        job_id: jobId,
        inspector_id: user.id,
        ...restData,
        brief_matches: JSON.stringify(brief_matches),
        section_photos: JSON.stringify(section_photos),
        submitted_at: new Date().toISOString(),
        time_spent_minutes: Math.floor(timeSpent / 60),
      };

      let reportSaveSuccess = false;

      if (existingReportId) {
        const patchResponse = await fetch(`${supabaseUrl}/rest/v1/inspection_reports?id=eq.${existingReportId}`, {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify(reportData),
        });
        reportSaveSuccess = patchResponse.ok;
        if (!reportSaveSuccess) {
          const errorText = await patchResponse.text();
          console.error('Report PATCH failed:', patchResponse.status, errorText);
          throw new Error(`Failed to update report: ${patchResponse.status}`);
        }
      } else {
        const postResponse = await fetch(`${supabaseUrl}/rest/v1/inspection_reports`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify(reportData),
        });
        reportSaveSuccess = postResponse.ok;
        if (!reportSaveSuccess) {
          const errorText = await postResponse.text();
          console.error('Report POST failed:', postResponse.status, errorText);
          throw new Error(`Failed to save report: ${postResponse.status}. Please try again.`);
        }
        // Get the new report ID
        const savedReport = await postResponse.json();
        if (savedReport?.[0]?.id) {
          setExistingReportId(savedReport[0].id);
        }
      }

      // Only update job status if report was saved successfully
      // Update job status to pending_review
      await fetch(`${supabaseUrl}/rest/v1/inspection_jobs?id=eq.${jobId}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ status: 'pending_review' }),
      });

      // Send notification to job creator
      try {
        await notifyReportSubmitted(
          job.requesting_agent_id,
          job.property_address,
          job.id,
          user.id
        );
      } catch (e) {
        console.error('Failed to send notification:', e);
      }

      setShowSubmitDialog(false);
      setShowCelebration(true);
    } catch (error) {
      console.error('Error submitting report:', error);
      toast.error('Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  const updateFormData = <K extends keyof ReportFormData>(key: K, value: ReportFormData[K]) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const toggleArrayItem = (key: 'other_spaces' | 'neighbourhood_amenities' | 'red_flags' | 'standout_features', value: string) => {
    setFormData(prev => {
      const arr = prev[key];
      if (arr.includes(value)) {
        return { ...prev, [key]: arr.filter(v => v !== value) };
      }
      return { ...prev, [key]: [...arr, value] };
    });
  };

  const updateBriefMatch = (index: number, field: 'status' | 'notes', value: any) => {
    setFormData(prev => {
      const newMatches = [...prev.brief_matches];
      newMatches[index] = { ...newMatches[index], [field]: value };
      return { ...prev, brief_matches: newMatches };
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="h-12 w-12 text-forest animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Loading inspection report...</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <p className="text-muted-foreground">Job not found</p>
          <Button onClick={() => navigate('/inspections/my-work')} className="mt-4">
            Back to My Work
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <div className="border-b bg-card sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-foreground truncate">Inspection Report</h1>
                {clientBrief && (
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 flex-shrink-0">
                    <Target className="h-3 w-3 mr-1" />
                    {briefMatchScore}/{briefTotalRequirements} ({briefMatchPercentage}%)
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                {job.property_address}
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTime(timeSpent)}
              </span>
              {lastSaved && (
                <span className="text-xs text-green-600 flex items-center gap-1 hidden sm:flex">
                  <CheckCircle2 className="h-3 w-3" />
                  Saved
                </span>
              )}
              <Button variant="outline" size="sm" onClick={handleSaveDraft} disabled={saving}>
                <Save className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{saving ? 'Saving...' : 'Save'}</span>
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          <Progress value={progressPercentage} className="h-2 mb-3" />

          {/* Desktop Section Nav */}
          <div className="hidden lg:flex justify-between overflow-x-auto pb-2 gap-1">
            {availableSections.map((section) => {
              const Icon = section.icon;
              const isActive = currentSection === section.id;
              const isCompleted = completedSections > section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setCurrentSection(section.id)}
                  className={cn(
                    'flex flex-col items-center gap-1 min-w-[50px] p-2 rounded-lg transition-colors',
                    isActive && 'bg-forest/10 text-forest',
                    !isActive && 'text-muted-foreground hover:bg-muted'
                  )}
                >
                  <div className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center border-2 transition-colors text-xs',
                    isActive && 'border-forest bg-forest/10',
                    isCompleted && !isActive && 'border-green-500 bg-green-50 text-green-600',
                    !isActive && !isCompleted && 'border-border'
                  )}>
                    {isCompleted && !isActive ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                  </div>
                  <p className="text-[9px] font-medium whitespace-nowrap">{section.name}</p>
                </button>
              );
            })}
          </div>

          {/* Mobile Section Nav */}
          <div className="lg:hidden">
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
            >
              <span className="flex items-center gap-2">
                {(() => {
                  const Icon = availableSections.find(s => s.id === currentSection)?.icon || FileCheck;
                  return <Icon className="h-4 w-4" />;
                })()}
                {availableSections.find(s => s.id === currentSection)?.name}
              </span>
              <ChevronDown className={cn('h-4 w-4 transition-transform', mobileNavOpen && 'rotate-180')} />
            </Button>
            {mobileNavOpen && (
              <div className="absolute left-4 right-4 mt-2 bg-card border rounded-lg shadow-lg z-30 max-h-[60vh] overflow-y-auto">
                {availableSections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      onClick={() => {
                        setCurrentSection(section.id);
                        setMobileNavOpen(false);
                      }}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted transition-colors',
                        currentSection === section.id && 'bg-forest/10 text-forest'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-sm">{section.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-24">
        {/* Professional Disclaimer - Shown on first section */}
        {currentSection === 0 && (
          <Card className="mb-6 border-blue-200 bg-blue-50/50">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 mb-2">Before You Begin</h3>
                  <p className="text-sm text-blue-800 mb-3">
                    This report captures your professional observations and opinions based on a visual walkthrough.
                    You're sharing your honest assessment as a fellow buyers agent – you're not acting as a licensed
                    building inspector, structural engineer, or pest specialist.
                  </p>
                  <p className="text-sm text-blue-800 mb-3">
                    Your colleague is relying on your experienced eye and local knowledge to help them decide whether
                    to pursue this property further. Be thorough, be honest, and flag anything that might need
                    professional follow-up.
                  </p>
                  {job?.agreed_price && (
                    <div className="p-2 bg-emerald-100 rounded-lg inline-block">
                      <p className="text-sm font-medium text-emerald-800">
                        Your earnings for this job: {formatPrice(Math.round(job.agreed_price * 0.90), job.budget_currency || 'AUD')}
                        <span className="text-xs ml-1">(paid when report is approved)</span>
                      </p>
                    </div>
                  )}
                  <p className="text-sm text-blue-700 mt-3">
                    Thank you for being part of our trusted network!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section 0: Inspection Details */}
        {currentSection === 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-forest" />
                Inspection Details
              </CardTitle>
              <CardDescription>Basic information about the inspection visit</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Inspection Date *</Label>
                  <Input
                    type="date"
                    value={formData.inspection_date}
                    onChange={(e) => updateFormData('inspection_date', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Inspection Time *</Label>
                  <Input
                    type="time"
                    value={formData.inspection_time}
                    onChange={(e) => updateFormData('inspection_time', e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Weather Conditions</Label>
                  <Select value={formData.weather} onValueChange={(v) => updateFormData('weather', v)}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sunny">Sunny</SelectItem>
                      <SelectItem value="cloudy">Cloudy</SelectItem>
                      <SelectItem value="rainy">Rainy</SelectItem>
                      <SelectItem value="overcast">Overcast</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Duration (minutes)</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 45"
                    value={formData.duration_minutes || ''}
                    onChange={(e) => updateFormData('duration_minutes', e.target.value ? Number(e.target.value) : null)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Who showed you through?</Label>
                <Input
                  placeholder="e.g., Selling agent John Smith"
                  value={formData.shown_by}
                  onChange={(e) => updateFormData('shown_by', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Areas you couldn't access</Label>
                <Textarea
                  placeholder="List any areas that were locked or inaccessible..."
                  value={formData.areas_not_accessed}
                  onChange={(e) => updateFormData('areas_not_accessed', e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section 1: Client Brief Match */}
        {currentSection === 1 && clientBrief && (
          <Card className="border-purple-200 bg-purple-50/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-purple-900">
                    <Target className="h-5 w-5 text-purple-600" />
                    Client Brief Match
                  </CardTitle>
                  <CardDescription>Evaluate against: {clientBrief.brief_name}</CardDescription>
                </div>
                <Badge className="bg-purple-100 text-purple-800 border-purple-300 text-lg px-3 py-1">
                  {briefMatchScore}/{briefTotalRequirements} ({briefMatchPercentage}%)
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.brief_matches.map((match, index) => (
                <div key={index} className="p-4 bg-white rounded-lg border border-purple-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{match.requirement}</span>
                    <div className="flex gap-2">
                      {[
                        { value: 'meets', label: 'Meets', icon: Check, color: 'text-green-600 bg-green-50 border-green-200' },
                        { value: 'partial', label: 'Partial', icon: AlertCircle, color: 'text-amber-600 bg-amber-50 border-amber-200' },
                        { value: 'doesnt', label: "Doesn't", icon: X, color: 'text-red-600 bg-red-50 border-red-200' },
                      ].map((option) => {
                        const Icon = option.icon;
                        return (
                          <button
                            key={option.value}
                            onClick={() => updateBriefMatch(index, 'status', option.value as MatchStatus)}
                            className={cn(
                              'flex items-center gap-1 px-2 py-1 rounded border text-xs font-medium transition-colors',
                              match.status === option.value ? option.color : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                            )}
                          >
                            <Icon className="h-3 w-3" />
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <Input
                    placeholder="Notes about this requirement..."
                    value={match.notes}
                    onChange={(e) => updateBriefMatch(index, 'notes', e.target.value)}
                    className="text-sm"
                  />
                </div>
              ))}
              <div className="space-y-2 pt-4 border-t border-purple-200">
                <Label className="text-purple-900">Overall Assessment Against Brief</Label>
                <Textarea
                  placeholder="Summarize how well this property matches the client's requirements overall..."
                  value={formData.brief_overall_assessment}
                  onChange={(e) => updateFormData('brief_overall_assessment', e.target.value)}
                  className="min-h-[150px]"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section 2: First Impressions */}
        {currentSection === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-forest" />
                First Impressions
              </CardTitle>
              <CardDescription>Your initial reactions when arriving</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Overall Vibe (1-10)</Label>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground w-12">Poor</span>
                  <Slider
                    value={[formData.first_impression_vibe]}
                    onValueChange={([val]) => updateFormData('first_impression_vibe', val)}
                    min={1} max={10} step={1} className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground w-16 text-right">Amazing</span>
                  <Badge variant="outline" className="w-10 justify-center">{formData.first_impression_vibe}</Badge>
                </div>
              </div>
              <div className="space-y-3">
                <Label>Does it match the listing photos?</Label>
                <RadioGroup
                  value={formData.matches_photos || ''}
                  onValueChange={(val) => updateFormData('matches_photos', val as any)}
                  className="flex gap-4"
                >
                  {['yes', 'mostly', 'no'].map(v => (
                    <label key={v} className="flex items-center gap-2 cursor-pointer">
                      <RadioGroupItem value={v} />
                      <span className="text-sm capitalize">{v === 'yes' ? 'Yes, accurate' : v === 'mostly' ? 'Mostly' : 'No, misleading'}</span>
                    </label>
                  ))}
                </RadioGroup>
              </div>
              <div className="space-y-3">
                <Label>Gut Feeling (1-10)</Label>
                <div className="flex items-center gap-4">
                  <ThumbsDown className="h-5 w-5 text-red-500" />
                  <Slider
                    value={[formData.gut_feeling_rating]}
                    onValueChange={([val]) => updateFormData('gut_feeling_rating', val)}
                    min={1} max={10} step={1} className="flex-1"
                  />
                  <ThumbsUp className="h-5 w-5 text-green-500" />
                  <Badge variant="outline" className="w-10 justify-center">{formData.gut_feeling_rating}</Badge>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Immediate reaction when you arrived?</Label>
                <Textarea
                  placeholder="Describe your initial thoughts. What stood out? How did it feel?"
                  value={formData.first_impression_comments}
                  onChange={(e) => updateFormData('first_impression_comments', e.target.value)}
                  className="min-h-[120px]"
                />
              </div>
              <PhotoUpload sectionId="2" formData={formData} updateFormData={updateFormData} userId={user?.id || ''} jobId={jobId || ''} />
            </CardContent>
          </Card>
        )}

        {/* Section 3: Exterior */}
        {currentSection === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5 text-forest" />
                Exterior Assessment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Street Appeal (1-10)</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[formData.exterior_street_appeal]}
                    onValueChange={([val]) => updateFormData('exterior_street_appeal', val)}
                    min={1} max={10} step={1} className="flex-1"
                  />
                  <Badge variant="outline" className="w-10 justify-center">{formData.exterior_street_appeal}</Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: 'exterior_roof_condition', label: 'Roof Condition' },
                  { key: 'exterior_walls_condition', label: 'Walls Condition' },
                  { key: 'exterior_windows_condition', label: 'Windows Condition' },
                  { key: 'exterior_garden_condition', label: 'Garden Condition' },
                ].map(({ key, label }) => (
                  <div key={key} className="space-y-2">
                    <Label>{label}</Label>
                    <Select
                      value={formData[key as keyof ReportFormData] as string || ''}
                      onValueChange={(v) => updateFormData(key as any, v)}
                    >
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="excellent">Excellent</SelectItem>
                        <SelectItem value="good">Good</SelectItem>
                        <SelectItem value="fair">Fair</SelectItem>
                        <SelectItem value="poor">Poor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Parking</Label>
                  <Input
                    placeholder="e.g., Double garage, street parking"
                    value={formData.exterior_parking}
                    onChange={(e) => updateFormData('exterior_parking', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fencing</Label>
                  <Input
                    placeholder="e.g., Fully fenced, needs repair"
                    value={formData.exterior_fencing}
                    onChange={(e) => updateFormData('exterior_fencing', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Describe the exterior</Label>
                <Textarea
                  placeholder="Overall exterior assessment, curb appeal, condition of facade..."
                  value={formData.exterior_comments}
                  onChange={(e) => updateFormData('exterior_comments', e.target.value)}
                  className="min-h-[120px]"
                />
              </div>
              <PhotoUpload sectionId="3" formData={formData} updateFormData={updateFormData} userId={user?.id || ''} jobId={jobId || ''} />
            </CardContent>
          </Card>
        )}

        {/* Section 4: Living Areas */}
        {currentSection === 4 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5 text-forest" />
                Interior - Living Areas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Condition</Label>
                  <Select value={formData.interior_living_condition || ''} onValueChange={(v) => updateFormData('interior_living_condition', v as ConditionRating)}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excellent">Excellent</SelectItem>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="fair">Fair</SelectItem>
                      <SelectItem value="poor">Poor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Natural Light</Label>
                  <Select value={formData.interior_living_natural_light || ''} onValueChange={(v) => updateFormData('interior_living_natural_light', v)}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="average">Average</SelectItem>
                      <SelectItem value="bright">Bright</SelectItem>
                      <SelectItem value="amazing">Amazing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Size Accuracy</Label>
                  <Select value={formData.interior_living_size_accuracy || ''} onValueChange={(v) => updateFormData('interior_living_size_accuracy', v)}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="smaller">Smaller than expected</SelectItem>
                      <SelectItem value="accurate">As advertised</SelectItem>
                      <SelectItem value="larger">Larger than expected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Layout/Flow</Label>
                <Input
                  placeholder="Describe the layout and flow between spaces..."
                  value={formData.interior_living_layout_flow}
                  onChange={(e) => updateFormData('interior_living_layout_flow', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Describe living areas</Label>
                <Textarea
                  placeholder="Living room, dining, family areas..."
                  value={formData.interior_living_comments}
                  onChange={(e) => updateFormData('interior_living_comments', e.target.value)}
                  className="min-h-[120px]"
                />
              </div>
              <PhotoUpload sectionId="4" formData={formData} updateFormData={updateFormData} userId={user?.id || ''} jobId={jobId || ''} />
            </CardContent>
          </Card>
        )}

        {/* Section 5: Kitchen */}
        {currentSection === 5 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Utensils className="h-5 w-5 text-forest" />
                Interior - Kitchen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Condition</Label>
                  <Select value={formData.kitchen_condition || ''} onValueChange={(v) => updateFormData('kitchen_condition', v as ConditionRating)}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excellent">Excellent</SelectItem>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="fair">Fair</SelectItem>
                      <SelectItem value="poor">Poor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Appliances</Label>
                  <Select value={formData.kitchen_appliances || ''} onValueChange={(v) => updateFormData('kitchen_appliances', v)}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="modern">Modern/High-end</SelectItem>
                      <SelectItem value="good">Good condition</SelectItem>
                      <SelectItem value="dated">Dated</SelectItem>
                      <SelectItem value="needs_replacement">Needs replacement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Bench Space</Label>
                  <Select value={formData.kitchen_bench_space || ''} onValueChange={(v) => updateFormData('kitchen_bench_space', v)}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="plenty">Plenty</SelectItem>
                      <SelectItem value="adequate">Adequate</SelectItem>
                      <SelectItem value="limited">Limited</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Storage</Label>
                  <Select value={formData.kitchen_storage || ''} onValueChange={(v) => updateFormData('kitchen_storage', v)}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="plenty">Plenty</SelectItem>
                      <SelectItem value="adequate">Adequate</SelectItem>
                      <SelectItem value="limited">Limited</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Age/Style</Label>
                <Input
                  placeholder="e.g., Modern 2020 renovation, Original 1970s..."
                  value={formData.kitchen_age_style}
                  onChange={(e) => updateFormData('kitchen_age_style', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Renovation Estimate</Label>
                <RadioGroup
                  value={formData.kitchen_renovation_estimate || ''}
                  onValueChange={(v) => updateFormData('kitchen_renovation_estimate', v as RenovationEstimate)}
                  className="flex flex-wrap gap-3"
                >
                  {[
                    { value: 'none', label: 'None needed' },
                    { value: 'minor', label: 'Minor $5-10k' },
                    { value: 'major', label: 'Major $20-50k' },
                    { value: 'full', label: 'Full $50k+' },
                  ].map(opt => (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                      <RadioGroupItem value={opt.value} />
                      <span className="text-sm">{opt.label}</span>
                    </label>
                  ))}
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label>Describe the kitchen</Label>
                <Textarea
                  placeholder="Layout, features, quality of finishes..."
                  value={formData.kitchen_comments}
                  onChange={(e) => updateFormData('kitchen_comments', e.target.value)}
                  className="min-h-[120px]"
                />
              </div>
              <PhotoUpload sectionId="5" formData={formData} updateFormData={updateFormData} userId={user?.id || ''} jobId={jobId || ''} />
            </CardContent>
          </Card>
        )}

        {/* Section 6: Bathrooms */}
        {currentSection === 6 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bath className="h-5 w-5 text-forest" />
                Interior - Bathrooms
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Total Count</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 2"
                    value={formData.bathroom_count || ''}
                    onChange={(e) => updateFormData('bathroom_count', e.target.value ? Number(e.target.value) : null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ensuites</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 1"
                    value={formData.bathroom_ensuite_count || ''}
                    onChange={(e) => updateFormData('bathroom_ensuite_count', e.target.value ? Number(e.target.value) : null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Condition</Label>
                  <Select value={formData.bathroom_condition || ''} onValueChange={(v) => updateFormData('bathroom_condition', v as ConditionRating)}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excellent">Excellent</SelectItem>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="fair">Fair</SelectItem>
                      <SelectItem value="poor">Poor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Ventilation</Label>
                  <Select value={formData.bathroom_ventilation || ''} onValueChange={(v) => updateFormData('bathroom_ventilation', v)}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="window">Window</SelectItem>
                      <SelectItem value="exhaust">Exhaust fan</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                      <SelectItem value="poor">Poor/None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Style</Label>
                <Input
                  placeholder="e.g., Modern subway tiles, Original 1980s..."
                  value={formData.bathroom_style}
                  onChange={(e) => updateFormData('bathroom_style', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Renovation Estimate</Label>
                <RadioGroup
                  value={formData.bathroom_renovation_estimate || ''}
                  onValueChange={(v) => updateFormData('bathroom_renovation_estimate', v as RenovationEstimate)}
                  className="flex flex-wrap gap-3"
                >
                  {[
                    { value: 'none', label: 'None needed' },
                    { value: 'minor', label: 'Minor $5-10k' },
                    { value: 'major', label: 'Major $20-50k' },
                    { value: 'full', label: 'Full $50k+' },
                  ].map(opt => (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                      <RadioGroupItem value={opt.value} />
                      <span className="text-sm">{opt.label}</span>
                    </label>
                  ))}
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label>Describe bathrooms</Label>
                <Textarea
                  placeholder="Fixtures, features, any issues..."
                  value={formData.bathroom_comments}
                  onChange={(e) => updateFormData('bathroom_comments', e.target.value)}
                  className="min-h-[120px]"
                />
              </div>
              <PhotoUpload sectionId="6" formData={formData} updateFormData={updateFormData} userId={user?.id || ''} jobId={jobId || ''} />
            </CardContent>
          </Card>
        )}

        {/* Section 7: Bedrooms */}
        {currentSection === 7 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bed className="h-5 w-5 text-forest" />
                Interior - Bedrooms
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bedroom Count</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 3"
                    value={formData.bedroom_count || ''}
                    onChange={(e) => updateFormData('bedroom_count', e.target.value ? Number(e.target.value) : null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Master Size</Label>
                  <Select value={formData.bedroom_master_size || ''} onValueChange={(v) => updateFormData('bedroom_master_size', v)}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="generous">Generous</SelectItem>
                      <SelectItem value="adequate">Adequate</SelectItem>
                      <SelectItem value="compact">Compact</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Other Bedrooms</Label>
                  <Select value={formData.bedroom_other_sizes || ''} onValueChange={(v) => updateFormData('bedroom_other_sizes', v)}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="generous">Generous</SelectItem>
                      <SelectItem value="adequate">Adequate</SelectItem>
                      <SelectItem value="compact">Compact</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Storage</Label>
                  <Select value={formData.bedroom_storage || ''} onValueChange={(v) => updateFormData('bedroom_storage', v)}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="built_in_robes">Built-in robes</SelectItem>
                      <SelectItem value="walk_in">Walk-in robes</SelectItem>
                      <SelectItem value="some_storage">Some storage</SelectItem>
                      <SelectItem value="no_storage">No built-in storage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Describe bedrooms</Label>
                <Textarea
                  placeholder="Sizes, layout, natural light, any issues..."
                  value={formData.bedroom_comments}
                  onChange={(e) => updateFormData('bedroom_comments', e.target.value)}
                  className="min-h-[120px]"
                />
              </div>
              <PhotoUpload sectionId="7" formData={formData} updateFormData={updateFormData} userId={user?.id || ''} jobId={jobId || ''} />
            </CardContent>
          </Card>
        )}

        {/* Section 8: Other Spaces */}
        {currentSection === 8 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5 text-forest" />
                Interior - Other Spaces
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Select all that apply</Label>
                <div className="grid grid-cols-3 gap-3">
                  {OTHER_SPACES_OPTIONS.map((space) => (
                    <label key={space} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={formData.other_spaces.includes(space)}
                        onCheckedChange={() => toggleArrayItem('other_spaces', space)}
                      />
                      <span className="text-sm">{space}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Describe other spaces</Label>
                <Textarea
                  placeholder="Details about garage, laundry, storage, outdoor areas..."
                  value={formData.other_spaces_comments}
                  onChange={(e) => updateFormData('other_spaces_comments', e.target.value)}
                  className="min-h-[120px]"
                />
              </div>
              <PhotoUpload sectionId="8" formData={formData} updateFormData={updateFormData} userId={user?.id || ''} jobId={jobId || ''} />
            </CardContent>
          </Card>
        )}

        {/* Section 9: Neighbourhood */}
        {currentSection === 9 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TreePine className="h-5 w-5 text-forest" />
                Neighbourhood
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Street Feel</Label>
                  <Select value={formData.neighbourhood_street_feel || ''} onValueChange={(v) => updateFormData('neighbourhood_street_feel', v)}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quiet_residential">Quiet residential</SelectItem>
                      <SelectItem value="family_friendly">Family friendly</SelectItem>
                      <SelectItem value="busy">Busy</SelectItem>
                      <SelectItem value="main_road">Main road</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Parking Ease</Label>
                  <Select value={formData.neighbourhood_parking_ease || ''} onValueChange={(v) => updateFormData('neighbourhood_parking_ease', v)}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="difficult">Difficult</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Traffic</Label>
                <Input
                  placeholder="e.g., Light residential traffic, busy commuter route..."
                  value={formData.neighbourhood_traffic}
                  onChange={(e) => updateFormData('neighbourhood_traffic', e.target.value)}
                />
              </div>
              <div className="space-y-3">
                <Label>Safety Rating (1-5)</Label>
                <div className="flex items-center gap-4">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <Slider
                    value={[formData.neighbourhood_safety_rating]}
                    onValueChange={([val]) => updateFormData('neighbourhood_safety_rating', val)}
                    min={1} max={5} step={1} className="flex-1"
                  />
                  <Badge variant="outline" className="w-10 justify-center">{formData.neighbourhood_safety_rating}</Badge>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Neighbour Properties</Label>
                <Input
                  placeholder="Condition of neighbouring properties..."
                  value={formData.neighbourhood_neighbour_properties}
                  onChange={(e) => updateFormData('neighbourhood_neighbour_properties', e.target.value)}
                />
              </div>
              <div className="space-y-3">
                <Label>Nearby Amenities</Label>
                <div className="grid grid-cols-3 gap-3">
                  {AMENITIES_OPTIONS.map((amenity) => {
                    const Icon = amenity.icon;
                    return (
                      <label key={amenity.value} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={formData.neighbourhood_amenities.includes(amenity.value)}
                          onCheckedChange={() => toggleArrayItem('neighbourhood_amenities', amenity.value)}
                        />
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{amenity.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Walking Distances (optional)</Label>
                <Input
                  placeholder="e.g., 5 min to shops, 10 min to station..."
                  value={formData.neighbourhood_walking_distances}
                  onChange={(e) => updateFormData('neighbourhood_walking_distances', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Describe the neighbourhood</Label>
                <Textarea
                  placeholder="Overall feel, demographics, noise levels, atmosphere..."
                  value={formData.neighbourhood_comments}
                  onChange={(e) => updateFormData('neighbourhood_comments', e.target.value)}
                  className="min-h-[150px]"
                />
              </div>
              <PhotoUpload sectionId="9" formData={formData} updateFormData={updateFormData} userId={user?.id || ''} jobId={jobId || ''} />
            </CardContent>
          </Card>
        )}

        {/* Section 10: Red Flags */}
        {currentSection === 10 && (
          <Card className="border-red-200 bg-red-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-900">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Red Flags & Concerns
              </CardTitle>
              <CardDescription className="text-red-700">
                Any issues that need attention - be thorough!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label className="text-red-900">Select all concerns observed</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {RED_FLAGS_OPTIONS.map((flag) => (
                    <label key={flag} className={cn(
                      'flex items-center gap-2 cursor-pointer p-2 rounded border transition-colors',
                      formData.red_flags.includes(flag)
                        ? 'bg-red-100 border-red-300'
                        : 'bg-white border-gray-200 hover:bg-red-50'
                    )}>
                      <Checkbox
                        checked={formData.red_flags.includes(flag)}
                        onCheckedChange={() => toggleArrayItem('red_flags', flag)}
                      />
                      <span className="text-sm">{flag}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className={cn('text-red-900', formData.red_flags.length > 0 && 'after:content-["*"] after:text-red-600 after:ml-1')}>
                  Describe ALL concerns in detail
                </Label>
                <Textarea
                  placeholder="Be specific about location, severity, and recommended action for each concern..."
                  value={formData.red_flags_comments}
                  onChange={(e) => updateFormData('red_flags_comments', e.target.value)}
                  className="min-h-[180px] border-red-200 focus:border-red-400"
                />
                {formData.red_flags.length > 0 && !formData.red_flags_comments && (
                  <p className="text-xs text-red-600">Required when concerns are selected</p>
                )}
              </div>
              <PhotoUpload sectionId="10" formData={formData} updateFormData={updateFormData} userId={user?.id || ''} jobId={jobId || ''} />
            </CardContent>
          </Card>
        )}

        {/* Section 11: Standout Features */}
        {currentSection === 11 && (
          <Card className="border-green-200 bg-green-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-900">
                <Star className="h-5 w-5 text-green-600" />
                Standout Features
              </CardTitle>
              <CardDescription className="text-green-700">
                What makes this property special?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label className="text-green-900">Select standout features</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {STANDOUT_FEATURES_OPTIONS.map((feature) => (
                    <label key={feature} className={cn(
                      'flex items-center gap-2 cursor-pointer p-2 rounded border transition-colors',
                      formData.standout_features.includes(feature)
                        ? 'bg-green-100 border-green-300'
                        : 'bg-white border-gray-200 hover:bg-green-50'
                    )}>
                      <Checkbox
                        checked={formData.standout_features.includes(feature)}
                        onCheckedChange={() => toggleArrayItem('standout_features', feature)}
                      />
                      <span className="text-sm">{feature}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Best Single Feature</Label>
                <Input
                  placeholder="The one thing that makes this property stand out..."
                  value={formData.best_single_feature}
                  onChange={(e) => updateFormData('best_single_feature', e.target.value)}
                />
              </div>
              <div className="space-y-3">
                <Label>Would you personally buy this property?</Label>
                <div className="flex gap-3">
                  {[
                    { value: 'yes', label: 'Yes', color: 'bg-green-100 border-green-300 text-green-800' },
                    { value: 'maybe', label: 'Maybe', color: 'bg-amber-100 border-amber-300 text-amber-800' },
                    { value: 'no', label: 'No', color: 'bg-red-100 border-red-300 text-red-800' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => updateFormData('would_personally_buy', opt.value as WouldBuy)}
                      className={cn(
                        'px-4 py-2 rounded-lg border font-medium transition-colors',
                        formData.would_personally_buy === opt.value ? opt.color : 'bg-white border-gray-200 hover:bg-gray-50'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>What makes this property special?</Label>
                <Textarea
                  placeholder="Describe the highlights and unique selling points..."
                  value={formData.standout_comments}
                  onChange={(e) => updateFormData('standout_comments', e.target.value)}
                  className="min-h-[120px]"
                />
              </div>
              <PhotoUpload sectionId="11" formData={formData} updateFormData={updateFormData} userId={user?.id || ''} jobId={jobId || ''} />
            </CardContent>
          </Card>
        )}

        {/* Section 12: Market Context */}
        {currentSection === 12 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-forest" />
                Market Context
              </CardTitle>
              <CardDescription>Pricing, competition, and market observations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Days on Market</Label>
                  <Input
                    placeholder="e.g., 14 days, Just listed..."
                    value={formData.days_on_market}
                    onChange={(e) => updateFormData('days_on_market', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Price Guide</Label>
                  <Input
                    placeholder="e.g., $850,000 - $900,000"
                    value={formData.price_guide}
                    onChange={(e) => updateFormData('price_guide', e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Your Pricing Opinion</Label>
                  <Select value={formData.pricing_opinion || ''} onValueChange={(v) => updateFormData('pricing_opinion', v)}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="underpriced">Underpriced</SelectItem>
                      <SelectItem value="fair">Fair market value</SelectItem>
                      <SelectItem value="overpriced">Overpriced</SelectItem>
                      <SelectItem value="unsure">Unsure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Competition Level</Label>
                  <Select value={formData.competition_level || ''} onValueChange={(v) => updateFormData('competition_level', v)}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low - Few buyers</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="high">High - Multiple offers expected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Seller Motivation</Label>
                <Input
                  placeholder="e.g., Motivated - relocating, Deceased estate, No rush..."
                  value={formData.seller_motivation}
                  onChange={(e) => updateFormData('seller_motivation', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Market observations - pricing, negotiation opportunities</Label>
                <Textarea
                  placeholder="Your assessment of value, comparable sales, negotiation strategy..."
                  value={formData.market_comments}
                  onChange={(e) => updateFormData('market_comments', e.target.value)}
                  className="min-h-[120px]"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section 13: Final Verdict */}
        {currentSection === 13 && (
          <Card className="border-forest/30 bg-forest/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-forest" />
                Final Verdict
              </CardTitle>
              <CardDescription>Your overall assessment and recommendation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label className="text-lg">Overall Score (1-10) *</Label>
                <div className="flex items-center justify-center gap-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                    <button
                      key={score}
                      onClick={() => updateFormData('overall_score', score)}
                      className={cn(
                        'w-12 h-12 rounded-full font-bold text-lg transition-all',
                        formData.overall_score === score
                          ? score >= 7 ? 'bg-green-500 text-white scale-110' : score >= 4 ? 'bg-amber-500 text-white scale-110' : 'bg-red-500 text-white scale-110'
                          : 'bg-white border-2 border-gray-200 hover:border-forest'
                      )}
                    >
                      {score}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <Label>Recommendation *</Label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'highly_recommend', label: 'Highly Recommend', icon: '🟢', color: 'bg-green-100 border-green-300 text-green-800' },
                    { value: 'worth_considering', label: 'Worth Considering', icon: '🟡', color: 'bg-amber-100 border-amber-300 text-amber-800' },
                    { value: 'not_recommended', label: 'Not Recommended', icon: '🔴', color: 'bg-red-100 border-red-300 text-red-800' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => updateFormData('recommendation', opt.value as Recommendation)}
                      className={cn(
                        'p-4 rounded-lg border-2 font-medium transition-all text-center',
                        formData.recommendation === opt.value ? opt.color + ' scale-105' : 'bg-white border-gray-200 hover:bg-gray-50'
                      )}
                    >
                      <span className="text-2xl block mb-1">{opt.icon}</span>
                      <span className="text-sm">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <Label>Urgency</Label>
                <div className="flex gap-3">
                  {[
                    { value: 'act_fast', label: 'Act Fast', icon: Zap, color: 'bg-red-100 border-red-300 text-red-700' },
                    { value: 'normal', label: 'Normal', icon: Clock, color: 'bg-blue-100 border-blue-300 text-blue-700' },
                    { value: 'take_time', label: 'Take Your Time', icon: Turtle, color: 'bg-gray-100 border-gray-300 text-gray-700' },
                  ].map(opt => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => updateFormData('urgency', opt.value as Urgency)}
                        className={cn(
                          'flex items-center gap-2 px-4 py-2 rounded-lg border font-medium transition-colors',
                          formData.urgency === opt.value ? opt.color : 'bg-white border-gray-200 hover:bg-gray-50'
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Final summary and recommendation *</Label>
                <Textarea
                  placeholder="Summarize your overall impression, key points for the buyer, and your recommendation..."
                  value={formData.summary_comments}
                  onChange={(e) => updateFormData('summary_comments', e.target.value)}
                  className="min-h-[200px]"
                />
                {formData.summary_comments.length < 10 && (
                  <p className="text-xs text-red-600">Required - please provide a detailed summary</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section 14: For Requesting Agent */}
        {currentSection === 14 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-forest" />
                For the Requesting Agent
              </CardTitle>
              <CardDescription>Tips and suggestions for follow-up</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Questions to ask selling agent</Label>
                <Textarea
                  placeholder="What should the buyer's agent clarify with the selling agent?"
                  value={formData.questions_to_ask_agent}
                  onChange={(e) => updateFormData('questions_to_ask_agent', e.target.value)}
                  className="min-h-[120px]"
                />
              </div>
              <div className="space-y-2">
                <Label>Things to check on second visit</Label>
                <Textarea
                  placeholder="What should be verified or looked at more closely?"
                  value={formData.second_visit_tips}
                  onChange={(e) => updateFormData('second_visit_tips', e.target.value)}
                  className="min-h-[120px]"
                />
              </div>
              <div className="space-y-2">
                <Label>Negotiation suggestions</Label>
                <Textarea
                  placeholder="Any leverage points or negotiation strategies?"
                  value={formData.negotiation_suggestions}
                  onChange={(e) => updateFormData('negotiation_suggestions', e.target.value)}
                  className="min-h-[120px]"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section 15: Review & Submit */}
        {currentSection === 15 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-forest" />
                Review & Submit
              </CardTitle>
              <CardDescription>Review your report before submitting</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Validation Checklist */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-3">Submission Checklist</h4>
                <div className="space-y-2">
                  {[
                    { check: !!formData.inspection_date && !!formData.inspection_time, label: 'Inspection details completed' },
                    { check: !!formData.overall_score, label: 'Overall score provided' },
                    { check: !!formData.recommendation, label: 'Recommendation selected' },
                    { check: formData.summary_comments.length >= 10, label: 'Summary provided' },
                    { check: formData.red_flags.length === 0 || formData.red_flags_comments.length > 0, label: 'Red flags documented (if any)' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      {item.check ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                      )}
                      <span className={cn('text-sm', !item.check && 'text-muted-foreground')}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Summary */}
              <div className="p-4 border rounded-lg space-y-3">
                <h4 className="font-medium">Report Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Overall Score:</span>
                    <span className="ml-2 font-semibold">{formData.overall_score}/10</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Recommendation:</span>
                    <span className="ml-2 font-semibold capitalize">{formData.recommendation?.replace(/_/g, ' ') || 'Not set'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Red Flags:</span>
                    <span className="ml-2 font-semibold">{formData.red_flags.length}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Standouts:</span>
                    <span className="ml-2 font-semibold">{formData.standout_features.length}</span>
                  </div>
                  {clientBrief && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Brief Match:</span>
                      <span className="ml-2 font-semibold">{briefMatchScore}/{briefTotalRequirements} ({briefMatchPercentage}%)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Professional Disclaimer Confirmation */}
              <div className="p-4 border-2 border-amber-200 bg-amber-50/50 rounded-lg">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="disclaimer-confirmation"
                    checked={disclaimerConfirmed}
                    onCheckedChange={(checked) => setDisclaimerConfirmed(checked === true)}
                    className="mt-1"
                  />
                  <label
                    htmlFor="disclaimer-confirmation"
                    className="text-sm text-amber-900 cursor-pointer leading-relaxed"
                  >
                    I confirm this report reflects my honest professional opinion based on a visual inspection.
                    I understand this is not a certified building, pest, or structural inspection, and I recommend
                    the buyer seek qualified professional inspections before making any purchase decision.
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-center pt-4">
                <Button
                  size="lg"
                  className="bg-forest hover:bg-forest/90 px-8"
                  onClick={() => setShowSubmitDialog(true)}
                  disabled={!canSubmit()}
                >
                  <Send className="h-5 w-5 mr-2" />
                  Submit Report
                </Button>
              </div>
              {!canSubmit() && (
                <p className="text-center text-sm text-amber-600">
                  {!disclaimerConfirmed
                    ? 'Please confirm the professional disclaimer above before submitting'
                    : 'Please complete all required fields before submitting'}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => setCurrentSection(prev => Math.max(prev - 1, 0))}
            disabled={currentSection === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          {currentSection < availableSections.length - 1 ? (
            <Button
              onClick={() => setCurrentSection(prev => Math.min(prev + 1, availableSections.length - 1))}
              className="bg-forest hover:bg-forest/90"
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={() => setShowSubmitDialog(true)}
              disabled={!canSubmit()}
              className="bg-forest hover:bg-forest/90"
            >
              <Send className="h-4 w-4 mr-2" />
              Submit Report
            </Button>
          )}
        </div>
      </div>

      {/* Submit Confirmation Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Inspection Report?</DialogTitle>
            <DialogDescription>
              You're about to submit your report for {job.property_address}.
              The requesting agent will be notified immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span>Your earnings for this job:</span>
              <span className="font-bold text-green-600 text-lg">{formatPrice(Math.round((job.agreed_price || 0) * 0.90), job.budget_currency || 'AUD')}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitDialog(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} className="bg-forest hover:bg-forest/90">
              {submitting ? 'Submitting...' : 'Submit Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Celebration Modal */}
      <Dialog open={showCelebration} onOpenChange={() => {}}>
        <DialogContent className="text-center">
          <div className="py-6">
            <PartyPopper className="h-16 w-16 text-forest mx-auto mb-4 animate-bounce" />
            <DialogTitle className="text-2xl mb-2">Report Submitted!</DialogTitle>
            <DialogDescription className="text-base">
              Great work! Your inspection report has been sent to the requesting agent.
            </DialogDescription>
            <div className="mt-6 space-y-3">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-green-800 font-medium">Earnings: {formatPrice(Math.round((job.agreed_price || 0) * 0.90), job.budget_currency || 'AUD')}</p>
                <p className="text-sm text-green-600">Payment will be released after review</p>
              </div>
              <div className="flex justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Award className="h-4 w-4 text-amber-500" />
                  +50 reputation points
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {formatTime(timeSpent)} spent
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="justify-center">
            <Button onClick={() => navigate('/inspections/my-work')} className="bg-forest hover:bg-forest/90">
              Back to My Work
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Photo Upload Component
function PhotoUpload({
  sectionId,
  formData,
  updateFormData,
  userId,
  jobId,
}: {
  sectionId: string;
  formData: ReportFormData;
  updateFormData: <K extends keyof ReportFormData>(key: K, value: ReportFormData[K]) => void;
  userId: string;
  jobId: string;
}) {
  const [uploading, setUploading] = useState(false);
  const photos = formData.section_photos[sectionId] || [];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Validate all files first
    const fileArray = Array.from(files);
    for (const file of fileArray) {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        toast.error(validation.error || 'Invalid file');
        return;
      }
    }

    setUploading(true);
    try {
      // Upload all files to Supabase storage
      const uploadResults = await uploadInspectionPhotos(fileArray, userId, jobId, sectionId);

      // Get the public URLs from the upload results
      const newPhotoUrls = uploadResults.map(result => result.url);

      // Add new URLs to the existing photos
      const updatedPhotos = { ...formData.section_photos, [sectionId]: [...photos, ...newPhotoUrls] };
      updateFormData('section_photos', updatedPhotos);

      toast.success(`${files.length} photo(s) uploaded successfully`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload photos');
    } finally {
      setUploading(false);
      // Reset the input
      e.target.value = '';
    }
  };

  const removePhoto = (index: number) => {
    const updatedPhotos = { ...formData.section_photos, [sectionId]: photos.filter((_, i) => i !== index) };
    updateFormData('section_photos', updatedPhotos);
  };

  return (
    <div className="space-y-3 pt-4 border-t">
      <Label className="flex items-center gap-2">
        <Camera className="h-4 w-4" />
        Photos (optional)
      </Label>
      <div className="flex flex-wrap gap-3">
        {photos.map((photo, index) => (
          <div key={index} className="relative w-20 h-20 rounded-lg overflow-hidden border">
            <img src={photo} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
            <button
              onClick={() => removePhoto(index)}
              className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
              disabled={uploading}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        <label className={cn(
          "w-20 h-20 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted transition-colors",
          uploading && "opacity-50 cursor-not-allowed"
        )}>
          {uploading ? (
            <>
              <div className="w-5 h-5 border-2 border-forest border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-muted-foreground mt-1">...</span>
            </>
          ) : (
            <>
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground mt-1">Add</span>
            </>
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleFileChange}
            className="hidden"
            disabled={uploading}
          />
        </label>
      </div>
    </div>
  );
}
