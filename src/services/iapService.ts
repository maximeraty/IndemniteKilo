import { Platform } from 'react-native';
import {
  ErrorCode,
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  restorePurchases as restoreStorePurchases,
  type Product,
  type ProductSubscription,
  type Purchase,
  type PurchaseError,
} from 'expo-iap';

// Product IDs to configure in App Store Connect
export const PRODUCT_IDS = {
  MONTHLY: 'kilotrack_pro_monthly',
  YEARLY: 'kilotrack_pro_yearly',
  LIFETIME: 'kilotrack_pro_lifetime',
};

const SUBSCRIPTION_IDS = [PRODUCT_IDS.MONTHLY, PRODUCT_IDS.YEARLY];
const NON_CONSUMABLE_IDS = [PRODUCT_IDS.LIFETIME];

export interface StoreProductInfo {
  id: string;
  title: string;
  description: string;
  displayPrice: string;
  type: 'in-app' | 'subs';
}

export interface PurchaseInfo {
  productId: string;
  purchaseState: string;
}

type PurchaseSuccessCallback = (purchase: PurchaseInfo) => void;
type PurchaseErrorCallback = (error: { code: string; message: string }) => void;

let connectionReady = false;
let listenersReady = false;
let catalogPromise: Promise<StoreProductInfo[]> | null = null;
let catalogCache = new Map<string, StoreProductInfo>();
let purchaseUpdateSubscription: { remove: () => void } | null = null;
let purchaseErrorSubscription: { remove: () => void } | null = null;
const successCallbacks = new Set<PurchaseSuccessCallback>();
const errorCallbacks = new Set<PurchaseErrorCallback>();
const processedPurchases = new Set<string>();

function isNativeIapPlatform() {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

function normalizePurchase(purchase: Purchase): PurchaseInfo {
  return {
    productId: purchase.productId,
    purchaseState: purchase.purchaseState,
  };
}

function normalizeProduct(
  product: Product | ProductSubscription,
): StoreProductInfo {
  return {
    id: product.id,
    title: product.title,
    description: product.description,
    displayPrice: product.displayPrice,
    type: product.type,
  };
}

function normalizeError(error: unknown): { code: string; message: string } {
  const purchaseError = error as PurchaseError | undefined;
  return {
    code: purchaseError?.code ?? ErrorCode.Unknown,
    message: purchaseError?.message ?? 'Une erreur inconnue est survenue.',
  };
}

function emitPurchaseError(error: { code: string; message: string }) {
  for (const callback of errorCallbacks) {
    callback(error);
  }
}

async function ensureConnection() {
  if (!isNativeIapPlatform() || connectionReady) {
    return;
  }

  await initConnection();
  connectionReady = true;
}

async function loadCatalog(): Promise<StoreProductInfo[]> {
  if (!isNativeIapPlatform()) {
    return [];
  }

  if (catalogPromise) {
    return catalogPromise;
  }

  catalogPromise = (async () => {
    await ensureConnection();

    const [subscriptions, products] = await Promise.all([
      fetchProducts({ skus: SUBSCRIPTION_IDS, type: 'subs' }) as Promise<ProductSubscription[]>,
      fetchProducts({ skus: NON_CONSUMABLE_IDS, type: 'in-app' }) as Promise<Product[]>,
    ]);

    const nextCatalog = [...subscriptions, ...products].map(normalizeProduct);
    catalogCache = new Map(nextCatalog.map((item) => [item.id, item]));

    return nextCatalog;
  })();

  try {
    return await catalogPromise;
  } finally {
    catalogPromise = null;
  }
}

async function getActivePurchases(): Promise<PurchaseInfo[]> {
  if (!isNativeIapPlatform()) {
    return [];
  }

  await ensureConnection();
  const purchases = await getAvailablePurchases({
    onlyIncludeActiveItemsIOS: true,
  });

  return purchases
    .filter((purchase) => isProPurchase(purchase.productId))
    .map(normalizePurchase);
}

async function ensureProductAvailable(productId: string) {
  const catalog = await loadCatalog();
  if (!catalog.some((product) => product.id === productId)) {
    throw {
      code: ErrorCode.ItemUnavailable,
      message:
        "Le produit n'est pas disponible. Vérifiez sa configuration dans App Store Connect ou Google Play Console.",
    };
  }
}

export async function initializeIAP(): Promise<void> {
  if (!isNativeIapPlatform()) {
    return;
  }

  await ensureConnection();
  await loadCatalog();
}

export function setupPurchaseListeners(
  onPurchaseSuccess: PurchaseSuccessCallback,
  onPurchaseError: PurchaseErrorCallback,
): void {
  successCallbacks.add(onPurchaseSuccess);
  errorCallbacks.add(onPurchaseError);

  if (!isNativeIapPlatform() || listenersReady) {
    return;
  }

  purchaseUpdateSubscription = purchaseUpdatedListener(async (purchase) => {
    if (!isProPurchase(purchase.productId)) {
      return;
    }

    const purchaseKey =
      purchase.purchaseToken ||
      purchase.id ||
      `${purchase.productId}:${purchase.transactionDate}`;

    if (processedPurchases.has(purchaseKey)) {
      return;
    }

    processedPurchases.add(purchaseKey);

    try {
      const normalized = normalizePurchase(purchase);
      for (const callback of successCallbacks) {
        callback(normalized);
      }

      await finishTransaction({
        purchase,
        isConsumable: false,
      });
    } catch (error) {
      processedPurchases.delete(purchaseKey);
      emitPurchaseError(normalizeError(error));
    }
  });

  purchaseErrorSubscription = purchaseErrorListener((error) => {
    emitPurchaseError(normalizeError(error));
  });

  listenersReady = true;
}

export async function getProducts(): Promise<StoreProductInfo[]> {
  const cachedProducts = Array.from(catalogCache.values());
  if (cachedProducts.length > 0) {
    return cachedProducts;
  }

  return loadCatalog();
}

export async function purchaseSubscription(sku: string): Promise<void> {
  if (!isNativeIapPlatform()) {
    throw {
      code: ErrorCode.IapNotAvailable,
      message: 'Les achats intégrés ne sont pas disponibles sur cette plateforme.',
    };
  }

  await ensureProductAvailable(sku);
  await requestPurchase({
    request: {
      apple: { sku },
      google: { skus: [sku] },
    },
    type: 'subs',
  });
}

export async function purchaseProduct(sku: string): Promise<void> {
  if (!isNativeIapPlatform()) {
    throw {
      code: ErrorCode.IapNotAvailable,
      message: 'Les achats intégrés ne sont pas disponibles sur cette plateforme.',
    };
  }

  await ensureProductAvailable(sku);
  await requestPurchase({
    request: {
      apple: { sku },
      google: { skus: [sku] },
    },
    type: 'in-app',
  });
}

export async function restorePurchases(): Promise<PurchaseInfo[]> {
  if (!isNativeIapPlatform()) {
    return [];
  }

  await ensureConnection();
  await restoreStorePurchases();
  return getActivePurchases();
}

export async function getProStatus(): Promise<PurchaseInfo | null> {
  const purchases = await getActivePurchases();
  return purchases[0] ?? null;
}

export function isProPurchase(productId: string): boolean {
  return Object.values(PRODUCT_IDS).includes(productId);
}

export function cleanupIAP(): void {
  purchaseUpdateSubscription?.remove();
  purchaseErrorSubscription?.remove();
  purchaseUpdateSubscription = null;
  purchaseErrorSubscription = null;
  listenersReady = false;
}
