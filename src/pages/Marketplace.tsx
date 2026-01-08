import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Bed, Bath, Eye, Car, Waves, Droplet, Sun } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LocationSearchFilter } from "@/components/filters/LocationSearchFilter";
import { Coordinates, calculateDistance } from "@/lib/geocoder";
import { PropertyDetailModal } from "@/components/marketplace/PropertyDetailModal";

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
  latitude: number | null;
  longitude: number | null;
  property_address: string | null;

  // Key attributes for display
  parking_spaces?: number | null;
  has_pool?: boolean | null;
  has_water_views?: boolean | null;
  land_size_sqm?: number | null;
  building_size_sqm?: number | null;
  architectural_style?: string | null;
  walkability_score?: number | null;
  solar_panels?: boolean | null;
  energy_efficiency_rating?: number | null;
  [key: string]: any; // Allow other properties for detail modal
}

const statusLabels: Record<string, { label: string; className: string }> = {
  off_market: { label: "Off-Market", className: "border-forest text-forest" },
  under_offer: { label: "Under Offer", className: "border-amber-600 text-amber-600" },
  sold: { label: "Sold", className: "border-muted-foreground text-muted-foreground" },
};

export default function Marketplace() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState<Coordinates | null>(null);
  const [radiusFilter, setRadiusFilter] = useState(25);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

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

  const handleLocationChange = useCallback((location: Coordinates | null, radius: number) => {
    setLocationFilter(location);
    setRadiusFilter(radius);
  }, []);

  const filteredProperties = properties.filter((property) => {
    const matchesSearch =
      searchQuery === "" ||
      property.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      property.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      property.state.toLowerCase().includes(searchQuery.toLowerCase());

    // Location filter
    let matchesLocation = true;
    if (locationFilter && property.latitude && property.longitude) {
      const distance = calculateDistance(
        locationFilter.lat,
        locationFilter.lng,
        property.latitude,
        property.longitude
      );
      matchesLocation = distance <= radiusFilter;
    }

    return matchesSearch && matchesLocation;
  }).map((property) => {
    // Add distance if location filter is active
    let distance: number | null = null;
    if (locationFilter && property.latitude && property.longitude) {
      distance = calculateDistance(
        locationFilter.lat,
        locationFilter.lng,
        property.latitude,
        property.longitude
      );
    }
    return { ...property, distance };
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
          <h1 className="font-sans text-2xl font-semibold text-foreground">Property Marketplace</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Discover exclusive off-market properties for your clients
          </p>
        </div>

        {/* Search & Location Filter */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              placeholder="Search by property name, city, or state..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="w-full md:w-72">
            <LocationSearchFilter onLocationChange={handleLocationChange} />
          </div>
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
                className="bg-card border-border hover:border-muted-foreground/20 transition-colors duration-150 overflow-hidden"
              >
                {/* Thumbnail */}
                <div className="relative h-48 bg-muted overflow-hidden">
                  {property.thumbnail_url ? (
                    <img
                      src={property.thumbnail_url}
                      alt={property.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <MapPin className="w-12 h-12 text-muted-foreground/30" />
                    </div>
                  )}
                  {/* Status Badge */}
                  <Badge
                    variant="outline"
                    className={`absolute top-3 right-3 bg-white/95 ${statusLabels[property.status].className}`}
                  >
                    {statusLabels[property.status].label}
                  </Badge>
                  {/* Distance Badge */}
                  {property.distance !== null && (
                    <Badge
                      variant="outline"
                      className="absolute top-3 left-3 bg-white/95 text-forest border-forest"
                    >
                      {property.distance} km
                    </Badge>
                  )}
                </div>

                <CardContent className="p-5 space-y-3">
                  {/* Title */}
                  <h3 className="font-sans text-base font-semibold text-foreground line-clamp-1">
                    {property.title}
                  </h3>

                  {/* Location */}
                  <div className="flex items-center gap-1 text-muted-foreground text-xs">
                    <MapPin size={14} />
                    <span>
                      {property.city}, {property.state}
                    </span>
                  </div>

                  {/* Features */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
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
                    {property.parking_spaces && (
                      <div className="flex items-center gap-1">
                        <Car size={14} />
                        <span>{property.parking_spaces} Cars</span>
                      </div>
                    )}
                  </div>

                  {/* Highlights */}
                  <div className="flex flex-wrap gap-1.5">
                    {property.has_pool && (
                      <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                        <Droplet size={12} className="mr-1" />
                        Pool
                      </Badge>
                    )}
                    {property.has_water_views && (
                      <Badge variant="secondary" className="text-xs bg-sky-50 text-sky-700 border-sky-200">
                        <Waves size={12} className="mr-1" />
                        Water Views
                      </Badge>
                    )}
                    {property.solar_panels && (
                      <Badge variant="secondary" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                        <Sun size={12} className="mr-1" />
                        Solar
                      </Badge>
                    )}
                  </div>

                  {/* Price */}
                  <p className="font-sans text-lg font-semibold text-forest">
                    {formatPrice(property.price)}
                  </p>

                  {/* View Details Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-forest hover:bg-forest/5"
                    onClick={() => {
                      setSelectedProperty(property);
                      setDetailModalOpen(true);
                    }}
                  >
                    <Eye size={14} className="mr-2" />
                    View Details
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Property Detail Modal */}
      <PropertyDetailModal
        property={selectedProperty}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
      />
    </DashboardLayout>
  );
}
