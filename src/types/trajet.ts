export type TrajetStatut = 'brouillon' | 'valide' | 'exporte';

export interface Trajet {
  id: number;
  entry_type: 'trajet';
  date: string; // ISO 8601 "YYYY-MM-DD"
  adresse_depart: string;
  adresse_arrivee: string;
  distance_km: number;
  aller_retour: boolean;
  motif: string;
  vehicule_id: number;
  montant_eur: number;
  statut: TrajetStatut;
}

export interface TrajetFormData {
  date: string;
  adresse_depart: string;
  adresse_arrivee: string;
  distance_km: number | null;
  aller_retour: boolean;
  motif: string;
  vehicule_id: number | null;
}
