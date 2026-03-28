import {
  calculerMontantTrajetBareme,
  getDistanceEffective,
} from '../constants/baremes';
import type { Trajet } from '../types/trajet';
import type { Vehicule } from '../types/vehicule';
import * as db from './db';

function getYearFromDate(date: string): string {
  return date.slice(0, 4);
}

function sortTrajetsChronologically<T extends Pick<Trajet, 'date' | 'id'>>(
  trajets: T[]
): T[] {
  return [...trajets].sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    return a.id - b.id;
  });
}

export async function recalculateTrajetAmountsForVehicleYear(
  vehiculeId: number,
  year: string
): Promise<void> {
  const vehicule = await db.getVehiculeById(vehiculeId);
  if (!vehicule) return;

  const trajets = await db.getTrajetsByVehiculeAndYear(vehiculeId, year);
  let distanceCumulee = 0;

  for (const trajet of trajets) {
    const montant = calculerMontantTrajetBareme({
      puissanceFiscale: vehicule.puissance_fiscale,
      isElectrique: vehicule.is_electrique,
      distanceAvantKm: distanceCumulee,
      distanceTrajetKm: trajet.distance_km,
      allerRetour: trajet.aller_retour,
    });

    distanceCumulee += getDistanceEffective(
      trajet.distance_km,
      trajet.aller_retour
    );

    if (Math.abs(trajet.montant_eur - montant) > 0.001) {
      await db.updateTrajetMontant(trajet.id, montant);
    }
  }
}

export async function recalculateTrajetAmountsForVehicule(
  vehiculeId: number
): Promise<void> {
  const years = await db.getTrajetYearsForVehicule(vehiculeId);
  for (const year of years) {
    await recalculateTrajetAmountsForVehicleYear(vehiculeId, year);
  }
}

export async function getTrajetBaremePreview(params: {
  trajetId?: number;
  vehiculeId: number;
  date: string;
  distanceKm: number;
  allerRetour: boolean;
}): Promise<{
  montant: number;
  tarifKm: number;
  distanceAvantKm: number;
  distanceEffectiveKm: number;
} | null> {
  if (params.distanceKm <= 0) return null;

  const vehicule = await db.getVehiculeById(params.vehiculeId);
  if (!vehicule) return null;

  const year = getYearFromDate(params.date);
  const trajetsExistants = await db.getTrajetsByVehiculeAndYear(
    params.vehiculeId,
    year
  );

  const trajetsSansEdition = trajetsExistants.filter(
    (trajet) => trajet.id !== params.trajetId
  );

  const trajetVirtuel: Trajet = {
    id: params.trajetId ?? Number.MAX_SAFE_INTEGER,
    entry_type: 'trajet',
    date: params.date,
    adresse_depart: '',
    adresse_arrivee: '',
    distance_km: params.distanceKm,
    aller_retour: params.allerRetour,
    motif: '',
    vehicule_id: params.vehiculeId,
    montant_eur: 0,
    statut: 'brouillon',
  };

  const trajets = sortTrajetsChronologically([
    ...trajetsSansEdition,
    trajetVirtuel,
  ]);

  let distanceCumulee = 0;

  for (const trajet of trajets) {
    if (trajet.id === trajetVirtuel.id && trajet.date === trajetVirtuel.date) {
      const montant = calculerMontantTrajetBareme({
        puissanceFiscale: vehicule.puissance_fiscale,
        isElectrique: vehicule.is_electrique,
        distanceAvantKm: distanceCumulee,
        distanceTrajetKm: params.distanceKm,
        allerRetour: params.allerRetour,
      });
      const distanceEffectiveKm = getDistanceEffective(
        params.distanceKm,
        params.allerRetour
      );

      return {
        montant,
        tarifKm:
          distanceEffectiveKm > 0
            ? Math.round((montant / distanceEffectiveKm) * 1000) / 1000
            : 0,
        distanceAvantKm: distanceCumulee,
        distanceEffectiveKm,
      };
    }

    distanceCumulee += getDistanceEffective(
      trajet.distance_km,
      trajet.aller_retour
    );
  }

  return null;
}

export function getVehiculeDescription(vehicule: Pick<Vehicule, 'puissance_fiscale' | 'is_electrique'>): string {
  const motorisation = vehicule.is_electrique
    ? 'Électrique (+20 %)'
    : 'Thermique';
  return `${vehicule.puissance_fiscale} CV • ${motorisation}`;
}
