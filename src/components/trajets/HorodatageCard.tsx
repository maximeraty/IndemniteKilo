import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { formatKm } from '../../utils/formatting';
import type { Horodatage } from '../../types/horodatage';

interface HorodatageCardProps {
  horodatage: Horodatage;
  vehiculeNom: string;
  onPress?: () => void;
  onDelete?: () => void;
}

export function HorodatageCard({
  horodatage,
  vehiculeNom,
  onPress,
  onDelete,
}: HorodatageCardProps) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface }]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.cardShadow} />

      <View style={styles.topSection}>
        <View style={styles.topLeft}>
          <View style={styles.iconCircle}>
            <Ionicons name="speedometer-outline" size={18} color="#717786" />
          </View>

          <View style={styles.contentBlock}>
            <View style={styles.titleRow}>
              <Ionicons name="time-outline" size={12} color="#94A3B8" />
              <Text style={[styles.titleText, { color: colors.text }]} numberOfLines={2}>
                Horodatage kilométrique
              </Text>
            </View>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {vehiculeNom || 'Véhicule'}{horodatage.note ? ` • ${horodatage.note}` : ''}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.separator} />
      <View style={styles.footer}>
        <View>
          <Text style={[styles.footerLabel, { color: colors.textSecondary }]}>KILOMÉTRAGE</Text>
          <Text style={[styles.footerValue, { color: colors.text }]}>
            {formatKm(horodatage.kilometrage_km)}
          </Text>
        </View>
        {onDelete && (
          <TouchableOpacity
            onPress={onDelete}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.deleteButton}
          >
            <Ionicons name="trash-outline" size={16} color={colors.error} />
          </TouchableOpacity>
        )}
        <View style={styles.timeBlock}>
          <Text style={[styles.footerLabel, { color: colors.textSecondary, textAlign: 'right' }]}>
            HEURE
          </Text>
          <Text style={[styles.timeValue, { color: '#0058BC' }]}>
            {horodatage.heure}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    position: 'relative',
  },
  cardShadow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    shadowColor: 'rgba(0,88,188,0.08)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 32,
    elevation: 3,
  },
  topSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  topLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0DFE4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentBlock: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  titleText: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
    flex: 1,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 18,
  },
  separator: {
    height: 1,
    backgroundColor: '#F3F3F8',
    marginTop: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 16,
  },
  footerLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  footerValue: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  deleteButton: {
    padding: 4,
  },
  timeBlock: {
    alignItems: 'flex-end',
  },
  timeValue: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
  },
});
