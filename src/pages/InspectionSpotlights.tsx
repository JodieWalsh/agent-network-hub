/**
 * InspectionSpotlights.tsx
 *
 * 🎭 THEATRICAL JOB BOARD - Property Spotlights
 *
 * Browse open inspection jobs with theatrical presentation:
 * - Spotlight cards for each job
 * - Urgency badges and visual indicators
 * - Bid counts and competition status
 * - Filters and sorting
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  MapPin,
  DollarSign,
  Clock,
  AlertCircle,
  Zap,
  Users,
  Calendar,
  Home,
  Building,
  Sparkles,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type UrgencyLevel = 'standard' | 'urgent' | 'express';
type PropertyType = 'house' | 'apartment' | 'townhouse' | 'land' | 'other';
type JobStatus = 'draft' | 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';

interface InspectionJob {
  id: string;
  creator_id: string;
  property_address: string;
  property_type: PropertyType;
  urgency_level: UrgencyLevel;
  budget_amount: number;
  status: JobStatus;
  created_at: string;
  preferred_inspection_dates: string[] | null;
  scope_requirements: string | null;
  bid_count?: number;
}

const URGENCY_CONFIG = {
  standard: {
    label: 'Standard',
    icon: Clock,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    badgeVariant: 'default' as const,
  },
  urgent: {
    label: 'Urgent',
    icon: AlertCircle,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    badgeVariant: 'default' as const,
  },
  express: {
    label: 'Express',
    icon: Zap,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    badgeVariant: 'destructive' as const,
  },
};

const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  house: 'House',
  apartment: 'Apartment',
  townhouse: 'Townhouse',
  land: 'Land',
  other: 'Other',
};

export default function InspectionSpotlights() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<InspectionJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyLevel | 'all'>('all');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<PropertyType | 'all'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'budget_high' | 'budget_low' | 'urgent'>('newest');

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      // Fetch open jobs
      const { data: jobsData, error: jobsError } = await supabase
        .from('inspection_jobs')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      if (jobsError) throw jobsError;

      // Fetch bid counts for each job
      const jobsWithBidCounts = await Promise.all(
        (jobsData || []).map(async (job) => {
          const { count } = await supabase
            .from('inspection_bids')
            .select('*', { count: 'exact', head: true })
            .eq('job_id', job.id)
            .in('status', ['pending', 'accepted']);

          return { ...job, bid_count: count || 0 };
        })
      );

      setJobs(jobsWithBidCounts);
    } catch (error: any) {
      console.error('Error fetching jobs:', error);
      toast.error('Failed to load inspection jobs');
    } finally {
      setLoading(false);
    }
  };

  // Apply filters and sorting
  const filteredAndSortedJobs = jobs
    .filter((job) => {
      // Search filter
      if (searchQuery && !job.property_address.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Urgency filter
      if (urgencyFilter !== 'all' && job.urgency_level !== urgencyFilter) {
        return false;
      }

      // Property type filter
      if (propertyTypeFilter !== 'all' && job.property_type !== propertyTypeFilter) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'budget_high':
          return b.budget_amount - a.budget_amount;
        case 'budget_low':
          return a.budget_amount - b.budget_amount;
        case 'urgent':
          const urgencyOrder = { express: 0, urgent: 1, standard: 2 };
          return urgencyOrder[a.urgency_level] - urgencyOrder[b.urgency_level];
        default:
          return 0;
      }
    });

  const handleJobClick = (jobId: string) => {
    navigate(`/inspections/spotlights/${jobId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="h-12 w-12 text-forest animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Loading spotlights...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-gradient-to-r from-forest/5 to-forest/10">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Sparkles className="h-8 w-8 text-forest" />
                Property Spotlights
              </h1>
              <p className="text-muted-foreground mt-2">
                Browse open inspection jobs and express your interest
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            <div className="bg-white rounded-lg p-4 border">
              <p className="text-sm text-muted-foreground">Open Jobs</p>
              <p className="text-2xl font-semibold text-forest">{jobs.length}</p>
            </div>
            <div className="bg-white rounded-lg p-4 border">
              <p className="text-sm text-muted-foreground">Express Jobs</p>
              <p className="text-2xl font-semibold text-red-600">
                {jobs.filter((j) => j.urgency_level === 'express').length}
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 border">
              <p className="text-sm text-muted-foreground">Avg Budget</p>
              <p className="text-2xl font-semibold text-forest">
                ${jobs.length > 0 ? Math.round(jobs.reduce((sum, j) => sum + j.budget_amount, 0) / jobs.length) : 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Urgency Filter */}
          <Select value={urgencyFilter} onValueChange={(val) => setUrgencyFilter(val as UrgencyLevel | 'all')}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All Urgencies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Urgencies</SelectItem>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="express">Express</SelectItem>
            </SelectContent>
          </Select>

          {/* Property Type Filter */}
          <Select value={propertyTypeFilter} onValueChange={(val) => setPropertyTypeFilter(val as PropertyType | 'all')}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="house">House</SelectItem>
              <SelectItem value="apartment">Apartment</SelectItem>
              <SelectItem value="townhouse">Townhouse</SelectItem>
              <SelectItem value="land">Land</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select value={sortBy} onValueChange={(val) => setSortBy(val as any)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="urgent">Most Urgent</SelectItem>
              <SelectItem value="budget_high">Highest Budget</SelectItem>
              <SelectItem value="budget_low">Lowest Budget</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Job Cards */}
      <div className="max-w-7xl mx-auto px-6 pb-12">
        {filteredAndSortedJobs.length === 0 ? (
          <div className="text-center py-16">
            <Sparkles className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No jobs found</h3>
            <p className="text-muted-foreground">
              {searchQuery || urgencyFilter !== 'all' || propertyTypeFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Check back soon for new opportunities'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedJobs.map((job) => {
              const urgencyConfig = URGENCY_CONFIG[job.urgency_level];
              const UrgencyIcon = urgencyConfig.icon;

              return (
                <Card
                  key={job.id}
                  className={cn(
                    'cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1',
                    'border-2',
                    urgencyConfig.borderColor
                  )}
                  onClick={() => handleJobClick(job.id)}
                >
                  <CardHeader className={cn('pb-3', urgencyConfig.bgColor)}>
                    <div className="flex items-start justify-between">
                      <Badge variant={urgencyConfig.badgeVariant} className="flex items-center gap-1">
                        <UrgencyIcon className="h-3 w-3" />
                        {urgencyConfig.label}
                      </Badge>
                      {job.bid_count !== undefined && job.bid_count > 0 && (
                        <Badge variant="outline" className="flex items-center gap-1 bg-white">
                          <Users className="h-3 w-3" />
                          {job.bid_count} bid{job.bid_count > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="pt-4 space-y-3">
                    {/* Property Address */}
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-forest mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground line-clamp-2">{job.property_address}</p>
                      </div>
                    </div>

                    {/* Property Type */}
                    <div className="flex items-center gap-2">
                      <Home className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {PROPERTY_TYPE_LABELS[job.property_type]}
                      </p>
                    </div>

                    {/* Budget */}
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-forest" />
                      <p className="text-lg font-semibold text-forest">
                        ${job.budget_amount.toLocaleString('en-AU')}
                      </p>
                    </div>

                    {/* Scope Preview */}
                    {job.scope_requirements && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {job.scope_requirements}
                      </p>
                    )}

                    {/* Posted Date */}
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">
                        Posted {new Date(job.created_at).toLocaleDateString('en-AU', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                    </div>

                    {/* Preferred Dates */}
                    {job.preferred_inspection_dates && job.preferred_inspection_dates.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-blue-600" />
                        <p className="text-xs text-blue-600">
                          {job.preferred_inspection_dates.length} preferred date{job.preferred_inspection_dates.length > 1 ? 's' : ''}
                        </p>
                      </div>
                    )}

                    <Button className="w-full mt-3 bg-forest hover:bg-forest/90" size="sm">
                      View Details & Bid
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
