import { create } from 'zustand';
import * as db from '../services/db';
import type { Vehicule, VehiculeFormData } from '../types/vehicule';

interface VehiculeState {
  vehicules: Vehicule[];
  isLoading: boolean;
  error: string | null;
  loadVehicules: () => Promise<void>;
  addVehicule: (data: VehiculeFormData) => Promise<number>;
  editVehicule: (id: number, data: VehiculeFormData) => Promise<void>;
  removeVehicule: (id: number) => Promise<void>;
}

export const useVehiculeStore = create<VehiculeState>((set) => ({
  vehicules: [],
  isLoading: false,
  error: null,

  loadVehicules: async () => {
    set({ isLoading: true, error: null });
    try {
      const vehicules = await db.getAllVehicules();
      set({ vehicules, isLoading: false });
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
    }
  },

  addVehicule: async (data) => {
    const id = await db.insertVehicule(data);
    const vehicules = await db.getAllVehicules();
    set({ vehicules });
    return id;
  },

  editVehicule: async (id, data) => {
    await db.updateVehicule(id, data);
    const vehicules = await db.getAllVehicules();
    set({ vehicules });
  },

  removeVehicule: async (id) => {
    await db.deleteVehicule(id);
    const vehicules = await db.getAllVehicules();
    set({ vehicules });
  },
}));
