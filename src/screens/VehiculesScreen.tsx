import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useVehiculeStore } from '../stores/useVehiculeStore';
import { EmptyState } from '../components/ui/EmptyState';
import { formatEuros } from '../utils/formatting';
import type { VehiculesScreenProps } from '../types/navigation';
import type { Vehicule } from '../types/vehicule';

export function VehiculesScreen({ navigation }: VehiculesScreenProps) {
  const { colors } = useTheme();
  const { vehicules, loadVehicules, removeVehicule } = useVehiculeStore();

  useEffect(() => {
    loadVehicules();
  }, []);

  const handleDelete = useCallback(
    (vehicule: Vehicule) => {
      Alert.alert(
        'Supprimer ce véhicule ?',
        vehicule.nom,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Supprimer',
            style: 'destructive',
            onPress: () => removeVehicule(vehicule.id),
          },
        ]
      );
    },
    [removeVehicule]
  );

  const renderItem = useCallback(
    ({ item }: { item: Vehicule }) => (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.surface }]}
        onPress={() =>
          navigation.navigate('AjoutVehicule', { vehiculeId: item.id })
        }
        activeOpacity={0.7}
      >
        <View style={styles.cardShadow} />
        <View style={styles.cardHeader}>
          <View style={styles.cardLeft}>
            <View style={styles.carIconCircle}>
              <Ionicons name="car" size={18} color="#717786" />
            </View>
            <View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {item.nom}
              </Text>
              {item.immatriculation ? (
                <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
                  {item.immatriculation}
                </Text>
              ) : null}
            </View>
          </View>
          <TouchableOpacity onPress={() => handleDelete(item)}>
            <Ionicons name="trash-outline" size={18} color={colors.error} />
          </TouchableOpacity>
        </View>
        <View style={styles.separator} />
        <View style={styles.cardFooter}>
          <View>
            <Text style={[styles.footerLabel, { color: colors.textSecondary }]}>TARIF</Text>
            <Text style={[styles.footerValue, { color: colors.text }]}>
              {formatEuros(item.tarif_km)}/km
            </Text>
          </View>
          <View style={styles.footerRight}>
            <Text style={[styles.footerLabel, { color: colors.textSecondary }]}>PUISSANCE</Text>
            <Text style={[styles.footerValue, { color: colors.text }]}>
              {item.puissance_fiscale} CV
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    ),
    [colors, navigation, handleDelete]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={vehicules}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={
          vehicules.length === 0 ? styles.emptyList : styles.list
        }
        ListEmptyComponent={
          <EmptyState
            icon="car-outline"
            title="Aucun véhicule"
            message="Ajoutez votre premier véhicule"
          />
        }
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AjoutVehicule')}
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
    padding: 16,
    paddingBottom: 100,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  carIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0DFE4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardSub: {
    fontSize: 12,
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: '#F3F3F8',
    marginTop: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  footerRight: {
    alignItems: 'flex-end',
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
