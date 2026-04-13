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
const REQUESTED_PRODUCT_IDS = [...SUBSCRIPTION_IDS, ...NON_CONSUMABLE_IDS];

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

export type IapCatalogStatus = 'ready' | 'empty' | 'error' | 'unsupported';

export interface IapCatalogState {
  productsById: Record<string, StoreProductInfo>;
  isLoading: boolean;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  requestedProductIds: string[];
  returnedProductIds: string[];
  connectionInitialized: boolean;
  catalogStatus: IapCatalogStatus;
}

type PurchaseSuccessCallback = (purchase: PurchaseInfo) => void;
type PurchaseErrorCallback = (error: { code: string; message: string }) => void;

let connectionReady = false;
let listenersReady = false;
let catalogPromise: Promise<IapCatalogState> | null = null;
let catalogCache = new Map<string, StoreProductInfo>();
let purchaseUpdateSubscription: { remove: () => void } | null = null;
let purchaseErrorSubscription: { remove: () => void } | null = null;
const successCallbacks = new Set<PurchaseSuccessCallback>();
const errorCallbacks = new Set<PurchaseErrorCallback>();
const processedPurchases = new Set<string>();
let catalogState: IapCatalogState = createInitialCatalogState();

function isNativeIapPlatform() {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

function createInitialCatalogState(): IapCatalogState {
  const isNativePlatform = isNativeIapPlatform();

  return {
    productsById: {},
    isLoading: isNativePlatform,
    lastErrorCode: null,
    lastErrorMessage: null,
    requestedProductIds: REQUESTED_PRODUCT_IDS,
    returnedProductIds: [],
    connectionInitialized: connectionReady,
    catalogStatus: isNativePlatform ? 'empty' : 'unsupported',
  };
}

function updateCatalogState(
  partial: Partial<IapCatalogState>,
): IapCatalogState {
  catalogState = {
    ...catalogState,
    ...partial,
    connectionInitialized: partial.connectionInitialized ?? connectionReady,
    requestedProductIds: partial.requestedProductIds ?? REQUESTED_PRODUCT_IDS,
  };

  return catalogState;
}

function productsToRecord(
  products: StoreProductInfo[],
): Record<string, StoreProductInfo> {
  return products.reduce<Record<string, StoreProductInfo>>((acc, product) => {
    acc[product.id] = product;
    return acc;
  }, {});
}

function logInfo(message: string, details?: Record<string, unknown>) {
  if (details) {
    console.info(`[IAP] ${message}`, details);
    return;
  }

  console.info(`[IAP] ${message}`);
}

function logWarn(message: string, details?: Record<string, unknown>) {
  if (details) {
    console.warn(`[IAP] ${message}`, details);
    return;
  }

  console.warn(`[IAP] ${message}`);
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

function isMissingExpoIapNativeModule(error: { code: string; message: string }) {
  return error.code === ErrorCode.Unknown && error.message.includes("Cannot find native module 'ExpoIap'");
}

function emitPurchaseError(error: { code: string; message: string }) {
  for (const callback of errorCallbacks) {
    callback(error);
  }
}

async function ensureConnection() {
  if (!isNativeIapPlatform() || connectionReady) {
    updateCatalogState({
      connectionInitialized: connectionReady,
      catalogStatus: isNativeIapPlatform() ? catalogState.catalogStatus : 'unsupported',
    });
    return;
  }

  try {
    await initConnection();
    connectionReady = true;
    updateCatalogState({
      connectionInitialized: true,
    });
    logInfo('Connection initialized', {
      platform: Platform.OS,
      requestedProductIds: REQUESTED_PRODUCT_IDS,
    });
  } catch (error) {
    const normalizedError = normalizeError(error);
    updateCatalogState({
      connectionInitialized: false,
      catalogStatus: 'error',
      lastErrorCode: normalizedError.code,
      lastErrorMessage: getDiagnosticMessage(normalizedError),
    });
    logWarn('Connection initialization failed', {
      code: normalizedError.code,
      message: normalizedError.message,
      platform: Platform.OS,
    });
    throw error;
  }
}

function getCatalogEmptyMessage() {
  return "Aucune offre App Store n'a été renvoyée pour les identifiants configurés. Vérifiez le Paid Apps Agreement, la capacité In-App Purchase, le bundle ID com.maximeraty.indemnitekilo et la configuration des produits dans App Store Connect.";
}

function getDiagnosticMessage(error: { code: string; message: string }) {
  if (isMissingExpoIapNativeModule(error)) {
    return "Ce build iOS ne contient pas le module natif expo-iap. Réinstallez un build natif récent sur l'appareil. Les achats intégrés ne fonctionneront pas dans Expo Go ni dans un ancien dev build.";
  }

  switch (error.code) {
    case ErrorCode.IapNotAvailable:
      return 'Les achats intégrés ne sont pas disponibles sur cet appareil ou sur ce build.';
    case ErrorCode.InitConnection:
      return "La connexion à StoreKit a échoué. Vérifiez la capacité In-App Purchase et la signature du build.";
    case ErrorCode.NetworkError:
      return "La connexion au Store a échoué. Vérifiez l'accès réseau puis réessayez.";
    case ErrorCode.ItemUnavailable:
      return getCatalogEmptyMessage();
    default:
      return error.message || "Les offres App Store n'ont pas pu être chargées.";
  }
}

async function loadCatalog({
  forceRefresh = false,
}: {
  forceRefresh?: boolean;
} = {}): Promise<IapCatalogState> {
  if (!isNativeIapPlatform()) {
    return updateCatalogState({
      productsById: {},
      isLoading: false,
      lastErrorCode: ErrorCode.IapNotAvailable,
      lastErrorMessage: 'Les achats intégrés ne sont pas disponibles sur cette plateforme.',
      returnedProductIds: [],
      catalogStatus: 'unsupported',
    });
  }

  if (!forceRefresh && catalogPromise) {
    return catalogPromise;
  }

  if (!forceRefresh && catalogCache.size > 0) {
    return updateCatalogState({
      productsById: productsToRecord(Array.from(catalogCache.values())),
      isLoading: false,
      lastErrorCode: null,
      lastErrorMessage: null,
      returnedProductIds: Array.from(catalogCache.keys()),
      connectionInitialized: connectionReady,
      catalogStatus: 'ready',
    });
  }

  if (forceRefresh) {
    catalogCache = new Map();
  }

  updateCatalogState({
    isLoading: true,
    lastErrorCode: null,
    lastErrorMessage: null,
    requestedProductIds: REQUESTED_PRODUCT_IDS,
  });

  catalogPromise = (async () => {
    try {
      await ensureConnection();

      const [subscriptions, products] = await Promise.all([
        fetchProducts({ skus: SUBSCRIPTION_IDS, type: 'subs' }) as Promise<ProductSubscription[]>,
        fetchProducts({ skus: NON_CONSUMABLE_IDS, type: 'in-app' }) as Promise<Product[]>,
      ]);

      const nextCatalog = [...subscriptions, ...products].map(normalizeProduct);
      catalogCache = new Map(nextCatalog.map((item) => [item.id, item]));

      if (nextCatalog.length === 0) {
        const nextState = updateCatalogState({
          productsById: {},
          isLoading: false,
          lastErrorCode: ErrorCode.ItemUnavailable,
          lastErrorMessage: getCatalogEmptyMessage(),
          returnedProductIds: [],
          catalogStatus: 'empty',
          connectionInitialized: connectionReady,
        });

        logWarn('Catalog returned no products', {
          requestedProductIds: REQUESTED_PRODUCT_IDS,
          returnedProductIds: [],
          bundleIdentifier: 'com.maximeraty.indemnitekilo',
        });

        return nextState;
      }

      const nextState = updateCatalogState({
        productsById: productsToRecord(nextCatalog),
        isLoading: false,
        lastErrorCode: null,
        lastErrorMessage: null,
        returnedProductIds: nextCatalog.map((product) => product.id),
        catalogStatus: 'ready',
        connectionInitialized: connectionReady,
      });

      logInfo('Catalog loaded', {
        requestedProductIds: REQUESTED_PRODUCT_IDS,
        returnedProductIds: nextState.returnedProductIds,
      });

      return nextState;
    } catch (error) {
      const normalizedError = normalizeError(error);
      const nextState = updateCatalogState({
        productsById: {},
        isLoading: false,
        lastErrorCode: normalizedError.code,
        lastErrorMessage: getDiagnosticMessage(normalizedError),
        returnedProductIds: [],
        catalogStatus: 'error',
        connectionInitialized: connectionReady,
      });

      logWarn('Catalog loading failed', {
        code: normalizedError.code,
        message: normalizedError.message,
        requestedProductIds: REQUESTED_PRODUCT_IDS,
      });

      return nextState;
    }
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
  const nextCatalogState = await loadCatalog({
    forceRefresh: catalogState.catalogStatus !== 'ready',
  });

  if (!nextCatalogState.productsById[productId]) {
    throw {
      code: ErrorCode.ItemUnavailable,
      message: nextCatalogState.lastErrorMessage || getCatalogEmptyMessage(),
    };
  }
}

export async function initializeIAP(): Promise<void> {
  if (!isNativeIapPlatform()) {
    return;
  }

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
  const nextCatalogState = await loadCatalog();
  return Object.values(nextCatalogState.productsById);
}

export async function loadProductsCatalog({
  forceRefresh = false,
}: {
  forceRefresh?: boolean;
} = {}): Promise<IapCatalogState> {
  return loadCatalog({ forceRefresh });
}

export function getIapCatalogState(): IapCatalogState {
  return catalogState;
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
