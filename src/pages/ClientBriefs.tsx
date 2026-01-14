import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, DollarSign, MapPin, Bed, Bath, Trash2, Calendar } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { toast } from "sonner";

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
  matched_properties_count: number;
  expiry_date: string | null;
  agent_id: string;
}

export default function ClientBriefs() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [briefs, setBriefs] = useState<ClientBrief[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBriefs();
  }, [user, profile]);

  const fetchBriefs = async () => {
    if (!user) return;

    try {
      // Admins see all briefs, verified professionals see only their own
      let query = supabase
        .from("client_briefs")
        .select("*");

      // If not admin, filter by agent_id
      if (profile?.role !== 'admin') {
        query = query.eq("agent_id", user.id);
      }

      const { data, error } = await query.order("updated_at", { ascending: false });

      if (error) throw error;

      setBriefs(data || []);
    } catch (error) {
      console.error("Error fetching briefs:", error);
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
      month: "short",
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
    } else if (diffDays === 1) {
      return { label: "Expires tomorrow", color: "bg-orange-100 text-orange-800" };
    } else if (diffDays <= 7) {
      return { label: `Expires in ${diffDays} days`, color: "bg-orange-100 text-orange-800" };
    } else if (diffDays <= 30) {
      return { label: `Expires in ${diffDays} days`, color: "bg-amber-100 text-amber-800" };
    } else {
      return { label: `Expires ${formatDate(expiryDate)}`, color: "bg-gray-100 text-gray-800" };
    }
  };

  const handleDelete = async (briefId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click

    if (!confirm("Are you sure you want to delete this client brief?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("client_briefs")
        .delete()
        .eq("id", briefId);

      if (error) throw error;

      toast.success("Client brief deleted successfully");
      fetchBriefs(); // Refresh the list
    } catch (error) {
      console.error("Error deleting brief:", error);
      toast.error("Failed to delete client brief");
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">Loading client briefs...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Client Briefs</h1>
            <p className="text-sm text-muted-foreground">
              Manage detailed property requirements for your clients
            </p>
          </div>
          <Button onClick={() => navigate("/briefs/new")}>
            <Plus size={16} className="mr-2" />
            Create Brief
          </Button>
        </div>

        {briefs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <FileText size={48} className="text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No client briefs yet</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md">
                Create your first client brief to start defining detailed property requirements with priority levels for
                each attribute.
              </p>
              <Button onClick={() => navigate("/briefs/new")}>
                <Plus size={16} className="mr-2" />
                Create Your First Brief
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {briefs.map((brief) => (
              <Card
                key={brief.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/briefs/${brief.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{brief.brief_name}</CardTitle>
                      <CardDescription className="mt-1">Client: {brief.client_name}</CardDescription>
                    </div>
                    <div className="flex gap-2 items-start">
                      <Badge className={getStatusColor(brief.status)}>{brief.status.replace("_", " ")}</Badge>
                      {brief.expiry_date && (() => {
                        const expiryInfo = getExpiryInfo(brief.expiry_date);
                        return expiryInfo ? (
                          <Badge className={expiryInfo.color}>
                            <Calendar size={12} className="mr-1" />
                            {expiryInfo.label}
                          </Badge>
                        ) : null;
                      })()}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => handleDelete(brief.id, e)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                  {brief.description && (
                    <p className="text-sm text-muted-foreground mt-2">{brief.description}</p>
                  )}
                </CardHeader>

                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    {/* Budget */}
                    {(brief.budget_min || brief.budget_max) && (
                      <div className="flex items-start gap-2">
                        <DollarSign size={16} className="text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">Budget</p>
                          <p className="text-sm font-medium">
                            {formatCurrency(brief.budget_min)} - {formatCurrency(brief.budget_max)}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Bedrooms */}
                    {(brief.bedrooms_min || brief.bedrooms_max) && (
                      <div className="flex items-start gap-2">
                        <Bed size={16} className="text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">Bedrooms</p>
                          <p className="text-sm font-medium">
                            {brief.bedrooms_min || "Any"} - {brief.bedrooms_max || "Any"}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Bathrooms */}
                    {(brief.bathrooms_min || brief.bathrooms_max) && (
                      <div className="flex items-start gap-2">
                        <Bath size={16} className="text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">Bathrooms</p>
                          <p className="text-sm font-medium">
                            {brief.bathrooms_min || "Any"} - {brief.bathrooms_max || "Any"}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Suburbs */}
                    {brief.preferred_suburbs.length > 0 && (
                      <div className="flex items-start gap-2">
                        <MapPin size={16} className="text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">Suburbs</p>
                          <p className="text-sm font-medium">{brief.preferred_suburbs.length} selected</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Suburbs List */}
                  {brief.preferred_suburbs.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {brief.preferred_suburbs.slice(0, 5).map((suburb) => (
                        <Badge key={suburb} variant="secondary" className="text-xs">
                          {suburb}
                        </Badge>
                      ))}
                      {brief.preferred_suburbs.length > 5 && (
                        <Badge variant="secondary" className="text-xs">
                          +{brief.preferred_suburbs.length - 5} more
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t">
                    <span>Updated {formatDate(brief.updated_at)}</span>
                    <span>{brief.matched_properties_count} properties matched</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
