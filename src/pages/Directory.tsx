import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Star, Filter, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LocationSearchFilter } from "@/components/filters/LocationSearchFilter";
import { Coordinates, calculateDistance } from "@/lib/geocoder";

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  user_type: "buyers_agent" | "real_estate_agent" | "conveyancer" | "mortgage_broker";
  specialization: "investment" | "luxury" | "residential" | "commercial" | null;
  reputation_score: number;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
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
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [userTypeFilter, setUserTypeFilter] = useState<string>("all");
  const [specializationFilter, setSpecializationFilter] = useState<string>("all");
  const [minReputation, setMinReputation] = useState([0]);
  const [showFilters, setShowFilters] = useState(false);
  const [locationFilter, setLocationFilter] = useState<Coordinates | null>(null);
  const [radiusFilter, setRadiusFilter] = useState(25);

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
      specializationFilter === "all" || profile.specialization === specializationFilter;

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
          <h1 className="font-serif text-3xl font-semibold text-foreground">Agent Directory</h1>
          <p className="text-muted-foreground mt-1">
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
            <Card className="bg-card border-border shadow-elegant">
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
                    className="bg-card border-border shadow-elegant hover:shadow-lg transition-shadow duration-300"
                  >
                    <CardContent className="p-6">
                      <div className="flex flex-col items-center text-center space-y-4">
                        {/* Avatar */}
                        <div className="w-20 h-20 rounded-full bg-rose-gold/30 flex items-center justify-center overflow-hidden border-2 border-rose-gold">
                          {profile.avatar_url ? (
                            <img
                              src={profile.avatar_url}
                              alt={profile.full_name || "Agent"}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-2xl font-semibold text-forest">
                              {profile.full_name?.charAt(0) || "A"}
                            </span>
                          )}
                        </div>

                        {/* Name */}
                        <h3 className="font-serif text-lg font-semibold text-foreground">
                          {profile.full_name || "Anonymous Agent"}
                        </h3>

                        {/* Distance Badge */}
                        {profile.distance !== null && (
                          <Badge variant="secondary" className="bg-accent/50">
                            {profile.distance} km away
                          </Badge>
                        )}

                        {/* Badge */}
                        <Badge className="bg-burgundy text-white">
                          {userTypeLabels[profile.user_type] || profile.user_type}
                        </Badge>

                        {/* Specialization */}
                        {profile.specialization && (
                          <span className="text-sm text-muted-foreground">
                            {specializationLabels[profile.specialization]}
                          </span>
                        )}

                        {/* Star Rating */}
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
                          <span className="text-sm text-muted-foreground ml-1">
                            ({profile.reputation_score})
                          </span>
                        </div>

                        {/* City */}
                        {profile.city && (
                          <p className="text-sm text-muted-foreground">{profile.city}</p>
                        )}

                        {/* View Profile Button */}
                        <Button className="w-full bg-rose-gold hover:bg-rose-gold/90 text-forest font-medium mt-2">
                          View Profile
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
