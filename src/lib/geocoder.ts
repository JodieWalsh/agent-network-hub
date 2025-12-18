// Real Geocoder using OpenStreetMap Nominatim API
// Free, no API key required, supports global addresses

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface GeocodeResult {
  address: string;
  coordinates: Coordinates;
  city?: string;
  state?: string;
  country?: string;
  displayName?: string;
}

// Nominatim API endpoint
const NOMINATIM_API = 'https://nominatim.openstreetmap.org';

// User agent required by Nominatim usage policy
const USER_AGENT = 'AgentHub/1.0';

// Rate limiting: Cache recent searches to avoid repeated API calls
const geocodeCache = new Map<string, GeocodeResult>();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

// Service regions for profile selection
export const SERVICE_REGIONS = [
  "Sydney CBD",
  "Eastern Suburbs",
  "North Shore",
  "Inner West",
  "Northern Beaches",
  "Western Sydney",
  "South Sydney",
  "Melbourne CBD",
  "Melbourne Inner",
  "Melbourne East",
  "Melbourne North",
  "Melbourne South",
  "Brisbane CBD",
  "Brisbane North",
  "Brisbane South",
  "Gold Coast",
  "Sunshine Coast",
  "Perth CBD",
  "Perth North",
  "Perth South",
  "Adelaide CBD",
  "Adelaide Hills",
  "Canberra",
  "Hobart",
  "Darwin",
];

// Geocoder interface for easy API swap
export interface GeocoderService {
  geocode(address: string): Promise<GeocodeResult | null>;
  autocomplete(query: string): Promise<string[]>;
}

/**
 * Real geocode function using Nominatim API
 * Supports global addresses (Australia, US, UK, and worldwide)
 */
export async function geocode(address: string): Promise<GeocodeResult | null> {
  if (!address || address.trim().length < 3) {
    return null;
  }

  const cacheKey = address.toLowerCase().trim();

  // Check cache first
  if (geocodeCache.has(cacheKey)) {
    const cached = geocodeCache.get(cacheKey)!;
    return cached;
  }

  try {
    // Build Nominatim API URL
    const params = new URLSearchParams({
      q: address,
      format: 'json',
      addressdetails: '1',
      limit: '1',
    });

    const response = await fetch(`${NOMINATIM_API}/search?${params}`, {
      headers: {
        'User-Agent': USER_AGENT,
      },
    });

    if (!response.ok) {
      console.error('Nominatim API error:', response.statusText);
      return null;
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      console.warn('No results found for address:', address);
      return null;
    }

    const result = data[0];
    const geocodeResult: GeocodeResult = {
      address,
      coordinates: {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
      },
      city: result.address?.city || result.address?.town || result.address?.suburb,
      state: result.address?.state,
      country: result.address?.country,
      displayName: result.display_name,
    };

    // Cache the result
    geocodeCache.set(cacheKey, geocodeResult);

    // Clear cache after duration
    setTimeout(() => {
      geocodeCache.delete(cacheKey);
    }, CACHE_DURATION);

    return geocodeResult;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

/**
 * Real autocomplete using Nominatim search
 * Returns suggested addresses as you type
 */
export async function autocomplete(query: string): Promise<string[]> {
  if (!query || query.length < 3) return [];

  try {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      addressdetails: '1',
      limit: '5',
    });

    const response = await fetch(`${NOMINATIM_API}/search?${params}`, {
      headers: {
        'User-Agent': USER_AGENT,
      },
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    return data.map((result: any) => result.display_name);
  } catch (error) {
    console.error('Autocomplete error:', error);
    return [];
  }
}

/**
 * Calculate distance between two points using Haversine formula
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 10) / 10; // Round to 1 decimal
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Check if a point is within a given radius from center
 */
export function isWithinRadius(
  center: Coordinates,
  point: Coordinates,
  radiusKm: number
): boolean {
  const distance = calculateDistance(
    center.lat,
    center.lng,
    point.lat,
    point.lng
  );
  return distance <= radiusKm;
}

// Default geocoder service using real Nominatim API
export const geocoderService: GeocoderService = {
  geocode,
  autocomplete,
};
