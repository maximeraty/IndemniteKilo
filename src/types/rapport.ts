import { Trajet, TrajetStatut } from './trajet';
import { Horodatage } from './horodatage';

export interface RapportFilters {
  date_debut: string; // "YYYY-MM-DD"
  date_fin: string; // "YYYY-MM-DD"
  vehicule_id: number | null;
  statut: TrajetStatut | null;
}

export interface RapportData {
  trajets: Trajet[];
  horodatages: Horodatage[];
  total_km: number;
  total_eur: number;
  periode: string;
  nom_utilisateur: string;
  entreprise: string;
}
