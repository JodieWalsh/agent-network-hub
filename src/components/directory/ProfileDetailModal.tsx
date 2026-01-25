import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { Star, MapPin, Mail, Phone, Award, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  user_type: string;
  specializations: string[] | null;
  reputation_score: number;
  city: string | null;
  is_verified: boolean | null;
  bio: string | null;
  service_regions: string[] | null;
  home_base_address: string | null;
  points: number | null;
  subscription_tier?: string | null;
}

const membershipLabels: Record<string, string> = {
  free: "Free Member",
  basic: "Basic Member",
  premium: "Premium Member",
};

const membershipColors: Record<string, string> = {
  free: "bg-muted text-muted-foreground",
  basic: "bg-forest/10 text-forest border-forest/20",
  premium: "bg-rose-gold/20 text-rose-gold border-rose-gold/30",
};

interface ProfileDetailModalProps {
  profile: Profile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userTypeLabels: Record<string, string>;
  specializationLabels: Record<string, string>;
}

export function ProfileDetailModal({
  profile,
  open,
  onOpenChange,
  userTypeLabels,
  specializationLabels,
}: ProfileDetailModalProps) {
  if (!profile) return null;

  const getStarRating = (score: number) => {
    return Math.round(score / 20);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-sans font-semibold">
            Agent Profile
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Section */}
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name || "Agent"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl font-medium text-muted-foreground">
                  {profile.full_name?.charAt(0) || "A"}
                </span>
              )}
            </div>

            <div className="flex-1">
              {/* Name & Verification */}
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-2xl font-sans font-semibold">
                  {profile.full_name || "Anonymous Agent"}
                </h2>
                <VerifiedBadge isVerified={profile.is_verified || false} size="lg" />
              </div>

              {/* User Type & Membership */}
              <div className="flex flex-wrap gap-2 mb-2">
                <Badge variant="outline">
                  {userTypeLabels[profile.user_type] || profile.user_type}
                </Badge>
                {profile.subscription_tier && profile.subscription_tier !== 'free' && (
                  <Badge
                    className={cn(
                      "border",
                      membershipColors[profile.subscription_tier] || membershipColors.free
                    )}
                  >
                    {profile.subscription_tier === 'premium' && <Crown className="w-3 h-3 mr-1" />}
                    {membershipLabels[profile.subscription_tier] || 'Member'}
                  </Badge>
                )}
              </div>

              {/* Star Rating */}
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={16}
                      className={
                        i < getStarRating(profile.reputation_score)
                          ? "text-yellow-500 fill-yellow-500"
                          : "text-muted"
                      }
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  {profile.reputation_score}/100
                </span>
                {profile.points !== null && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <div className="flex items-center gap-1">
                      <Award size={14} className="text-forest" />
                      <span className="text-sm text-muted-foreground">
                        {profile.points} points
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Specializations */}
          {profile.specializations && profile.specializations.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Specializations</h3>
              <div className="flex flex-wrap gap-2">
                {profile.specializations.map((spec) => (
                  <Badge
                    key={spec}
                    variant="secondary"
                    className="bg-forest/5 text-forest border-forest/20"
                  >
                    {specializationLabels[spec] || spec}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Bio */}
          {profile.bio && (
            <div>
              <h3 className="text-sm font-semibold mb-2">About</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {profile.bio}
              </p>
            </div>
          )}

          {/* Location */}
          {(profile.city || profile.home_base_address) && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Location</h3>
              <div className="flex items-start gap-2">
                <MapPin size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="text-sm text-muted-foreground">
                  {profile.home_base_address && (
                    <div>{profile.home_base_address}</div>
                  )}
                  {!profile.home_base_address && profile.city && (
                    <div>{profile.city}</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Service Regions */}
          {profile.service_regions && profile.service_regions.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Service Areas</h3>
              <div className="flex flex-wrap gap-2">
                {profile.service_regions.map((region) => (
                  <Badge key={region} variant="outline" className="text-xs">
                    {region}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Contact Section */}
          <div className="pt-4 border-t border-border">
            <div className="flex gap-2">
              <Button
                variant="default"
                className="flex-1 bg-forest hover:bg-forest/90 text-white"
              >
                <Mail size={16} className="mr-2" />
                Send Message
              </Button>
              <Button variant="outline" className="flex-1">
                <Phone size={16} className="mr-2" />
                Request Call
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
