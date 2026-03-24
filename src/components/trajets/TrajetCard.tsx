import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { formatEuros, formatKm } from '../../utils/formatting';
import type { Trajet } from '../../types/trajet';

interface TrajetCardProps {
  trajet: Trajet;
  vehiculeNom: string;
  onPress?: () => void;
  onDelete?: () => void;
  compact?: boolean;
}

export function TrajetCard({
  trajet,
  vehiculeNom,
  onPress,
  onDelete,
  compact = false,
}: TrajetCardProps) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface }]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      {/* Shadow overlay */}
      <View style={styles.cardShadow} />

      {/* Top section: icon + addresses + badge */}
      <View style={styles.topSection}>
        <View style={styles.topLeft}>
          {/* Car icon circle */}
          <View style={styles.carIconCircle}>
            <Ionicons name="car" size={18} color="#717786" />
          </View>

          {/* Address + vehicle info */}
          <View style={styles.addressBlock}>
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={12} color="#94A3B8" />
              <Text style={[styles.addressText, { color: colors.text }]} numberOfLines={2}>
                {trajet.adresse_depart} → {trajet.adresse_arrivee}
              </Text>
            </View>
            <Text style={[styles.vehicleMotif, { color: colors.textSecondary }]} numberOfLines={1}>
              {vehiculeNom}{trajet.motif ? ` • ${trajet.motif}` : ''}
            </Text>
          </View>
        </View>

      </View>

      {/* Separator + footer with distance/amount */}
      <View style={styles.separator} />
      <View style={styles.footer}>
        <View>
          <Text style={[styles.footerLabel, { color: colors.textSecondary }]}>DISTANCE</Text>
          <Text style={[styles.footerValue, { color: colors.text }]}>
            {formatKm(trajet.distance_km)}
            {trajet.aller_retour ? ' (A/R)' : ''}
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
        <View style={styles.amountBlock}>
          <Text style={[styles.footerLabel, { color: colors.textSecondary, textAlign: 'right' }]}>
            MONTANT
          </Text>
          <Text style={[styles.amountValue, { color: '#0058BC' }]}>
            {formatEuros(trajet.montant_eur)}
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
  carIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0DFE4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressBlock: {
    flex: 1,
    gap: 4,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  addressText: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
    flex: 1,
  },
  vehicleMotif: {
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
  amountBlock: {
    alignItems: 'flex-end',
  },
  amountValue: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
  },
});
