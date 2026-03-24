import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsState {
  userName: string;
  companyName: string;
  defaultVehiculeId: number | null;
  updateProfile: (data: Partial<Pick<SettingsState, 'userName' | 'companyName'>>) => void;
  setDefaultVehicule: (id: number | null) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      userName: '',
      companyName: '',
      defaultVehiculeId: null,

      updateProfile: (data) => set(data),
      setDefaultVehicule: (id) => set({ defaultVehiculeId: id }),
    }),
    {
      name: 'kilotrack-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
