import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Star, Filter, X, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LocationSearchFilter } from "@/components/filters/LocationSearchFilter";
import { Coordinates, calculateDistance } from "@/lib/geocoder";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { useUnits } from "@/contexts/UnitsContext";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistance } from "@/lib/currency";
import { ProfileDetailModal } from "@/components/directory/ProfileDetailModal";
import { getOrCreateConversation } from "@/lib/messaging";
import { toast } from "sonner";

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  user_type: "buyers_agent" | "real_estate_agent" | "conveyancer" | "mortgage_broker";
  specializations: string[] | null;
  reputation_score: number;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  is_verified: boolean | null;
  bio: string | null;
  service_regions: string[] | null;
  home_base_address: string | null;
  points: number | null;
}

const userTypeLabels: Record<string, string> = {
  buyers_agent: "Buyers Agent",
  real_estate_agent: "Real Estate Agent",
  conveyancer: "Conveyancer",
  mortgage_broker: "Mortgage Broker",
};

const specializationLabels: Record<string, string> = {
  investment: "Investment",
  luxury: "Luxury",
  residential: "Residential",
  commercial: "Commercial",
};

export default function Directory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { unitSystem } = useUnits();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [userTypeFilter, setUserTypeFilter] = useState<string>("all");
  const [specializationFilter, setSpecializationFilter] = useState<string>("all");
  const [minReputation, setMinReputation] = useState([0]);
  const [showFilters, setShowFilters] = useState(false);
  const [locationFilter, setLocationFilter] = useState<Coordinates | null>(null);
  const [radiusFilter, setRadiusFilter] = useState(25);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  const handleSendMessage = async (recipientId: string) => {
    if (!user) {
      toast.error("Please sign in to send messages");
      navigate("/auth");
      return;
    }
    if (recipientId === user.id) {
      toast.error("You can't message yourself");
      return;
    }
    setIsSendingMessage(true);
    try {
      const conversationId = await getOrCreateConversation(user.id, recipientId);
      setProfileModalOpen(false);
      navigate(`/messages?conversation=${conversationId}`);
    } catch (error) {
      console.error("Failed to start conversation:", error);
      toast.error("Failed to start conversation");
    } finally {
      setIsSendingMessage(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("reputation_score", { ascending: false });

    if (!error && data) {
      setProfiles(data);
    }
    setLoading(false);
  };

  const handleLocationChange = useCallback((location: Coordinates | null, radius: number) => {
    setLocationFilter(location);
    setRadiusFilter(radius);
  }, []);

  const filteredProfiles = profiles.filter((profile) => {
    const matchesSearch =
      searchQuery === "" ||
      profile.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile.city?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesUserType =
      userTypeFilter === "all" || profile.user_type === userTypeFilter;

    const matchesSpecialization =
      specializationFilter === "all" ||
      (profile.specializations && profile.specializations.includes(specializationFilter));

    const matchesReputation = profile.reputation_score >= minReputation[0];

    // Location filter
    let matchesLocation = true;
    if (locationFilter && profile.latitude && profile.longitude) {
      const distance = calculateDistance(
        locationFilter.lat,
        locationFilter.lng,
        profile.latitude,
        profile.longitude
      );
      matchesLocation = distance <= radiusFilter;
    }

    return matchesSearch && matchesUserType && matchesSpecialization && matchesReputation && matchesLocation;
  }).map((profile) => {
    // Add distance if location filter is active
    let distance: number | null = null;
    if (locationFilter && profile.latitude && profile.longitude) {
      distance = calculateDistance(
        locationFilter.lat,
        locationFilter.lng,
        profile.latitude,
        profile.longitude
      );
    }
    return { ...profile, distance };
  });

  const getStarRating = (score: number) => {
    return Math.round(score / 20);
  };

  const clearFilters = () => {
    setUserTypeFilter("all");
    setSpecializationFilter("all");
    setMinReputation([0]);
  };

  const hasActiveFilters =
    userTypeFilter !== "all" || specializationFilter !== "all" || minReputation[0] > 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-serif font-semibold text-foreground">Agent Directory</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Connect with verified professionals in your network
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              placeholder="Search by name or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="lg:hidden"
          >
            <Filter size={18} className="mr-2" />
            Filters
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-2 bg-rose-gold text-forest">
                Active
              </Badge>
            )}
          </Button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filters Sidebar */}
          <aside
            className={`lg:w-64 space-y-6 ${showFilters ? "block" : "hidden lg:block"}`}
          >
            <Card className="bg-card border-border">
              <CardContent className="p-5 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-foreground">Filters</h3>
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      <X size={12} />
                      Clear
                    </button>
                  )}
                </div>

                {/* Location Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Location
                  </label>
                  <LocationSearchFilter onLocationChange={handleLocationChange} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Professional Type
                  </label>
                  <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="all">All Types</SelectItem>
                      {Object.entries(userTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Specialization
                  </label>
                  <Select value={specializationFilter} onValueChange={setSpecializationFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Specializations" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="all">All Specializations</SelectItem>
                      {Object.entries(specializationLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-foreground">
                      Min Reputation
                    </label>
                    <span className="text-sm text-muted-foreground">{minReputation[0]}+</span>
                  </div>
                  <Slider
                    value={minReputation}
                    onValueChange={setMinReputation}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>
              </CardContent>
            </Card>
          </aside>

          {/* Results Grid */}
          <div className="flex-1">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="bg-card border-border animate-pulse">
                    <CardContent className="p-6">
                      <div className="flex flex-col items-center space-y-4">
                        <div className="w-20 h-20 rounded-full bg-muted" />
                        <div className="h-4 w-32 bg-muted rounded" />
                        <div className="h-3 w-24 bg-muted rounded" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredProfiles.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground">No agents found matching your criteria.</p>
                  {hasActiveFilters && (
                    <Button variant="link" onClick={clearFilters} className="mt-2 text-primary">
                      Clear filters
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredProfiles.map((profile) => (
                  <Card
                    key={profile.id}
                    className="bg-card border-border hover:border-muted-foreground/20 transition-colors duration-150 cursor-pointer"
                    onClick={() => {
                      setSelectedProfile(profile);
                      setProfileModalOpen(true);
                    }}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        {/* Avatar */}
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                          {profile.avatar_url ? (
                            <img
                              src={profile.avatar_url}
                              alt={profile.full_name || "Agent"}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-lg font-medium text-muted-foreground">
                              {profile.full_name?.charAt(0) || "A"}
                            </span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Name & Verified Badge */}
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-semibold text-foreground truncate">
                              {profile.full_name || "Anonymous Agent"}
                            </h3>
                            <VerifiedBadge isVerified={profile.is_verified || false} size="sm" />
                          </div>

                          {/* Type */}
                          <div className="mt-1">
                            <Badge variant="outline" className="text-xs">
                              {userTypeLabels[profile.user_type] || profile.user_type}
                            </Badge>
                          </div>

                          {/* Specializations */}
                          {profile.specializations && profile.specializations.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {profile.specializations.map((spec) => (
                                <Badge
                                  key={spec}
                                  variant="secondary"
                                  className="text-xs bg-forest/5 text-forest border-forest/20"
                                >
                                  {specializationLabels[spec] || spec}
                                </Badge>
                              ))}
                            </div>
                          )}

                          {/* Star Rating */}
                          <div className="flex items-center gap-1 mt-2">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                size={14}
                                className={
                                  i < getStarRating(profile.reputation_score)
                                    ? "text-yellow-500 fill-yellow-500"
                                    : "text-muted"
                                }
                              />
                            ))}
                            <span className="text-xs text-muted-foreground ml-1">
                              ({profile.reputation_score})
                            </span>
                          </div>

                          {/* City & Distance */}
                          <div className="flex items-center gap-2 mt-2">
                            {profile.city && (
                              <p className="text-xs text-muted-foreground">{profile.city}</p>
                            )}
                            {profile.distance !== null && (
                              <>
                                <span className="text-xs text-muted-foreground">•</span>
                                <span className="text-xs text-forest">
                                  {formatDistance(profile.distance, unitSystem)}
                                </span>
                              </>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2 mt-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="flex-1 text-forest hover:bg-forest/5"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedProfile(profile);
                                setProfileModalOpen(true);
                              }}
                            >
                              View Profile
                            </Button>
                            {user && user.id !== profile.id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-forest hover:bg-forest/5 px-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSendMessage(profile.id);
                                }}
                                title="Send Message"
                              >
                                <MessageSquare size={16} />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile Detail Modal */}
      <ProfileDetailModal
        profile={selectedProfile}
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
        userTypeLabels={userTypeLabels}
        specializationLabels={specializationLabels}
        onSendMessage={handleSendMessage}
        isSendingMessage={isSendingMessage}
      />
    </DashboardLayout>
  );
}
