import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ErrorCode } from 'expo-iap';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LEGAL_URLS } from '../constants/legal';
import { useSubscriptionStore, type SubscriptionPlan } from '../stores/useSubscriptionStore';
import {
  PRODUCT_IDS,
  purchaseProduct,
  purchaseSubscription,
  type IapCatalogState,
} from '../services/iapService';
import { useTheme } from '../theme/ThemeContext';

type PaywallScreenProps = NativeStackScreenProps<any, 'Paywall'>;

const PLANS: {
  key: SubscriptionPlan;
  title: string;
  subtitle: string;
  fallbackPrice: string;
  billingLabel: string;
  billedTodayLabel: string;
  productId: string;
  featured: boolean;
  badge?: string;
}[] = [
  {
    key: 'monthly',
    title: 'Mensuel',
    subtitle: 'Sans engagement',
    fallbackPrice: '4,99 €',
    billingLabel: 'par mois',
    billedTodayLabel: 'Facturé chaque mois',
    productId: PRODUCT_IDS.MONTHLY,
    featured: false,
  },
  {
    key: 'yearly',
    title: 'Annuel',
    subtitle: 'Économisez 40%',
    fallbackPrice: '34,99 €',
    billingLabel: 'par an',
    billedTodayLabel: 'Facturé chaque année',
    productId: PRODUCT_IDS.YEARLY,
    featured: true,
    badge: 'Meilleure Offre',
  },
  {
    key: 'lifetime',
    title: 'À vie',
    subtitle: 'Paiement unique',
    fallbackPrice: '99,99 €',
    billingLabel: 'à vie',
    billedTodayLabel: 'Paiement unique',
    productId: PRODUCT_IDS.LIFETIME,
    featured: false,
  },
];

const FEATURES = [
  'Trajets illimités',
  'Exports PDF & Excel illimités',
];

function getCatalogStatusTitle(catalog: IapCatalogState) {
  switch (catalog.catalogStatus) {
    case 'unsupported':
      return 'Achats indisponibles sur ce build';
    case 'error':
      return 'Connexion App Store impossible';
    case 'empty':
      return 'Offres App Store indisponibles';
    default:
      return '';
  }
}

function getCatalogStatusMessage(catalog: IapCatalogState) {
  if (catalog.lastErrorMessage) {
    return catalog.lastErrorMessage;
  }

  switch (catalog.catalogStatus) {
    case 'unsupported':
      return 'Les achats intégrés ne sont pas disponibles sur cet environnement.';
    case 'error':
      return "Les offres App Store n'ont pas pu être chargées pour le moment.";
    case 'empty':
      return "Aucune offre n'a été retournée par l'App Store.";
    default:
      return '';
  }
}

export function PaywallScreen({ navigation }: PaywallScreenProps) {
  const { colors } = useTheme();
  const restore = useSubscriptionStore((state) => state.restore);
  const iapCatalog = useSubscriptionStore((state) => state.iapCatalog);
  const refreshIapCatalog = useSubscriptionStore((state) => state.refreshIapCatalog);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('yearly');
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    void refreshIapCatalog();
  }, [refreshIapCatalog]);

  useEffect(() => {
    if (iapCatalog.isLoading) {
      return;
    }

    const currentPlan = PLANS.find((plan) => plan.key === selectedPlan);
    if (currentPlan && iapCatalog.productsById[currentPlan.productId]) {
      return;
    }

    const firstAvailablePlan = PLANS.find((plan) => iapCatalog.productsById[plan.productId]);
    if (firstAvailablePlan && firstAvailablePlan.key !== selectedPlan) {
      setSelectedPlan(firstAvailablePlan.key);
    }
  }, [iapCatalog.isLoading, iapCatalog.productsById, selectedPlan]);

  const isLoadingProducts = iapCatalog.isLoading;
  const selectedPlanConfig = PLANS.find((plan) => plan.key === selectedPlan);
  const selectedProductId = selectedPlanConfig?.productId;
  const selectedProduct = selectedProductId ? iapCatalog.productsById[selectedProductId] : undefined;
  const selectedPrice = selectedProduct?.displayPrice || selectedPlanConfig?.fallbackPrice || '--';
  const hasCatalogIssue = ['empty', 'error', 'unsupported'].includes(iapCatalog.catalogStatus);
  const hasAnyStoreProduct = iapCatalog.returnedProductIds.length > 0;
  const canPurchaseSelectedPlan = Boolean(selectedProduct) && !isLoadingProducts;
  const diagnosticTitle = getCatalogStatusTitle(iapCatalog);
  const diagnosticMessage = getCatalogStatusMessage(iapCatalog);

  const handleReloadCatalog = useCallback(async () => {
    await refreshIapCatalog(true);
  }, [refreshIapCatalog]);

  const handlePurchase = useCallback(async () => {
    const plan = PLANS.find((p) => p.key === selectedPlan);
    if (!plan) {
      return;
    }

    if (!selectedProduct) {
      Alert.alert('Offres indisponibles', diagnosticMessage);
      return;
    }

    setIsPurchasing(true);
    try {
      if (plan.key === 'lifetime') {
        await purchaseProduct(plan.productId);
      } else {
        await purchaseSubscription(plan.productId);
      }
      navigation.goBack();
    } catch (err: any) {
      if (err?.code !== ErrorCode.UserCancelled) {
        Alert.alert(
          'Erreur',
          err?.message || "L'achat n'a pas pu être finalisé. Veuillez réessayer.",
        );
      }
    } finally {
      setIsPurchasing(false);
    }
  }, [diagnosticMessage, navigation, selectedPlan, selectedProduct]);

  const handleRestore = useCallback(async () => {
    setIsRestoring(true);
    try {
      const restored = await restore();
      if (restored) {
        Alert.alert('Succès', 'Votre abonnement a été restauré.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Aucun achat', "Aucun abonnement actif n'a été trouvé.");
      }
    } catch {
      Alert.alert('Erreur', 'Impossible de restaurer les achats.');
    } finally {
      setIsRestoring(false);
    }
  }, [navigation, restore]);

  const openLegalUrl = useCallback(async (url: string, label: string) => {
    if (!url) {
      Alert.alert(
        'Lien manquant',
        `Configurez l'URL ${label.toLowerCase()} dans src/constants/legal.ts avant la soumission App Store.`,
      );
      return;
    }

    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        throw new Error('unsupported-url');
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert('Erreur', `Impossible d'ouvrir ${label.toLowerCase()}.`);
    }
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="close" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>KiloTrack Pro</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <Ionicons name="car" size={36} color="#FFFFFF" />
            <View style={styles.heroLocationPin}>
              <Ionicons name="location" size={18} color="#72FE88" />
            </View>
          </View>

          <Text style={[styles.heroTitle, { color: colors.text }]}>
            Débloquez tout avec Kilotrack Pro
          </Text>
          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
            Enregistrez plus de 10 trajets et exportez vos rapports sans limites.
          </Text>
        </View>

        <View style={styles.featuresSection}>
          {FEATURES.map((feature) => (
            <View
              key={feature}
              style={[styles.featureRow, { backgroundColor: colors.surfaceSecondary }]}
            >
              <View style={styles.featureCheck}>
                <Ionicons name="checkmark" size={18} color="#00531C" />
              </View>
              <Text style={[styles.featureText, { color: colors.text }]}>{feature}</Text>
            </View>
          ))}
        </View>

        <View style={styles.plansSection}>
          {PLANS.map((plan) => {
            const isSelected = selectedPlan === plan.key;
            const storeProduct = iapCatalog.productsById[plan.productId];
            const price = storeProduct?.displayPrice || plan.fallbackPrice;
            const isAvailable = Boolean(storeProduct);
            const isDisabled = !isAvailable && !isLoadingProducts;

            if (plan.featured) {
              return (
                <TouchableOpacity
                  key={plan.key}
                  activeOpacity={0.8}
                  onPress={() => setSelectedPlan(plan.key)}
                  disabled={isDisabled}
                >
                  <View
                    style={[
                      styles.planCard,
                      styles.planCardFeatured,
                      isSelected && styles.planCardSelected,
                      isDisabled && styles.planCardDisabled,
                    ]}
                  >
                    {plan.badge ? (
                      <View style={styles.planBadge}>
                        <Text style={styles.planBadgeText}>{plan.badge}</Text>
                      </View>
                    ) : null}
                    <View style={styles.planContent}>
                      <View>
                        <Text style={styles.planTitleWhite}>{plan.title}</Text>
                        <Text style={styles.planSubtitleFeatured}>{plan.subtitle}</Text>
                        {isDisabled ? (
                          <Text style={styles.planUnavailableText}>Produit indisponible</Text>
                        ) : null}
                      </View>
                      <View style={styles.planPriceRight}>
                        <Text style={styles.planPriceWhite}>{price}</Text>
                        <Text style={styles.planPriceLabelFeatured}>{plan.billingLabel}</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }

            return (
              <TouchableOpacity
                key={plan.key}
                style={[
                  styles.planCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: isSelected ? colors.primary : 'transparent',
                  },
                  isDisabled && styles.planCardDisabled,
                ]}
                activeOpacity={0.8}
                onPress={() => setSelectedPlan(plan.key)}
                disabled={isDisabled}
              >
                <View style={styles.planContent}>
                  <View>
                    <Text style={[styles.planTitle, { color: colors.text }]}>{plan.title}</Text>
                    <Text style={[styles.planSubtitle, { color: colors.textSecondary }]}>
                      {plan.subtitle}
                    </Text>
                    {isDisabled ? (
                      <Text style={styles.planUnavailableText}>Produit indisponible</Text>
                    ) : null}
                  </View>
                  <View style={styles.planPriceRight}>
                    <Text style={[styles.planPrice, { color: colors.text }]}>{price}</Text>
                    <Text style={[styles.planPriceLabel, { color: colors.textSecondary }]}>
                      {plan.billingLabel}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {isLoadingProducts ? (
          <Text style={[styles.storeStatusText, { color: colors.textSecondary }]}>
            Chargement des offres App Store...
          </Text>
        ) : null}

        {hasCatalogIssue ? (
          <View
            style={[
              styles.statusCard,
              {
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.statusHeader}>
              <Ionicons name="alert-circle-outline" size={18} color={colors.error} />
              <Text style={[styles.statusTitle, { color: colors.text }]}>{diagnosticTitle}</Text>
            </View>
            <Text style={[styles.statusMessage, { color: colors.textSecondary }]}>
              {diagnosticMessage}
            </Text>
            <Text style={[styles.statusMeta, { color: colors.textSecondary }]}>
              Produits attendus: {iapCatalog.requestedProductIds.join(', ')}
            </Text>
            <Text style={[styles.statusMeta, { color: colors.textSecondary }]}>
              Produits reçus: {hasAnyStoreProduct ? iapCatalog.returnedProductIds.join(', ') : 'aucun'}
            </Text>
            <TouchableOpacity
              style={[styles.retryButton, { borderColor: colors.primary }]}
              onPress={handleReloadCatalog}
              disabled={isLoadingProducts}
              activeOpacity={0.85}
            >
              <Text style={[styles.retryButtonText, { color: colors.primary }]}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {selectedPlanConfig ? (
          <View style={[styles.billingSummaryCard, { backgroundColor: colors.surfaceSecondary }]}>
            <Text style={[styles.billingSummaryLabel, { color: colors.textSecondary }]}>
              Montant facturé
            </Text>
            <Text style={[styles.billingSummaryPrice, { color: colors.text }]}>{selectedPrice}</Text>
            <Text style={[styles.billingSummaryCaption, { color: colors.textSecondary }]}>
              {selectedPlanConfig.billedTodayLabel}
            </Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[
            styles.ctaButton,
            (!canPurchaseSelectedPlan || hasCatalogIssue) && styles.ctaButtonDisabled,
          ]}
          onPress={handlePurchase}
          disabled={isPurchasing || !canPurchaseSelectedPlan || hasCatalogIssue}
          activeOpacity={0.85}
        >
          <View style={styles.ctaGradient}>
            {isPurchasing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.ctaText}>
                  {isLoadingProducts
                    ? 'Chargement...'
                    : hasCatalogIssue
                      ? 'Offres indisponibles'
                      : 'Continuer'}
                </Text>
                {!isLoadingProducts && selectedPlanConfig ? (
                  <Text style={styles.ctaSubtext}>
                    {selectedPrice} {selectedPlanConfig.billingLabel}
                  </Text>
                ) : null}
              </>
            )}
          </View>
        </TouchableOpacity>

        <View style={styles.footer}>
          <TouchableOpacity onPress={handleRestore} disabled={isRestoring}>
            <Text style={styles.footerLink}>
              {isRestoring ? 'Restauration...' : 'Restaurer les achats'}
            </Text>
          </TouchableOpacity>
          <View style={styles.footerLinksRow}>
            <TouchableOpacity
              onPress={() => openLegalUrl(LEGAL_URLS.privacyPolicy, 'la Politique de confidentialité')}
            >
              <Text style={styles.footerLink}>Politique de confidentialité</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => openLegalUrl(LEGAL_URLS.termsOfUse, "les Conditions d'utilisation")}
            >
              <Text style={styles.footerLink}>Conditions d'utilisation</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
  },
  closeButton: {
    width: 32,
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 32,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 8,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    backgroundColor: '#0058BC',
    shadowColor: '#0058BC',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 8,
  },
  heroLocationPin: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  heroTitle: {
    fontSize: 40,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 44,
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  featuresSection: {
    gap: 12,
    marginBottom: 32,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: 12,
  },
  featureCheck: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#72FE88',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: 16,
    fontWeight: '500',
  },
  plansSection: {
    gap: 12,
    marginBottom: 24,
  },
  planCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
  },
  planCardFeatured: {
    borderWidth: 0,
    backgroundColor: '#0058BC',
    shadowColor: '#0058BC',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 8,
  },
  planCardSelected: {},
  planCardDisabled: {
    opacity: 0.45,
  },
  planBadge: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
    left: '50%',
    transform: [{ translateX: -50 }],
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  planBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0058BC',
    textTransform: 'uppercase',
    letterSpacing: -0.3,
  },
  planContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  planTitleWhite: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  planSubtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  planSubtitleFeatured: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.84)',
  },
  planUnavailableText: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '700',
    color: '#BA1A1A',
  },
  planPriceRight: {
    alignItems: 'flex-end',
    marginLeft: 16,
  },
  planPrice: {
    fontSize: 22,
    fontWeight: '800',
  },
  planPriceWhite: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  planPriceLabel: {
    fontSize: 13,
    marginTop: 4,
  },
  planPriceLabelFeatured: {
    fontSize: 13,
    marginTop: 4,
    color: 'rgba(255,255,255,0.8)',
  },
  storeStatusText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  statusCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    gap: 10,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  statusMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  statusMeta: {
    fontSize: 12,
    lineHeight: 18,
  },
  retryButton: {
    marginTop: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  billingSummaryCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  billingSummaryLabel: {
    fontSize: 14,
    marginBottom: 6,
  },
  billingSummaryPrice: {
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 4,
  },
  billingSummaryCaption: {
    fontSize: 14,
  },
  ctaButton: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 28,
  },
  ctaButtonDisabled: {
    opacity: 0.5,
  },
  ctaGradient: {
    minHeight: 64,
    backgroundColor: '#0058BC',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  ctaSubtext: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 13,
    marginTop: 4,
  },
  footer: {
    alignItems: 'center',
    gap: 18,
  },
  footerLinksRow: {
    flexDirection: 'row',
    gap: 20,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  footerLink: {
    color: '#0058BC',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
