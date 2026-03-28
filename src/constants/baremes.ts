// Barème kilométrique URSSAF pour les automobiles.
// Le barème est majoré de 20 % pour les véhicules électriques.

interface BaremeTranche {
  kmMax: number;
  coefficient: number;
  constant: number;
}

interface BaremeEntry {
  cvMin: number;
  cvMax: number;
  tranches: BaremeTranche[];
}

export const BAREMES_URSSAF_VOITURE: BaremeEntry[] = [
  {
    cvMin: 0, cvMax: 3,
    tranches: [
      { kmMax: 5000, coefficient: 0.529, constant: 0 },
      { kmMax: 20000, coefficient: 0.316, constant: 1065 },
      { kmMax: Infinity, coefficient: 0.370, constant: 0 },
    ],
  },
  {
    cvMin: 4, cvMax: 4,
    tranches: [
      { kmMax: 5000, coefficient: 0.606, constant: 0 },
      { kmMax: 20000, coefficient: 0.340, constant: 1330 },
      { kmMax: Infinity, coefficient: 0.407, constant: 0 },
    ],
  },
  {
    cvMin: 5, cvMax: 5,
    tranches: [
      { kmMax: 5000, coefficient: 0.636, constant: 0 },
      { kmMax: 20000, coefficient: 0.357, constant: 1395 },
      { kmMax: Infinity, coefficient: 0.427, constant: 0 },
    ],
  },
  {
    cvMin: 6, cvMax: 6,
    tranches: [
      { kmMax: 5000, coefficient: 0.665, constant: 0 },
      { kmMax: 20000, coefficient: 0.374, constant: 1457 },
      { kmMax: Infinity, coefficient: 0.447, constant: 0 },
    ],
  },
  {
    cvMin: 7, cvMax: Infinity,
    tranches: [
      { kmMax: 5000, coefficient: 0.697, constant: 0 },
      { kmMax: 20000, coefficient: 0.394, constant: 1515 },
      { kmMax: Infinity, coefficient: 0.470, constant: 0 },
    ],
  },
];

function roundToCents(value: number): number {
  return Math.round(value * 100) / 100;
}

export function getDistanceEffective(
  distanceKm: number,
  allerRetour: boolean
): number {
  return allerRetour ? distanceKm * 2 : distanceKm;
}

function calculerIndemniteBrute(
  puissanceFiscale: number,
  distanceAnnuelleKm: number
): number {
  if (puissanceFiscale <= 0 || distanceAnnuelleKm <= 0) return 0;

  const entry = BAREMES_URSSAF_VOITURE.find(
    (b) => puissanceFiscale >= b.cvMin && puissanceFiscale <= b.cvMax
  );
  if (!entry) return 0;

  const tranche = entry.tranches.find((t) => distanceAnnuelleKm <= t.kmMax);
  if (!tranche) return 0;

  return distanceAnnuelleKm * tranche.coefficient + tranche.constant;
}

export function calculerIndemniteBareme(
  puissanceFiscale: number,
  distanceAnnuelleKm: number,
  isElectrique = false
): number {
  const montant = calculerIndemniteBrute(
    puissanceFiscale,
    distanceAnnuelleKm
  );
  const majore = isElectrique ? montant * 1.2 : montant;
  return roundToCents(majore);
}

export function getTarifParKm(
  puissanceFiscale: number,
  distanceAnnuelleEstimee: number,
  isElectrique = false
): number {
  const montantTotal = calculerIndemniteBareme(
    puissanceFiscale,
    distanceAnnuelleEstimee,
    isElectrique
  );
  if (distanceAnnuelleEstimee === 0) return 0;
  return Math.round((montantTotal / distanceAnnuelleEstimee) * 1000) / 1000;
}

export function calculerMontantTrajetBareme(params: {
  puissanceFiscale: number;
  isElectrique: boolean;
  distanceAvantKm: number;
  distanceTrajetKm: number;
  allerRetour: boolean;
}): number {
  const distanceEffective = getDistanceEffective(
    params.distanceTrajetKm,
    params.allerRetour
  );
  if (distanceEffective <= 0) return 0;

  const totalAvant = calculerIndemniteBareme(
    params.puissanceFiscale,
    params.distanceAvantKm,
    params.isElectrique
  );
  const totalApres = calculerIndemniteBareme(
    params.puissanceFiscale,
    params.distanceAvantKm + distanceEffective,
    params.isElectrique
  );

  return roundToCents(totalApres - totalAvant);
}
