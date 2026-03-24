import { create } from 'zustand';
import * as db from '../services/db';
import * as exportService from '../services/exportService';
import { useSettingsStore } from './useSettingsStore';
import { getMonthRange, getCurrentYearMonth } from '../utils/dateUtils';
import type { RapportFilters, RapportData } from '../types/rapport';
import type { TrajetStatut } from '../types/trajet';

interface ReportState {
  filters: RapportFilters;
  reportData: RapportData | null;
  isGenerating: boolean;
  setFilters: (filters: Partial<RapportFilters>) => void;
  generateReport: () => Promise<void>;
  exportPDF: () => Promise<string>;
  exportExcel: () => Promise<string>;
  shareFile: (uri: string) => Promise<void>;
}

export const useReportStore = create<ReportState>((set, get) => {
  const currentMonth = getCurrentYearMonth();
  const { start, end } = getMonthRange(currentMonth);

  return {
    filters: {
      date_debut: start,
      date_fin: end,
      vehicule_id: null,
      statut: null,
    },
    reportData: null,
    isGenerating: false,

    setFilters: (updates) =>
      set((state) => ({
        filters: { ...state.filters, ...updates },
        reportData: null,
      })),

    generateReport: async () => {
      set({ isGenerating: true });
      try {
        const { filters } = get();
        const [trajets, rawHorodatages, vehicules] = await Promise.all([
          db.getTrajetsByPeriod(
            filters.date_debut,
            filters.date_fin,
            filters.vehicule_id,
            filters.statut
          ),
          db.getHorodatagesByPeriod(
            filters.date_debut,
            filters.date_fin,
            filters.vehicule_id
          ),
          db.getAllVehicules(),
        ]);
        const vehiculeNames = new Map(vehicules.map((vehicule) => [vehicule.id, vehicule.nom]));
        const horodatages = rawHorodatages.map((horodatage) => ({
          ...horodatage,
          vehicule_nom: vehiculeNames.get(horodatage.vehicule_id) ?? '',
        }));

        const total_km = trajets.reduce((sum, t) => sum + t.distance_km, 0);
        const total_eur = trajets.reduce((sum, t) => sum + t.montant_eur, 0);

        const settings = useSettingsStore.getState();
        const reportData: RapportData = {
          trajets,
          horodatages,
          total_km: Math.round(total_km * 10) / 10,
          total_eur: Math.round(total_eur * 100) / 100,
          periode: `${filters.date_debut} au ${filters.date_fin}`,
          nom_utilisateur: settings.userName || 'Non renseigné',
          entreprise: settings.companyName,
        };

        set({ reportData, isGenerating: false });
      } catch {
        set({ isGenerating: false });
        throw new Error('Impossible de générer le rapport');
      }
    },

    exportPDF: async () => {
      const { reportData } = get();
      if (!reportData) throw new Error('Générez d\'abord un rapport');
      const uri = await exportService.generatePDF(reportData);
      await db.markTrajetsAsExported(reportData.trajets.map((t) => t.id));
      return uri;
    },

    exportExcel: async () => {
      const { reportData } = get();
      if (!reportData) throw new Error('Générez d\'abord un rapport');
      const uri = await exportService.generateExcel(reportData);
      await db.markTrajetsAsExported(reportData.trajets.map((t) => t.id));
      return uri;
    },

    shareFile: exportService.shareFile,
  };
});
