import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MapPin, Bed, Bath, Maximize, Home, Droplet, Trees, Sun, Eye, Car,
  Shield, Zap, Thermometer, Waves, Building2, Ruler, Calendar, Award,
  Heart, TrendingUp, DollarSign, AlertCircle, Images, FileText, Map
} from "lucide-react";
import { PropertyGallery } from "./PropertyGallery";
import { PropertyMap } from "./PropertyMap";

interface Property {
  id: string;
  title: string;
  description: string | null;
  city: string;
  state: string;
  price: number;
  bedrooms: number | null;
  bathrooms: number | null;
  status: string;

  // All the detailed attributes
  land_size_sqm?: number | null;
  building_size_sqm?: number | null;
  year_built?: number | null;
  property_condition?: string | null;

  // Pool
  has_pool?: boolean | null;
  pool_type?: string | null;
  pool_length_m?: number | null;
  pool_width_m?: number | null;

  // Garden
  garden_type?: string | null;
  garden_size_sqm?: number | null;
  outdoor_entertaining_area?: boolean | null;
  outdoor_area_size_sqm?: number | null;

  // Architecture
  architectural_style?: string | null;
  ceiling_height_m?: number | null;
  primary_light_direction?: string | null;
  natural_light_quality?: string | null;

  // Views
  has_water_views?: boolean | null;
  has_city_views?: boolean | null;
  has_mountain_views?: boolean | null;
  view_quality?: string | null;

  // Parking
  parking_spaces?: number | null;
  parking_type?: string | null;
  has_garage?: boolean | null;
  storage_area?: boolean | null;

  // Climate
  air_conditioning?: string | null;
  heating_type?: string | null;
  solar_panels?: boolean | null;
  solar_capacity_kw?: number | null;

  // Security
  security_system?: boolean | null;
  security_features?: string[] | null;
  smart_home_features?: string[] | null;

  // Sustainability
  energy_efficiency_rating?: number | null;
  water_efficiency_rating?: number | null;
  sustainable_features?: string[] | null;

  // Kitchen & Bath
  kitchen_style?: string | null;
  kitchen_features?: string[] | null;
  ensuite_bathrooms?: number | null;
  bathroom_features?: string[] | null;

  // Flooring
  flooring_types?: string[] | null;

  // Location
  proximity_beach_km?: number | null;
  proximity_cbd_km?: number | null;
  proximity_schools_km?: number | null;
  walkability_score?: number | null;

  // Investment
  rental_yield_estimate?: number | null;
  council_rates_annual?: number | null;
  strata_fees_quarterly?: number | null;

  // Lifestyle
  noise_level?: string | null;
  street_traffic?: string | null;
  privacy_level?: string | null;

  // Gallery and floor plan
  photo_urls?: string[] | null;
  floor_plan_url?: string | null;
  property_address?: string | null;
}

interface PropertyDetailModalProps {
  property: Property | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PropertyDetailModal({ property, open, onOpenChange }: PropertyDetailModalProps) {
  if (!property) return null;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatLabel = (text: string) => {
    return text.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif font-semibold">
            {property.title}
          </DialogTitle>
          <div className="flex items-center gap-2 mt-2">
            <MapPin size={14} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {property.city}, {property.state}
            </span>
          </div>
        </DialogHeader>

        {/* Price Bar - Always Visible */}
        <div className="p-4 bg-forest/5 rounded-lg border border-forest/20">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-serif font-bold text-forest">
              {formatPrice(property.price)}
            </div>
            <div className="flex items-center gap-4 text-sm">
              {property.bedrooms && (
                <div className="flex items-center gap-1">
                  <Bed size={16} className="text-muted-foreground" />
                  <span>{property.bedrooms} Beds</span>
                </div>
              )}
              {property.bathrooms && (
                <div className="flex items-center gap-1">
                  <Bath size={16} className="text-muted-foreground" />
                  <span>{property.bathrooms} Baths</span>
                </div>
              )}
              {property.parking_spaces && (
                <div className="flex items-center gap-1">
                  <Car size={16} className="text-muted-foreground" />
                  <span>{property.parking_spaces} Cars</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="photos" className="w-full">
          <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0">
            <TabsTrigger value="photos" className="gap-2">
              <Images size={16} />
              Photos
              {property.photo_urls && property.photo_urls.length > 0 && (
                <span className="text-xs">({property.photo_urls.length})</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="details" className="gap-2">
              <FileText size={16} />
              Details
            </TabsTrigger>
            {property.floor_plan_url && (
              <TabsTrigger value="floorplan" className="gap-2">
                <Ruler size={16} />
                Floor Plan
              </TabsTrigger>
            )}
            {property.latitude && property.longitude && (
              <TabsTrigger value="location" className="gap-2">
                <Map size={16} />
                Location
              </TabsTrigger>
            )}
          </TabsList>

          {/* Photos Tab */}
          <TabsContent value="photos" className="mt-6">
            <PropertyGallery
              photos={property.photo_urls || []}
              propertyTitle={property.title}
            />
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details" className="mt-6">
            <div className="space-y-6">
          {/* Description */}
          {property.description && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Description</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {property.description}
              </p>
            </div>
          )}

          {/* Property Characteristics Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Size & Structure */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Home size={16} className="text-forest" />
                Property Details
              </h3>
              <div className="space-y-2 text-sm">
                {property.building_size_sqm && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Building Size</span>
                    <span className="font-medium">{property.building_size_sqm}m²</span>
                  </div>
                )}
                {property.land_size_sqm && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Land Size</span>
                    <span className="font-medium">{property.land_size_sqm}m²</span>
                  </div>
                )}
                {property.year_built && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Year Built</span>
                    <span className="font-medium">{property.year_built}</span>
                  </div>
                )}
                {property.architectural_style && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Style</span>
                    <Badge variant="outline" className="text-xs">{formatLabel(property.architectural_style)}</Badge>
                  </div>
                )}
                {property.ceiling_height_m && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ceiling Height</span>
                    <span className="font-medium">{property.ceiling_height_m}m</span>
                  </div>
                )}
                {property.property_condition && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Condition</span>
                    <Badge variant="secondary" className="text-xs">{formatLabel(property.property_condition)}</Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Views & Light */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Eye size={16} className="text-forest" />
                Views & Natural Light
              </h3>
              <div className="space-y-2 text-sm">
                {property.view_quality && property.view_quality !== 'none' && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">View Quality</span>
                    <Badge variant="secondary" className="text-xs">{formatLabel(property.view_quality)}</Badge>
                  </div>
                )}
                {property.has_water_views && (
                  <div className="flex items-center gap-2">
                    <Waves size={14} className="text-blue-500" />
                    <span>Water Views</span>
                  </div>
                )}
                {property.has_city_views && (
                  <div className="flex items-center gap-2">
                    <Building2 size={14} className="text-gray-500" />
                    <span>City Views</span>
                  </div>
                )}
                {property.primary_light_direction && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Light Direction</span>
                    <span className="font-medium">{formatLabel(property.primary_light_direction)}</span>
                  </div>
                )}
                {property.natural_light_quality && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Natural Light</span>
                    <Badge variant="outline" className="text-xs">{formatLabel(property.natural_light_quality)}</Badge>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pool & Outdoor */}
          {(property.has_pool || property.garden_type || property.outdoor_entertaining_area) && (
            <div className="space-y-3 p-4 bg-blue-50/50 rounded-lg border border-blue-100">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Droplet size={16} className="text-blue-600" />
                Outdoor Living
              </h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                {property.has_pool && (
                  <div className="space-y-1">
                    <div className="font-medium">Pool</div>
                    <div className="text-muted-foreground">
                      {property.pool_type && formatLabel(property.pool_type)}
                      {property.pool_length_m && property.pool_width_m && (
                        <span> • {property.pool_length_m}m × {property.pool_width_m}m</span>
                      )}
                    </div>
                  </div>
                )}
                {property.garden_type && (
                  <div className="space-y-1">
                    <div className="font-medium">Garden</div>
                    <div className="text-muted-foreground">
                      {formatLabel(property.garden_type)}
                      {property.garden_size_sqm && <span> • {property.garden_size_sqm}m²</span>}
                    </div>
                  </div>
                )}
                {property.outdoor_entertaining_area && (
                  <div className="space-y-1">
                    <div className="font-medium">Outdoor Entertaining</div>
                    <div className="text-muted-foreground">
                      {property.outdoor_area_size_sqm && <span>{property.outdoor_area_size_sqm}m²</span>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Climate Control & Energy */}
          {(property.air_conditioning || property.heating_type || property.solar_panels) && (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Thermometer size={16} className="text-forest" />
                  Climate Control
                </h3>
                <div className="space-y-2 text-sm">
                  {property.air_conditioning && property.air_conditioning !== 'none' && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cooling</span>
                      <Badge variant="outline" className="text-xs">{formatLabel(property.air_conditioning)}</Badge>
                    </div>
                  )}
                  {property.heating_type && property.heating_type !== 'none' && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Heating</span>
                      <Badge variant="outline" className="text-xs">{formatLabel(property.heating_type)}</Badge>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Zap size={16} className="text-forest" />
                  Energy & Sustainability
                </h3>
                <div className="space-y-2 text-sm">
                  {property.solar_panels && (
                    <div className="flex items-center gap-2">
                      <Sun size={14} className="text-amber-500" />
                      <span>Solar Panels</span>
                      {property.solar_capacity_kw && (
                        <span className="text-muted-foreground">({property.solar_capacity_kw}kW)</span>
                      )}
                    </div>
                  )}
                  {property.energy_efficiency_rating && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Energy Rating</span>
                      <Badge className="bg-green-600 text-white text-xs">{property.energy_efficiency_rating}/10</Badge>
                    </div>
                  )}
                  {property.water_efficiency_rating && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Water Rating</span>
                      <Badge className="bg-blue-600 text-white text-xs">{property.water_efficiency_rating}/6</Badge>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Features Arrays */}
          {property.sustainable_features && property.sustainable_features.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Sustainable Features</h3>
              <div className="flex flex-wrap gap-2">
                {property.sustainable_features.map((feature) => (
                  <Badge key={feature} variant="outline" className="text-xs bg-green-50">
                    {formatLabel(feature)}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {property.security_features && property.security_features.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Shield size={16} className="text-forest" />
                Security Features
              </h3>
              <div className="flex flex-wrap gap-2">
                {property.security_features.map((feature) => (
                  <Badge key={feature} variant="outline" className="text-xs">
                    {formatLabel(feature)}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {property.kitchen_features && property.kitchen_features.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Kitchen Features</h3>
              <div className="flex flex-wrap gap-2">
                {property.kitchen_features.map((feature) => (
                  <Badge key={feature} variant="secondary" className="text-xs">
                    {formatLabel(feature)}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Location & Lifestyle */}
          {(property.walkability_score || property.proximity_cbd_km || property.proximity_beach_km) && (
            <div className="space-y-3 p-4 bg-purple-50/50 rounded-lg border border-purple-100">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <MapPin size={16} className="text-purple-600" />
                Location & Lifestyle
              </h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                {property.walkability_score && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Walkability Score</span>
                    <Badge className="bg-purple-600 text-white text-xs">{property.walkability_score}/100</Badge>
                  </div>
                )}
                {property.proximity_cbd_km && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Distance to CBD</span>
                    <span className="font-medium">{property.proximity_cbd_km}km</span>
                  </div>
                )}
                {property.proximity_beach_km && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Distance to Beach</span>
                    <span className="font-medium">{property.proximity_beach_km}km</span>
                  </div>
                )}
                {property.proximity_schools_km && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Distance to Schools</span>
                    <span className="font-medium">{property.proximity_schools_km}km</span>
                  </div>
                )}
                {property.noise_level && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Noise Level</span>
                    <span className="font-medium">{formatLabel(property.noise_level)}</span>
                  </div>
                )}
                {property.privacy_level && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Privacy</span>
                    <span className="font-medium">{formatLabel(property.privacy_level)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Investment Details */}
          {(property.rental_yield_estimate || property.council_rates_annual || property.strata_fees_quarterly) && (
            <div className="space-y-3 p-4 bg-amber-50/50 rounded-lg border border-amber-100">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp size={16} className="text-amber-600" />
                Investment Information
              </h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                {property.rental_yield_estimate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Est. Rental Yield</span>
                    <span className="font-medium text-green-600">{property.rental_yield_estimate}%</span>
                  </div>
                )}
                {property.council_rates_annual && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Council Rates (annual)</span>
                    <span className="font-medium">${property.council_rates_annual.toLocaleString()}</span>
                  </div>
                )}
                {property.strata_fees_quarterly && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Strata Fees (quarterly)</span>
                    <span className="font-medium">${property.strata_fees_quarterly.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          )}

            </div>
          </TabsContent>

          {/* Floor Plan Tab */}
          {property.floor_plan_url && (
            <TabsContent value="floorplan" className="mt-6">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Floor Plan</h3>
                <div className="bg-muted rounded-lg overflow-hidden">
                  <img
                    src={property.floor_plan_url}
                    alt={`Floor plan for ${property.title}`}
                    className="w-full h-auto"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Click on the image to view in full size
                </p>
              </div>
            </TabsContent>
          )}

          {/* Location Tab */}
          {property.latitude && property.longitude && (
            <TabsContent value="location" className="mt-6">
              <PropertyMap
                latitude={property.latitude}
                longitude={property.longitude}
                propertyTitle={property.title}
                address={property.property_address}
              />
            </TabsContent>
          )}
        </Tabs>

        {/* Action Buttons - Always Visible */}
        <div className="flex gap-3 pt-4 border-t border-border">
          <Button className="flex-1 bg-forest hover:bg-forest/90 text-white">
            <Heart size={16} className="mr-2" />
            Save to Client Brief
          </Button>
          <Button variant="outline" className="flex-1">
            <DollarSign size={16} className="mr-2" />
            Request Inspection
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
