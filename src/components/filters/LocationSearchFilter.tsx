import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { MapPin, X } from "lucide-react";
import { autocomplete, geocode, Coordinates } from "@/lib/geocoder";

interface LocationSearchFilterProps {
  onLocationChange: (location: Coordinates | null, radius: number) => void;
  className?: string;
}

export function LocationSearchFilter({ onLocationChange, className = "" }: LocationSearchFilterProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [radius, setRadius] = useState(25);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.length >= 2 && !selectedLocation) {
        const results = await autocomplete(searchQuery);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    };

    const debounce = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, selectedLocation]);

  useEffect(() => {
    onLocationChange(coordinates, radius);
  }, [coordinates, radius, onLocationChange]);

  const handleSelectSuggestion = async (suggestion: string) => {
    setSearchQuery(suggestion);
    setSelectedLocation(suggestion);
    setShowSuggestions(false);

    const result = await geocode(suggestion);
    if (result) {
      setCoordinates(result.coordinates);
    }
  };

  const handleClear = () => {
    setSearchQuery("");
    setSelectedLocation(null);
    setCoordinates(null);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="relative">
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search location..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (selectedLocation) {
                setSelectedLocation(null);
                setCoordinates(null);
              }
            }}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            className="pl-10 pr-10 bg-background border-border"
          />
          {selectedLocation && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        {showSuggestions && (
          <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-elegant overflow-hidden">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSelectSuggestion(suggestion)}
                className="w-full px-4 py-2 text-left text-sm hover:bg-accent/50 transition-colors flex items-center gap-2"
              >
                <MapPin className="h-3 w-3 text-muted-foreground" />
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedLocation && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Radius</span>
            <span className="text-sm font-medium text-foreground">{radius} km</span>
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
            <span>100 km</span>
          </div>
        </div>
      )}
    </div>
  );
}
