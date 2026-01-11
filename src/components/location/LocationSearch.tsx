/**
 * LocationSearch Component
 *
 * Reusable GLOBAL location autocomplete search with Mapbox integration
 * Shows hierarchical location disambiguation (City, State, Country)
 * Biases results to user's location (proximity) but shows worldwide results
 *
 * Use cases:
 * - Agent service areas (broad: cities, regions, countries - GLOBAL)
 * - Property addresses (precise: street addresses - GLOBAL)
 * - Client brief search areas (flexible - GLOBAL)
 *
 * Examples:
 * - "Paris" → Paris, France + Paris, Texas, USA
 * - "London" → London, United Kingdom + London, Ontario, Canada
 * - "Sydney" → Sydney, Australia + Sydney, Nova Scotia, Canada
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, X, Loader2, LocateFixed } from 'lucide-react';
import { mapboxAutocomplete, getUserLocation, type LocationSuggestion } from '@/lib/mapbox-geocoder';
import { cn } from '@/lib/utils';

export interface LocationSearchProps {
  value?: LocationSuggestion | null;
  onChange: (location: LocationSuggestion | null) => void;
  placeholder?: string;
  country?: string; // ISO country code to restrict results (e.g., 'au', 'us')
  types?: string[]; // Place types to search (e.g., ['place', 'locality', 'address'])
  allowGeolocation?: boolean; // Show "Use my location" button
  className?: string;
  disabled?: boolean;
}

export function LocationSearch({
  value,
  onChange,
  placeholder = 'Search location...',
  country,
  types = ['place', 'locality', 'neighborhood', 'region'],
  allowGeolocation = false,
  className = '',
  disabled = false,
}: LocationSearchProps) {
  const [searchQuery, setSearchQuery] = useState(value?.fullName || '');
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [geolocating, setGeolocating] = useState(false);
  const [userProximity, setUserProximity] = useState<{ lat: number; lng: number } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const prevValueRef = useRef(value);

  // Only sync searchQuery when value changes from OUTSIDE (not from user typing)
  useEffect(() => {
    // Only update if value actually changed
    if (prevValueRef.current !== value) {
      prevValueRef.current = value;

      if (value && value.fullName) {
        // External value changed to something new
        setSearchQuery(value.fullName);
      }
      // If value is null, don't clear searchQuery - allow user to keep typing
    }
  }, [value]); // CRITICAL: Only depend on value, NOT searchQuery!

  // Fetch user's location for proximity biasing (only once)
  useEffect(() => {
    if (allowGeolocation && !userProximity) {
      getUserLocation().then(coords => {
        if (coords) {
          setUserProximity(coords);
        }
      });
    }
  }, [allowGeolocation, userProximity]);

  // Fetch autocomplete suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.length >= 2 && !value) {
        setLoading(true);
        try {
          const results = await mapboxAutocomplete(searchQuery, {
            country,
            types,
            proximity: userProximity || undefined,
            limit: 7,
          });
          setSuggestions(results);
          setShowSuggestions(results.length > 0);
        } catch (error) {
          console.error('Autocomplete error:', error);
          setSuggestions([]);
        } finally {
          setLoading(false);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    };

    const debounce = setTimeout(fetchSuggestions, 250);
    return () => clearTimeout(debounce);
  }, [searchQuery, value, country, types, userProximity]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Select suggestion
  const handleSelectSuggestion = useCallback((suggestion: LocationSuggestion) => {
    setSearchQuery(suggestion.fullName);
    onChange(suggestion);
    setShowSuggestions(false);
  }, [onChange]);

  // Clear search
  const handleClear = useCallback(() => {
    setSearchQuery('');
    onChange(null);
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  }, [onChange]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchQuery(newValue);
    if (value) {
      onChange(null); // Clear selection when user types
    }
  };

  // Use current location (geolocation)
  const handleUseMyLocation = useCallback(async () => {
    setGeolocating(true);
    const coords = await getUserLocation();

    if (coords) {
      // Reverse geocode to get address
      const { mapboxReverseGeocode } = await import('@/lib/mapbox-geocoder');
      const address = await mapboxReverseGeocode(coords);

      if (address) {
        // Create a location suggestion from the result
        const suggestion: LocationSuggestion = {
          id: 'current-location',
          name: 'Current Location',
          fullName: address,
          coordinates: coords,
          placeType: ['address'],
        };
        handleSelectSuggestion(suggestion);
      }
    } else {
      alert('Unable to get your location. Please search manually.');
    }

    setGeolocating(false);
  }, [handleSelectSuggestion]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
    // TODO: Add arrow key navigation in Phase 2
  };

  return (
    <div className={cn('relative', className)}>
      {/* Geolocation Button (if enabled) */}
      {allowGeolocation && (
        <Button
          type="button"
          variant="outline"
          onClick={handleUseMyLocation}
          disabled={geolocating || disabled}
          className="w-full mb-3 md:hidden" // Show on mobile only
        >
          {geolocating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Getting location...
            </>
          ) : (
            <>
              <LocateFixed className="mr-2 h-4 w-4" />
              Use my location
            </>
          )}
        </Button>
      )}

      {/* Search Input */}
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          className="pl-10 pr-10"
          disabled={disabled}
          // NOTE: Don't disable during loading - user must be able to continue typing!
        />

        {/* Loading Spinner */}
        {loading && (
          <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}

        {/* Clear Button - Shows when there's any text in the search */}
        {searchQuery && !loading && !disabled && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-muted"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg overflow-hidden max-h-64 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              type="button"
              onClick={() => handleSelectSuggestion(suggestion)}
              className={cn(
                'w-full px-4 py-3 text-left text-sm hover:bg-accent/50 transition-colors flex items-start gap-3',
                'border-b border-border/50 last:border-0 focus:outline-none focus:bg-accent/50'
              )}
            >
              <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground truncate">
                  {suggestion.name}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {suggestion.fullName}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No Results Message */}
      {showSuggestions && suggestions.length === 0 && searchQuery.length >= 2 && !loading && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg p-4 text-sm text-muted-foreground text-center">
          No locations found for "{searchQuery}"
        </div>
      )}
    </div>
  );
}
