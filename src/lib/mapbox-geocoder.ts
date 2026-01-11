/**
 * Mapbox Geocoding API Integration
 *
 * Features:
 * - Autocomplete for location search
 * - Forward geocoding (address → coordinates)
 * - Reverse geocoding (coordinates → address)
 * - Hierarchical location disambiguation
 *
 * API Docs: https://docs.mapbox.com/api/search/geocoding/
 */

import type { Coordinates } from './geocoder';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
const GEOCODING_API = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

// Check if Mapbox token is configured
if (!MAPBOX_TOKEN || MAPBOX_TOKEN === 'YOUR_MAPBOX_TOKEN_HERE') {
  console.warn(
    '⚠️ Mapbox API token not configured. Location features will not work.\n' +
    'Sign up for free at: https://account.mapbox.com/auth/signup/\n' +
    'Then add your token to .env as VITE_MAPBOX_ACCESS_TOKEN'
  );
}

export interface MapboxFeature {
  id: string;
  type: 'Feature';
  place_type: string[]; // e.g., ['place', 'locality']
  relevance: number;
  properties: Record<string, any>;
  text: string; // Place name
  place_name: string; // Full formatted name with hierarchy
  center: [number, number]; // [lng, lat]
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  context?: Array<{
    id: string;
    text: string;
    short_code?: string;
  }>;
  bbox?: [number, number, number, number]; // [min_lng, min_lat, max_lng, max_lat]
}

export interface MapboxResponse {
  type: 'FeatureCollection';
  query: string[];
  features: MapboxFeature[];
  attribution: string;
}

export interface GeocodeResult {
  address: string;
  coordinates: Coordinates;
  city?: string;
  state?: string;
  country?: string;
  postcode?: string;
}

export interface LocationSuggestion {
  id: string;
  name: string; // Short name (e.g., "Sydney")
  fullName: string; // Full hierarchy (e.g., "Sydney, New South Wales, Australia")
  coordinates: Coordinates;
  placeType: string[];
  city?: string;
  state?: string;
  country?: string;
  countryCode?: string;
  bbox?: [number, number, number, number];
}

/**
 * Autocomplete search using Mapbox Geocoding API
 *
 * @param query - Search query (minimum 2 characters)
 * @param options - Search options
 * @returns Array of location suggestions
 */
export async function mapboxAutocomplete(
  query: string,
  options: {
    country?: string; // ISO 3166-1 alpha-2 code (e.g., 'au', 'us')
    types?: string[]; // e.g., ['place', 'locality', 'neighborhood', 'address']
    proximity?: Coordinates; // Bias results near this location
    limit?: number; // Max results (1-10, default 5)
    language?: string; // Language code (e.g., 'en')
  } = {}
): Promise<LocationSuggestion[]> {
  if (!MAPBOX_TOKEN || MAPBOX_TOKEN === 'YOUR_MAPBOX_TOKEN_HERE') {
    console.error('Mapbox API token not configured');
    return [];
  }

  if (!query || query.length < 2) {
    return [];
  }

  const params = new URLSearchParams({
    access_token: MAPBOX_TOKEN,
    autocomplete: 'true',
    limit: String(options.limit || 5),
  });

  if (options.country) {
    params.append('country', options.country);
  }

  if (options.types && options.types.length > 0) {
    params.append('types', options.types.join(','));
  }

  if (options.proximity) {
    params.append('proximity', `${options.proximity.lng},${options.proximity.lat}`);
  }

  if (options.language) {
    params.append('language', options.language);
  }

  const url = `${GEOCODING_API}/${encodeURIComponent(query)}.json?${params}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Mapbox API error: ${response.status} ${response.statusText}`);
    }

    const data: MapboxResponse = await response.json();

    return data.features.map(feature => {
      const city = feature.context?.find(c => c.id.startsWith('place'))?.text;
      const state = feature.context?.find(c => c.id.startsWith('region'))?.text;
      const country = feature.context?.find(c => c.id.startsWith('country'))?.text;
      const countryCode = feature.context?.find(c => c.id.startsWith('country'))?.short_code?.toUpperCase();

      return {
        id: feature.id,
        name: feature.text,
        fullName: feature.place_name,
        coordinates: {
          lat: feature.center[1],
          lng: feature.center[0],
        },
        placeType: feature.place_type,
        city,
        state,
        country,
        countryCode,
        bbox: feature.bbox,
      };
    });
  } catch (error) {
    console.error('Mapbox autocomplete error:', error);
    return [];
  }
}

/**
 * Geocode address to coordinates (forward geocoding)
 *
 * @param address - Address to geocode
 * @param options - Geocoding options
 * @returns Geocoded result or null
 */
export async function mapboxGeocode(
  address: string,
  options: {
    country?: string;
    types?: string[];
  } = {}
): Promise<GeocodeResult | null> {
  if (!MAPBOX_TOKEN || MAPBOX_TOKEN === 'YOUR_MAPBOX_TOKEN_HERE') {
    console.error('Mapbox API token not configured');
    return null;
  }

  const params = new URLSearchParams({
    access_token: MAPBOX_TOKEN,
    limit: '1',
  });

  if (options.country) {
    params.append('country', options.country);
  }

  if (options.types && options.types.length > 0) {
    params.append('types', options.types.join(','));
  }

  const url = `${GEOCODING_API}/${encodeURIComponent(address)}.json?${params}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Mapbox API error: ${response.status} ${response.statusText}`);
    }

    const data: MapboxResponse = await response.json();

    if (data.features.length === 0) {
      return null;
    }

    const feature = data.features[0];
    const [lng, lat] = feature.center;

    // Extract city, state, country from context
    const city = feature.context?.find(c => c.id.startsWith('place'))?.text;
    const state = feature.context?.find(c => c.id.startsWith('region'))?.text;
    const country = feature.context?.find(c => c.id.startsWith('country'))?.text;
    const postcode = feature.context?.find(c => c.id.startsWith('postcode'))?.text;

    return {
      address: feature.place_name,
      coordinates: { lat, lng },
      city,
      state,
      country,
      postcode,
    };
  } catch (error) {
    console.error('Mapbox geocode error:', error);
    return null;
  }
}

/**
 * Reverse geocode coordinates to address
 *
 * @param coordinates - Coordinates to reverse geocode
 * @param options - Options
 * @returns Address or null
 */
export async function mapboxReverseGeocode(
  coordinates: Coordinates,
  options: {
    types?: string[];
  } = {}
): Promise<string | null> {
  if (!MAPBOX_TOKEN || MAPBOX_TOKEN === 'YOUR_MAPBOX_TOKEN_HERE') {
    console.error('Mapbox API token not configured');
    return null;
  }

  const params = new URLSearchParams({
    access_token: MAPBOX_TOKEN,
  });

  if (options.types && options.types.length > 0) {
    params.append('types', options.types.join(','));
  }

  const url = `${GEOCODING_API}/${coordinates.lng},${coordinates.lat}.json?${params}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Mapbox API error: ${response.status} ${response.statusText}`);
    }

    const data: MapboxResponse = await response.json();

    if (data.features.length === 0) {
      return null;
    }

    return data.features[0].place_name;
  } catch (error) {
    console.error('Mapbox reverse geocode error:', error);
    return null;
  }
}

/**
 * Get user's approximate location using browser geolocation API
 *
 * @returns Coordinates or null
 */
export async function getUserLocation(): Promise<Coordinates | null> {
  if (!navigator.geolocation) {
    console.warn('Geolocation is not supported by this browser');
    return null;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        console.error('Geolocation error:', error);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000, // Cache for 1 minute
      }
    );
  });
}
