import type { TrajetStatut } from '../types/trajet';

export const STATUTS: Record<
  TrajetStatut,
  { label: string; bgColor: string; textColor: string }
> = {
  brouillon: { label: 'Brouillon', bgColor: '#E3E2E7', textColor: '#46464B' },
  valide: { label: 'Validé', bgColor: '#72FE88', textColor: '#00531C' },
  exporte: { label: 'Exporté', bgColor: '#D8E2FF', textColor: '#004493' },
};
