import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getProStatus,
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
  refreshStatus: () => Promise<boolean>;
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
        await get().loadTripCount();
        try {
          await initializeIAP();
          await get().refreshStatus();

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
        } catch (error) {
          console.warn('IAP initialization failed:', error);
        }
      },

      refreshStatus: async () => {
        try {
          const activePurchase = await getProStatus();
          const isPro = Boolean(
            activePurchase?.productId && isProPurchase(activePurchase.productId),
          );

          set({
            isPro,
            productId: isPro ? activePurchase?.productId ?? null : null,
          });

          return isPro;
        } catch (error) {
          console.warn('Subscription status refresh failed:', error);
          return get().isPro;
        }
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
          set({ isPro: false, productId: null });
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
