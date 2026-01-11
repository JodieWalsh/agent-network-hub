/**
 * PropertyAddressSearch Component
 *
 * Smart single-field address search for property listings
 * - Uses Mapbox geocoding for street-level address autocomplete
 * - Auto-fills all location fields: street, city, state, country, postcode, coordinates
 * - Shows parsed address components for confirmation
 * - Best practice UX like Zillow, Domain, Airbnb
 */

import { useState, useEffect } from 'react';
import { LocationSearch } from '@/components/location/LocationSearch';
import { LocationSuggestion } from '@/lib/mapbox-geocoder';
import { Label } from '@/components/ui/label';
import { Check } from 'lucide-react';

export interface PropertyLocationData {
  streetAddress: string;
  city: string;
  state: string;
  country: string;
  postcode: string;
  latitude: number;
  longitude: number;
  fullAddress: string;
}

interface PropertyAddressSearchProps {
  value: PropertyLocationData | null;
  onChange: (location: PropertyLocationData | null) => void;
  className?: string;
  disabled?: boolean;
}

export function PropertyAddressSearch({
  value,
  onChange,
  className = '',
  disabled = false,
}: PropertyAddressSearchProps) {
  const [selectedLocation, setSelectedLocation] = useState<LocationSuggestion | null>(null);

  // Convert value to LocationSuggestion for the search component
  useEffect(() => {
    if (value && !selectedLocation) {
      setSelectedLocation({
        id: 'initial-value',
        name: value.streetAddress,
        fullName: value.fullAddress,
        coordinates: {
          lat: value.latitude,
          lng: value.longitude,
        },
        placeType: ['address'],
        streetAddress: value.streetAddress,
        city: value.city,
        state: value.state,
        country: value.country,
        postcode: value.postcode,
      });
    }
  }, [value, selectedLocation]);

  const handleLocationChange = (location: LocationSuggestion | null) => {
    setSelectedLocation(location);

    if (!location) {
      onChange(null);
      return;
    }

    // Extract all address components
    const propertyData: PropertyLocationData = {
      streetAddress: location.streetAddress || location.name,
      city: location.city || '',
      state: location.state || '',
      country: location.country || '',
      postcode: location.postcode || '',
      latitude: location.coordinates.lat,
      longitude: location.coordinates.lng,
      fullAddress: location.fullName,
    };

    onChange(propertyData);
  };

  return (
    <div className={className}>
      <Label htmlFor="property-address">Property Address *</Label>
      <LocationSearch
        value={selectedLocation}
        onChange={handleLocationChange}
        placeholder="Start typing the property address..."
        types={['address', 'poi']} // Street addresses and points of interest
        allowGeolocation={true}
        disabled={disabled}
        className="mt-2"
      />

      {/* Parsed Address Confirmation */}
      {selectedLocation && (
        <div className="mt-4 p-4 bg-accent/30 border border-border rounded-md space-y-2">
          <div className="text-sm font-medium text-foreground mb-3">
            Address Components:
          </div>

          {selectedLocation.streetAddress && (
            <div className="flex items-start gap-2 text-sm">
              <Check size={16} className="text-forest mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-muted-foreground">Street: </span>
                <span className="text-foreground font-medium">{selectedLocation.streetAddress}</span>
              </div>
            </div>
          )}

          {selectedLocation.city && (
            <div className="flex items-start gap-2 text-sm">
              <Check size={16} className="text-forest mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-muted-foreground">City: </span>
                <span className="text-foreground font-medium">{selectedLocation.city}</span>
              </div>
            </div>
          )}

          {selectedLocation.state && (
            <div className="flex items-start gap-2 text-sm">
              <Check size={16} className="text-forest mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-muted-foreground">State: </span>
                <span className="text-foreground font-medium">{selectedLocation.state}</span>
              </div>
            </div>
          )}

          {selectedLocation.postcode && (
            <div className="flex items-start gap-2 text-sm">
              <Check size={16} className="text-forest mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-muted-foreground">Postcode: </span>
                <span className="text-foreground font-medium">{selectedLocation.postcode}</span>
              </div>
            </div>
          )}

          {selectedLocation.country && (
            <div className="flex items-start gap-2 text-sm">
              <Check size={16} className="text-forest mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-muted-foreground">Country: </span>
                <span className="text-foreground font-medium">{selectedLocation.country}</span>
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 text-sm pt-2 border-t border-border/50">
            <Check size={16} className="text-forest mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-muted-foreground">Coordinates: </span>
              <span className="text-foreground font-mono text-xs">
                {selectedLocation.coordinates.lat.toFixed(6)}, {selectedLocation.coordinates.lng.toFixed(6)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
