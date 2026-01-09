import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, DollarSign, MapPin, Bed, Bath, Home } from "lucide-react";
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

  // Property Size
  land_size_min_sqm: number | null;
  land_size_min_priority: Priority;
  building_size_min_sqm: number | null;
  building_size_min_priority: Priority;

  // Additional fields (add more as needed)
  pool_required: boolean;
  pool_priority: Priority;
  garden_required: boolean;
  garden_priority: Priority;
  architectural_styles: string[];
  preferred_flooring_types: string[];
  max_noise_level: string | null;
  max_street_traffic: string | null;
  min_privacy_level: string | null;
}

export default function ClientBriefDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [brief, setBrief] = useState<ClientBrief | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchBrief();
    }
  }, [id]);

  const fetchBrief = async () => {
    if (!user || !id) return;

    try {
      const { data, error } = await supabase
        .from("client_briefs")
        .select("*")
        .eq("id", id)
        .eq("agent_id", user.id)
        .single();

      if (error) throw error;
      setBrief(data);
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

  const getPriorityLabel = (priority: Priority) => {
    const labels: Record<Priority, string> = {
      must_have: "Must Have",
      important: "Important",
      nice_to_have: "Nice to Have",
      dont_care: "Don't Care",
    };
    return labels[priority];
  };

  const getPriorityColor = (priority: Priority) => {
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
          <Button onClick={() => navigate("/briefs")}>Back to Briefs</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate("/briefs")} className="mb-4">
            <ArrowLeft size={16} className="mr-2" />
            Back to Briefs
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">{brief.brief_name}</h1>
              <p className="text-lg text-muted-foreground">Client: {brief.client_name}</p>
            </div>
            <div className="flex gap-3 items-start">
              <Badge className={getStatusColor(brief.status)}>{brief.status.replace("_", " ")}</Badge>
              <Button onClick={() => navigate(`/briefs/${brief.id}/edit`)}>
                <Edit size={16} className="mr-2" />
                Edit
              </Button>
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
        {brief.preferred_suburbs.length > 0 && (
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

        {/* Lifestyle Preferences */}
        {(brief.max_noise_level || brief.max_street_traffic || brief.min_privacy_level) && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Lifestyle Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {brief.max_noise_level && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Max Noise Level</p>
                  <p className="text-base">{brief.max_noise_level}</p>
                </div>
              )}
              {brief.max_street_traffic && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Max Street Traffic</p>
                  <p className="text-base">{brief.max_street_traffic}</p>
                </div>
              )}
              {brief.min_privacy_level && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Min Privacy Level</p>
                  <p className="text-base">{brief.min_privacy_level}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Architectural Styles */}
        {brief.architectural_styles && brief.architectural_styles.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Architectural Styles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {brief.architectural_styles.map((style) => (
                  <Badge key={style} variant="secondary" className="text-sm py-1 px-3">
                    {style}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Flooring Types */}
        {brief.preferred_flooring_types && brief.preferred_flooring_types.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Preferred Flooring</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {brief.preferred_flooring_types.map((type) => (
                  <Badge key={type} variant="secondary" className="text-sm py-1 px-3">
                    {type}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Outdoor Features */}
        {(brief.pool_required || brief.garden_required) && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Outdoor Features</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {brief.pool_required && (
                <div className="flex items-center justify-between">
                  <p className="text-base">Pool Required</p>
                  <Badge className={getPriorityColor(brief.pool_priority)}>
                    {getPriorityLabel(brief.pool_priority)}
                  </Badge>
                </div>
              )}
              {brief.garden_required && (
                <div className="flex items-center justify-between">
                  <p className="text-base">Garden Required</p>
                  <Badge className={getPriorityColor(brief.garden_priority)}>
                    {getPriorityLabel(brief.garden_priority)}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
