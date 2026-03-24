import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useTrajetStore } from '../stores/useTrajetStore';
import { useVehiculeStore } from '../stores/useVehiculeStore';
import { useSubscriptionStore } from '../stores/useSubscriptionStore';
import { TrajetCard } from '../components/trajets/TrajetCard';
import { HorodatageCard } from '../components/trajets/HorodatageCard';
import { MonthlySummaryBar } from '../components/trajets/MonthlySummaryBar';
import { EmptyState } from '../components/ui/EmptyState';
import type { TrajetsScreenProps } from '../types/navigation';
import type { Trajet } from '../types/trajet';
import type { Horodatage } from '../types/horodatage';

const JOURS_SEMAINE = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

function formatSectionDate(isoDate: string): string {
  const date = new Date(isoDate + 'T00:00:00');
  const jour = JOURS_SEMAINE[date.getDay()];
  const d = date.getDate();
  const mois = [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
  ][date.getMonth()];
  return `${jour} ${d} ${mois}`;
}

export function TrajetsScreen({ navigation }: TrajetsScreenProps) {
  const { colors } = useTheme();
  const {
    trajets,
    horodatages,
    currentMonth,
    monthlySummary,
    setCurrentMonth,
    loadTrajets,
    loadMonthlySummary,
    removeTrajet,
    removeHorodatage,
  } = useTrajetStore();
  const { vehicules } = useVehiculeStore();
  const { canCreateTrip, loadTripCount } = useSubscriptionStore();

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadTrajets();
    loadMonthlySummary();
    loadTripCount();
  }, [currentMonth]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadTrajets(), loadMonthlySummary()]);
    setRefreshing(false);
  }, [loadTrajets, loadMonthlySummary]);

  const handleDelete = useCallback(
    (trajet: Trajet) => {
      Alert.alert(
        'Supprimer ce trajet ?',
        `${trajet.adresse_depart} → ${trajet.adresse_arrivee}`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Supprimer',
            style: 'destructive',
            onPress: () => removeTrajet(trajet.id),
          },
        ]
      );
    },
    [removeTrajet]
  );

  const getVehiculeName = useCallback(
    (vehiculeId: number) => {
      return vehicules.find((v) => v.id === vehiculeId)?.nom ?? '';
    },
    [vehicules]
  );

  const handleDeleteHorodatage = useCallback(
    (horodatage: Horodatage) => {
      Alert.alert(
        "Supprimer cet horodatage ?",
        `${getVehiculeName(horodatage.vehicule_id) || 'Véhicule'} • ${horodatage.kilometrage_km.toFixed(1)} km`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Supprimer',
            style: 'destructive',
            onPress: () => removeHorodatage(horodatage.id),
          },
        ]
      );
    },
    [getVehiculeName, removeHorodatage]
  );

  const handleAdd = useCallback(() => {
    if (vehicules.length === 0) {
      Alert.alert(
        'Aucun véhicule',
        'Ajoutez d\'abord un véhicule dans les paramètres.',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Ajouter un véhicule',
            onPress: () =>
              navigation.navigate('Parametres', {
                screen: 'AjoutVehicule',
              }),
          },
        ]
      );
      return;
    }
    if (!canCreateTrip()) {
      navigation.navigate('Paywall');
      return;
    }
    Alert.alert(
      'Ajouter un enregistrement',
      'Choisissez le type à ajouter.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Ajouter un trajet',
          onPress: () => navigation.navigate('AjoutTrajet'),
        },
        {
          text: 'Ajouter un horodatage',
          onPress: () => navigation.navigate('AjoutHorodatage'),
        },
      ]
    );
  }, [navigation, vehicules, canCreateTrip]);

  // Group entries by date for section list
  const sections = useMemo(() => {
    const entries = [...trajets, ...horodatages].sort((a, b) => {
      if (a.date !== b.date) {
        return b.date.localeCompare(a.date);
      }
      if (a.entry_type === 'horodatage' && b.entry_type === 'horodatage') {
        return b.heure.localeCompare(a.heure);
      }
      if (a.entry_type === 'horodatage') return -1;
      if (b.entry_type === 'horodatage') return 1;
      return b.id - a.id;
    });

    const grouped: Record<string, Array<Trajet | Horodatage>> = {};
    for (const entry of entries) {
      const key = entry.date;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(entry);
    }
    return Object.entries(grouped)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, data]) => ({
        title: formatSectionDate(date),
        data,
      }));
  }, [trajets, horodatages]);

  const renderItem = useCallback(
    ({ item }: { item: Trajet | Horodatage }) => (
      item.entry_type === 'trajet' ? (
        <TrajetCard
          trajet={item}
          vehiculeNom={getVehiculeName(item.vehicule_id)}
          onPress={() =>
            navigation.navigate('AjoutTrajet', { trajetId: item.id })
          }
          onDelete={() => handleDelete(item)}
        />
      ) : (
        <HorodatageCard
          horodatage={item}
          vehiculeNom={getVehiculeName(item.vehicule_id)}
          onPress={() =>
            navigation.navigate('AjoutHorodatage', { horodatageId: item.id })
          }
          onDelete={() => handleDeleteHorodatage(item)}
        />
      )
    ),
    [getVehiculeName, navigation, handleDelete, handleDeleteHorodatage]
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: { title: string } }) => (
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          {section.title.toUpperCase()}
        </Text>
        <View style={[styles.sectionDivider, { backgroundColor: colors.separator }]} />
      </View>
    ),
    [colors]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SectionList
        sections={sections}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item) => `${item.entry_type}-${item.id}`}
        contentContainerStyle={[styles.list, trajets.length === 0 && horodatages.length === 0 && styles.emptyList]}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <MonthlySummaryBar
            currentMonth={currentMonth}
            summary={monthlySummary}
            onPreviousMonth={() => {
              const [y, m] = currentMonth.split('-').map(Number);
              const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
              setCurrentMonth(prev);
            }}
            onNextMonth={() => {
              const [y, m] = currentMonth.split('-').map(Number);
              const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
              setCurrentMonth(next);
            }}
          />
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          vehicules.length === 0 ? (
            <EmptyState
              icon="car-outline"
              title="Aucun véhicule"
              message={'Ajoutez d\'abord un véhicule dans l\'onglet Paramètres, puis revenez créer un trajet.'}
            />
          ) : (
            <EmptyState
              icon="car-outline"
              title="Aucun enregistrement"
              message="Ajoutez un trajet ou un horodatage avec le bouton +"
            />
          )
        }
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={handleAdd}
        activeOpacity={0.8}
      >
        <View style={styles.fabGradient}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  emptyList: {
    flexGrow: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 8,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  sectionDivider: {
    flex: 1,
    height: 1,
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 8,
  },
  fabGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0058BC',
  },
});
