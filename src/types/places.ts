export interface PlaceAddress {
  road?: string;
  house_number?: string;
  city?: string;
  town?: string;
  village?: string;
  postcode?: string;
}

export interface PlaceResult {
  display_name: string;
  lat: string;
  lon: string;
  title?: string;
  subtitle?: string;
  icon?: string;
  source?: 'apple' | 'osm';
  address?: PlaceAddress;
}

export interface RouteResult {
  distance_km: number;
  duration_min: number;
}

export type FavoritePlaceKind = 'home' | 'work' | 'custom';

export interface SavedPlace extends PlaceResult {
  id: number;
  label: string;
  favorite_kind: FavoritePlaceKind;
  created_at?: string;
  updated_at?: string;
}
