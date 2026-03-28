export interface Vehicule {
  id: number;
  nom: string;
  immatriculation: string;
  puissance_fiscale: number;
  is_electrique: boolean;
}

export interface VehiculeFormData {
  nom: string;
  immatriculation: string;
  puissance_fiscale: number;
  is_electrique: boolean;
}
