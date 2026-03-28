import { create } from 'zustand';
import * as db from '../services/db';
import { recalculateTrajetAmountsForVehicleYear } from '../services/indemniteService';
import { getCurrentYearMonth } from '../utils/dateUtils';
import { useSubscriptionStore } from './useSubscriptionStore';
import type { Trajet, TrajetStatut, TrajetFormData } from '../types/trajet';
import type { Horodatage, HorodatageFormData } from '../types/horodatage';

interface TrajetState {
  trajets: Trajet[];
  horodatages: Horodatage[];
  currentMonth: string;
  monthlySummary: db.MonthlySummary | null;
  isLoading: boolean;
  error: string | null;
  loadTrajets: () => Promise<void>;
  loadMonthlySummary: () => Promise<void>;
  setCurrentMonth: (month: string) => void;
  addTrajet: (data: TrajetFormData) => Promise<number>;
  editTrajet: (id: number, data: TrajetFormData) => Promise<void>;
  removeTrajet: (id: number) => Promise<void>;
  addHorodatage: (data: HorodatageFormData) => Promise<number>;
  editHorodatage: (id: number, data: HorodatageFormData) => Promise<void>;
  removeHorodatage: (id: number) => Promise<void>;
  changeStatut: (id: number, statut: TrajetStatut) => Promise<void>;
}

export const useTrajetStore = create<TrajetState>((set, get) => ({
  trajets: [],
  horodatages: [],
  currentMonth: getCurrentYearMonth(),
  monthlySummary: null,
  isLoading: false,
  error: null,

  loadTrajets: async () => {
    set({ isLoading: true, error: null });
    try {
      const [trajets, horodatages] = await Promise.all([
        db.getTrajetsByMonth(get().currentMonth),
        db.getHorodatagesByMonth(get().currentMonth),
      ]);
      set({ trajets, horodatages, isLoading: false });
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
    }
  },

  loadMonthlySummary: async () => {
    try {
      const summary = await db.getMonthlySummary(get().currentMonth);
      set({ monthlySummary: summary });
    } catch {
      // silent
    }
  },

  setCurrentMonth: (month) => {
    set({ currentMonth: month });
  },

  addTrajet: async (data) => {
    const id = await db.insertTrajet({
      date: data.date,
      adresse_depart: data.adresse_depart,
      adresse_arrivee: data.adresse_arrivee,
      distance_km: data.distance_km!,
      aller_retour: data.aller_retour,
      motif: data.motif,
      vehicule_id: data.vehicule_id!,
      montant_eur: 0,
    });
    await recalculateTrajetAmountsForVehicleYear(
      data.vehicule_id!,
      data.date.slice(0, 4)
    );
    await get().loadTrajets();
    await get().loadMonthlySummary();
    // Update trip count for paywall
    useSubscriptionStore.getState().loadTripCount();
    return id;
  },

  editTrajet: async (id, data) => {
    const existingTrajet = await db.getTrajetById(id);
    if (!existingTrajet) return;

    await db.updateTrajet(id, {
      date: data.date,
      adresse_depart: data.adresse_depart,
      adresse_arrivee: data.adresse_arrivee,
      distance_km: data.distance_km!,
      aller_retour: data.aller_retour,
      motif: data.motif,
      vehicule_id: data.vehicule_id!,
      montant_eur: 0,
    });

    const affectedPeriods = new Map<string, { vehiculeId: number; year: string }>();
    affectedPeriods.set(
      `${existingTrajet.vehicule_id}-${existingTrajet.date.slice(0, 4)}`,
      {
        vehiculeId: existingTrajet.vehicule_id,
        year: existingTrajet.date.slice(0, 4),
      }
    );
    affectedPeriods.set(
      `${data.vehicule_id!}-${data.date.slice(0, 4)}`,
      {
        vehiculeId: data.vehicule_id!,
        year: data.date.slice(0, 4),
      }
    );

    for (const { vehiculeId, year } of affectedPeriods.values()) {
      await recalculateTrajetAmountsForVehicleYear(vehiculeId, year);
    }

    await get().loadTrajets();
    await get().loadMonthlySummary();
  },

  removeTrajet: async (id) => {
    const existingTrajet = await db.getTrajetById(id);
    await db.deleteTrajet(id);
    if (existingTrajet) {
      await recalculateTrajetAmountsForVehicleYear(
        existingTrajet.vehicule_id,
        existingTrajet.date.slice(0, 4)
      );
    }
    await get().loadTrajets();
    await get().loadMonthlySummary();
    useSubscriptionStore.getState().loadTripCount();
  },

  addHorodatage: async (data) => {
    const id = await db.insertHorodatage({
      date: data.date,
      heure: data.heure,
      kilometrage_km: data.kilometrage_km!,
      note: data.note,
      vehicule_id: data.vehicule_id!,
    });
    await get().loadTrajets();
    return id;
  },

  editHorodatage: async (id, data) => {
    await db.updateHorodatage(id, {
      date: data.date,
      heure: data.heure,
      kilometrage_km: data.kilometrage_km!,
      note: data.note,
      vehicule_id: data.vehicule_id!,
    });
    await get().loadTrajets();
  },

  removeHorodatage: async (id) => {
    await db.deleteHorodatage(id);
    await get().loadTrajets();
  },

  changeStatut: async (id, statut) => {
    await db.updateTrajetStatut(id, statut);
    await get().loadTrajets();
  },
}));
