import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
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
import { formatDateFr, formatKm } from '../utils/formatting';
import { getCurrentISODate, getCurrentTimeHM } from '../utils/dateUtils';
import type { AjoutHorodatageScreenProps } from '../types/navigation';

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

  useEffect(() => {
    if (visible) {
      const [y, m, d] = date.split('-').map(Number);
      setMonthIdx(m - 1);
      const yIdx = years.indexOf(String(y));
      setYearIdx(yIdx >= 0 ? yIdx : 5);
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
        <View style={[pickerStyles.handle, { backgroundColor: colors.separator }]} />
        <View style={[pickerStyles.header, { borderBottomColor: colors.separator }]}>
          <TouchableOpacity onPress={onClose} style={pickerStyles.headerBtn}>
            <Text style={{ color: colors.primary, fontSize: 16 }}>Annuler</Text>
          </TouchableOpacity>
          <Text style={[pickerStyles.headerTitle, { color: colors.text }]}>
            Date de l'horodatage
          </Text>
          <TouchableOpacity onPress={handleConfirm} style={pickerStyles.headerBtn}>
            <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '700' }}>
              OK
            </Text>
          </TouchableOpacity>
        </View>

        <View style={pickerStyles.labelRow}>
          <Text style={[pickerStyles.colLabel, { color: colors.textSecondary }]}>Jour</Text>
          <Text style={[pickerStyles.colLabel, { color: colors.textSecondary, flex: 2 }]}>Mois</Text>
          <Text style={[pickerStyles.colLabel, { color: colors.textSecondary }]}>Année</Text>
        </View>

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

function formatTimeInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function isValidTime(value: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [hours, minutes] = value.split(':').map(Number);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
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

export function AjoutHorodatageScreen({ navigation, route }: AjoutHorodatageScreenProps) {
  const { colors } = useTheme();
  const { horodatages, addHorodatage, editHorodatage } = useTrajetStore();
  const { vehicules } = useVehiculeStore();

  const editingId = route.params?.horodatageId;
  const existingHorodatage = editingId
    ? horodatages.find((h) => h.id === editingId)
    : null;

  const [date, setDate] = useState(existingHorodatage?.date ?? getCurrentISODate());
  const [heure, setHeure] = useState(existingHorodatage?.heure ?? getCurrentTimeHM());
  const [kilometrageStr, setKilometrageStr] = useState(
    existingHorodatage ? existingHorodatage.kilometrage_km.toString() : ''
  );
  const [note, setNote] = useState(existingHorodatage?.note ?? '');
  const [vehiculeId, setVehiculeId] = useState<number | null>(
    existingHorodatage?.vehicule_id ?? vehicules[0]?.id ?? null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [showVehiculePicker, setShowVehiculePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const kilometrage = useMemo(() => {
    const val = parseFloat(kilometrageStr.replace(',', '.'));
    return isNaN(val) ? null : val;
  }, [kilometrageStr]);

  const selectedVehicule = useMemo(
    () => vehicules.find((v) => v.id === vehiculeId),
    [vehicules, vehiculeId]
  );

  const isValid =
    kilometrage !== null &&
    kilometrage > 0 &&
    vehiculeId !== null &&
    isValidTime(heure);

  const handleSave = useCallback(async () => {
    if (!isValid || kilometrage === null || vehiculeId === null) return;

    setIsSaving(true);
    try {
      const formData = {
        date,
        heure,
        kilometrage_km: kilometrage,
        note: note.trim(),
        vehicule_id: vehiculeId,
      };

      if (editingId) {
        await editHorodatage(editingId, formData);
      } else {
        await addHorodatage(formData);
      }

      navigation.goBack();
    } catch {
      Alert.alert('Erreur', "Impossible de sauvegarder l'horodatage.");
    } finally {
      setIsSaving(false);
    }
  }, [isValid, kilometrage, vehiculeId, date, heure, note, editingId, editHorodatage, addHorodatage, navigation]);

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

        <View style={styles.doubleRow}>
          <View style={[styles.fieldGroup, styles.doubleField]}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>HEURE</Text>
            <View style={[styles.fieldRow, { backgroundColor: colors.surfaceSecondary }]}>
              <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
              <TextInput
                style={[styles.fieldInput, { color: colors.text }]}
                value={heure}
                onChangeText={(value) => setHeure(formatTimeInput(value))}
                placeholder="14:30"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                maxLength={5}
              />
            </View>
          </View>

          <View style={[styles.fieldGroup, styles.doubleField]}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>KILOMÉTRAGE</Text>
            <View style={[styles.fieldRow, { backgroundColor: colors.surfaceSecondary }]}>
              <Ionicons name="speedometer-outline" size={18} color={colors.textSecondary} />
              <TextInput
                style={[styles.fieldInput, { color: colors.text }]}
                value={kilometrageStr}
                onChangeText={setKilometrageStr}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
              />
              <Text style={[styles.trailingText, { color: colors.textSecondary }]}>km</Text>
            </View>
          </View>
        </View>

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
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>NOTE</Text>
          <View style={[styles.noteContainer, { backgroundColor: colors.surfaceSecondary }]}>
            <TextInput
              style={[styles.noteInput, { color: colors.text }]}
              value={note}
              onChangeText={setNote}
              placeholder="Ex: Relevé avant départ"
              placeholderTextColor={colors.textMuted}
              multiline
            />
          </View>
        </View>

        {kilometrage !== null && (
          <View style={[styles.summaryCard, { backgroundColor: '#0058BC' }]}>
            <Text style={styles.summaryEyebrow}>HORODATAGE ENREGISTRÉ</Text>
            <Text style={styles.summaryKm}>{formatKm(kilometrage)}</Text>
            <Text style={styles.summaryMeta}>
              {selectedVehicule?.nom ?? 'Véhicule'} • {heure}
            </Text>
          </View>
        )}

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
                {editingId ? "Modifier l'horodatage" : "Enregistrer l'horodatage"}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </ScrollView>

      <DatePickerModal
        visible={showDatePicker}
        date={date}
        onConfirm={setDate}
        onClose={() => setShowDatePicker(false)}
        colors={colors}
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
  fieldInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  trailingText: {
    fontSize: 15,
    fontWeight: '500',
  },
  doubleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  doubleField: {
    flex: 1,
  },
  vehiculeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
    borderRadius: 14,
  },
  vehiculeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  vehiculeIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehiculeText: {
    fontSize: 16,
    fontWeight: '500',
  },
  pickerList: {
    marginTop: 8,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  pickerItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pickerItemText: {
    fontSize: 15,
    fontWeight: '500',
  },
  noteContainer: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 96,
  },
  noteInput: {
    fontSize: 16,
    minHeight: 72,
    textAlignVertical: 'top',
  },
  summaryCard: {
    borderRadius: 20,
    padding: 20,
    gap: 6,
  },
  summaryEyebrow: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  summaryKm: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
  },
  summaryMeta: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 14,
    fontWeight: '500',
  },
  saveButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  saveButtonInner: {
    backgroundColor: '#0058BC',
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
