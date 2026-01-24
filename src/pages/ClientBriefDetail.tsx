import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Edit, DollarSign, MapPin, Bed, Bath, Home, Car,
  Thermometer, Sun, Eye, Shield, Leaf, UtensilsCrossed, Droplets,
  Calendar, FileText, AlertTriangle, Lightbulb, Building, Warehouse
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

type Priority = "must_have" | "important" | "nice_to_have" | "dont_care";

interface ClientBrief {
  id: string;
  client_name: string;
  brief_name: string;
  description: string | null;
  budget_min: number | null;
  budget_max: number | null;
  bedrooms_min: number | null;
  bedrooms_max: number | null;
  bathrooms_min: number | null;
  bathrooms_max: number | null;
  preferred_suburbs: string[];
  status: "active" | "matched" | "on_hold" | "archived";
  created_at: string;
  updated_at: string;
  expiry_date: string | null;

  // Property Size
  land_size_min_sqm: number | null;
  land_size_min_priority: Priority;
  building_size_min_sqm: number | null;
  building_size_min_priority: Priority;

  // Pool
  pool_required: boolean;
  pool_priority: Priority;
  pool_min_length_m: number | null;

  // Garden
  garden_required: boolean;
  garden_priority: Priority;
  garden_min_size_sqm: number | null;

  // Architecture
  architectural_styles: string[];
  architectural_style_priority: Priority;
  min_ceiling_height_m: number | null;
  ceiling_height_priority: Priority;
  preferred_light_directions: string[];
  light_direction_priority: Priority;
  natural_light_importance: Priority;

  // Views
  water_views_required: boolean;
  water_views_priority: Priority;
  city_views_required: boolean;
  city_views_priority: Priority;
  mountain_views_required: boolean;
  mountain_views_priority: Priority;
  park_views_required: boolean;
  park_views_priority: Priority;

  // Parking
  min_parking_spaces: number | null;
  parking_priority: Priority;
  garage_required: boolean;
  garage_priority: Priority;

  // Storage
  storage_required: boolean;
  storage_priority: Priority;
  min_storage_size_sqm: number | null;

  // Climate
  air_conditioning_required: boolean;
  air_conditioning_priority: Priority;
  preferred_ac_types: string[];
  heating_required: boolean;
  heating_priority: Priority;
  preferred_heating_types: string[];

  // Outdoor
  outdoor_entertaining_required: boolean;
  outdoor_entertaining_priority: Priority;
  min_outdoor_area_sqm: number | null;
  balcony_terrace_required: boolean;
  balcony_priority: Priority;

  // Security
  security_system_required: boolean;
  security_priority: Priority;
  required_security_features: string[];

  // Sustainability
  solar_panels_required: boolean;
  solar_priority: Priority;
  min_energy_rating: number | null;
  energy_rating_priority: Priority;
  required_sustainable_features: string[];
  sustainability_priority: Priority;

  // Kitchen
  kitchen_styles: string[];
  kitchen_style_priority: Priority;
  required_kitchen_features: string[];
  kitchen_features_priority: Priority;

  // Bathrooms
  min_ensuite_bathrooms: number | null;
  ensuite_priority: Priority;
  required_bathroom_features: string[];
  bathroom_features_priority: Priority;

  // Condition
  acceptable_conditions: string[];
  condition_priority: Priority;
  max_year_built: number | null;
  year_built_priority: Priority;
  renovation_acceptable: boolean;

  // Smart Home
  smart_home_required: boolean;
  smart_home_priority: Priority;
  required_smart_features: string[];

  // Lifestyle
  walkability_min_score: number | null;
  walkability_priority: Priority;
  max_noise_level: string | null;
  noise_priority: Priority;
  max_street_traffic: string | null;
  traffic_priority: Priority;
  min_privacy_level: string | null;
  privacy_priority: Priority;

  // Investment
  min_rental_yield: number | null;
  rental_yield_priority: Priority;
  max_council_rates_annual: number | null;
  max_strata_fees_quarterly: number | null;

  // Flooring
  preferred_flooring_types: string[];
  flooring_priority: Priority;
  flooring_specific_notes: string | null;

  // Additional
  additional_notes: string | null;
  deal_breakers: string | null;
  flexibility_notes: string | null;
}

export default function ClientBriefDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [brief, setBrief] = useState<ClientBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

  // Check if we came from somewhere (for smart back navigation)
  const cameFromJob = location.state?.from === 'job' || document.referrer.includes('/inspections/spotlights/');

  const handleBack = () => {
    // If there's browser history, go back to previous page
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      // Fallback to briefs list if no history
      navigate('/briefs');
    }
  };

  useEffect(() => {
    if (id) {
      fetchBrief();
    }
  }, [id]);

  const fetchBrief = async () => {
    if (!user || !id) {
      setLoading(false);
      return;
    }

    try {
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

      // First, try to fetch as owner (for edit access)
      let url = `${supabaseUrl}/rest/v1/client_briefs?select=*,agent_id&id=eq.${id}&agent_id=eq.${user.id}`;
      let response = await fetch(url, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.pgrst.object+json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.id) {
          setBrief(data);
          setIsOwner(true);
          return;
        }
      }

      // Not the owner - check if brief is linked to an inspection job (view-only access)
      url = `${supabaseUrl}/rest/v1/client_briefs?select=*,agent_id&id=eq.${id}`;
      response = await fetch(url, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.pgrst.object+json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.id) {
          setBrief(data);
          setIsOwner(data.agent_id === user.id);
        }
      }
    } catch (error) {
      console.error("Error fetching brief:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return "-";
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-AU", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "matched":
        return "bg-blue-100 text-blue-800";
      case "on_hold":
        return "bg-amber-100 text-amber-800";
      case "archived":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityLabel = (priority: Priority | null | undefined) => {
    if (!priority) return "Not Set";
    const labels: Record<Priority, string> = {
      must_have: "Must Have",
      important: "Important",
      nice_to_have: "Nice to Have",
      dont_care: "Don't Care",
    };
    return labels[priority] || "Not Set";
  };

  const getPriorityColor = (priority: Priority | null | undefined) => {
    if (!priority) return "bg-gray-100 text-gray-800";
    switch (priority) {
      case "must_have":
        return "bg-red-100 text-red-800";
      case "important":
        return "bg-orange-100 text-orange-800";
      case "nice_to_have":
        return "bg-blue-100 text-blue-800";
      case "dont_care":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getExpiryInfo = (expiryDate: string | null) => {
    if (!expiryDate) return null;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { label: "Expired", color: "bg-red-100 text-red-800" };
    } else if (diffDays === 0) {
      return { label: "Expires today", color: "bg-red-100 text-red-800" };
    } else if (diffDays <= 7) {
      return { label: `Expires in ${diffDays} days`, color: "bg-orange-100 text-orange-800" };
    } else if (diffDays <= 30) {
      return { label: `Expires in ${diffDays} days`, color: "bg-amber-100 text-amber-800" };
    } else {
      return { label: `Expires ${formatDate(expiryDate)}`, color: "bg-gray-100 text-gray-800" };
    }
  };

  // Helper to check if an array has values
  const hasValues = (arr: string[] | null | undefined) => arr && arr.length > 0;

  // Helper to check if any view is required
  const hasViewRequirements = () =>
    brief?.water_views_required || brief?.city_views_required ||
    brief?.mountain_views_required || brief?.park_views_required;

  // Helper to check if any parking/storage requirements exist
  const hasParkingRequirements = () =>
    brief?.min_parking_spaces || brief?.garage_required ||
    brief?.storage_required || brief?.min_storage_size_sqm;

  // Helper to check if any climate requirements exist
  const hasClimateRequirements = () =>
    brief?.air_conditioning_required || brief?.heating_required ||
    hasValues(brief?.preferred_ac_types) || hasValues(brief?.preferred_heating_types);

  // Helper to check if outdoor requirements exist
  const hasOutdoorRequirements = () =>
    brief?.outdoor_entertaining_required || brief?.balcony_terrace_required ||
    brief?.min_outdoor_area_sqm || brief?.pool_required || brief?.garden_required;

  // Helper to check if security requirements exist
  const hasSecurityRequirements = () =>
    brief?.security_system_required || hasValues(brief?.required_security_features);

  // Helper to check if sustainability requirements exist
  const hasSustainabilityRequirements = () =>
    brief?.solar_panels_required || brief?.min_energy_rating ||
    hasValues(brief?.required_sustainable_features);

  // Helper to check if kitchen requirements exist
  const hasKitchenRequirements = () =>
    hasValues(brief?.kitchen_styles) || hasValues(brief?.required_kitchen_features);

  // Helper to check if bathroom requirements exist
  const hasBathroomRequirements = () =>
    brief?.min_ensuite_bathrooms || hasValues(brief?.required_bathroom_features);

  // Helper to check if condition requirements exist
  const hasConditionRequirements = () =>
    hasValues(brief?.acceptable_conditions) || brief?.max_year_built || brief?.renovation_acceptable;

  // Helper to check if smart home requirements exist
  const hasSmartHomeRequirements = () =>
    brief?.smart_home_required || hasValues(brief?.required_smart_features);

  // Helper to check if investment requirements exist
  const hasInvestmentRequirements = () =>
    brief?.min_rental_yield || brief?.max_council_rates_annual || brief?.max_strata_fees_quarterly;

  // Helper to check if any notes exist
  const hasNotes = () =>
    brief?.additional_notes || brief?.deal_breakers || brief?.flexibility_notes;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">Loading client brief...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!brief) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-muted-foreground mb-4">Brief not found</p>
          <Button onClick={handleBack}>Go Back</Button>
        </div>
      </DashboardLayout>
    );
  }

  const expiryInfo = getExpiryInfo(brief.expiry_date);

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={handleBack} className="mb-4">
            <ArrowLeft size={16} className="mr-2" />
            Back
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">{brief.brief_name}</h1>
              <p className="text-lg text-muted-foreground">Client: {brief.client_name}</p>
            </div>
            <div className="flex gap-3 items-start flex-wrap justify-end">
              <Badge className={getStatusColor(brief.status)}>{brief.status.replace("_", " ")}</Badge>
              {expiryInfo && (
                <Badge className={expiryInfo.color}>
                  <Calendar size={12} className="mr-1" />
                  {expiryInfo.label}
                </Badge>
              )}
              {!isOwner && (
                <Badge variant="secondary" className="bg-blue-50 text-blue-700 border border-blue-200">
                  <Eye size={12} className="mr-1" />
                  View Only
                </Badge>
              )}
              {isOwner && (
                <Button onClick={() => navigate(`/briefs/${brief.id}/edit`)}>
                  <Edit size={16} className="mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </div>

          {brief.description && (
            <p className="text-muted-foreground mt-4">{brief.description}</p>
          )}

          <div className="text-sm text-muted-foreground mt-4">
            Created {formatDate(brief.created_at)} • Updated {formatDate(brief.updated_at)}
          </div>
        </div>

        {/* Basic Requirements */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Basic Requirements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Budget */}
              {(brief.budget_min || brief.budget_max) && (
                <div className="flex items-start gap-3">
                  <DollarSign size={20} className="text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Budget</p>
                    <p className="text-lg font-semibold">
                      {formatCurrency(brief.budget_min)} - {formatCurrency(brief.budget_max)}
                    </p>
                  </div>
                </div>
              )}

              {/* Bedrooms */}
              {(brief.bedrooms_min || brief.bedrooms_max) && (
                <div className="flex items-start gap-3">
                  <Bed size={20} className="text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Bedrooms</p>
                    <p className="text-lg font-semibold">
                      {brief.bedrooms_min || "Any"} - {brief.bedrooms_max || "Any"}
                    </p>
                  </div>
                </div>
              )}

              {/* Bathrooms */}
              {(brief.bathrooms_min || brief.bathrooms_max) && (
                <div className="flex items-start gap-3">
                  <Bath size={20} className="text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Bathrooms</p>
                    <p className="text-lg font-semibold">
                      {brief.bathrooms_min || "Any"} - {brief.bathrooms_max || "Any"}
                    </p>
                  </div>
                </div>
              )}

              {/* Property Size */}
              {(brief.land_size_min_sqm || brief.building_size_min_sqm) && (
                <div className="flex items-start gap-3">
                  <Home size={20} className="text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Property Size</p>
                    {brief.land_size_min_sqm && (
                      <p className="text-base">
                        Land: {brief.land_size_min_sqm}+ sqm{" "}
                        <Badge variant="secondary" className={`ml-2 ${getPriorityColor(brief.land_size_min_priority)}`}>
                          {getPriorityLabel(brief.land_size_min_priority)}
                        </Badge>
                      </p>
                    )}
                    {brief.building_size_min_sqm && (
                      <p className="text-base">
                        Building: {brief.building_size_min_sqm}+ sqm{" "}
                        <Badge variant="secondary" className={`ml-2 ${getPriorityColor(brief.building_size_min_priority)}`}>
                          {getPriorityLabel(brief.building_size_min_priority)}
                        </Badge>
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Preferred Suburbs */}
        {brief.preferred_suburbs && brief.preferred_suburbs.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin size={20} />
                Preferred Suburbs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {brief.preferred_suburbs.map((suburb) => (
                  <Badge key={suburb} variant="secondary" className="text-sm py-1 px-3">
                    {suburb}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Parking & Storage */}
        {hasParkingRequirements() && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car size={20} />
                Parking & Storage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {brief.min_parking_spaces && (
                <div className="flex items-center justify-between">
                  <p className="text-base">Minimum Parking Spaces: {brief.min_parking_spaces}</p>
                  <Badge className={getPriorityColor(brief.parking_priority)}>
                    {getPriorityLabel(brief.parking_priority)}
                  </Badge>
                </div>
              )}
              {brief.garage_required && (
                <div className="flex items-center justify-between">
                  <p className="text-base">Garage Required</p>
                  <Badge className={getPriorityColor(brief.garage_priority)}>
                    {getPriorityLabel(brief.garage_priority)}
                  </Badge>
                </div>
              )}
              {brief.storage_required && (
                <div className="flex items-center justify-between">
                  <p className="text-base">
                    Storage Required
                    {brief.min_storage_size_sqm && ` (min ${brief.min_storage_size_sqm} sqm)`}
                  </p>
                  <Badge className={getPriorityColor(brief.storage_priority)}>
                    {getPriorityLabel(brief.storage_priority)}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Outdoor Features */}
        {hasOutdoorRequirements() && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sun size={20} />
                Outdoor Features
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {brief.pool_required && (
                <div className="flex items-center justify-between">
                  <p className="text-base">
                    Pool Required
                    {brief.pool_min_length_m && ` (min ${brief.pool_min_length_m}m length)`}
                  </p>
                  <Badge className={getPriorityColor(brief.pool_priority)}>
                    {getPriorityLabel(brief.pool_priority)}
                  </Badge>
                </div>
              )}
              {brief.garden_required && (
                <div className="flex items-center justify-between">
                  <p className="text-base">
                    Garden Required
                    {brief.garden_min_size_sqm && ` (min ${brief.garden_min_size_sqm} sqm)`}
                  </p>
                  <Badge className={getPriorityColor(brief.garden_priority)}>
                    {getPriorityLabel(brief.garden_priority)}
                  </Badge>
                </div>
              )}
              {brief.outdoor_entertaining_required && (
                <div className="flex items-center justify-between">
                  <p className="text-base">
                    Outdoor Entertaining Area
                    {brief.min_outdoor_area_sqm && ` (min ${brief.min_outdoor_area_sqm} sqm)`}
                  </p>
                  <Badge className={getPriorityColor(brief.outdoor_entertaining_priority)}>
                    {getPriorityLabel(brief.outdoor_entertaining_priority)}
                  </Badge>
                </div>
              )}
              {brief.balcony_terrace_required && (
                <div className="flex items-center justify-between">
                  <p className="text-base">Balcony/Terrace Required</p>
                  <Badge className={getPriorityColor(brief.balcony_priority)}>
                    {getPriorityLabel(brief.balcony_priority)}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Views */}
        {hasViewRequirements() && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye size={20} />
                Views
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {brief.water_views_required && (
                <div className="flex items-center justify-between">
                  <p className="text-base">Water Views</p>
                  <Badge className={getPriorityColor(brief.water_views_priority)}>
                    {getPriorityLabel(brief.water_views_priority)}
                  </Badge>
                </div>
              )}
              {brief.city_views_required && (
                <div className="flex items-center justify-between">
                  <p className="text-base">City Views</p>
                  <Badge className={getPriorityColor(brief.city_views_priority)}>
                    {getPriorityLabel(brief.city_views_priority)}
                  </Badge>
                </div>
              )}
              {brief.mountain_views_required && (
                <div className="flex items-center justify-between">
                  <p className="text-base">Mountain Views</p>
                  <Badge className={getPriorityColor(brief.mountain_views_priority)}>
                    {getPriorityLabel(brief.mountain_views_priority)}
                  </Badge>
                </div>
              )}
              {brief.park_views_required && (
                <div className="flex items-center justify-between">
                  <p className="text-base">Park/Garden Views</p>
                  <Badge className={getPriorityColor(brief.park_views_priority)}>
                    {getPriorityLabel(brief.park_views_priority)}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Architecture & Design */}
        {(hasValues(brief.architectural_styles) || brief.min_ceiling_height_m ||
          hasValues(brief.preferred_light_directions) || brief.natural_light_importance !== "dont_care") && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building size={20} />
                Architecture & Design
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {hasValues(brief.architectural_styles) && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-muted-foreground">Architectural Styles</p>
                    <Badge className={getPriorityColor(brief.architectural_style_priority)}>
                      {getPriorityLabel(brief.architectural_style_priority)}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {brief.architectural_styles.map((style) => (
                      <Badge key={style} variant="secondary" className="text-sm py-1 px-3">
                        {style}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {brief.min_ceiling_height_m && (
                <div className="flex items-center justify-between">
                  <p className="text-base">Minimum Ceiling Height: {brief.min_ceiling_height_m}m</p>
                  <Badge className={getPriorityColor(brief.ceiling_height_priority)}>
                    {getPriorityLabel(brief.ceiling_height_priority)}
                  </Badge>
                </div>
              )}
              {hasValues(brief.preferred_light_directions) && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-muted-foreground">Preferred Light Directions</p>
                    <Badge className={getPriorityColor(brief.light_direction_priority)}>
                      {getPriorityLabel(brief.light_direction_priority)}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {brief.preferred_light_directions.map((dir) => (
                      <Badge key={dir} variant="secondary" className="text-sm py-1 px-3">
                        {dir}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {brief.natural_light_importance && brief.natural_light_importance !== "dont_care" && (
                <div className="flex items-center justify-between">
                  <p className="text-base">Natural Light Importance</p>
                  <Badge className={getPriorityColor(brief.natural_light_importance)}>
                    {getPriorityLabel(brief.natural_light_importance)}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Climate Control */}
        {hasClimateRequirements() && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Thermometer size={20} />
                Climate Control
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {brief.air_conditioning_required && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-base">Air Conditioning Required</p>
                    <Badge className={getPriorityColor(brief.air_conditioning_priority)}>
                      {getPriorityLabel(brief.air_conditioning_priority)}
                    </Badge>
                  </div>
                  {hasValues(brief.preferred_ac_types) && (
                    <div className="flex flex-wrap gap-2 ml-4">
                      {brief.preferred_ac_types.map((type) => (
                        <Badge key={type} variant="secondary" className="text-sm py-1 px-3">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {brief.heating_required && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-base">Heating Required</p>
                    <Badge className={getPriorityColor(brief.heating_priority)}>
                      {getPriorityLabel(brief.heating_priority)}
                    </Badge>
                  </div>
                  {hasValues(brief.preferred_heating_types) && (
                    <div className="flex flex-wrap gap-2 ml-4">
                      {brief.preferred_heating_types.map((type) => (
                        <Badge key={type} variant="secondary" className="text-sm py-1 px-3">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Security */}
        {hasSecurityRequirements() && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield size={20} />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {brief.security_system_required && (
                <div className="flex items-center justify-between">
                  <p className="text-base">Security System Required</p>
                  <Badge className={getPriorityColor(brief.security_priority)}>
                    {getPriorityLabel(brief.security_priority)}
                  </Badge>
                </div>
              )}
              {hasValues(brief.required_security_features) && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Required Features</p>
                  <div className="flex flex-wrap gap-2">
                    {brief.required_security_features.map((feature) => (
                      <Badge key={feature} variant="secondary" className="text-sm py-1 px-3">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Sustainability */}
        {hasSustainabilityRequirements() && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Leaf size={20} />
                Sustainability
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {brief.solar_panels_required && (
                <div className="flex items-center justify-between">
                  <p className="text-base">Solar Panels Required</p>
                  <Badge className={getPriorityColor(brief.solar_priority)}>
                    {getPriorityLabel(brief.solar_priority)}
                  </Badge>
                </div>
              )}
              {brief.min_energy_rating && (
                <div className="flex items-center justify-between">
                  <p className="text-base">Minimum Energy Rating: {brief.min_energy_rating} stars</p>
                  <Badge className={getPriorityColor(brief.energy_rating_priority)}>
                    {getPriorityLabel(brief.energy_rating_priority)}
                  </Badge>
                </div>
              )}
              {hasValues(brief.required_sustainable_features) && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-muted-foreground">Sustainable Features</p>
                    <Badge className={getPriorityColor(brief.sustainability_priority)}>
                      {getPriorityLabel(brief.sustainability_priority)}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {brief.required_sustainable_features.map((feature) => (
                      <Badge key={feature} variant="secondary" className="text-sm py-1 px-3">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Kitchen */}
        {hasKitchenRequirements() && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UtensilsCrossed size={20} />
                Kitchen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {hasValues(brief.kitchen_styles) && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-muted-foreground">Kitchen Styles</p>
                    <Badge className={getPriorityColor(brief.kitchen_style_priority)}>
                      {getPriorityLabel(brief.kitchen_style_priority)}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {brief.kitchen_styles.map((style) => (
                      <Badge key={style} variant="secondary" className="text-sm py-1 px-3">
                        {style}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {hasValues(brief.required_kitchen_features) && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-muted-foreground">Required Features</p>
                    <Badge className={getPriorityColor(brief.kitchen_features_priority)}>
                      {getPriorityLabel(brief.kitchen_features_priority)}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {brief.required_kitchen_features.map((feature) => (
                      <Badge key={feature} variant="secondary" className="text-sm py-1 px-3">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Bathrooms */}
        {hasBathroomRequirements() && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Droplets size={20} />
                Bathrooms
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {brief.min_ensuite_bathrooms && (
                <div className="flex items-center justify-between">
                  <p className="text-base">Minimum Ensuite Bathrooms: {brief.min_ensuite_bathrooms}</p>
                  <Badge className={getPriorityColor(brief.ensuite_priority)}>
                    {getPriorityLabel(brief.ensuite_priority)}
                  </Badge>
                </div>
              )}
              {hasValues(brief.required_bathroom_features) && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-muted-foreground">Required Features</p>
                    <Badge className={getPriorityColor(brief.bathroom_features_priority)}>
                      {getPriorityLabel(brief.bathroom_features_priority)}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {brief.required_bathroom_features.map((feature) => (
                      <Badge key={feature} variant="secondary" className="text-sm py-1 px-3">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Flooring */}
        {(hasValues(brief.preferred_flooring_types) || brief.flooring_specific_notes) && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Flooring Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {hasValues(brief.preferred_flooring_types) && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-muted-foreground">Preferred Types</p>
                    <Badge className={getPriorityColor(brief.flooring_priority)}>
                      {getPriorityLabel(brief.flooring_priority)}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {brief.preferred_flooring_types.map((type) => (
                      <Badge key={type} variant="secondary" className="text-sm py-1 px-3">
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {brief.flooring_specific_notes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Notes</p>
                  <p className="text-base">{brief.flooring_specific_notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Building Condition */}
        {hasConditionRequirements() && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Warehouse size={20} />
                Building Condition
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {hasValues(brief.acceptable_conditions) && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-muted-foreground">Acceptable Conditions</p>
                    <Badge className={getPriorityColor(brief.condition_priority)}>
                      {getPriorityLabel(brief.condition_priority)}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {brief.acceptable_conditions.map((condition) => (
                      <Badge key={condition} variant="secondary" className="text-sm py-1 px-3">
                        {condition}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {brief.max_year_built && (
                <div className="flex items-center justify-between">
                  <p className="text-base">Maximum Year Built: {brief.max_year_built}</p>
                  <Badge className={getPriorityColor(brief.year_built_priority)}>
                    {getPriorityLabel(brief.year_built_priority)}
                  </Badge>
                </div>
              )}
              {brief.renovation_acceptable && (
                <p className="text-base text-green-700">Renovation projects acceptable</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Smart Home */}
        {hasSmartHomeRequirements() && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb size={20} />
                Smart Home
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {brief.smart_home_required && (
                <div className="flex items-center justify-between">
                  <p className="text-base">Smart Home Features Required</p>
                  <Badge className={getPriorityColor(brief.smart_home_priority)}>
                    {getPriorityLabel(brief.smart_home_priority)}
                  </Badge>
                </div>
              )}
              {hasValues(brief.required_smart_features) && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Required Features</p>
                  <div className="flex flex-wrap gap-2">
                    {brief.required_smart_features.map((feature) => (
                      <Badge key={feature} variant="secondary" className="text-sm py-1 px-3">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Lifestyle Preferences */}
        {(brief.max_noise_level || brief.max_street_traffic || brief.min_privacy_level || brief.walkability_min_score) && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Lifestyle Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {brief.walkability_min_score && (
                <div className="flex items-center justify-between">
                  <p className="text-base">Minimum Walkability Score: {brief.walkability_min_score}</p>
                  <Badge className={getPriorityColor(brief.walkability_priority)}>
                    {getPriorityLabel(brief.walkability_priority)}
                  </Badge>
                </div>
              )}
              {brief.max_noise_level && (
                <div className="flex items-center justify-between">
                  <p className="text-base">Max Noise Level: {brief.max_noise_level}</p>
                  <Badge className={getPriorityColor(brief.noise_priority)}>
                    {getPriorityLabel(brief.noise_priority)}
                  </Badge>
                </div>
              )}
              {brief.max_street_traffic && (
                <div className="flex items-center justify-between">
                  <p className="text-base">Max Street Traffic: {brief.max_street_traffic}</p>
                  <Badge className={getPriorityColor(brief.traffic_priority)}>
                    {getPriorityLabel(brief.traffic_priority)}
                  </Badge>
                </div>
              )}
              {brief.min_privacy_level && (
                <div className="flex items-center justify-between">
                  <p className="text-base">Min Privacy Level: {brief.min_privacy_level}</p>
                  <Badge className={getPriorityColor(brief.privacy_priority)}>
                    {getPriorityLabel(brief.privacy_priority)}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Investment */}
        {hasInvestmentRequirements() && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign size={20} />
                Investment Considerations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {brief.min_rental_yield && (
                <div className="flex items-center justify-between">
                  <p className="text-base">Minimum Rental Yield: {brief.min_rental_yield}%</p>
                  <Badge className={getPriorityColor(brief.rental_yield_priority)}>
                    {getPriorityLabel(brief.rental_yield_priority)}
                  </Badge>
                </div>
              )}
              {brief.max_council_rates_annual && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Max Council Rates (Annual)</p>
                  <p className="text-base">{formatCurrency(brief.max_council_rates_annual)}</p>
                </div>
              )}
              {brief.max_strata_fees_quarterly && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Max Strata Fees (Quarterly)</p>
                  <p className="text-base">{formatCurrency(brief.max_strata_fees_quarterly)}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Additional Notes */}
        {hasNotes() && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText size={20} />
                Additional Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {brief.additional_notes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Additional Notes</p>
                  <p className="text-base whitespace-pre-wrap">{brief.additional_notes}</p>
                </div>
              )}
              {brief.deal_breakers && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                    <AlertTriangle size={14} className="text-red-500" />
                    Deal Breakers
                  </p>
                  <p className="text-base whitespace-pre-wrap text-red-700">{brief.deal_breakers}</p>
                </div>
              )}
              {brief.flexibility_notes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Flexibility Notes</p>
                  <p className="text-base whitespace-pre-wrap">{brief.flexibility_notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
