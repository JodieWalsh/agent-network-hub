/**
 * BriefLocationManager Component
 *
 * Smart location preference system for Client Briefs with tiered priorities:
 * - MUST-HAVE: Primary choices (highest priority)
 * - NICE-TO-HAVE: Would consider (secondary priority)
 * - EXCLUDE: Do NOT show properties here
 *
 * Each location can have an optional radius (e.g., "within 25km of Richmond")
 */

import { useState } from 'react';
import { LocationSearch, type LocationSearchProps } from '@/components/location/LocationSearch';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { MapPin, X, Star, ThumbsUp, Ban } from 'lucide-react';
import { type LocationSuggestion } from '@/lib/mapbox-geocoder';
import { cn } from '@/lib/utils';

export type LocationPriorityTier = 'must_have' | 'nice_to_have' | 'exclude';

export interface BriefLocation {
  id?: string; // Will be set when saved to database
  location_name: string;
  latitude: number;
  longitude: number;
  radius_km: number | null; // null means exact suburb only
  priority_tier: LocationPriorityTier;
  country_code?: string;
  state?: string;
  city?: string;
  suburb?: string;
}

interface BriefLocationManagerProps {
  locations: BriefLocation[];
  onChange: (locations: BriefLocation[]) => void;
  className?: string;
}

export function BriefLocationManager({ locations, onChange, className }: BriefLocationManagerProps) {
  const [selectedLocation, setSelectedLocation] = useState<LocationSuggestion | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [priority, setPriority] = useState<LocationPriorityTier>('must_have');
  const [radiusKm, setRadiusKm] = useState<number>(25);
  const [exactSuburbOnly, setExactSuburbOnly] = useState(false);

  const handleAddLocation = () => {
    if (!selectedLocation) return;

    const newLocation: BriefLocation = {
      location_name: selectedLocation.fullName,
      latitude: selectedLocation.coordinates.lat,
      longitude: selectedLocation.coordinates.lng,
      radius_km: exactSuburbOnly ? null : radiusKm,
      priority_tier: priority,
      country_code: selectedLocation.countryCode,
      state: selectedLocation.state,
      city: selectedLocation.city,
      suburb: selectedLocation.name,
    };

    onChange([...locations, newLocation]);

    // Reset form
    setSelectedLocation(null);
    setShowAddForm(false);
    setPriority('must_have');
    setRadiusKm(25);
    setExactSuburbOnly(false);
  };

  const handleRemoveLocation = (index: number) => {
    onChange(locations.filter((_, i) => i !== index));
  };

  const handleLocationSelected = (location: LocationSuggestion | null) => {
    setSelectedLocation(location);
    if (location) {
      setShowAddForm(true);
    } else {
      setShowAddForm(false);
    }
  };

  const handleCancel = () => {
    setSelectedLocation(null);
    setShowAddForm(false);
    setPriority('must_have');
    setRadiusKm(25);
    setExactSuburbOnly(false);
  };

  const mustHaveLocations = locations.filter((l) => l.priority_tier === 'must_have');
  const niceToHaveLocations = locations.filter((l) => l.priority_tier === 'nice_to_have');
  const excludeLocations = locations.filter((l) => l.priority_tier === 'exclude');

  return (
    <div className={cn('space-y-6', className)}>
      {/* Search Box */}
      <div className="space-y-2">
        <Label>Search suburbs, cities, or postcodes...</Label>
        <LocationSearch
          value={selectedLocation}
          onChange={handleLocationSelected}
          placeholder="Type to search locations worldwide..."
          types={['place', 'locality', 'neighborhood', 'postcode']}
        />
      </div>

      {/* Add Location Form */}
      {showAddForm && selectedLocation && (
        <Card className="border-forest/20 bg-forest/5">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-forest mt-0.5" />
              <div>
                <p className="font-medium text-foreground">{selectedLocation.name}</p>
                <p className="text-sm text-muted-foreground">{selectedLocation.fullName}</p>
              </div>
            </div>

            {/* Priority Selection */}
            <div className="space-y-2">
              <Label>Priority</Label>
              <RadioGroup value={priority} onValueChange={(val) => setPriority(val as LocationPriorityTier)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="must_have" id="must_have" />
                  <Label htmlFor="must_have" className="font-normal cursor-pointer flex items-center gap-2">
                    <Star className="h-4 w-4 text-amber-500" />
                    Must-have (Primary choice)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="nice_to_have" id="nice_to_have" />
                  <Label htmlFor="nice_to_have" className="font-normal cursor-pointer flex items-center gap-2">
                    <ThumbsUp className="h-4 w-4 text-blue-500" />
                    Nice-to-have (Would consider)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="exclude" id="exclude" />
                  <Label htmlFor="exclude" className="font-normal cursor-pointer flex items-center gap-2">
                    <Ban className="h-4 w-4 text-red-500" />
                    Exclude (Do NOT show properties here)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Radius Selection (hidden for excluded locations) */}
            {priority !== 'exclude' && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="exact-suburb"
                    checked={exactSuburbOnly}
                    onCheckedChange={(checked) => setExactSuburbOnly(checked as boolean)}
                  />
                  <Label htmlFor="exact-suburb" className="font-normal cursor-pointer">
                    Exact suburb only (no radius)
                  </Label>
                </div>

                {!exactSuburbOnly && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Radius: {radiusKm} km</Label>
                      <span className="text-xs text-muted-foreground">
                        Within {radiusKm}km of {selectedLocation.name}
                      </span>
                    </div>
                    <Slider
                      value={[radiusKm]}
                      onValueChange={(val) => setRadiusKm(val[0])}
                      min={1}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>1 km</span>
                      <span>100 km</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button onClick={handleAddLocation} className="bg-forest hover:bg-forest/90">
                Add Location
              </Button>
              <Button onClick={handleCancel} variant="outline">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Display Added Locations */}
      {locations.length === 0 && !showAddForm && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Add your preferred suburbs and areas. You can set priorities and exclude areas you don't want.
        </div>
      )}

      {/* MUST-HAVE Section */}
      {mustHaveLocations.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500" />
            <h3 className="font-semibold text-foreground">MUST-HAVE (Primary choices)</h3>
          </div>
          <div className="space-y-2">
            {mustHaveLocations.map((location, idx) => {
              const globalIndex = locations.indexOf(location);
              return (
                <Card key={globalIndex} className="border-amber-200 bg-amber-50/50">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <MapPin className="h-4 w-4 text-amber-600" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{location.suburb || location.city}</p>
                          <p className="text-xs text-muted-foreground truncate">{location.location_name}</p>
                        </div>
                        <Badge variant="outline" className="bg-white text-xs">
                          {location.radius_km ? `${location.radius_km}km radius` : 'Exact suburb'}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveLocation(globalIndex)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* NICE-TO-HAVE Section */}
      {niceToHaveLocations.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ThumbsUp className="h-5 w-5 text-blue-500" />
            <h3 className="font-semibold text-foreground">NICE-TO-HAVE (Would consider)</h3>
          </div>
          <div className="space-y-2">
            {niceToHaveLocations.map((location, idx) => {
              const globalIndex = locations.indexOf(location);
              return (
                <Card key={globalIndex} className="border-blue-200 bg-blue-50/50">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <MapPin className="h-4 w-4 text-blue-600" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{location.suburb || location.city}</p>
                          <p className="text-xs text-muted-foreground truncate">{location.location_name}</p>
                        </div>
                        <Badge variant="outline" className="bg-white text-xs">
                          {location.radius_km ? `${location.radius_km}km radius` : 'Exact suburb'}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveLocation(globalIndex)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* EXCLUDE Section */}
      {excludeLocations.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Ban className="h-5 w-5 text-red-500" />
            <h3 className="font-semibold text-foreground">EXCLUDE (Do NOT show me properties here)</h3>
          </div>
          <div className="space-y-2">
            {excludeLocations.map((location, idx) => {
              const globalIndex = locations.indexOf(location);
              return (
                <Card key={globalIndex} className="border-red-200 bg-red-50/50">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <MapPin className="h-4 w-4 text-red-600" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{location.suburb || location.city}</p>
                          <p className="text-xs text-muted-foreground truncate">{location.location_name}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveLocation(globalIndex)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
