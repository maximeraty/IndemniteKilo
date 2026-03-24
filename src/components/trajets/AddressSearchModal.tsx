import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import {
  searchAddress,
  formatShortAddress,
  getCity,
  type GeocodingResult,
} from '../../services/geocodingService';

interface AddressSearchModalProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  onSelect: (result: GeocodingResult) => void;
}

export function AddressSearchModal({
  visible,
  title,
  onClose,
  onSelect,
}: AddressSearchModalProps) {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      setQuery('');
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [visible]);

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
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await searchAddress(text);
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 400);
  }, []);

  const handleSelect = useCallback(
    (item: GeocodingResult) => {
      onSelect(item);
      onClose();
    },
    [onSelect, onClose]
  );

  const renderItem = useCallback(
    ({ item }: { item: GeocodingResult }) => {
      const shortName = formatShortAddress(item);
      const city = getCity(item);

      return (
        <TouchableOpacity
          style={[styles.resultItem, { borderBottomColor: colors.separator }]}
          onPress={() => handleSelect(item)}
          activeOpacity={0.6}
        >
          <View style={[styles.resultIcon, { backgroundColor: colors.surfaceSecondary }]}>
            <Ionicons name="location" size={16} color={colors.textSecondary} />
          </View>
          <View style={styles.resultContent}>
            <Text style={[styles.resultName, { color: colors.text }]} numberOfLines={1}>
              {shortName}
            </Text>
            {city ? (
              <Text style={[styles.resultSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                {city}
              </Text>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      );
    },
    [colors, handleSelect]
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Drag handle */}
        <View style={styles.handleContainer}>
          <View style={[styles.handle, { backgroundColor: colors.surfaceTertiary }]} />
        </View>

        {/* Search header */}
        <View style={styles.searchHeader}>
          <View style={[styles.searchInputContainer, { backgroundColor: colors.surfaceSecondary }]}>
            <Ionicons name="search" size={16} color={colors.textMuted} />
            <TextInput
              ref={inputRef}
              style={[styles.searchInput, { color: colors.text }]}
              placeholder={title}
              placeholderTextColor={colors.textMuted}
              value={query}
              onChangeText={handleSearch}
              returnKeyType="search"
              autoCorrect={false}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => handleSearch('')}>
                <Ionicons name="close-circle" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
            <Text style={[styles.cancelText, { color: colors.primary }]}>Annuler</Text>
          </TouchableOpacity>
        </View>

        {/* Results */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : results.length > 0 ? (
          <FlatList
            data={results}
            renderItem={renderItem}
            keyExtractor={(item, index) => `${item.lat}-${item.lon}-${index}`}
            contentContainerStyle={styles.resultsList}
            keyboardShouldPersistTaps="handled"
          />
        ) : query.length >= 2 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="location-outline" size={40} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Aucun résultat trouvé
            </Text>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={40} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Rechercher une adresse
            </Text>
            <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
              Saisissez au moins 2 caractères
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 3,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    padding: 0,
  },
  cancelButton: {
    paddingVertical: 8,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
  resultsList: {
    paddingHorizontal: 16,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  resultIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultContent: {
    flex: 1,
    gap: 2,
  },
  resultName: {
    fontSize: 15,
    fontWeight: '500',
  },
  resultSubtitle: {
    fontSize: 13,
    fontWeight: '400',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 80,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
  },
  emptyHint: {
    fontSize: 14,
    fontWeight: '400',
  },
});
