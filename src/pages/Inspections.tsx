import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LocationSearchFilter } from "@/components/filters/LocationSearchFilter";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { TrustTipBanner } from "@/components/ui/trust-tip-banner";
import { CurrencyBadge } from "@/components/ui/currency-badge";
import { Plus, Search, MapPin, Calendar, DollarSign, Video, Camera, Gavel, FileText, ClipboardCheck, Home, Navigation } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Coordinates, calculateDistance } from "@/lib/geocoder";
import { useAuth } from "@/contexts/AuthContext";
import { useUnits } from "@/contexts/UnitsContext";
import { formatDistance, CurrencyCode, CURRENCY_SYMBOLS } from "@/lib/currency";

interface Profile {
  id: string;
  full_name: string | null;
  is_verified: boolean | null;
  latitude: number | null;
  longitude: number | null;
}

interface InspectionRequest {
  id: string;
  title: string;
  description: string | null;
  property_address: string;
  latitude: number | null;
  longitude: number | null;
  service_type: string;
  budget: number;
  deadline: string;
  status: string | null;
  created_at: string;
  requester_id: string;
  currency_code: string | null;
  profiles?: Profile;
}

const serviceTypeLabels: Record<string, { label: string; icon: React.ReactNode }> = {
  video_walkthrough: { label: "Video Walkthrough", icon: <Video className="h-4 w-4" /> },
  photo_inspection: { label: "Photo Inspection", icon: <Camera className="h-4 w-4" /> },
  auction_bidding: { label: "Auction Bidding", icon: <Gavel className="h-4 w-4" /> },
  contract_collection: { label: "Contract Collection", icon: <FileText className="h-4 w-4" /> },
  property_assessment: { label: "Property Assessment", icon: <ClipboardCheck className="h-4 w-4" /> },
  open_home_attendance: { label: "Open Home", icon: <Home className="h-4 w-4" /> },
};

const statusColors: Record<string, string> = {
  open: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  assigned: "bg-amber-500/10 text-amber-600 border-amber-200",
  completed: "bg-blue-500/10 text-blue-600 border-blue-200",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
};

const currencyOptions: CurrencyCode[] = ['AUD', 'USD', 'GBP', 'EUR', 'NZD', 'CAD'];

export default function Inspections() {
  const { user } = useAuth();
  const { unitSystem, userCurrency } = useUnits();
  
  const [requests, setRequests] = useState<InspectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>("all");
  const [currencyFilter, setCurrencyFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<Coordinates | null>(null);
  const [radiusFilter, setRadiusFilter] = useState(25);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [isUserVerified, setIsUserVerified] = useState(false);

  useEffect(() => {
    fetchRequests();
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, is_verified, latitude, longitude")
        .eq("id", user.id)
        .single();
      
      if (error) throw error;
      setUserProfile(data);
      setIsUserVerified(data?.is_verified || false);
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("inspection_requests")
        .select(`
          *,
          profiles:requester_id (
            id,
            full_name,
            is_verified,
            latitude,
            longitude
          )
        `)
        .eq("status", "open")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error("Error fetching inspection requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationChange = useCallback((location: Coordinates | null, radius: number) => {
    setLocationFilter(location);
    setRadiusFilter(radius);
  }, []);

  const filteredRequests = requests.filter((request) => {
    // Text search
    const matchesSearch = 
      request.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.property_address.toLowerCase().includes(searchQuery.toLowerCase());

    // Service type filter
    const matchesServiceType = 
      serviceTypeFilter === "all" || request.service_type === serviceTypeFilter;

    // Currency filter
    const matchesCurrency = 
      currencyFilter === "all" || request.currency_code === currencyFilter;

    // Location filter
    let matchesLocation = true;
    if (locationFilter && request.latitude && request.longitude) {
      const distance = calculateDistance(
        locationFilter.lat,
        locationFilter.lng,
        request.latitude,
        request.longitude
      );
      matchesLocation = distance <= radiusFilter;
    }

    return matchesSearch && matchesServiceType && matchesCurrency && matchesLocation;
  }).map((request) => {
    // Add distance from search location
    let searchDistance: number | null = null;
    if (locationFilter && request.latitude && request.longitude) {
      searchDistance = calculateDistance(
        locationFilter.lat,
        locationFilter.lng,
        request.latitude,
        request.longitude
      );
    }
    
    // Add distance from user's home base
    let homeBaseDistance: number | null = null;
    if (userProfile?.latitude && userProfile?.longitude && request.latitude && request.longitude) {
      homeBaseDistance = calculateDistance(
        userProfile.latitude,
        userProfile.longitude,
        request.latitude,
        request.longitude
      );
    }
    
    return { ...request, searchDistance, homeBaseDistance };
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-serif font-bold text-foreground">
              Inspection Marketplace
            </h1>
            <p className="text-muted-foreground mt-1">
              Find and post inspection jobs in your area
            </p>
          </div>
          <Link to="/inspections/new">
            <Button className="bg-rose-gold hover:bg-rose-gold/90 text-forest font-semibold">
              <Plus className="h-4 w-4 mr-2" />
              Post Inspection Request
            </Button>
          </Link>
        </div>

        {/* Trust Tip Banner for unverified users */}
        {user && !isUserVerified && (
          <TrustTipBanner />
        )}

        {/* Filters */}
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search jobs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Service Type Filter */}
              <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Service Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Services</SelectItem>
                  {Object.entries(serviceTypeLabels).map(([value, { label }]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Currency Filter */}
              <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Currencies</SelectItem>
                  {currencyOptions.map((code) => (
                    <SelectItem key={code} value={code}>
                      {CURRENCY_SYMBOLS[code]} {code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Location Filter */}
              <LocationSearchFilter onLocationChange={handleLocationChange} />
            </div>
          </CardContent>
        </Card>

        {/* Job Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="space-y-2">
                  <div className="h-6 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="h-4 bg-muted rounded" />
                  <div className="h-4 bg-muted rounded w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredRequests.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">No jobs found</h3>
                <p className="text-muted-foreground mt-1">
                  {requests.length === 0
                    ? "Be the first to post an inspection request!"
                    : "Try adjusting your filters to find more jobs."}
                </p>
              </div>
              <Link to="/inspections/new">
                <Button className="bg-rose-gold hover:bg-rose-gold/90 text-forest">
                  <Plus className="h-4 w-4 mr-2" />
                  Post a Job
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRequests.map((request) => {
              const serviceInfo = serviceTypeLabels[request.service_type] || {
                label: request.service_type,
                icon: <ClipboardCheck className="h-4 w-4" />,
              };
              const posterIsVerified = request.profiles?.is_verified || false;
              const currency = (request.currency_code as CurrencyCode) || 'AUD';

              return (
                <Card
                  key={request.id}
                  className="hover:shadow-elegant transition-shadow border-border/50 overflow-hidden"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 text-rose-gold">
                        {serviceInfo.icon}
                        <span className="text-sm font-medium">{serviceInfo.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <VerifiedBadge isVerified={posterIsVerified} size="sm" />
                        <Badge
                          variant="outline"
                          className={statusColors[request.status || "open"]}
                        >
                          {request.status || "Open"}
                        </Badge>
                      </div>
                    </div>
                    <CardTitle className="text-lg font-semibold text-foreground line-clamp-2">
                      {request.title}
                    </CardTitle>
                    {/* Poster info */}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span>Posted by</span>
                      <span className="font-medium text-foreground">
                        {request.profiles?.full_name || "Anonymous"}
                      </span>
                      {posterIsVerified && (
                        <VerifiedBadge isVerified={true} size="sm" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Location */}
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <span className="text-muted-foreground line-clamp-2 flex-1">
                        {request.property_address}
                      </span>
                    </div>

                    {/* Distance badges */}
                    <div className="flex flex-wrap gap-2">
                      {request.searchDistance !== undefined && request.searchDistance !== null && (
                        <Badge variant="secondary" className="text-xs">
                          <MapPin className="h-3 w-3 mr-1" />
                          {formatDistance(request.searchDistance, unitSystem)}
                        </Badge>
                      )}
                      {request.homeBaseDistance !== undefined && request.homeBaseDistance !== null && (
                        <Badge variant="outline" className="text-xs bg-rose-gold/10 border-rose-gold/30 text-foreground">
                          <Navigation className="h-3 w-3 mr-1" />
                          {formatDistance(request.homeBaseDistance, unitSystem)} from base
                        </Badge>
                      )}
                    </div>

                    {/* Budget & Deadline */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                      <div className="flex items-center gap-1.5 text-sm">
                        <DollarSign className="h-4 w-4 text-emerald-600" />
                        <CurrencyBadge 
                          amountCents={request.budget} 
                          currency={currency}
                          showConversion={currency !== userCurrency}
                        />
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Due {formatDate(request.deadline)}</span>
                      </div>
                    </div>

                    {/* View Details Button */}
                    <Button variant="outline" className="w-full mt-2">
                      View Details
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
