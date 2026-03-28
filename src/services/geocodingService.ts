import { NativeModules, Platform } from 'react-native';
import type { PlaceResult, RouteResult } from '../types/places';

export type GeocodingResult = PlaceResult;

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const OSRM_BASE = 'https://router.project-osrm.org';
const AppleMapsModule = NativeModules.AppleMapsModule as {
  searchPlaces?: (query: string, limit: number) => Promise<GeocodingResult[]>;
  calculateRoute?: (
    fromLat: number,
    fromLon: number,
    toLat: number,
    toLon: number
  ) => Promise<RouteResult>;
};

/**
 * Search addresses using OpenStreetMap Nominatim API.
 */
export async function searchAddress(
  query: string,
  limit = 5
): Promise<GeocodingResult[]> {
  if (!query || query.trim().length < 2) return [];

  if (Platform.OS === 'ios' && AppleMapsModule?.searchPlaces) {
    return AppleMapsModule.searchPlaces(query.trim(), limit);
  }

  const params = new URLSearchParams({
    q: query.trim(),
    format: 'json',
    limit: String(limit),
    countrycodes: 'fr',
    addressdetails: '1',
  });

  const response = await fetch(`${NOMINATIM_BASE}/search?${params}`, {
    headers: {
      'User-Agent': 'KiloTrack/1.0',
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Nominatim error: ${response.status}`);
  }

  const results = await response.json() as GeocodingResult[];
  return results.map((result) => ({
    ...result,
    title: formatOsmTitle(result),
    subtitle: formatOsmSubtitle(result),
    icon: 'location-outline',
    source: 'osm',
  }));
}

/**
 * Calculate driving route distance between two coordinates using OSRM.
 */
export async function calculateRoute(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number
): Promise<RouteResult> {
  if (Platform.OS === 'ios' && AppleMapsModule?.calculateRoute) {
    return AppleMapsModule.calculateRoute(fromLat, fromLon, toLat, toLon);
  }

  const url = `${OSRM_BASE}/route/v1/driving/${fromLon},${fromLat};${toLon},${toLat}?overview=false`;

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`OSRM error: ${response.status}`);
  }

  const data = await response.json();

  if (data.code !== 'Ok' || !data.routes?.length) {
    throw new Error('No route found');
  }

  const route = data.routes[0];
  return {
    distance_km: Math.round((route.distance / 1000) * 10) / 10,
    duration_min: Math.round(route.duration / 60),
  };
}

/**
 * Format a Nominatim result into a short display name.
 */
export function formatShortAddress(result: GeocodingResult): string {
  if (result.title?.trim()) return result.title.trim();

  const addr = result.address;
  if (!addr) return result.display_name;

  const parts: string[] = [];
  if (addr.house_number && addr.road) {
    parts.push(`${addr.house_number} ${addr.road}`);
  } else if (addr.road) {
    parts.push(addr.road);
  }

  const city = addr.city || addr.town || addr.village;
  if (city) parts.push(city);

  return parts.length > 0 ? parts.join(', ') : result.display_name;
}

/**
 * Get the city/town from a Nominatim result.
 */
export function getCity(result: GeocodingResult): string {
  if (result.subtitle?.trim()) return result.subtitle.trim();

  const addr = result.address;
  if (!addr) return '';
  return addr.city || addr.town || addr.village || '';
}

export function getPlaceIcon(result: GeocodingResult): string {
  return result.icon || 'location-outline';
}

function formatOsmTitle(result: GeocodingResult): string {
  const addr = result.address;
  if (!addr) return result.display_name;

  if (addr.house_number && addr.road) {
    return `${addr.house_number} ${addr.road}`;
  }
  if (addr.road) return addr.road;

  return result.display_name;
}

function formatOsmSubtitle(result: GeocodingResult): string {
  const addr = result.address;
  if (!addr) return '';

  const city = addr.city || addr.town || addr.village;
  const postal = addr.postcode;
  return [postal, city].filter(Boolean).join(' ');
}
