import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useVehiculeStore } from '../stores/useVehiculeStore';
import { useAuthStore } from '../stores/useAuthStore';
import { useSubscriptionStore, FREE_TRIP_LIMIT } from '../stores/useSubscriptionStore';
import { getVehiculeDescription } from '../services/indemniteService';
import type { ParametresScreenProps } from '../types/navigation';

export function ParametresScreen({ navigation }: ParametresScreenProps) {
  const { colors } = useTheme();
  const { userName, companyName, updateProfile } = useSettingsStore();
  const { vehicules } = useVehiculeStore();
  const logout = useAuthStore((s) => s.logout);
  const { isPro, totalTripCount, refreshStatus, loadTripCount } = useSubscriptionStore();
  const defaultVehicule = vehicules[0];

  useFocusEffect(
    React.useCallback(() => {
      loadTripCount();
      refreshStatus();
    }, [loadTripCount, refreshStatus])
  );

  const editField = (label: string, currentValue: string, key: 'userName' | 'companyName') => {
    Alert.prompt(
      `Modifier le ${label.toLowerCase()}`,
      undefined,
      (value) => {
        if (value !== null) updateProfile({ [key]: value.trim() });
      },
      'plain-text',
      currentValue
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Déconnexion', style: 'destructive', onPress: logout },
      ]
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.configLabel, { color: colors.textSecondary }]}>
          CONFIGURATION
        </Text>
        <Text style={[styles.heading, { color: colors.text }]}>Paramètres</Text>
      </View>

      {/* Section: Profil */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="person-outline" size={12} color={colors.textSecondary} />
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>PROFIL</Text>
        </View>
        <View style={[styles.groupedCard, { backgroundColor: colors.surfaceSecondary }]}>
          <TouchableOpacity
            style={[styles.groupedRow, styles.groupedRowBetween, { backgroundColor: colors.surface }]}
            onPress={() => editField('nom', userName, 'userName')}
            activeOpacity={0.7}
          >
            <View>
              <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>NOM</Text>
              <Text style={[styles.rowValue, { color: userName ? colors.text : colors.textMuted }]}>
                {userName || 'Non renseigné'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
          <View style={styles.groupedDivider} />
          <TouchableOpacity
            style={[styles.groupedRow, styles.groupedRowBetween, { backgroundColor: colors.surface }]}
            onPress={() => editField('nom de l\'entreprise', companyName, 'companyName')}
            activeOpacity={0.7}
          >
            <View>
              <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>ENTREPRISE</Text>
              <View style={styles.companyRow}>
                <Ionicons name="business-outline" size={14} color={colors.textSecondary} />
                <Text style={[styles.rowValue, { color: companyName ? colors.text : colors.textMuted }]}>
                  {companyName || 'Non renseigné'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Section: KiloTrack Pro */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="star-outline" size={12} color={colors.textSecondary} />
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            KILOTRACK PRO
          </Text>
        </View>
        {isPro ? (
          <View style={[styles.actionCard, { backgroundColor: colors.surface }]}>
            <View style={styles.actionCardLeft}>
              <View style={[styles.iconCircle, { backgroundColor: '#72FE88' }]}>
                <Ionicons name="checkmark" size={18} color="#00531C" />
              </View>
              <View>
                <Text style={[styles.actionCardTitle, { color: colors.text }]}>
                  Abonnement actif
                </Text>
                <Text style={[styles.actionCardSub, { color: colors.textSecondary }]}>
                  Trajets et exports illimités
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.surface }]}
            onPress={() => navigation.navigate('Paywall')}
            activeOpacity={0.7}
          >
            <View style={styles.actionCardLeft}>
              <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="star" size={18} color="#0058BC" />
              </View>
              <View>
                <Text style={[styles.actionCardTitle, { color: colors.text }]}>
                  Passer à Pro
                </Text>
                <Text style={[styles.actionCardSub, { color: colors.textSecondary }]}>
                  {totalTripCount}/{FREE_TRIP_LIMIT} trajets gratuits utilisés
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Section: Véhicule par défaut */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="car-outline" size={12} color={colors.textSecondary} />
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            VÉHICULE PAR DÉFAUT
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: colors.surface }]}
          onPress={() => navigation.navigate('Vehicules')}
          activeOpacity={0.7}
        >
          <View style={styles.actionCardLeft}>
            <View style={[styles.iconCircle, { backgroundColor: colors.surfaceTertiary }]}>
              <Ionicons name="car" size={18} color="#717786" />
            </View>
            <View>
              <Text style={[styles.actionCardTitle, { color: colors.text }]}>
                {defaultVehicule?.nom ?? 'Aucun véhicule'}
              </Text>
              {defaultVehicule && (
                <Text style={[styles.actionCardSub, { color: colors.textSecondary }]}>
                  {getVehiculeDescription(defaultVehicule)}
                </Text>
              )}
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Section: Gestion */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginLeft: 8 }]}>
          GESTION
        </Text>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: colors.surface }]}
          onPress={() => navigation.navigate('Vehicules')}
          activeOpacity={0.7}
        >
          <View style={styles.actionCardLeft}>
            <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="car-sport" size={18} color="#0058BC" />
            </View>
            <Text style={[styles.actionCardTitle, { color: colors.text }]}>
              Gérer mes véhicules
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Section: À propos */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="information-circle-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>À PROPOS</Text>
        </View>
        <View style={[styles.groupedCard, { backgroundColor: colors.surfaceSecondary }]}>
          <View style={[styles.groupedRow, styles.groupedRowBetween, { backgroundColor: colors.surface }]}>
            <Text style={[styles.rowValue, { color: colors.text }]}>Version</Text>
            <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>1.0.0</Text>
          </View>
          <View style={styles.groupedDivider} />
          <View style={[styles.groupedRow, styles.aboutDataRow, { backgroundColor: colors.surface }]}>
            <View style={styles.aboutDataHeader}>
              <View style={styles.companyRow}>
                <Ionicons name="shield-checkmark" size={16} color="#00531C" />
                <Text style={[styles.rowValue, { color: colors.text }]}>Données locales</Text>
              </View>
              <View style={styles.secureBadge}>
                <Text style={styles.secureBadgeText}>SÉCURISÉ</Text>
              </View>
            </View>
            <Text style={[styles.aboutText, { color: colors.textSecondary }]}>
              Toutes vos données de trajets sont stockées localement sur cet appareil. Aucune donnée personnelle n'est transmise à nos serveurs sans votre consentement explicite lors de l'export.
            </Text>
          </View>
        </View>
      </View>

      {/* Déconnexion */}
      <TouchableOpacity
        style={[styles.logoutButton, { backgroundColor: colors.separator }]}
        onPress={handleLogout}
        activeOpacity={0.7}
      >
        <Text style={styles.logoutText}>Déconnexion</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 4,
  },
  configLabel: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.275,
    textTransform: 'uppercase',
  },
  heading: {
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.75,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 24,
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  groupedCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  groupedRow: {
    padding: 16,
  },
  groupedRowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  groupedDivider: {
    height: 1,
    backgroundColor: 'rgba(193,198,215,0.1)',
    marginHorizontal: 16,
  },
  rowMeta: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.55,
    textTransform: 'uppercase',
  },
  rowValue: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 2,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  actionCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionCardSub: {
    fontSize: 12,
    fontWeight: '400',
    marginTop: 2,
  },
  aboutDataRow: {
    paddingVertical: 20,
    gap: 16,
  },
  aboutDataHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  secureBadge: {
    backgroundColor: '#72FE88',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  secureBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#00531C',
    letterSpacing: -0.5,
    textTransform: 'uppercase',
  },
  aboutText: {
    fontSize: 12,
    lineHeight: 19.5,
  },
  logoutButton: {
    marginHorizontal: 16,
    marginTop: 32,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#BA1A1A',
  },
});
