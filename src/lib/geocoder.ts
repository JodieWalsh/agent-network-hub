// Mock Geocoder - Structure ready for real API integration (Google Maps, Mapbox, etc.)

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface GeocodeResult {
  address: string;
  coordinates: Coordinates;
  city?: string;
  state?: string;
}

// Australian city coordinates for mock geocoding
const CITY_COORDINATES: Record<string, Coordinates> = {
  // Major Cities
  "sydney": { lat: -33.8688, lng: 151.2093 },
  "melbourne": { lat: -37.8136, lng: 144.9631 },
  "brisbane": { lat: -27.4698, lng: 153.0251 },
  "perth": { lat: -31.9505, lng: 115.8605 },
  "adelaide": { lat: -34.9285, lng: 138.6007 },
  "hobart": { lat: -42.8821, lng: 147.3272 },
  "darwin": { lat: -12.4634, lng: 130.8456 },
  "canberra": { lat: -35.2809, lng: 149.1300 },
  
  // Sydney Suburbs
  "sydney cbd": { lat: -33.8688, lng: 151.2093 },
  "bondi": { lat: -33.8915, lng: 151.2767 },
  "manly": { lat: -33.7963, lng: 151.2876 },
  "parramatta": { lat: -33.8151, lng: 151.0011 },
  "chatswood": { lat: -33.7969, lng: 151.1803 },
  "north sydney": { lat: -33.8389, lng: 151.2070 },
  "surry hills": { lat: -33.8830, lng: 151.2110 },
  "newtown": { lat: -33.8976, lng: 151.1790 },
  "randwick": { lat: -33.9133, lng: 151.2414 },
  "eastern suburbs": { lat: -33.8900, lng: 151.2600 },
  "north shore": { lat: -33.8200, lng: 151.2000 },
  "inner west": { lat: -33.8800, lng: 151.1500 },
  
  // Melbourne Suburbs
  "melbourne cbd": { lat: -37.8136, lng: 144.9631 },
  "st kilda": { lat: -37.8576, lng: 144.9803 },
  "south yarra": { lat: -37.8379, lng: 144.9920 },
  "richmond": { lat: -37.8183, lng: 145.0011 },
  "fitzroy": { lat: -37.7991, lng: 144.9785 },
  "carlton": { lat: -37.7955, lng: 144.9672 },
  "docklands": { lat: -37.8143, lng: 144.9467 },
  
  // Brisbane Suburbs
  "brisbane cbd": { lat: -27.4698, lng: 153.0251 },
  "south bank": { lat: -27.4810, lng: 153.0234 },
  "fortitude valley": { lat: -27.4573, lng: 153.0356 },
  "west end": { lat: -27.4827, lng: 153.0087 },
  "paddington": { lat: -27.4597, lng: 152.9986 },
  
  // Perth Suburbs
  "perth cbd": { lat: -31.9505, lng: 115.8605 },
  "fremantle": { lat: -32.0569, lng: 115.7439 },
  "subiaco": { lat: -31.9449, lng: 115.8272 },
  "cottesloe": { lat: -31.9940, lng: 115.7580 },
};

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
 * Mock geocode function - returns coordinates for known locations
 * Replace with real API call (Google Maps, Mapbox, etc.) when ready
 */
export async function mockGeocode(address: string): Promise<GeocodeResult | null> {
  const normalizedAddress = address.toLowerCase().trim();
  
  // Try exact match first
  if (CITY_COORDINATES[normalizedAddress]) {
    return {
      address,
      coordinates: CITY_COORDINATES[normalizedAddress],
      city: address,
    };
  }
  
  // Try partial match
  for (const [key, coords] of Object.entries(CITY_COORDINATES)) {
    if (normalizedAddress.includes(key) || key.includes(normalizedAddress)) {
      return {
        address,
        coordinates: coords,
        city: key.charAt(0).toUpperCase() + key.slice(1),
      };
    }
  }
  
  // Default to Sydney if no match (for demo purposes)
  return {
    address,
    coordinates: CITY_COORDINATES["sydney"],
    city: "Sydney",
  };
}

/**
 * Mock autocomplete - returns matching city names
 */
export async function mockAutocomplete(query: string): Promise<string[]> {
  if (!query || query.length < 2) return [];
  
  const normalizedQuery = query.toLowerCase();
  const matches = Object.keys(CITY_COORDINATES)
    .filter(city => city.includes(normalizedQuery))
    .map(city => city.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' '))
    .slice(0, 5);
  
  return matches;
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

// Default geocoder service using mock functions
export const geocoderService: GeocoderService = {
  geocode: mockGeocode,
  autocomplete: mockAutocomplete,
};
