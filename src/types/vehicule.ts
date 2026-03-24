export interface Vehicule {
  id: number;
  nom: string;
  immatriculation: string;
  tarif_km: number;
  puissance_fiscale: number;
}

export interface VehiculeFormData {
  nom: string;
  immatriculation: string;
  tarif_km: number;
  puissance_fiscale: number;
}
