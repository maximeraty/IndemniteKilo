export function calculerMontant(
  distanceKm: number,
  tarifKm: number,
  allerRetour: boolean
): number {
  const distanceEffective = allerRetour ? distanceKm * 2 : distanceKm;
  return Math.round(distanceEffective * tarifKm * 100) / 100;
}
