/**
 * ServiceAreaManager Component
 *
 * Allows agents to manage their service areas:
 * - Radius-based (e.g., "50km from Sydney CBD")
 * - Region-based (e.g., "Eastern Suburbs, Sydney")
 * - State-level (e.g., "Anywhere in NSW")
 * - Country-level (e.g., "Anywhere in Australia")
 * - Global (e.g., "Anywhere in the world")
 *
 * Supports multiple service areas per agent
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LocationSearch, type LocationSearchProps } from '@/components/location/LocationSearch';
import { MapPin, Plus, X, Globe2, Map } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { LocationSuggestion } from '@/lib/mapbox-geocoder';

export interface ServiceArea {
  id?: string;
  area_type: 'radius' | 'region' | 'state' | 'country' | 'global';
  center_point?: { lat: number; lng: number };
  center_name?: string;
  radius_km?: number;
  region_name?: string;
  state_code?: string;
  state_name?: string;
  country_code?: string;
  country_name?: string;
  is_primary: boolean;
  priority: number;
}

interface ServiceAreaManagerProps {
  userId: string;
  initialAreas?: ServiceArea[];
  onChange?: (areas: ServiceArea[]) => void;
}

const COUNTRIES = [
  { code: 'AU', name: 'Australia' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
];

const AUSTRALIAN_STATES = [
  { code: 'NSW', name: 'New South Wales' },
  { code: 'VIC', name: 'Victoria' },
  { code: 'QLD', name: 'Queensland' },
  { code: 'WA', name: 'Western Australia' },
  { code: 'SA', name: 'South Australia' },
  { code: 'TAS', name: 'Tasmania' },
  { code: 'ACT', name: 'Australian Capital Territory' },
  { code: 'NT', name: 'Northern Territory' },
];

export function ServiceAreaManager({ userId, initialAreas = [], onChange }: ServiceAreaManagerProps) {
  const [areas, setAreas] = useState<ServiceArea[]>(initialAreas);
  const [isAdding, setIsAdding] = useState(false);
  const [newAreaType, setNewAreaType] = useState<ServiceArea['area_type']>('radius');
  const [selectedLocation, setSelectedLocation] = useState<LocationSuggestion | null>(null);
  const [radius, setRadius] = useState(25);
  const [selectedCountry, setSelectedCountry] = useState('AU');
  const [selectedState, setSelectedState] = useState('');
  const [saving, setSaving] = useState(false);

  // Load existing service areas
  useEffect(() => {
    loadServiceAreas();
  }, [userId]);

  const loadServiceAreas = async () => {
    const { data, error } = await supabase
      .from('agent_service_areas')
      .select('*')
      .eq('agent_id', userId)
      .order('is_primary', { ascending: false })
      .order('priority', { ascending: true });

    if (error) {
      console.error('Error loading service areas:', error);
      return;
    }

    if (data) {
      const formattedAreas: ServiceArea[] = data.map(area => ({
        ...area,
        center_point: area.center_point
          ? {
              // PostGIS returns geography as GeoJSON-like object
              lat: (area.center_point as any).coordinates?.[1] || 0,
              lng: (area.center_point as any).coordinates?.[0] || 0,
            }
          : undefined,
      }));
      setAreas(formattedAreas);
      onChange?.(formattedAreas);
    }
  };

  const handleAddArea = () => {
    setIsAdding(true);
    setSelectedLocation(null);
    setRadius(25);
    setSelectedState('');
  };

  const handleSaveNewArea = async () => {
    let newArea: Partial<ServiceArea> = {
      area_type: newAreaType,
      is_primary: areas.length === 0, // First area is primary
      priority: areas.length + 1,
    };

    // Validate and build area data based on type
    switch (newAreaType) {
      case 'radius':
        if (!selectedLocation) {
          toast.error('Please select a location for the radius center');
          return;
        }
        newArea = {
          ...newArea,
          center_point: selectedLocation.coordinates,
          center_name: selectedLocation.fullName,
          radius_km: radius,
        };
        break;

      case 'region':
        if (!selectedLocation) {
          toast.error('Please select a region');
          return;
        }
        newArea = {
          ...newArea,
          region_name: selectedLocation.fullName,
        };
        break;

      case 'state':
        if (!selectedState) {
          toast.error('Please select a state');
          return;
        }
        const state = AUSTRALIAN_STATES.find(s => s.code === selectedState);
        newArea = {
          ...newArea,
          state_code: selectedState,
          state_name: state?.name,
          country_code: 'AU',
          country_name: 'Australia',
        };
        break;

      case 'country':
        const country = COUNTRIES.find(c => c.code === selectedCountry);
        newArea = {
          ...newArea,
          country_code: selectedCountry,
          country_name: country?.name,
        };
        break;

      case 'global':
        newArea = {
          ...newArea,
        };
        break;
    }

    // Save to database
    setSaving(true);
    try {
      let insertData: any = {
        agent_id: userId,
        area_type: newArea.area_type,
        is_primary: newArea.is_primary,
        priority: newArea.priority,
      };

      if (newAreaType === 'radius' && newArea.center_point) {
        // Use the helper function to insert radius-based area
        const { data, error } = await supabase.rpc('insert_radius_service_area', {
          p_agent_id: userId,
          p_center_name: newArea.center_name!,
          p_lat: newArea.center_point.lat,
          p_lng: newArea.center_point.lng,
          p_radius_km: newArea.radius_km!,
          p_is_primary: newArea.is_primary!,
          p_priority: newArea.priority!,
        });

        if (error) throw error;
      } else {
        // Insert other types directly
        if (newAreaType === 'region') {
          insertData.region_name = newArea.region_name;
        } else if (newAreaType === 'state') {
          insertData.state_code = newArea.state_code;
          insertData.state_name = newArea.state_name;
          insertData.country_code = newArea.country_code;
          insertData.country_name = newArea.country_name;
        } else if (newAreaType === 'country') {
          insertData.country_code = newArea.country_code;
          insertData.country_name = newArea.country_name;
        }

        const { error } = await supabase
          .from('agent_service_areas')
          .insert(insertData);

        if (error) throw error;
      }

      toast.success('Service area added successfully');
      await loadServiceAreas();
      setIsAdding(false);
    } catch (error: any) {
      console.error('Error saving service area:', error);
      toast.error('Failed to save service area: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteArea = async (areaId: string) => {
    const { error } = await supabase
      .from('agent_service_areas')
      .delete()
      .eq('id', areaId);

    if (error) {
      console.error('Error deleting service area:', error);
      toast.error('Failed to delete service area');
      return;
    }

    toast.success('Service area removed');
    await loadServiceAreas();
  };

  const getAreaDisplayName = (area: ServiceArea): string => {
    switch (area.area_type) {
      case 'radius':
        return `${area.radius_km}km from ${area.center_name}`;
      case 'region':
        return area.region_name || 'Region';
      case 'state':
        return `Anywhere in ${area.state_name}`;
      case 'country':
        return `Anywhere in ${area.country_name}`;
      case 'global':
        return 'Anywhere in the world';
      default:
        return 'Unknown';
    }
  };

  const getAreaTypeLabel = (type: ServiceArea['area_type']): string => {
    switch (type) {
      case 'radius': return 'Radius';
      case 'region': return 'Region';
      case 'state': return 'State';
      case 'country': return 'Country';
      case 'global': return 'Global';
      default: return type;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Service Areas</CardTitle>
        <CardDescription>
          Specify where you're willing to work. You can add multiple areas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing Service Areas */}
        {areas.length > 0 && (
          <div className="space-y-2">
            {areas.map((area) => (
              <div
                key={area.id}
                className="flex items-center justify-between p-3 rounded-md border border-border bg-muted/30"
              >
                <div className="flex items-center gap-3 flex-1">
                  <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {getAreaDisplayName(area)}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {getAreaTypeLabel(area.area_type)}
                      </Badge>
                      {area.is_primary && (
                        <Badge variant="secondary" className="text-xs bg-forest/10 text-forest">
                          Primary
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteArea(area.id!)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add New Area Form */}
        {isAdding ? (
          <div className="space-y-4 p-4 rounded-md border border-border bg-muted/20">
            <div className="space-y-2">
              <label className="text-sm font-medium">Area Type</label>
              <Select value={newAreaType} onValueChange={(value: any) => setNewAreaType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="radius">Radius from location</SelectItem>
                  <SelectItem value="region">Specific region/city</SelectItem>
                  <SelectItem value="state">Entire state</SelectItem>
                  <SelectItem value="country">Entire country</SelectItem>
                  <SelectItem value="global">Anywhere in the world</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Radius Type */}
            {newAreaType === 'radius' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Center Location</label>
                  <LocationSearch
                    value={selectedLocation}
                    onChange={setSelectedLocation}
                    placeholder="Search for a location..."
                    country="au"
                    allowGeolocation
                  />
                </div>
                {selectedLocation && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Radius</label>
                      <span className="text-sm font-semibold text-forest">{radius} km</span>
                    </div>
                    <Slider
                      value={[radius]}
                      onValueChange={(value) => setRadius(value[0])}
                      min={5}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>5 km</span>
                      <span>50 km</span>
                      <span>100 km</span>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Region Type */}
            {newAreaType === 'region' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Region or City</label>
                <LocationSearch
                  value={selectedLocation}
                  onChange={setSelectedLocation}
                  placeholder="Search for a region or city..."
                  country="au"
                  types={['place', 'locality', 'region']}
                />
              </div>
            )}

            {/* State Type */}
            {newAreaType === 'state' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">State</label>
                <Select value={selectedState} onValueChange={setSelectedState}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a state" />
                  </SelectTrigger>
                  <SelectContent>
                    {AUSTRALIAN_STATES.map(state => (
                      <SelectItem key={state.code} value={state.code}>
                        {state.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Country Type */}
            {newAreaType === 'country' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Country</label>
                <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map(country => (
                      <SelectItem key={country.code} value={country.code}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Global Type */}
            {newAreaType === 'global' && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50">
                <Globe2 className="h-5 w-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  You'll be shown for all location searches worldwide
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <Button
                type="button"
                onClick={handleSaveNewArea}
                disabled={saving}
                className="flex-1"
              >
                {saving ? 'Saving...' : 'Add Service Area'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAdding(false)}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={handleAddArea}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Service Area
          </Button>
        )}

        {/* Empty State */}
        {areas.length === 0 && !isAdding && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <Map className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No service areas added yet</p>
            <p className="text-xs mt-1">Add at least one area to help clients find you</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
