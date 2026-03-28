const MOIS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

export function formatEuros(amount: number): string {
  return amount.toFixed(2).replace('.', ',') + ' €';
}

export function formatTarifKm(amount: number): string {
  return amount.toFixed(3).replace('.', ',') + ' €';
}

export function formatKm(km: number): string {
  return km.toFixed(1).replace('.', ',') + ' km';
}

export function formatDateFr(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  const m = parseInt(month, 10) - 1;
  return `${parseInt(day, 10)} ${MOIS_FR[m]} ${year}`;
}
