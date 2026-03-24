export interface GeocodingResult {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    road?: string;
    house_number?: string;
    city?: string;
    town?: string;
    village?: string;
    postcode?: string;
  };
}

export interface RouteResult {
  distance_km: number;
  duration_min: number;
}

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const OSRM_BASE = 'https://router.project-osrm.org';

/**
 * Search addresses using OpenStreetMap Nominatim API.
 */
export async function searchAddress(
  query: string,
  limit = 5
): Promise<GeocodingResult[]> {
  if (!query || query.trim().length < 2) return [];

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

  return response.json();
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
  const addr = result.address;
  if (!addr) return '';
  return addr.city || addr.town || addr.village || '';
}
