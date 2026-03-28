import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import {
  searchAddress,
  formatShortAddress,
  getCity,
  getPlaceIcon,
  type GeocodingResult,
} from '../../services/geocodingService';
import {
  clearRecentPlaces,
  getFavoritePlaces,
  getRecentPlaces,
  removeFavoritePlace,
  saveFavoritePlace,
  saveRecentPlace,
} from '../../services/db';
import type { SavedPlace } from '../../types/places';

interface AddressSearchModalProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  onSelect: (result: GeocodingResult) => void;
}

const EXPLORE_QUERIES = [
  { label: 'Stations', icon: 'car-outline', query: 'station service' },
  { label: 'Shopping', icon: 'bag-outline', query: 'centre commercial' },
  { label: 'Hôtel', icon: 'bed-outline', query: 'hotel' },
];

export function AddressSearchModal({
  visible,
  title,
  onClose,
  onSelect,
}: AddressSearchModalProps) {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [recents, setRecents] = useState<SavedPlace[]>([]);
  const [favorites, setFavorites] = useState<SavedPlace[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshSavedPlaces = useCallback(async () => {
    try {
      const [recentData, favoriteData] = await Promise.all([
        getRecentPlaces(),
        getFavoritePlaces(),
      ]);
      setRecents(recentData);
      setFavorites(favoriteData);
    } catch {
      setRecents([]);
      setFavorites([]);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      setQuery('');
      setResults([]);
      setIsLoading(false);
      refreshSavedPlaces();
      setTimeout(() => inputRef.current?.focus(), 250);
    } else if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, [visible, refreshSavedPlaces]);

  const homeFavorite = useMemo(
    () => favorites.find((item) => item.favorite_kind === 'home') ?? null,
    [favorites]
  );

  const workFavorite = useMemo(
    () => favorites.find((item) => item.favorite_kind === 'work') ?? null,
    [favorites]
  );

  const customFavorites = useMemo(
    () => favorites.filter((item) => item.favorite_kind === 'custom'),
    [favorites]
  );

  const runSearch = useCallback(async (text: string) => {
    if (text.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const data = await searchAddress(text, 8);
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSearch = useCallback((text: string) => {
    setQuery(text);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (text.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    debounceRef.current = setTimeout(() => {
      runSearch(text);
    }, 280);
  }, [runSearch]);

  const handleSelect = useCallback(
    async (item: GeocodingResult) => {
      try {
        await saveRecentPlace(item);
      } catch {
        // Saving recents should never block selection.
      }
      onSelect(item);
      onClose();
    },
    [onClose, onSelect]
  );

  const handleSaveFavorite = useCallback(
    (item: GeocodingResult) => {
      Alert.alert(
        'Enregistrer ce lieu',
        'Choisissez le type de favori à enregistrer.',
        [
          {
            text: 'Maison',
            onPress: async () => {
              await saveFavoritePlace(item, 'home');
              await refreshSavedPlaces();
            },
          },
          {
            text: 'Travail',
            onPress: async () => {
              await saveFavoritePlace(item, 'work');
              await refreshSavedPlaces();
            },
          },
          {
            text: 'Favori',
            onPress: async () => {
              await saveFavoritePlace(item, 'custom');
              await refreshSavedPlaces();
            },
          },
          { text: 'Annuler', style: 'cancel' },
        ]
      );
    },
    [refreshSavedPlaces]
  );

  const handleFavoriteShortcut = useCallback(
    (item: SavedPlace | null, emptyLabel: string) => {
      if (!item) {
        Alert.alert(
          emptyLabel,
          'Recherchez un lieu, puis utilisez le bouton + à droite d’un résultat pour l’enregistrer.'
        );
        return;
      }
      handleSelect(item);
    },
    [handleSelect]
  );

  const handleMore = useCallback(() => {
    Alert.alert(
      'Options',
      'Que souhaitez-vous faire ?',
      [
        {
          text: 'Effacer les récents',
          style: 'destructive',
          onPress: async () => {
            await clearRecentPlaces();
            await refreshSavedPlaces();
          },
        },
        { text: 'Fermer', style: 'cancel' },
      ]
    );
  }, [refreshSavedPlaces]);

  const renderRow = useCallback(
    (
      item: GeocodingResult | SavedPlace,
      rightAction?: 'save' | 'remove',
      onRightPress?: () => void
    ) => {
      const shortName = formatShortAddress(item);
      const subtitle = getCity(item);
      const iconName = getPlaceIcon(item) as keyof typeof Ionicons.glyphMap;

      return (
        <View
          key={`${item.lat}-${item.lon}-${item.display_name}`}
          style={[styles.resultItem, { backgroundColor: colors.surface }]}
        >
          <TouchableOpacity
            style={styles.resultMain}
            onPress={() => handleSelect(item)}
            activeOpacity={0.65}
          >
            <View style={[styles.resultIcon, { backgroundColor: colors.surfaceSecondary }]}>
              <Ionicons name={iconName} size={18} color={colors.textSecondary} />
            </View>
            <View style={styles.resultContent}>
              <Text style={[styles.resultName, { color: colors.text }]} numberOfLines={1}>
                {shortName}
              </Text>
              {subtitle ? (
                <Text style={[styles.resultSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>

          {rightAction && onRightPress ? (
            <TouchableOpacity
              style={[styles.rowAction, { backgroundColor: colors.surfaceSecondary }]}
              onPress={onRightPress}
              activeOpacity={0.75}
            >
              <Ionicons
                name={rightAction === 'save' ? 'add' : 'trash-outline'}
                size={18}
                color={rightAction === 'save' ? colors.primary : colors.textSecondary}
              />
            </TouchableOpacity>
          ) : null}
        </View>
      );
    },
    [colors, handleSelect]
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={['#DDE7FF', '#EDF2FF', '#F9F9FE']}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={styles.backdrop}
        >
          <View style={[styles.mapLine, { top: 58, left: -20, width: 280 }]} />
          <View style={[styles.mapLine, { top: 104, right: -50, width: 240 }]} />
          <View style={[styles.mapLine, { top: 142, left: 54, width: 180 }]} />
          <View style={[styles.mapNode, { top: 92, left: 44 }]} />
          <View style={[styles.mapNode, { top: 134, right: 64 }]} />
        </LinearGradient>

        <KeyboardAvoidingView
          style={styles.keyboard}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
            <View
              style={[
                styles.sheet,
                {
                  backgroundColor: 'rgba(249,249,254,0.92)',
                  shadowColor: colors.cardShadow,
                },
              ]}
            >
              <View style={styles.handleContainer}>
                <View style={[styles.handle, { backgroundColor: 'rgba(26,28,31,0.12)' }]} />
              </View>

              <View style={styles.header}>
                <View style={[styles.searchInputContainer, { backgroundColor: colors.separator }]}>
                  <Ionicons name="search" size={18} color={colors.textSecondary} />
                  <TextInput
                    ref={inputRef}
                    style={[styles.searchInput, { color: colors.text }]}
                    placeholder={title}
                    placeholderTextColor={colors.textSecondary}
                    value={query}
                    onChangeText={handleSearch}
                    returnKeyType="search"
                    autoCorrect={false}
                  />
                  {query.length > 0 ? (
                    <TouchableOpacity onPress={() => handleSearch('')} activeOpacity={0.7}>
                      <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                  ) : null}
                </View>
                <TouchableOpacity onPress={onClose} style={styles.cancelButton} activeOpacity={0.7}>
                  <Text style={[styles.cancelText, { color: colors.primary }]}>Annuler</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.quickActions}>
                  <ShortcutButton
                    label="Maison"
                    icon="home"
                    active={!!homeFavorite}
                    colors={colors}
                    onPress={() => handleFavoriteShortcut(homeFavorite, 'Maison non définie')}
                  />
                  <ShortcutButton
                    label="Travail"
                    icon="briefcase"
                    active={!!workFavorite}
                    colors={colors}
                    onPress={() => handleFavoriteShortcut(workFavorite, 'Travail non défini')}
                  />
                  <ShortcutButton
                    label="Favori"
                    icon="star"
                    active={customFavorites.length > 0}
                    colors={colors}
                    onPress={() =>
                      handleFavoriteShortcut(customFavorites[0] ?? null, 'Aucun favori enregistré')
                    }
                  />
                  <ShortcutButton
                    label="Plus"
                    icon="ellipsis-horizontal"
                    active={true}
                    colors={colors}
                    onPress={handleMore}
                  />
                </View>

                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator color={colors.primary} />
                  </View>
                ) : query.trim().length >= 2 ? (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Résultats</Text>
                    <View style={styles.sectionList}>
                      {results.length > 0 ? (
                        results.map((item) =>
                          renderRow(item, 'save', () => {
                            handleSaveFavorite(item);
                          })
                        )
                      ) : (
                        <View style={styles.emptyState}>
                          <Ionicons name="location-outline" size={36} color={colors.textMuted} />
                          <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
                            Aucun résultat trouvé
                          </Text>
                          <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
                            Essayez avec une entreprise, une gare ou une adresse complète.
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                ) : (
                  <>
                    <View style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Récents</Text>
                        {recents.length > 0 ? (
                          <TouchableOpacity onPress={handleMore} activeOpacity={0.7}>
                            <Text style={[styles.sectionAction, { color: colors.primary }]}>
                              Gérer
                            </Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>

                      <View style={styles.sectionList}>
                        {recents.length > 0 ? (
                          recents.map((item) =>
                            renderRow(item, 'save', () => {
                              handleSaveFavorite(item);
                            })
                          )
                        ) : (
                          <View style={styles.emptyStateCompact}>
                            <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
                              Vos dernières recherches apparaîtront ici.
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {customFavorites.length > 0 ? (
                      <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Favoris</Text>
                        <View style={styles.sectionList}>
                          {customFavorites.map((item) =>
                            renderRow(item, 'remove', () => {
                              removeFavoritePlace(item.id).then(refreshSavedPlaces);
                            })
                          )}
                        </View>
                      </View>
                    ) : null}

                    <View style={styles.section}>
                      <Text style={[styles.sectionTitle, { color: colors.text }]}>Explorer</Text>
                      <View style={styles.chipsRow}>
                        {EXPLORE_QUERIES.map((chip) => (
                          <TouchableOpacity
                            key={chip.label}
                            style={[styles.chip, { backgroundColor: colors.surfaceSecondary }]}
                            onPress={() => {
                              setQuery(chip.query);
                              runSearch(chip.query);
                            }}
                            activeOpacity={0.7}
                          >
                            <Ionicons
                              name={chip.icon as keyof typeof Ionicons.glyphMap}
                              size={16}
                              color={colors.textSecondary}
                            />
                            <Text style={[styles.chipText, { color: colors.text }]}>
                              {chip.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </>
                )}
              </ScrollView>

              <View style={styles.footerBrand}>
                <View style={[styles.footerDot, { backgroundColor: colors.primaryGradientEnd }]}>
                  <Ionicons name="navigate" size={11} color="#FFFFFF" />
                </View>
                <Text style={[styles.footerText, { color: colors.textMuted }]}>Propulsé par Plans</Text>
              </View>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function ShortcutButton({
  label,
  icon,
  active,
  colors,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  colors: any;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.shortcutItem} onPress={onPress} activeOpacity={0.75}>
      <View
        style={[
          styles.shortcutCircle,
          {
            backgroundColor: active ? colors.primaryLight : colors.surfaceTertiary,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={active ? colors.primaryDark : colors.textSecondary}
        />
      </View>
      <Text style={[styles.shortcutLabel, { color: colors.textSecondary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 260,
    overflow: 'hidden',
  },
  mapLine: {
    position: 'absolute',
    height: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(86, 104, 145, 0.22)',
    transform: [{ rotate: '-7deg' }],
  },
  mapNode: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(114, 254, 136, 0.55)',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  keyboard: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    flex: 1,
    marginTop: 118,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 999,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 6,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 17,
    fontWeight: '500',
    paddingVertical: 0,
  },
  cancelButton: {
    paddingVertical: 8,
  },
  cancelText: {
    fontSize: 17,
    fontWeight: '500',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  shortcutItem: {
    alignItems: 'center',
    gap: 8,
    width: '23%',
  },
  shortcutCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionAction: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionList: {
    gap: 10,
  },
  resultItem: {
    borderRadius: 22,
    paddingHorizontal: 6,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  resultMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 8,
  },
  resultIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultContent: {
    flex: 1,
    gap: 2,
  },
  resultName: {
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 22,
  },
  resultSubtitle: {
    fontSize: 14,
    lineHeight: 18,
  },
  rowAction: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyState: {
    paddingVertical: 42,
    alignItems: 'center',
    gap: 10,
  },
  emptyStateCompact: {
    paddingVertical: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyHint: {
    fontSize: 14,
    lineHeight: 20,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  chipText: {
    fontSize: 15,
    fontWeight: '500',
  },
  footerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 18,
    paddingHorizontal: 20,
  },
  footerDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});
