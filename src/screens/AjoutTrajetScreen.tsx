import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useTrajetStore } from '../stores/useTrajetStore';
import { useVehiculeStore } from '../stores/useVehiculeStore';
import { AddressSearchModal } from '../components/trajets/AddressSearchModal';
import {
  calculateRoute,
  formatShortAddress,
  type GeocodingResult,
} from '../services/geocodingService';
import {
  getTrajetBaremePreview,
  getVehiculeDescription,
} from '../services/indemniteService';
import {
  formatEuros,
  formatKm,
  formatDateFr,
  formatTarifKm,
} from '../utils/formatting';
import { getCurrentISODate } from '../utils/dateUtils';
import type { AjoutTrajetScreenProps } from '../types/navigation';

const MOIS_PICKER = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const ITEM_H = 44;

function SpinnerColumn({
  items,
  selectedIndex,
  onIndexChange,
  width,
  colors,
}: {
  items: string[];
  selectedIndex: number;
  onIndexChange: (i: number) => void;
  width?: number;
  colors: any;
}) {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: selectedIndex * ITEM_H, animated: false });
    }, 50);
  }, []);

  const handleScrollEnd = (e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
    onIndexChange(Math.max(0, Math.min(items.length - 1, idx)));
  };

  return (
    <View style={{ flex: width ?? 1, alignItems: 'center' }}>
      {/* selection highlight */}
      <View
        pointerEvents="none"
        style={[
          pickerStyles.selectionHighlight,
          { backgroundColor: colors.surfaceSecondary },
        ]}
      />
      <ScrollView
        ref={scrollRef}
        style={{ height: ITEM_H * 5, width: '100%' }}
        contentContainerStyle={{ paddingVertical: ITEM_H * 2 }}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
      >
        {items.map((item, i) => (
          <View key={i} style={pickerStyles.spinnerItem}>
            <Text
              style={[
                pickerStyles.spinnerText,
                { color: i === selectedIndex ? colors.text : colors.textMuted },
                i === selectedIndex && pickerStyles.spinnerTextSelected,
              ]}
              numberOfLines={1}
            >
              {item}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function DatePickerModal({
  visible,
  date,
  onConfirm,
  onClose,
  colors,
}: {
  visible: boolean;
  date: string;
  onConfirm: (d: string) => void;
  onClose: () => void;
  colors: any;
}) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => String(currentYear - 5 + i));

  const [dayIdx, setDayIdx] = useState(0);
  const [monthIdx, setMonthIdx] = useState(0);
  const [yearIdx, setYearIdx] = useState(5);

  // Re-init when modal opens
  useEffect(() => {
    if (visible) {
      const [y, m, d] = date.split('-').map(Number);
      setMonthIdx(m - 1);
      const yIdx = years.indexOf(String(y));
      setYearIdx(yIdx >= 0 ? yIdx : 5);
      // Days for the selected month
      const daysInMonth = new Date(y, m, 0).getDate();
      setDayIdx(Math.min(d - 1, daysInMonth - 1));
    }
  }, [visible]);

  const daysInSelectedMonth = new Date(
    parseInt(years[yearIdx], 10),
    monthIdx + 1,
    0
  ).getDate();
  const days = Array.from({ length: daysInSelectedMonth }, (_, i) =>
    String(i + 1).padStart(2, '0')
  );
  const effectiveDayIdx = Math.min(dayIdx, days.length - 1);

  const handleConfirm = () => {
    const d = String(effectiveDayIdx + 1).padStart(2, '0');
    const m = String(monthIdx + 1).padStart(2, '0');
    onConfirm(`${years[yearIdx]}-${m}-${d}`);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity
        style={pickerStyles.overlay}
        onPress={onClose}
        activeOpacity={1}
      />
      <View style={[pickerStyles.sheet, { backgroundColor: colors.surface }]}>
        {/* Handle bar */}
        <View style={[pickerStyles.handle, { backgroundColor: colors.separator }]} />

        {/* Header */}
        <View style={[pickerStyles.header, { borderBottomColor: colors.separator }]}>
          <TouchableOpacity onPress={onClose} style={pickerStyles.headerBtn}>
            <Text style={{ color: colors.primary, fontSize: 16 }}>Annuler</Text>
          </TouchableOpacity>
          <Text style={[pickerStyles.headerTitle, { color: colors.text }]}>
            Date du trajet
          </Text>
          <TouchableOpacity onPress={handleConfirm} style={pickerStyles.headerBtn}>
            <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '700' }}>
              OK
            </Text>
          </TouchableOpacity>
        </View>

        {/* Column labels */}
        <View style={pickerStyles.labelRow}>
          <Text style={[pickerStyles.colLabel, { color: colors.textSecondary }]}>Jour</Text>
          <Text style={[pickerStyles.colLabel, { color: colors.textSecondary, flex: 2 }]}>Mois</Text>
          <Text style={[pickerStyles.colLabel, { color: colors.textSecondary }]}>Année</Text>
        </View>

        {/* Spinners */}
        <View style={pickerStyles.spinnerRow}>
          <SpinnerColumn
            items={days}
            selectedIndex={effectiveDayIdx}
            onIndexChange={setDayIdx}
            colors={colors}
          />
          <SpinnerColumn
            items={MOIS_PICKER}
            selectedIndex={monthIdx}
            onIndexChange={setMonthIdx}
            width={2}
            colors={colors}
          />
          <SpinnerColumn
            items={years}
            selectedIndex={yearIdx}
            onIndexChange={setYearIdx}
            colors={colors}
          />
        </View>
      </View>
    </Modal>
  );
}

const pickerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
    minWidth: 70,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  labelRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  colLabel: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  spinnerRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
  },
  selectionHighlight: {
    position: 'absolute',
    top: ITEM_H * 2,
    left: 4,
    right: 4,
    height: ITEM_H,
    borderRadius: 8,
    zIndex: -1,
  },
  spinnerItem: {
    height: ITEM_H,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinnerText: {
    fontSize: 16,
    fontWeight: '400',
  },
  spinnerTextSelected: {
    fontWeight: '600',
    fontSize: 17,
  },
});

export function AjoutTrajetScreen({ navigation, route }: AjoutTrajetScreenProps) {
  const { colors } = useTheme();
  const { addTrajet, editTrajet, trajets } = useTrajetStore();
  const { vehicules } = useVehiculeStore();

  const editingId = route.params?.trajetId;
  const existingTrajet = editingId
    ? trajets.find((t) => t.id === editingId)
    : null;

  const [date, setDate] = useState(existingTrajet?.date ?? getCurrentISODate());
  const [adresseDepart, setAdresseDepart] = useState(
    existingTrajet?.adresse_depart ?? ''
  );
  const [adresseArrivee, setAdresseArrivee] = useState(
    existingTrajet?.adresse_arrivee ?? ''
  );
  const [departCoords, setDepartCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [arriveeCoords, setArriveeCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [distanceStr, setDistanceStr] = useState(
    existingTrajet ? existingTrajet.distance_km.toString() : ''
  );
  const [allerRetour, setAllerRetour] = useState(
    existingTrajet?.aller_retour ?? false
  );
  const [motif, setMotif] = useState(existingTrajet?.motif ?? '');
  const [vehiculeId, setVehiculeId] = useState<number | null>(
    existingTrajet?.vehicule_id ?? vehicules[0]?.id ?? null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isCalculatingBareme, setIsCalculatingBareme] = useState(false);
  const [showVehiculePicker, setShowVehiculePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [addressModalTarget, setAddressModalTarget] = useState<'depart' | 'arrivee' | null>(null);
  const [baremePreview, setBaremePreview] = useState<{
    montant: number;
    tarifKm: number;
    distanceAvantKm: number;
    distanceEffectiveKm: number;
  } | null>(null);

  // Auto-calculate distance when both coordinates are set
  useEffect(() => {
    if (departCoords && arriveeCoords) {
      setIsCalculating(true);
      calculateRoute(
        departCoords.lat,
        departCoords.lon,
        arriveeCoords.lat,
        arriveeCoords.lon
      )
        .then((result) => {
          setDistanceStr(result.distance_km.toString());
        })
        .catch(() => {
          // Keep manual distance if route calculation fails
        })
        .finally(() => {
          setIsCalculating(false);
        });
    }
  }, [departCoords, arriveeCoords]);

  const distance = useMemo(() => {
    const val = parseFloat(distanceStr.replace(',', '.'));
    return isNaN(val) ? null : val;
  }, [distanceStr]);

  const selectedVehicule = useMemo(
    () => vehicules.find((v) => v.id === vehiculeId),
    [vehicules, vehiculeId]
  );

  useEffect(() => {
    let cancelled = false;

    if (
      distance === null ||
      distance <= 0 ||
      vehiculeId === null ||
      !selectedVehicule
    ) {
      setBaremePreview(null);
      setIsCalculatingBareme(false);
      return;
    }

    setIsCalculatingBareme(true);

    getTrajetBaremePreview({
      trajetId: editingId,
      vehiculeId,
      date,
      distanceKm: distance,
      allerRetour,
    })
      .then((preview) => {
        if (!cancelled) {
          setBaremePreview(preview);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBaremePreview(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsCalculatingBareme(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [distance, vehiculeId, selectedVehicule, editingId, date, allerRetour]);

  const montant = baremePreview?.montant ?? null;

  const isValid =
    adresseDepart.trim().length > 0 &&
    adresseArrivee.trim().length > 0 &&
    distance !== null &&
    distance > 0 &&
    vehiculeId !== null;

  const handleSave = useCallback(async () => {
    if (!isValid || montant === null || vehiculeId === null || distance === null) return;
    setIsSaving(true);
    try {
      const formData = {
        date,
        adresse_depart: adresseDepart.trim(),
        adresse_arrivee: adresseArrivee.trim(),
        distance_km: distance,
        aller_retour: allerRetour,
        motif: motif.trim(),
        vehicule_id: vehiculeId,
      };

      if (editingId) {
        await editTrajet(editingId, formData);
      } else {
        await addTrajet(formData);
      }
      navigation.goBack();
    } catch {
      Alert.alert('Erreur', 'Impossible de sauvegarder le trajet.');
    } finally {
      setIsSaving(false);
    }
  }, [
    isValid, montant, vehiculeId, distance, date, adresseDepart,
    adresseArrivee, allerRetour, motif, editingId,
    addTrajet, editTrajet, navigation,
  ]);

  // Set header buttons
  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '500' }}>
            Annuler
          </Text>
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity
          onPress={handleSave}
          disabled={!isValid || isSaving}
        >
          <Text
            style={{
              color: isValid ? colors.primary : colors.textMuted,
              fontSize: 16,
              fontWeight: '600',
            }}
          >
            {isSaving ? '...' : 'Enregistrer'}
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, colors, isValid, isSaving, handleSave]);

  const handleAddressSelect = useCallback(
    (result: GeocodingResult) => {
      const shortAddr = formatShortAddress(result);
      const coords = { lat: parseFloat(result.lat), lon: parseFloat(result.lon) };

      if (addressModalTarget === 'depart') {
        setAdresseDepart(shortAddr);
        setDepartCoords(coords);
      } else {
        setAdresseArrivee(shortAddr);
        setArriveeCoords(coords);
      }
    },
    [addressModalTarget]
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Date field */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>DATE</Text>
          <TouchableOpacity
            style={[styles.fieldRow, { backgroundColor: colors.surfaceSecondary }]}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.6}
          >
            <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.fieldValue, { color: colors.text, flex: 1 }]}>
              {formatDateFr(date)}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Address fields */}
        <View style={styles.addressSection}>
          <TouchableOpacity
            style={[styles.addressField, { backgroundColor: colors.surfaceSecondary }]}
            onPress={() => setAddressModalTarget('depart')}
            activeOpacity={0.6}
          >
            <View style={[styles.addressDot, { backgroundColor: '#34C759' }]} />
            <Text
              style={[
                styles.addressText,
                { color: adresseDepart ? colors.text : colors.textMuted },
              ]}
              numberOfLines={1}
            >
              {adresseDepart || 'Adresse de départ'}
            </Text>
          </TouchableOpacity>

          <View style={styles.addressDivider}>
            <View style={[styles.addressDividerLine, { backgroundColor: colors.separator }]} />
          </View>

          <TouchableOpacity
            style={[styles.addressField, { backgroundColor: colors.surfaceSecondary }]}
            onPress={() => setAddressModalTarget('arrivee')}
            activeOpacity={0.6}
          >
            <View style={[styles.addressDot, { backgroundColor: '#FF3B30' }]} />
            <Text
              style={[
                styles.addressText,
                { color: adresseArrivee ? colors.text : colors.textMuted },
              ]}
              numberOfLines={1}
            >
              {adresseArrivee || "Adresse d'arrivée"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Distance + Aller-retour row */}
        <View style={styles.distanceRow}>
          <View style={styles.distanceField}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>DISTANCE</Text>
            <View style={[styles.distanceInputContainer, { backgroundColor: colors.surfaceSecondary }]}>
              {isCalculating ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <TextInput
                  style={[styles.distanceInput, { color: colors.text }]}
                  value={distanceStr}
                  onChangeText={setDistanceStr}
                  placeholder="0,0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                />
              )}
              <Text style={[styles.distanceUnit, { color: colors.textSecondary }]}>km</Text>
            </View>
          </View>

          <View style={styles.allerRetourField}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>ALLER-RETOUR</Text>
            <View style={[styles.switchContainer, { backgroundColor: colors.surfaceSecondary }]}>
              <Switch
                value={allerRetour}
                onValueChange={setAllerRetour}
                trackColor={{ true: '#0070EB', false: '#E2E2E7' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        {allerRetour && distance !== null && (
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            Distance effective : {formatKm(distance * 2)}
          </Text>
        )}

        {/* Vehicle picker */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>VÉHICULE</Text>
          <TouchableOpacity
            style={[styles.vehiculeRow, { backgroundColor: colors.surfaceSecondary }]}
            onPress={() => setShowVehiculePicker(!showVehiculePicker)}
            activeOpacity={0.6}
          >
            <View style={styles.vehiculeLeft}>
              <View style={[styles.vehiculeIcon, { backgroundColor: colors.surfaceTertiary }]}>
                <Ionicons name="car" size={16} color={colors.textSecondary} />
              </View>
              <Text
                style={[
                  styles.vehiculeText,
                  { color: selectedVehicule ? colors.text : colors.textMuted },
                ]}
              >
                {selectedVehicule?.nom ?? 'Sélectionner un véhicule'}
              </Text>
            </View>
            <Ionicons
              name={showVehiculePicker ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          {showVehiculePicker && (
            <View style={[styles.pickerList, { backgroundColor: colors.surface, borderColor: colors.separator }]}>
              {vehicules.map((v) => (
                <TouchableOpacity
                  key={v.id}
                  style={[
                    styles.pickerItem,
                    v.id === vehiculeId && { backgroundColor: colors.surfaceSecondary },
                  ]}
                  onPress={() => {
                    setVehiculeId(v.id);
                    setShowVehiculePicker(false);
                  }}
                >
                  <Text style={[styles.pickerItemText, { color: colors.text }]}>{v.nom}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '500' }}>
                    {getVehiculeDescription(v)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Motif field */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>MOTIF</Text>
          <View style={[styles.fieldRow, { backgroundColor: colors.surfaceSecondary }]}>
            <TextInput
              style={[styles.motifInput, { color: colors.text }]}
              value={motif}
              onChangeText={setMotif}
              placeholder="Ex: Rendez-vous client"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>

        {/* Summary card */}
        {(montant !== null || isCalculatingBareme) && (
          <View style={[styles.summaryCard, { backgroundColor: '#0058BC' }]}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Distance</Text>
              <Text style={styles.summaryValue}>
                {baremePreview
                  ? formatKm(baremePreview.distanceEffectiveKm)
                  : formatKm(allerRetour && distance !== null ? distance * 2 : (distance ?? 0))}
              </Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: 'rgba(255,255,255,0.15)' }]} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tarif estimé</Text>
              <Text style={styles.summaryValue}>
                {isCalculatingBareme ? 'Calcul...' : baremePreview ? `${formatTarifKm(baremePreview.tarifKm)}/km` : '-'}
              </Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: 'rgba(255,255,255,0.15)' }]} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Cumul annuel avant</Text>
              <Text style={styles.summaryValue}>
                {baremePreview ? formatKm(baremePreview.distanceAvantKm) : '-'}
              </Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: 'rgba(255,255,255,0.15)' }]} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryAmountLabel}>Montant</Text>
              {isCalculatingBareme ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.summaryAmountValue}>
                  {montant !== null ? formatEuros(montant) : '-'}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Save button */}
        <TouchableOpacity
          style={[
            styles.saveButton,
            { opacity: isValid && !isSaving ? 1 : 0.5 },
          ]}
          onPress={handleSave}
          disabled={!isValid || isSaving}
          activeOpacity={0.8}
        >
          <View style={styles.saveButtonInner}>
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>
                {editingId ? 'Modifier le trajet' : 'Enregistrer le trajet'}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* Date picker modal */}
      <DatePickerModal
        visible={showDatePicker}
        date={date}
        onConfirm={setDate}
        onClose={() => setShowDatePicker(false)}
        colors={colors}
      />

      {/* Address search modal */}
      <AddressSearchModal
        visible={addressModalTarget !== null}
        title={
          addressModalTarget === 'depart'
            ? 'Adresse de départ'
            : "Adresse d'arrivée"
        }
        onClose={() => setAddressModalTarget(null)}
        onSelect={handleAddressSelect}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 40,
    gap: 20,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.55,
    textTransform: 'uppercase',
    marginLeft: 4,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 52,
    borderRadius: 12,
    gap: 12,
  },
  fieldValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  addressSection: {
    gap: 0,
  },
  addressField: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 52,
    borderRadius: 12,
    gap: 12,
  },
  addressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  addressText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  addressDivider: {
    paddingLeft: 20,
    height: 12,
  },
  addressDividerLine: {
    width: 1,
    height: 12,
    marginLeft: 4,
  },
  distanceRow: {
    flexDirection: 'row',
    gap: 12,
  },
  distanceField: {
    flex: 1,
    gap: 8,
  },
  distanceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 52,
    borderRadius: 12,
    gap: 8,
  },
  distanceInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    padding: 0,
  },
  distanceUnit: {
    fontSize: 14,
    fontWeight: '500',
  },
  allerRetourField: {
    gap: 8,
  },
  switchContainer: {
    height: 52,
    paddingHorizontal: 12,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hint: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: -12,
    marginLeft: 4,
  },
  vehiculeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 52,
    borderRadius: 12,
  },
  vehiculeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  vehiculeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehiculeText: {
    fontSize: 16,
    fontWeight: '500',
  },
  pickerList: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pickerItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  motifInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    padding: 0,
  },
  summaryCard: {
    borderRadius: 16,
    padding: 20,
    gap: 0,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  summaryDivider: {
    height: 1,
  },
  summaryAmountLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  summaryAmountValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  saveButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: 'rgba(0,88,188,0.1)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 5,
  },
  saveButtonInner: {
    backgroundColor: '#0058BC',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    minHeight: 56,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
