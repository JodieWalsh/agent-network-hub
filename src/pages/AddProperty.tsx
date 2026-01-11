import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ImageUpload } from '@/components/property/ImageUpload';
import { PropertyAddressSearch, PropertyLocationData } from '@/components/property/PropertyAddressSearch';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { uploadPropertyImage, uploadFloorPlan, validateFloorPlanFile } from '@/lib/storage';
import { toast } from 'sonner';
import { Home, Building2, Trees, Eye, Car, Sun, Shield, Leaf, ChefHat, Ruler, MapPin, DollarSign, FileText, Upload, Loader2 } from 'lucide-react';

export default function AddProperty() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [floorPlanFile, setFloorPlanFile] = useState<File | null>(null);
  const [propertyLocation, setPropertyLocation] = useState<PropertyLocationData | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    // Basic details
    title: '',
    description: '',
    price: '',
    bedrooms: '',
    bathrooms: '',
    status: 'off_market',

    // Size & structure
    land_size_sqm: '',
    building_size_sqm: '',
    number_of_levels: '',
    year_built: '',
    property_condition: 'good',

    // Pool
    has_pool: false,
    pool_type: 'none',
    pool_length_m: '',
    pool_width_m: '',

    // Garden & outdoor
    garden_type: 'none',
    garden_size_sqm: '',
    outdoor_entertaining_area: false,
    outdoor_area_size_sqm: '',
    balcony_terrace: false,

    // Architecture & interior
    architectural_style: 'modern',
    ceiling_height_m: '',
    primary_light_direction: 'north',
    natural_light_quality: 'good',

    // Views
    has_water_views: false,
    has_city_views: false,
    has_mountain_views: false,
    has_park_views: false,
    view_quality: 'none',

    // Parking & storage
    parking_spaces: '0',
    parking_type: 'none',
    has_garage: false,
    storage_area: false,
    storage_size_sqm: '',

    // Climate control
    air_conditioning: 'none',
    heating_type: 'none',
    solar_panels: false,
    solar_capacity_kw: '',
    water_tank: false,
    water_tank_capacity_l: '',

    // Security
    security_system: false,
    security_features: [] as string[],
    smart_home_features: [] as string[],

    // Sustainability
    energy_efficiency_rating: '',
    water_efficiency_rating: '',
    sustainable_features: [] as string[],

    // Kitchen & bathrooms
    kitchen_style: 'modern',
    kitchen_features: [] as string[],
    ensuite_bathrooms: '0',
    powder_rooms: '0',
    bathroom_features: [] as string[],

    // Flooring
    flooring_types: [] as string[],
    interior_condition: 'good',

    // Location features
    proximity_beach_km: '',
    proximity_cbd_km: '',
    proximity_schools_km: '',
    proximity_shopping_km: '',
    proximity_transport_km: '',
    walkability_score: '',

    // Investment
    rental_yield_estimate: '',
    council_rates_annual: '',
    strata_fees_quarterly: '',
    water_rates_annual: '',

    // Additional
    noise_level: 'quiet',
    street_traffic: 'quiet_street',
    privacy_level: 'moderate',
  });

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleArrayToggle = (field: string, value: string) => {
    setFormData((prev) => {
      const array = prev[field as keyof typeof prev] as string[];
      const newArray = array.includes(value)
        ? array.filter((item) => item !== value)
        : [...array, value];
      return { ...prev, [field]: newArray };
    });
  };

  const handleFloorPlanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const validation = validateFloorPlanFile(file);
    if (!validation.valid) {
      toast.error(validation.error || 'Invalid floor plan file');
      return;
    }

    setFloorPlanFile(file);
    toast.success('Floor plan selected');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('You must be signed in to submit a property');
      return;
    }

    // Validate required fields
    if (!formData.title || !formData.price) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!propertyLocation) {
      toast.error('Please enter the property address');
      return;
    }

    if (imageFiles.length === 0) {
      toast.error('Please upload at least one property image');
      return;
    }

    setUploading(true);

    try {
      // 1. Insert property
      const { data: property, error: insertError } = await supabase
        .from('properties')
        .insert({
          title: formData.title,
          description: formData.description || null,
          // Location fields (auto-filled from address search)
          street_address: propertyLocation.streetAddress,
          city: propertyLocation.city,
          state: propertyLocation.state,
          country: propertyLocation.country,
          postcode: propertyLocation.postcode,
          latitude: propertyLocation.latitude,
          longitude: propertyLocation.longitude,
          // Basic details
          price: parseInt(formData.price),
          bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
          bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : null,
          status: formData.status,
          owner_id: user.id,
          approval_status: 'pending',

          // Size & structure
          land_size_sqm: formData.land_size_sqm ? parseFloat(formData.land_size_sqm) : null,
          building_size_sqm: formData.building_size_sqm ? parseFloat(formData.building_size_sqm) : null,
          number_of_levels: formData.number_of_levels ? parseInt(formData.number_of_levels) : null,
          year_built: formData.year_built ? parseInt(formData.year_built) : null,
          property_condition: formData.property_condition || null,

          // Pool
          has_pool: formData.has_pool,
          pool_type: formData.has_pool ? formData.pool_type : 'none',
          pool_length_m: formData.pool_length_m ? parseFloat(formData.pool_length_m) : null,
          pool_width_m: formData.pool_width_m ? parseFloat(formData.pool_width_m) : null,

          // Garden & outdoor
          garden_type: formData.garden_type || null,
          garden_size_sqm: formData.garden_size_sqm ? parseFloat(formData.garden_size_sqm) : null,
          outdoor_entertaining_area: formData.outdoor_entertaining_area,
          outdoor_area_size_sqm: formData.outdoor_area_size_sqm ? parseFloat(formData.outdoor_area_size_sqm) : null,
          balcony_terrace: formData.balcony_terrace,

          // Architecture & interior
          architectural_style: formData.architectural_style || null,
          ceiling_height_m: formData.ceiling_height_m ? parseFloat(formData.ceiling_height_m) : null,
          primary_light_direction: formData.primary_light_direction || null,
          natural_light_quality: formData.natural_light_quality || null,

          // Views
          has_water_views: formData.has_water_views,
          has_city_views: formData.has_city_views,
          has_mountain_views: formData.has_mountain_views,
          has_park_views: formData.has_park_views,
          view_quality: formData.view_quality || null,

          // Parking & storage
          parking_spaces: parseInt(formData.parking_spaces) || 0,
          parking_type: formData.parking_type || null,
          has_garage: formData.has_garage,
          storage_area: formData.storage_area,
          storage_size_sqm: formData.storage_size_sqm ? parseFloat(formData.storage_size_sqm) : null,

          // Climate control
          air_conditioning: formData.air_conditioning || null,
          heating_type: formData.heating_type || null,
          solar_panels: formData.solar_panels,
          solar_capacity_kw: formData.solar_capacity_kw ? parseFloat(formData.solar_capacity_kw) : null,
          water_tank: formData.water_tank,
          water_tank_capacity_l: formData.water_tank_capacity_l ? parseInt(formData.water_tank_capacity_l) : null,

          // Security
          security_system: formData.security_system,
          security_features: formData.security_features,
          smart_home_features: formData.smart_home_features,

          // Sustainability
          energy_efficiency_rating: formData.energy_efficiency_rating ? parseFloat(formData.energy_efficiency_rating) : null,
          water_efficiency_rating: formData.water_efficiency_rating ? parseFloat(formData.water_efficiency_rating) : null,
          sustainable_features: formData.sustainable_features,

          // Kitchen & bathrooms
          kitchen_style: formData.kitchen_style || null,
          kitchen_features: formData.kitchen_features,
          ensuite_bathrooms: parseInt(formData.ensuite_bathrooms) || 0,
          powder_rooms: parseInt(formData.powder_rooms) || 0,
          bathroom_features: formData.bathroom_features,

          // Flooring
          flooring_types: formData.flooring_types,
          interior_condition: formData.interior_condition || null,

          // Location features
          proximity_beach_km: formData.proximity_beach_km ? parseFloat(formData.proximity_beach_km) : null,
          proximity_cbd_km: formData.proximity_cbd_km ? parseFloat(formData.proximity_cbd_km) : null,
          proximity_schools_km: formData.proximity_schools_km ? parseFloat(formData.proximity_schools_km) : null,
          proximity_shopping_km: formData.proximity_shopping_km ? parseFloat(formData.proximity_shopping_km) : null,
          proximity_transport_km: formData.proximity_transport_km ? parseFloat(formData.proximity_transport_km) : null,
          walkability_score: formData.walkability_score ? parseInt(formData.walkability_score) : null,

          // Investment
          rental_yield_estimate: formData.rental_yield_estimate ? parseFloat(formData.rental_yield_estimate) : null,
          council_rates_annual: formData.council_rates_annual ? parseFloat(formData.council_rates_annual) : null,
          strata_fees_quarterly: formData.strata_fees_quarterly ? parseFloat(formData.strata_fees_quarterly) : null,
          water_rates_annual: formData.water_rates_annual ? parseFloat(formData.water_rates_annual) : null,

          // Additional
          noise_level: formData.noise_level || null,
          street_traffic: formData.street_traffic || null,
          privacy_level: formData.privacy_level || null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // 2. Upload images
      const photoUrls: string[] = [];
      for (let i = 0; i < imageFiles.length; i++) {
        toast.info(`Uploading image ${i + 1} of ${imageFiles.length}...`);
        const result = await uploadPropertyImage(imageFiles[i], user.id, property.id, i);
        photoUrls.push(result.url);
      }

      // 3. Upload floor plan
      let floorPlanUrl: string | null = null;
      if (floorPlanFile) {
        toast.info('Uploading floor plan...');
        const result = await uploadFloorPlan(floorPlanFile, user.id, property.id);
        floorPlanUrl = result.url;
      }

      // 4. Update property with file URLs
      const { error: updateError } = await supabase
        .from('properties')
        .update({
          photo_urls: photoUrls,
          thumbnail_url: photoUrls[0],
          floor_plan_url: floorPlanUrl,
        })
        .eq('id', property.id);

      if (updateError) throw updateError;

      toast.success('Property submitted for review!');
      navigate('/marketplace');
    } catch (error: any) {
      console.error('Property submission error:', error);
      toast.error(error.message || 'Failed to submit property');
    } finally {
      setUploading(false);
    }
  };

  return (
    <DashboardLayout>
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Submit Property Listing</h1>
          <p className="text-muted-foreground">
            Add a new property to the marketplace for admin review
          </p>
        </div>

        {/* Basic Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home size={20} />
              Basic Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Property Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="e.g., Stunning waterfront home with pool"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Describe the property's key features and appeal..."
                rows={4}
              />
            </div>

            {/* Smart Address Search - Auto-fills street, city, state, country, postcode, coordinates */}
            <PropertyAddressSearch
              value={propertyLocation}
              onChange={setPropertyLocation}
              disabled={uploading}
            />

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="price">Price (AUD) *</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => handleChange('price', e.target.value)}
                  placeholder="850000"
                  required
                />
              </div>
              <div>
                <Label htmlFor="bedrooms">Bedrooms</Label>
                <Input
                  id="bedrooms"
                  type="number"
                  value={formData.bedrooms}
                  onChange={(e) => handleChange('bedrooms', e.target.value)}
                  placeholder="3"
                />
              </div>
              <div>
                <Label htmlFor="bathrooms">Bathrooms</Label>
                <Input
                  id="bathrooms"
                  type="number"
                  value={formData.bathrooms}
                  onChange={(e) => handleChange('bathrooms', e.target.value)}
                  placeholder="2"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(val) => handleChange('status', val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="off_market">Off Market</SelectItem>
                  <SelectItem value="for_sale">For Sale</SelectItem>
                  <SelectItem value="under_contract">Under Contract</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Size & Structure */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 size={20} />
              Size & Structure
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="land_size_sqm">Land Size (sqm)</Label>
                <Input
                  id="land_size_sqm"
                  type="number"
                  value={formData.land_size_sqm}
                  onChange={(e) => handleChange('land_size_sqm', e.target.value)}
                  placeholder="450"
                />
              </div>
              <div>
                <Label htmlFor="building_size_sqm">Building Size (sqm)</Label>
                <Input
                  id="building_size_sqm"
                  type="number"
                  value={formData.building_size_sqm}
                  onChange={(e) => handleChange('building_size_sqm', e.target.value)}
                  placeholder="180"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="number_of_levels">Number of Levels</Label>
                <Input
                  id="number_of_levels"
                  type="number"
                  value={formData.number_of_levels}
                  onChange={(e) => handleChange('number_of_levels', e.target.value)}
                  placeholder="2"
                />
              </div>
              <div>
                <Label htmlFor="year_built">Year Built</Label>
                <Input
                  id="year_built"
                  type="number"
                  value={formData.year_built}
                  onChange={(e) => handleChange('year_built', e.target.value)}
                  placeholder="2015"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="property_condition">Property Condition</Label>
              <Select
                value={formData.property_condition}
                onValueChange={(val) => handleChange('property_condition', val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="needs_renovation">Needs Renovation</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Pool & Outdoor */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trees size={20} />
              Pool & Outdoor Features
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="has_pool"
                checked={formData.has_pool}
                onCheckedChange={(checked) => handleChange('has_pool', checked)}
              />
              <Label htmlFor="has_pool" className="cursor-pointer">
                Has Swimming Pool
              </Label>
            </div>

            {formData.has_pool && (
              <div className="space-y-4 pl-6 border-l-2 border-forest/20">
                <div>
                  <Label htmlFor="pool_type">Pool Type</Label>
                  <Select
                    value={formData.pool_type}
                    onValueChange={(val) => handleChange('pool_type', val)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inground">Inground</SelectItem>
                      <SelectItem value="above_ground">Above Ground</SelectItem>
                      <SelectItem value="lap_pool">Lap Pool</SelectItem>
                      <SelectItem value="infinity">Infinity</SelectItem>
                      <SelectItem value="plunge">Plunge Pool</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="pool_length_m">Pool Length (m)</Label>
                    <Input
                      id="pool_length_m"
                      type="number"
                      step="0.1"
                      value={formData.pool_length_m}
                      onChange={(e) => handleChange('pool_length_m', e.target.value)}
                      placeholder="10"
                    />
                  </div>
                  <div>
                    <Label htmlFor="pool_width_m">Pool Width (m)</Label>
                    <Input
                      id="pool_width_m"
                      type="number"
                      step="0.1"
                      value={formData.pool_width_m}
                      onChange={(e) => handleChange('pool_width_m', e.target.value)}
                      placeholder="4"
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="garden_type">Garden Type</Label>
              <Select value={formData.garden_type} onValueChange={(val) => handleChange('garden_type', val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="landscaped">Landscaped</SelectItem>
                  <SelectItem value="native">Native</SelectItem>
                  <SelectItem value="low_maintenance">Low Maintenance</SelectItem>
                  <SelectItem value="established">Established</SelectItem>
                  <SelectItem value="edible">Edible Garden</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="garden_size_sqm">Garden Size (sqm)</Label>
              <Input
                id="garden_size_sqm"
                type="number"
                value={formData.garden_size_sqm}
                onChange={(e) => handleChange('garden_size_sqm', e.target.value)}
                placeholder="100"
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="outdoor_entertaining_area"
                checked={formData.outdoor_entertaining_area}
                onCheckedChange={(checked) => handleChange('outdoor_entertaining_area', checked)}
              />
              <Label htmlFor="outdoor_entertaining_area" className="cursor-pointer">
                Outdoor Entertaining Area
              </Label>
            </div>

            {formData.outdoor_entertaining_area && (
              <div className="pl-6">
                <Label htmlFor="outdoor_area_size_sqm">Outdoor Area Size (sqm)</Label>
                <Input
                  id="outdoor_area_size_sqm"
                  type="number"
                  value={formData.outdoor_area_size_sqm}
                  onChange={(e) => handleChange('outdoor_area_size_sqm', e.target.value)}
                  placeholder="40"
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <Checkbox
                id="balcony_terrace"
                checked={formData.balcony_terrace}
                onCheckedChange={(checked) => handleChange('balcony_terrace', checked)}
              />
              <Label htmlFor="balcony_terrace" className="cursor-pointer">
                Balcony / Terrace
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Architecture & Interior */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ruler size={20} />
              Architecture & Interior
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="architectural_style">Architectural Style</Label>
              <Select
                value={formData.architectural_style}
                onValueChange={(val) => handleChange('architectural_style', val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="modern">Modern</SelectItem>
                  <SelectItem value="contemporary">Contemporary</SelectItem>
                  <SelectItem value="traditional">Traditional</SelectItem>
                  <SelectItem value="victorian">Victorian</SelectItem>
                  <SelectItem value="federation">Federation</SelectItem>
                  <SelectItem value="art_deco">Art Deco</SelectItem>
                  <SelectItem value="mediterranean">Mediterranean</SelectItem>
                  <SelectItem value="hamptons">Hamptons</SelectItem>
                  <SelectItem value="industrial">Industrial</SelectItem>
                  <SelectItem value="mid_century">Mid Century</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="ceiling_height_m">Ceiling Height (m)</Label>
              <Input
                id="ceiling_height_m"
                type="number"
                step="0.1"
                value={formData.ceiling_height_m}
                onChange={(e) => handleChange('ceiling_height_m', e.target.value)}
                placeholder="2.7"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="primary_light_direction">Primary Light Direction</Label>
                <Select
                  value={formData.primary_light_direction}
                  onValueChange={(val) => handleChange('primary_light_direction', val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="north">North</SelectItem>
                    <SelectItem value="south">South</SelectItem>
                    <SelectItem value="east">East</SelectItem>
                    <SelectItem value="west">West</SelectItem>
                    <SelectItem value="north_east">North East</SelectItem>
                    <SelectItem value="north_west">North West</SelectItem>
                    <SelectItem value="south_east">South East</SelectItem>
                    <SelectItem value="south_west">South West</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="natural_light_quality">Natural Light Quality</Label>
                <Select
                  value={formData.natural_light_quality}
                  onValueChange={(val) => handleChange('natural_light_quality', val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excellent">Excellent</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="limited">Limited</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="interior_condition">Interior Condition</Label>
              <Select
                value={formData.interior_condition}
                onValueChange={(val) => handleChange('interior_condition', val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pristine">Pristine</SelectItem>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="average">Average</SelectItem>
                  <SelectItem value="needs_work">Needs Work</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Views */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye size={20} />
              Views & Outlook
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="has_water_views"
                  checked={formData.has_water_views}
                  onCheckedChange={(checked) => handleChange('has_water_views', checked)}
                />
                <Label htmlFor="has_water_views" className="cursor-pointer">
                  Water Views
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="has_city_views"
                  checked={formData.has_city_views}
                  onCheckedChange={(checked) => handleChange('has_city_views', checked)}
                />
                <Label htmlFor="has_city_views" className="cursor-pointer">
                  City Views
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="has_mountain_views"
                  checked={formData.has_mountain_views}
                  onCheckedChange={(checked) => handleChange('has_mountain_views', checked)}
                />
                <Label htmlFor="has_mountain_views" className="cursor-pointer">
                  Mountain Views
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="has_park_views"
                  checked={formData.has_park_views}
                  onCheckedChange={(checked) => handleChange('has_park_views', checked)}
                />
                <Label htmlFor="has_park_views" className="cursor-pointer">
                  Park Views
                </Label>
              </div>
            </div>

            <div>
              <Label htmlFor="view_quality">Overall View Quality</Label>
              <Select
                value={formData.view_quality}
                onValueChange={(val) => handleChange('view_quality', val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="panoramic">Panoramic</SelectItem>
                  <SelectItem value="expansive">Expansive</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="glimpses">Glimpses</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Parking & Storage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car size={20} />
              Parking & Storage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="parking_spaces">Number of Parking Spaces</Label>
                <Input
                  id="parking_spaces"
                  type="number"
                  value={formData.parking_spaces}
                  onChange={(e) => handleChange('parking_spaces', e.target.value)}
                  placeholder="2"
                />
              </div>

              <div>
                <Label htmlFor="parking_type">Parking Type</Label>
                <Select
                  value={formData.parking_type}
                  onValueChange={(val) => handleChange('parking_type', val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="garage">Garage</SelectItem>
                    <SelectItem value="carport">Carport</SelectItem>
                    <SelectItem value="covered">Covered</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="street">Street</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="has_garage"
                checked={formData.has_garage}
                onCheckedChange={(checked) => handleChange('has_garage', checked)}
              />
              <Label htmlFor="has_garage" className="cursor-pointer">
                Has Garage
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="storage_area"
                checked={formData.storage_area}
                onCheckedChange={(checked) => handleChange('storage_area', checked)}
              />
              <Label htmlFor="storage_area" className="cursor-pointer">
                Additional Storage Area
              </Label>
            </div>

            {formData.storage_area && (
              <div className="pl-6">
                <Label htmlFor="storage_size_sqm">Storage Size (sqm)</Label>
                <Input
                  id="storage_size_sqm"
                  type="number"
                  value={formData.storage_size_sqm}
                  onChange={(e) => handleChange('storage_size_sqm', e.target.value)}
                  placeholder="10"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Climate Control */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sun size={20} />
              Climate Control & Utilities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="air_conditioning">Air Conditioning</Label>
                <Select
                  value={formData.air_conditioning}
                  onValueChange={(val) => handleChange('air_conditioning', val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ducted">Ducted</SelectItem>
                    <SelectItem value="split_system">Split System</SelectItem>
                    <SelectItem value="evaporative">Evaporative</SelectItem>
                    <SelectItem value="ceiling_fans">Ceiling Fans</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="heating_type">Heating Type</Label>
                <Select
                  value={formData.heating_type}
                  onValueChange={(val) => handleChange('heating_type', val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ducted">Ducted</SelectItem>
                    <SelectItem value="split_system">Split System</SelectItem>
                    <SelectItem value="gas">Gas</SelectItem>
                    <SelectItem value="fireplace">Fireplace</SelectItem>
                    <SelectItem value="hydronic">Hydronic</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="solar_panels"
                checked={formData.solar_panels}
                onCheckedChange={(checked) => handleChange('solar_panels', checked)}
              />
              <Label htmlFor="solar_panels" className="cursor-pointer">
                Solar Panels
              </Label>
            </div>

            {formData.solar_panels && (
              <div className="pl-6">
                <Label htmlFor="solar_capacity_kw">Solar Capacity (kW)</Label>
                <Input
                  id="solar_capacity_kw"
                  type="number"
                  step="0.1"
                  value={formData.solar_capacity_kw}
                  onChange={(e) => handleChange('solar_capacity_kw', e.target.value)}
                  placeholder="6.6"
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <Checkbox
                id="water_tank"
                checked={formData.water_tank}
                onCheckedChange={(checked) => handleChange('water_tank', checked)}
              />
              <Label htmlFor="water_tank" className="cursor-pointer">
                Water Tank
              </Label>
            </div>

            {formData.water_tank && (
              <div className="pl-6">
                <Label htmlFor="water_tank_capacity_l">Water Tank Capacity (L)</Label>
                <Input
                  id="water_tank_capacity_l"
                  type="number"
                  value={formData.water_tank_capacity_l}
                  onChange={(e) => handleChange('water_tank_capacity_l', e.target.value)}
                  placeholder="5000"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security & Smart Home */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield size={20} />
              Security & Smart Home
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="security_system"
                checked={formData.security_system}
                onCheckedChange={(checked) => handleChange('security_system', checked)}
              />
              <Label htmlFor="security_system" className="cursor-pointer">
                Security System Installed
              </Label>
            </div>

            <div>
              <Label>Security Features</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {['alarm', 'cameras', 'intercom', 'gate', 'sensor_lights', 'deadlocks'].map((feature) => (
                  <div key={feature} className="flex items-center gap-2">
                    <Checkbox
                      id={`security_${feature}`}
                      checked={formData.security_features.includes(feature)}
                      onCheckedChange={() => handleArrayToggle('security_features', feature)}
                    />
                    <Label htmlFor={`security_${feature}`} className="cursor-pointer capitalize">
                      {feature.replace('_', ' ')}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Smart Home Features</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {['automation', 'smart_locks', 'smart_lights', 'smart_thermostat', 'voice_control', 'security_cameras'].map(
                  (feature) => (
                    <div key={feature} className="flex items-center gap-2">
                      <Checkbox
                        id={`smart_${feature}`}
                        checked={formData.smart_home_features.includes(feature)}
                        onCheckedChange={() => handleArrayToggle('smart_home_features', feature)}
                      />
                      <Label htmlFor={`smart_${feature}`} className="cursor-pointer capitalize">
                        {feature.replace('_', ' ')}
                      </Label>
                    </div>
                  )
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sustainability */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Leaf size={20} />
              Sustainability & Energy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="energy_efficiency_rating">Energy Efficiency Rating (0-10)</Label>
                <Input
                  id="energy_efficiency_rating"
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={formData.energy_efficiency_rating}
                  onChange={(e) => handleChange('energy_efficiency_rating', e.target.value)}
                  placeholder="7.5"
                />
              </div>

              <div>
                <Label htmlFor="water_efficiency_rating">Water Efficiency Rating (0-6)</Label>
                <Input
                  id="water_efficiency_rating"
                  type="number"
                  step="0.1"
                  min="0"
                  max="6"
                  value={formData.water_efficiency_rating}
                  onChange={(e) => handleChange('water_efficiency_rating', e.target.value)}
                  placeholder="4"
                />
              </div>
            </div>

            <div>
              <Label>Sustainable Features</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {['rainwater', 'greywater', 'insulation', 'double_glazing', 'led_lighting', 'composting'].map((feature) => (
                  <div key={feature} className="flex items-center gap-2">
                    <Checkbox
                      id={`sustainable_${feature}`}
                      checked={formData.sustainable_features.includes(feature)}
                      onCheckedChange={() => handleArrayToggle('sustainable_features', feature)}
                    />
                    <Label htmlFor={`sustainable_${feature}`} className="cursor-pointer capitalize">
                      {feature.replace('_', ' ')}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Kitchen & Bathrooms */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChefHat size={20} />
              Kitchen & Bathrooms
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="kitchen_style">Kitchen Style</Label>
              <Select
                value={formData.kitchen_style}
                onValueChange={(val) => handleChange('kitchen_style', val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="modern">Modern</SelectItem>
                  <SelectItem value="country">Country</SelectItem>
                  <SelectItem value="industrial">Industrial</SelectItem>
                  <SelectItem value="scandinavian">Scandinavian</SelectItem>
                  <SelectItem value="traditional">Traditional</SelectItem>
                  <SelectItem value="gourmet">Gourmet</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Kitchen Features</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {['island', 'pantry', 'stone_benchtops', 'gas_cooking', 'dishwasher', 'breakfast_bar'].map((feature) => (
                  <div key={feature} className="flex items-center gap-2">
                    <Checkbox
                      id={`kitchen_${feature}`}
                      checked={formData.kitchen_features.includes(feature)}
                      onCheckedChange={() => handleArrayToggle('kitchen_features', feature)}
                    />
                    <Label htmlFor={`kitchen_${feature}`} className="cursor-pointer capitalize">
                      {feature.replace('_', ' ')}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ensuite_bathrooms">Ensuite Bathrooms</Label>
                <Input
                  id="ensuite_bathrooms"
                  type="number"
                  value={formData.ensuite_bathrooms}
                  onChange={(e) => handleChange('ensuite_bathrooms', e.target.value)}
                  placeholder="1"
                />
              </div>

              <div>
                <Label htmlFor="powder_rooms">Powder Rooms</Label>
                <Input
                  id="powder_rooms"
                  type="number"
                  value={formData.powder_rooms}
                  onChange={(e) => handleChange('powder_rooms', e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <Label>Bathroom Features</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {['spa_bath', 'separate_shower', 'double_vanity', 'heated_floors', 'rainfall_shower', 'freestanding_bath'].map(
                  (feature) => (
                    <div key={feature} className="flex items-center gap-2">
                      <Checkbox
                        id={`bathroom_${feature}`}
                        checked={formData.bathroom_features.includes(feature)}
                        onCheckedChange={() => handleArrayToggle('bathroom_features', feature)}
                      />
                      <Label htmlFor={`bathroom_${feature}`} className="cursor-pointer capitalize">
                        {feature.replace('_', ' ')}
                      </Label>
                    </div>
                  )
                )}
              </div>
            </div>

            <div>
              <Label>Flooring Types</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {['timber', 'tiles', 'carpet', 'concrete', 'marble', 'vinyl'].map((type) => (
                  <div key={type} className="flex items-center gap-2">
                    <Checkbox
                      id={`flooring_${type}`}
                      checked={formData.flooring_types.includes(type)}
                      onCheckedChange={() => handleArrayToggle('flooring_types', type)}
                    />
                    <Label htmlFor={`flooring_${type}`} className="cursor-pointer capitalize">
                      {type}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location Features */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin size={20} />
              Location & Proximity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="proximity_beach_km">Distance to Beach (km)</Label>
                <Input
                  id="proximity_beach_km"
                  type="number"
                  step="0.1"
                  value={formData.proximity_beach_km}
                  onChange={(e) => handleChange('proximity_beach_km', e.target.value)}
                  placeholder="2.5"
                />
              </div>

              <div>
                <Label htmlFor="proximity_cbd_km">Distance to CBD (km)</Label>
                <Input
                  id="proximity_cbd_km"
                  type="number"
                  step="0.1"
                  value={formData.proximity_cbd_km}
                  onChange={(e) => handleChange('proximity_cbd_km', e.target.value)}
                  placeholder="15"
                />
              </div>

              <div>
                <Label htmlFor="proximity_schools_km">Distance to Schools (km)</Label>
                <Input
                  id="proximity_schools_km"
                  type="number"
                  step="0.1"
                  value={formData.proximity_schools_km}
                  onChange={(e) => handleChange('proximity_schools_km', e.target.value)}
                  placeholder="0.8"
                />
              </div>

              <div>
                <Label htmlFor="proximity_shopping_km">Distance to Shopping (km)</Label>
                <Input
                  id="proximity_shopping_km"
                  type="number"
                  step="0.1"
                  value={formData.proximity_shopping_km}
                  onChange={(e) => handleChange('proximity_shopping_km', e.target.value)}
                  placeholder="1.2"
                />
              </div>

              <div>
                <Label htmlFor="proximity_transport_km">Distance to Transport (km)</Label>
                <Input
                  id="proximity_transport_km"
                  type="number"
                  step="0.1"
                  value={formData.proximity_transport_km}
                  onChange={(e) => handleChange('proximity_transport_km', e.target.value)}
                  placeholder="0.5"
                />
              </div>

              <div>
                <Label htmlFor="walkability_score">Walkability Score (0-100)</Label>
                <Input
                  id="walkability_score"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.walkability_score}
                  onChange={(e) => handleChange('walkability_score', e.target.value)}
                  placeholder="75"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="noise_level">Noise Level</Label>
                <Select
                  value={formData.noise_level}
                  onValueChange={(val) => handleChange('noise_level', val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="very_quiet">Very Quiet</SelectItem>
                    <SelectItem value="quiet">Quiet</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="busy">Busy</SelectItem>
                    <SelectItem value="very_busy">Very Busy</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="street_traffic">Street Traffic</Label>
                <Select
                  value={formData.street_traffic}
                  onValueChange={(val) => handleChange('street_traffic', val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no_through_road">No Through Road</SelectItem>
                    <SelectItem value="quiet_street">Quiet Street</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="busy_road">Busy Road</SelectItem>
                    <SelectItem value="main_road">Main Road</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="privacy_level">Privacy Level</Label>
                <Select
                  value={formData.privacy_level}
                  onValueChange={(val) => handleChange('privacy_level', val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="very_private">Very Private</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="overlooked">Overlooked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Investment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign size={20} />
              Investment & Costs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="rental_yield_estimate">Rental Yield Estimate (%)</Label>
                <Input
                  id="rental_yield_estimate"
                  type="number"
                  step="0.1"
                  value={formData.rental_yield_estimate}
                  onChange={(e) => handleChange('rental_yield_estimate', e.target.value)}
                  placeholder="4.5"
                />
              </div>

              <div>
                <Label htmlFor="council_rates_annual">Council Rates (Annual)</Label>
                <Input
                  id="council_rates_annual"
                  type="number"
                  value={formData.council_rates_annual}
                  onChange={(e) => handleChange('council_rates_annual', e.target.value)}
                  placeholder="2500"
                />
              </div>

              <div>
                <Label htmlFor="strata_fees_quarterly">Strata Fees (Quarterly)</Label>
                <Input
                  id="strata_fees_quarterly"
                  type="number"
                  value={formData.strata_fees_quarterly}
                  onChange={(e) => handleChange('strata_fees_quarterly', e.target.value)}
                  placeholder="1200"
                />
              </div>

              <div>
                <Label htmlFor="water_rates_annual">Water Rates (Annual)</Label>
                <Input
                  id="water_rates_annual"
                  type="number"
                  value={formData.water_rates_annual}
                  onChange={(e) => handleChange('water_rates_annual', e.target.value)}
                  placeholder="800"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Photos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText size={20} />
              Property Photos *
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ImageUpload
              maxFiles={15}
              maxSizeMB={5}
              onFilesChange={setImageFiles}
            />
          </CardContent>
        </Card>

        {/* Floor Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload size={20} />
              Floor Plan (Optional)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png"
                  onChange={handleFloorPlanChange}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  PDF, JPEG, or PNG (max 10MB)
                </p>
              </div>

              {floorPlanFile && (
                <div className="flex items-center gap-2 p-3 bg-accent rounded-md">
                  <FileText size={16} className="text-forest" />
                  <span className="text-sm">{floorPlanFile.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFloorPlanFile(null)}
                    className="ml-auto"
                  >
                    Remove
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={uploading}
            className="flex-1"
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Property for Review'
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/marketplace')}
            disabled={uploading}
          >
            Cancel
          </Button>
        </div>
      </form>
    </DashboardLayout>
  );
}
