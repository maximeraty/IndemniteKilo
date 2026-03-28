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
import { LEGAL_URLS } from '../constants/legal';
import { useTheme } from '../theme/ThemeContext';
import { useSubscriptionStore, type SubscriptionPlan } from '../stores/useSubscriptionStore';
import {
  getProducts,
  purchaseSubscription,
  purchaseProduct,
  PRODUCT_IDS,
  type StoreProductInfo,
} from '../services/iapService';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type PaywallScreenProps = NativeStackScreenProps<any, 'Paywall'>;

const PLANS: {
  key: SubscriptionPlan;
  title: string;
  subtitle: string;
  fallbackPrice: string;
  priceLabel: string;
  productId: string;
  featured: boolean;
  badge?: string;
}[] = [
  {
    key: 'monthly',
    title: 'Mensuel',
    subtitle: 'Sans engagement',
    fallbackPrice: '--',
    priceLabel: '/ MOIS',
    productId: PRODUCT_IDS.MONTHLY,
    featured: false,
  },
  {
    key: 'yearly',
    title: 'Annuel',
    subtitle: 'Économisez 40%',
    fallbackPrice: '--',
    priceLabel: 'SOIT 2,91 € / MOIS',
    productId: PRODUCT_IDS.YEARLY,
    featured: true,
    badge: 'Meilleure Offre',
  },
  {
    key: 'lifetime',
    title: 'À vie (Lifetime)',
    subtitle: 'Paiement unique',
    fallbackPrice: '--',
    priceLabel: 'ONE-TIME',
    productId: PRODUCT_IDS.LIFETIME,
    featured: false,
  },
];

const FEATURES = [
  'Trajets illimités',
  'Exports PDF & Excel illimités',
];

export function PaywallScreen({ navigation }: PaywallScreenProps) {
  const { colors } = useTheme();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('yearly');
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [productsById, setProductsById] = useState<Record<string, StoreProductInfo>>({});
  const { restore } = useSubscriptionStore();

  useEffect(() => {
    let isMounted = true;

    const loadProducts = async () => {
      try {
        const products = await getProducts();
        if (!isMounted) return;

        const nextProducts = products.reduce<Record<string, StoreProductInfo>>((acc, product) => {
          acc[product.id] = product;
          return acc;
        }, {});

        setProductsById(nextProducts);
      } catch {
        if (isMounted) {
          setProductsById({});
        }
      } finally {
        if (isMounted) {
          setIsLoadingProducts(false);
        }
      }
    };

    loadProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedProductId = PLANS.find((plan) => plan.key === selectedPlan)?.productId;
  const selectedProduct = selectedProductId ? productsById[selectedProductId] : undefined;

  const handlePurchase = useCallback(async () => {
    const plan = PLANS.find((p) => p.key === selectedPlan);
    if (!plan) return;

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
  }, [selectedPlan, navigation]);

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
  }, [restore, navigation]);

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
          <Ionicons name="close" size={24} color="#007AFF" />
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
            Débloquez tout{'\n'}KiloTrack
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
            const storeProduct = productsById[plan.productId];
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
                    {plan.badge && (
                      <View style={styles.planBadge}>
                        <Text style={styles.planBadgeText}>{plan.badge}</Text>
                      </View>
                    )}
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
                        <Text style={styles.planPriceLabelFeatured}>{plan.priceLabel}</Text>
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
                      {plan.priceLabel}
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

        <TouchableOpacity
          style={[
            styles.ctaButton,
            (!selectedProduct || isLoadingProducts) && styles.ctaButtonDisabled,
          ]}
          onPress={handlePurchase}
          disabled={isPurchasing || isLoadingProducts || !selectedProduct}
          activeOpacity={0.85}
        >
          <View style={styles.ctaGradient}>
            {isPurchasing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.ctaText}>
                {isLoadingProducts ? 'Chargement...' : 'Continuer avec KiloTrack Pro'}
              </Text>
            )}
          </View>
        </TouchableOpacity>

        <View style={styles.footer}>
          <View style={styles.footerLinksRow}>
            <TouchableOpacity onPress={handleRestore} disabled={isRestoring}>
              <Text style={styles.footerLink}>
                {isRestoring ? 'Restauration...' : 'Restaurer les achats'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => openLegalUrl(LEGAL_URLS.termsOfUse, "les Conditions d'utilisation")}
            >
              <Text style={styles.footerLink}>Conditions d'utilisation</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            onPress={() => openLegalUrl(LEGAL_URLS.privacyPolicy, 'la Politique de confidentialité')}
          >
            <Text style={styles.footerLink}>Politique de confidentialité</Text>
          </TouchableOpacity>
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
    marginBottom: 32,
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
    fontSize: 18,
    fontWeight: '700',
  },
  planTitleWhite: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  planSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  planSubtitleFeatured: {
    fontSize: 14,
    color: '#D8E2FF',
    marginTop: 2,
  },
  planPriceRight: {
    alignItems: 'flex-end',
  },
  planPrice: {
    fontSize: 20,
    fontWeight: '800',
  },
  planPriceWhite: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  planPriceLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  planPriceLabelFeatured: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D8E2FF',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  planUnavailableText: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
    color: '#B42318',
  },
  storeStatusText: {
    marginBottom: 12,
    textAlign: 'center',
    fontSize: 13,
  },
  ctaButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#0058BC',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    marginBottom: 32,
  },
  ctaButtonDisabled: {
    opacity: 0.55,
  },
  ctaGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#0058BC',
  },
  ctaText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  footer: {
    alignItems: 'center',
    gap: 8,
  },
  footerLinksRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 4,
  },
  footerLink: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
