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
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
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
import { formatPrice } from '@/lib/currency';

type UrgencyLevel = 'standard' | 'urgent' | 'express';
type PropertyType = 'house' | 'apartment' | 'townhouse' | 'land' | 'other';
type JobStatus = 'draft' | 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';

interface InspectionJob {
  id: string;
  creator_id: string;
  property_address: string;
  property_country?: string | null;
  property_type: PropertyType;
  urgency_level: UrgencyLevel;
  budget_amount: number;
  budget_currency: string;
  status: JobStatus;
  created_at: string;
  preferred_inspection_dates: string[] | null;
  scope_requirements: string | null;
  matches_my_areas: boolean;
  bid_count?: number;
}

type AreaScope = 'mine' | 'country' | 'everywhere';

// Country code -> name, for the "All of {Country}" pill (Service Areas plan §4.2).
// Labels use the definite article for US/UK; matching uses the full name.
const COUNTRY_NAMES: Record<string, string> = {
  AU: 'Australia', US: 'United States', GB: 'United Kingdom', CA: 'Canada',
  NZ: 'New Zealand', IE: 'Ireland', DE: 'Germany', FR: 'France', ES: 'Spain',
  IT: 'Italy', NL: 'Netherlands', BE: 'Belgium', AT: 'Austria', CH: 'Switzerland',
  SE: 'Sweden', NO: 'Norway', DK: 'Denmark', FI: 'Finland', PT: 'Portugal',
  PL: 'Poland', CZ: 'Czech Republic', HU: 'Hungary', RO: 'Romania', BG: 'Bulgaria',
  HR: 'Croatia', GR: 'Greece', SG: 'Singapore', HK: 'Hong Kong', JP: 'Japan',
  MY: 'Malaysia', TH: 'Thailand', MX: 'Mexico', BR: 'Brazil',
};
const countryLabel = (code: string | null | undefined): string | null => {
  if (!code) return null;
  if (code === 'US') return 'the US';
  if (code === 'GB') return 'the UK';
  return COUNTRY_NAMES[code] || null;
};

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
  const { user, profile } = useAuth();
  const [jobs, setJobs] = useState<InspectionJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [areaScope, setAreaScope] = useState<AreaScope>('mine');
  const [hasServiceAreas, setHasServiceAreas] = useState<boolean | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyLevel | 'all'>('all');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<PropertyType | 'all'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'budget_high' | 'budget_low' | 'urgent'>('newest');

  useEffect(() => {
    fetchJobs();
  }, []);

  // Does this agent have any service areas? If not, default to Everywhere so
  // they never land on an empty board (step 4 edge case).
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        let accessToken = supabaseKey;
        try {
          const storedSession = localStorage.getItem(`sb-${import.meta.env.VITE_SUPABASE_PROJECT_ID}-auth-token`);
          if (storedSession) accessToken = JSON.parse(storedSession)?.access_token || supabaseKey;
        } catch (e) {}
        const r = await fetch(
          `${supabaseUrl}/rest/v1/agent_service_areas?select=id&agent_id=eq.${user.id}&limit=1`,
          { headers: { apikey: supabaseKey, Authorization: `Bearer ${accessToken}` } }
        );
        const rows = r.ok ? await r.json() : [];
        const found = rows.length > 0;
        setHasServiceAreas(found);
        if (!found) setAreaScope('everywhere');
      } catch (e) {
        setHasServiceAreas(null); // unknown — leave the default view alone
      }
    })();
  }, [user]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      console.log('[InspectionSpotlights] Fetching jobs...');

      // Use raw fetch since Supabase client has issues
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

      // Feed RPC (Service Areas plan step 2): all open jobs + matches_my_areas
      const url = `${supabaseUrl}/rest/v1/rpc/get_open_jobs_in_my_areas`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: '{}',
      });

      if (!response.ok) {
        throw new Error(`Fetch failed: ${response.status}`);
      }

      const jobsData = await response.json();
      console.log('[InspectionSpotlights] Jobs fetched:', jobsData?.length || 0);

      // For now, set bid_count to 0 for all jobs (can fetch separately if needed)
      const jobsWithBidCounts = (jobsData || []).map((job: any) => ({
        ...job,
        bid_count: 0,
      }));

      setJobs(jobsWithBidCounts);
    } catch (error: any) {
      console.error('[InspectionSpotlights] Error fetching jobs:', error);
      toast.error('Failed to load inspection jobs');
      setJobs([]); // Set empty array on error so page still renders
    } finally {
      setLoading(false);
    }
  };

  // Area scope (Service Areas plan step 4) — applied BEFORE the other filters
  const myCountryName = COUNTRY_NAMES[profile?.country_code || ''] || null;
  const myCountryLabel = countryLabel(profile?.country_code);
  const myAreaJobs = jobs.filter((j) => j.matches_my_areas);
  // Gentle fallback (§4.4): "My Areas" with zero matches shows everything + a note
  const fallbackActive = areaScope === 'mine' && myAreaJobs.length === 0 && jobs.length > 0;
  const scopedJobs =
    areaScope === 'mine'
      ? (fallbackActive ? jobs : myAreaJobs)
      : areaScope === 'country' && myCountryName
        ? jobs.filter(
            (j) =>
              j.property_country === myCountryName ||
              (!j.property_country && j.property_address.toLowerCase().includes(myCountryName.toLowerCase()))
          )
        : jobs;

  // Apply filters and sorting
  const filteredAndSortedJobs = scopedJobs
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
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Sparkles className="h-12 w-12 text-forest animate-pulse mx-auto mb-4" />
            <p className="text-muted-foreground">Loading spotlights...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="border-b bg-gradient-to-r from-forest/5 to-forest/10">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl lg:text-3xl font-serif font-bold text-foreground flex items-center gap-3">
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
                {jobs.length > 0 ? formatPrice(Math.round(jobs.reduce((sum, j) => sum + j.budget_amount, 0) / jobs.length), 'AUD') : formatPrice(0, 'AUD')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Area scope pills (Service Areas plan step 4) */}
        <div role="group" aria-label="Job area filter" className="flex flex-wrap items-center gap-2 mb-4">
          {([
            { value: 'mine' as AreaScope, label: 'My Areas' },
            ...(myCountryLabel ? [{ value: 'country' as AreaScope, label: `All of ${myCountryLabel}` }] : []),
            { value: 'everywhere' as AreaScope, label: 'Everywhere' },
          ]).map((pill) => (
            <button
              key={pill.value}
              type="button"
              onClick={() => setAreaScope(pill.value)}
              aria-pressed={areaScope === pill.value}
              className={cn(
                'min-h-[44px] rounded-full border px-4 text-sm font-medium transition-colors duration-200',
                areaScope === pill.value
                  ? 'bg-forest text-white border-forest'
                  : 'bg-white/70 text-forest border-forest/30 hover:bg-forest/5'
              )}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Gentle zero-match fallback note (§4.4) */}
        {fallbackActive && (
          <div className="mb-4 rounded-lg border border-forest/15 bg-forest/5 px-4 py-3">
            <p className="text-sm text-foreground">
              No open jobs in your service areas yet — showing all open jobs.
            </p>
          </div>
        )}

        {/* No service areas set at all — quiet hint (edge case) */}
        {hasServiceAreas === false && (
          <div className="mb-4 rounded-lg border border-forest/15 bg-forest/5 px-4 py-3">
            <p className="text-sm text-foreground">
              Tip: set your service areas in{' '}
              <button
                type="button"
                onClick={() => navigate('/settings/profile')}
                className="font-medium text-forest underline underline-offset-4 hover:text-forest/80"
              >
                Profile Settings
              </button>{' '}
              and we'll spotlight the jobs near you.
            </p>
          </div>
        )}

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
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant={urgencyConfig.badgeVariant} className="flex items-center gap-1">
                          <UrgencyIcon className="h-3 w-3" />
                          {urgencyConfig.label}
                        </Badge>
                        {areaScope !== 'mine' && job.matches_my_areas && (
                          <Badge variant="outline" className="bg-forest/10 text-forest border-forest/30 text-xs">
                            In your area
                          </Badge>
                        )}
                      </div>
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
                        {job.property_address.startsWith('Area:') ? (
                          <>
                            <Badge variant="outline" className="mb-1 bg-blue-50 text-blue-700 border-blue-200 text-xs">
                              General Area
                            </Badge>
                            <p className="font-medium text-foreground line-clamp-2">{job.property_address.replace('Area: ', '')}</p>
                          </>
                        ) : (
                          <p className="font-medium text-foreground line-clamp-2">{job.property_address}</p>
                        )}
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
                        {formatPrice(job.budget_amount, job.budget_currency || 'AUD')}
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

                    <Button
                      className="w-full mt-3 h-auto min-h-10 py-2 whitespace-normal bg-forest hover:bg-forest/90"
                      size="sm"
                    >
                      View Details & Bid
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
