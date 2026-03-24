import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { formatEuros, formatKm } from '../../utils/formatting';
import { formatMonthYear } from '../../utils/dateUtils';

interface MonthlySummaryBarProps {
  currentMonth: string; // "YYYY-MM"
  summary: { total_km: number; total_eur: number; count: number } | null;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
}

export function MonthlySummaryBar({
  currentMonth,
  summary,
  onPreviousMonth,
  onNextMonth,
}: MonthlySummaryBarProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {/* Month navigation */}
      <View style={[styles.monthNav, { backgroundColor: colors.surfaceSecondary }]}>
        <TouchableOpacity
          onPress={onPreviousMonth}
          style={styles.navButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={16} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.monthText, { color: colors.text }]}>
          {formatMonthYear(currentMonth)}
        </Text>
        <TouchableOpacity
          onPress={onNextMonth}
          style={styles.navButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-forward" size={16} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Stats chips */}
      <View style={styles.statsRow}>
        <View style={[styles.statChip, { backgroundColor: colors.surface }]}>
          <View style={styles.statChipShadow} />
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>TRAJETS</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {summary?.count ?? 0}
          </Text>
        </View>
        <View style={[styles.statChip, { backgroundColor: colors.surface }]}>
          <View style={styles.statChipShadow} />
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>DISTANCE</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {formatKm(summary?.total_km ?? 0)}
          </Text>
        </View>
        <View style={[styles.statChipAccent]}>
          <Text style={styles.statLabelAccent}>INDEMNITÉS</Text>
          <Text style={styles.statValueAccent}>
            {formatEuros(summary?.total_eur ?? 0)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 16,
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  navButton: {
    padding: 8,
  },
  monthText: {
    fontSize: 18,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statChip: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
  },
  statChipShadow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    shadowColor: 'rgba(0,88,188,0.08)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 32,
    elevation: 3,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statChipAccent: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#0070EB',
    shadowColor: 'rgba(0,88,188,0.08)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 32,
    elevation: 3,
  },
  statLabelAccent: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.5,
    color: '#DBEAFE',
    marginBottom: 4,
  },
  statValueAccent: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FEFCFF',
  },
});
