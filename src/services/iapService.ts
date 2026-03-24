// Stub IAP service — will be connected to react-native-iap when ready for App Store submission.
// Install react-native-iap, run `npx expo prebuild && cd ios && pod install`, then replace this stub.

// Product IDs to configure in App Store Connect
export const PRODUCT_IDS = {
  MONTHLY: 'kilotrack_pro_monthly',
  YEARLY: 'kilotrack_pro_yearly',
  LIFETIME: 'kilotrack_pro_lifetime',
};

export interface PurchaseInfo {
  productId: string;
  purchaseState: string;
}

export async function initializeIAP(): Promise<void> {
  // No-op in stub mode
}

export function setupPurchaseListeners(
  _onPurchaseSuccess: (purchase: PurchaseInfo) => void,
  _onPurchaseError: (error: { code: string; message: string }) => void,
): void {
  // No-op in stub mode
}

export async function purchaseSubscription(_sku: string): Promise<void> {
  throw new Error('IAP not available — nécessite un development build');
}

export async function purchaseProduct(_sku: string): Promise<void> {
  throw new Error('IAP not available — nécessite un development build');
}

export async function restorePurchases(): Promise<PurchaseInfo[]> {
  return [];
}

export function isProPurchase(productId: string): boolean {
  return Object.values(PRODUCT_IDS).includes(productId);
}
