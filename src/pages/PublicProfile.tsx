/**
 * PublicProfile.tsx
 *
 * Public profile page accessible at /profiles/:userId
 * Shows professional information, reputation stats, and reviews.
 * Does NOT expose private data (email, phone, billing, Stripe IDs).
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { VerifiedBadge } from '@/components/ui/verified-badge';
import {
  ArrowLeft,
  Star,
  MapPin,
  MessageSquare,
  Award,
  Crown,
  Briefcase,
  CheckCircle2,
  CalendarDays,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getOrCreateConversation } from '@/lib/messaging';

const USER_TYPE_LABELS: Record<string, string> = {
  buyers_agent: 'Buyers Agent',
  real_estate_agent: 'Real Estate Agent',
  building_inspector: 'Building Inspector',
  conveyancer: 'Conveyancer',
  mortgage_broker: 'Mortgage Broker',
  stylist: 'Stylist',
};

const SPECIALIZATION_LABELS: Record<string, string> = {
  investment: 'Investment',
  luxury: 'Luxury',
  residential: 'Residential',
  commercial: 'Commercial',
};

const MEMBERSHIP_LABELS: Record<string, string> = {
  free: 'Free Member',
  basic: 'Basic Member',
  premium: 'Premium Member',
};

const MEMBERSHIP_COLORS: Record<string, string> = {
  free: 'bg-muted text-muted-foreground',
  basic: 'bg-forest/10 text-forest border-forest/20',
  premium: 'bg-rose-gold/20 text-rose-gold border-rose-gold/30',
};

interface ProfileData {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  user_type: string;
  bio: string | null;
  specializations: string[] | null;
  reputation_score: number;
  points: number | null;
  city: string | null;
  home_base_address: string | null;
  service_regions: string[] | null;
  is_verified: boolean | null;
  subscription_tier: string | null;
  created_at: string;
}

interface ReputationStats {
  jobsPosted: number;
  jobsCompleted: number;
  reviewCount: number;
  averageRating: number | null;
}

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

export default function PublicProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<ReputationStats>({
    jobsPosted: 0,
    jobsCompleted: 0,
    reviewCount: 0,
    averageRating: null,
  });
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchProfile();
    }
  }, [userId]);

  const fetchProfile = async () => {
    if (!userId) return;
    setLoading(true);

    try {
      const { supabaseUrl, supabaseKey, accessToken } = getAuthHeaders();
      const headers = {
        apikey: supabaseKey,
        Authorization: `Bearer ${accessToken}`,
      };

      // Fetch profile (public fields only)
      const profileRes = await fetch(
        `${supabaseUrl}/rest/v1/profiles?select=id,full_name,avatar_url,user_type,bio,specializations,reputation_score,points,city,home_base_address,service_regions,is_verified,subscription_tier,created_at&id=eq.${userId}`,
        {
          headers: {
            ...headers,
            Accept: 'application/vnd.pgrst.object+json',
          },
        }
      );

      if (!profileRes.ok) {
        throw new Error('Profile not found');
      }

      const profile = await profileRes.json();
      setProfileData(profile);

      // Fetch reputation stats in parallel
      const [jobsPostedRes, jobsCompletedRes, reviewsRes] = await Promise.all([
        // Jobs posted by this user
        fetch(
          `${supabaseUrl}/rest/v1/inspection_jobs?select=id&requesting_agent_id=eq.${userId}`,
          { headers }
        ),
        // Jobs completed (posted by this user and status = completed)
        fetch(
          `${supabaseUrl}/rest/v1/inspection_jobs?select=id&requesting_agent_id=eq.${userId}&status=eq.completed`,
          { headers }
        ),
        // Reviews received
        fetch(
          `${supabaseUrl}/rest/v1/inspection_reviews?select=rating&reviewee_id=eq.${userId}`,
          { headers }
        ),
      ]);

      const jobsPosted = jobsPostedRes.ok ? await jobsPostedRes.json() : [];
      const jobsCompleted = jobsCompletedRes.ok ? await jobsCompletedRes.json() : [];
      const reviews = reviewsRes.ok ? await reviewsRes.json() : [];

      const avgRating =
        reviews.length > 0
          ? reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / reviews.length
          : null;

      setStats({
        jobsPosted: Array.isArray(jobsPosted) ? jobsPosted.length : 0,
        jobsCompleted: Array.isArray(jobsCompleted) ? jobsCompleted.length : 0,
        reviewCount: Array.isArray(reviews) ? reviews.length : 0,
        averageRating: avgRating,
      });
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!user) {
      toast.error('Please sign in to send messages');
      navigate('/auth');
      return;
    }
    if (!userId) return;

    setSendingMessage(true);
    try {
      const conversationId = await getOrCreateConversation(user.id, userId);
      navigate(`/messages?conversation=${conversationId}`);
    } catch (error) {
      console.error('Failed to start conversation:', error);
      toast.error('Failed to start conversation');
    } finally {
      setSendingMessage(false);
    }
  };

  const getStarRating = (score: number) => Math.round(score / 20);

  const memberSince = profileData?.created_at
    ? new Date(profileData.created_at).toLocaleDateString('en-AU', {
        month: 'long',
        year: 'numeric',
      })
    : null;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Sparkles className="h-12 w-12 text-forest animate-pulse mx-auto mb-4" />
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!profileData) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-muted-foreground mb-4">Profile not found</p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </DashboardLayout>
    );
  }

  const isOwnProfile = user?.id === profileData.id;

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Profile Header Card */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                {profileData.avatar_url ? (
                  <img
                    src={profileData.avatar_url}
                    alt={profileData.full_name || 'User'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-medium text-muted-foreground">
                    {profileData.full_name?.charAt(0) || 'U'}
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                {/* Name & Verification */}
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <h1 className="text-2xl font-semibold">
                    {profileData.full_name || 'Anonymous'}
                  </h1>
                  <VerifiedBadge isVerified={profileData.is_verified || false} size="lg" />
                </div>

                {/* Type & Membership */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge variant="outline">
                    {USER_TYPE_LABELS[profileData.user_type] || profileData.user_type}
                  </Badge>
                  {profileData.subscription_tier && profileData.subscription_tier !== 'free' && (
                    <Badge
                      className={cn(
                        'border',
                        MEMBERSHIP_COLORS[profileData.subscription_tier] || MEMBERSHIP_COLORS.free
                      )}
                    >
                      {profileData.subscription_tier === 'premium' && (
                        <Crown className="w-3 h-3 mr-1" />
                      )}
                      {MEMBERSHIP_LABELS[profileData.subscription_tier] || 'Member'}
                    </Badge>
                  )}
                </div>

                {/* Star Rating */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={16}
                        className={
                          i < getStarRating(profileData.reputation_score)
                            ? 'text-yellow-500 fill-yellow-500'
                            : 'text-muted'
                        }
                      />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {profileData.reputation_score}/100
                  </span>
                  {profileData.points !== null && profileData.points > 0 && (
                    <>
                      <span className="text-muted-foreground">·</span>
                      <div className="flex items-center gap-1">
                        <Award size={14} className="text-forest" />
                        <span className="text-sm text-muted-foreground">
                          {profileData.points} points
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {!isOwnProfile && (
              <div className="mt-5 pt-4 border-t">
                <Button
                  className="bg-forest hover:bg-forest/90 text-white"
                  onClick={handleSendMessage}
                  disabled={sendingMessage}
                >
                  <MessageSquare size={16} className="mr-2" />
                  {sendingMessage ? 'Opening...' : 'Send Message'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reputation Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <Briefcase className="h-5 w-5 text-forest mx-auto mb-1" />
              <p className="text-2xl font-bold">{stats.jobsPosted}</p>
              <p className="text-xs text-muted-foreground">Jobs Posted</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto mb-1" />
              <p className="text-2xl font-bold">{stats.jobsCompleted}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <Star className="h-5 w-5 text-yellow-500 mx-auto mb-1" />
              <p className="text-2xl font-bold">
                {stats.averageRating !== null ? stats.averageRating.toFixed(1) : '--'}
              </p>
              <p className="text-xs text-muted-foreground">
                Avg Rating ({stats.reviewCount})
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <CalendarDays className="h-5 w-5 text-blue-600 mx-auto mb-1" />
              <p className="text-sm font-semibold mt-1">{memberSince || '--'}</p>
              <p className="text-xs text-muted-foreground">Member Since</p>
            </CardContent>
          </Card>
        </div>

        {/* Bio */}
        {profileData.bio && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">About</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {profileData.bio}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Specializations */}
        {profileData.specializations && profileData.specializations.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">Specializations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {profileData.specializations.map((spec) => (
                  <Badge
                    key={spec}
                    variant="secondary"
                    className="bg-forest/5 text-forest border-forest/20"
                  >
                    {SPECIALIZATION_LABELS[spec] || spec}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Location & Service Areas */}
        {(profileData.city || profileData.home_base_address || (profileData.service_regions && profileData.service_regions.length > 0)) && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">Location & Service Areas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(profileData.home_base_address || profileData.city) && (
                <div className="flex items-start gap-2">
                  <MapPin size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    {profileData.home_base_address || profileData.city}
                  </p>
                </div>
              )}
              {profileData.service_regions && profileData.service_regions.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Service Areas</p>
                  <div className="flex flex-wrap gap-2">
                    {profileData.service_regions.map((region) => (
                      <Badge key={region} variant="outline" className="text-xs">
                        {region}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
