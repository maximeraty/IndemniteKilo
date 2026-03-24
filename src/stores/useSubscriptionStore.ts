import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  initializeIAP,
  setupPurchaseListeners,
  restorePurchases,
  isProPurchase,
} from '../services/iapService';
import * as db from '../services/db';

export const FREE_TRIP_LIMIT = 10;

export type SubscriptionPlan = 'monthly' | 'yearly' | 'lifetime';

interface SubscriptionState {
  isPro: boolean;
  productId: string | null;
  totalTripCount: number;

  // Actions
  initialize: () => Promise<void>;
  loadTripCount: () => Promise<void>;
  setPro: (productId: string) => void;
  restore: () => Promise<boolean>;
  canCreateTrip: () => boolean;
  isAtLimit: () => boolean;
}

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      isPro: false,
      productId: null,
      totalTripCount: 0,

      initialize: async () => {
        await initializeIAP();
        await get().loadTripCount();

        setupPurchaseListeners(
          (purchase) => {
            if (purchase.productId && isProPurchase(purchase.productId)) {
              set({ isPro: true, productId: purchase.productId });
            }
          },
          (error) => {
            console.warn('Purchase error:', error);
          },
        );
      },

      loadTripCount: async () => {
        try {
          const count = await db.getTotalTrajetCount();
          set({ totalTripCount: count });
        } catch {
          // silent
        }
      },

      setPro: (productId: string) => {
        set({ isPro: true, productId });
      },

      restore: async () => {
        try {
          const purchases = await restorePurchases();
          const proPurchase = purchases.find(
            (p) => p.productId && isProPurchase(p.productId),
          );
          if (proPurchase) {
            set({ isPro: true, productId: proPurchase.productId });
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },

      canCreateTrip: () => {
        const { isPro, totalTripCount } = get();
        return isPro || totalTripCount < FREE_TRIP_LIMIT;
      },

      isAtLimit: () => {
        const { isPro, totalTripCount } = get();
        return !isPro && totalTripCount >= FREE_TRIP_LIMIT;
      },
    }),
    {
      name: 'kilotrack-subscription',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isPro: state.isPro,
        productId: state.productId,
      }),
    },
  ),
);
