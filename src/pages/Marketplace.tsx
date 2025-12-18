import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Bed, Bath, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Property {
  id: string;
  title: string;
  description: string | null;
  city: string;
  state: string;
  price: number;
  bedrooms: number | null;
  bathrooms: number | null;
  thumbnail_url: string | null;
  status: "off_market" | "under_offer" | "sold";
}

const statusLabels: Record<string, { label: string; className: string }> = {
  off_market: { label: "Off-Market", className: "bg-primary text-primary-foreground" },
  under_offer: { label: "Under Offer", className: "bg-amber-500 text-white" },
  sold: { label: "Sold", className: "bg-muted text-muted-foreground" },
};

export default function Marketplace() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setProperties(data);
    }
    setLoading(false);
  };

  const filteredProperties = properties.filter((property) => {
    return (
      searchQuery === "" ||
      property.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      property.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      property.state.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-serif text-3xl font-semibold text-foreground">Property Marketplace</h1>
          <p className="text-muted-foreground mt-1">
            Discover exclusive off-market properties for your clients
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            placeholder="Search by property name, city, or state..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Properties Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="bg-card border-border animate-pulse overflow-hidden">
                <div className="h-48 bg-muted" />
                <CardContent className="p-5 space-y-3">
                  <div className="h-5 w-3/4 bg-muted rounded" />
                  <div className="h-4 w-1/2 bg-muted rounded" />
                  <div className="h-6 w-1/3 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredProperties.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">No properties found matching your search.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map((property) => (
              <Card
                key={property.id}
                className="bg-card border-border shadow-elegant hover:shadow-lg transition-all duration-300 overflow-hidden group"
              >
                {/* Thumbnail */}
                <div className="relative h-48 bg-muted overflow-hidden">
                  {property.thumbnail_url ? (
                    <img
                      src={property.thumbnail_url}
                      alt={property.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-rose-gold/20 to-primary/10">
                      <MapPin className="w-12 h-12 text-muted-foreground/50" />
                    </div>
                  )}
                  {/* Status Badge */}
                  <Badge
                    className={`absolute top-3 right-3 ${statusLabels[property.status].className}`}
                  >
                    {statusLabels[property.status].label}
                  </Badge>
                </div>

                <CardContent className="p-5 space-y-4">
                  {/* Title */}
                  <h3 className="font-serif text-lg font-semibold text-foreground line-clamp-1">
                    {property.title}
                  </h3>

                  {/* Location */}
                  <div className="flex items-center gap-1 text-muted-foreground text-sm">
                    <MapPin size={14} />
                    <span>
                      {property.city}, {property.state}
                    </span>
                  </div>

                  {/* Features */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {property.bedrooms && (
                      <div className="flex items-center gap-1">
                        <Bed size={14} />
                        <span>{property.bedrooms} Beds</span>
                      </div>
                    )}
                    {property.bathrooms && (
                      <div className="flex items-center gap-1">
                        <Bath size={14} />
                        <span>{property.bathrooms} Baths</span>
                      </div>
                    )}
                  </div>

                  {/* Price */}
                  <p className="font-serif text-xl font-semibold text-primary">
                    {formatPrice(property.price)}
                  </p>

                  {/* View Details Button */}
                  <Button className="w-full bg-rose-gold hover:bg-rose-gold/90 text-forest font-medium">
                    <Eye size={16} className="mr-2" />
                    View Details
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
