export interface Horodatage {
  id: number;
  entry_type: 'horodatage';
  date: string; // ISO 8601 "YYYY-MM-DD"
  heure: string; // "HH:mm"
  kilometrage_km: number;
  note: string;
  vehicule_id: number;
  vehicule_nom?: string;
}

export interface HorodatageFormData {
  date: string;
  heure: string;
  kilometrage_km: number | null;
  note: string;
  vehicule_id: number | null;
}
