import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useTheme } from '../theme/ThemeContext';
import { PREMIUM_REQUIRED_ERROR_CODE, useReportStore } from '../stores/useReportStore';
import { useVehiculeStore } from '../stores/useVehiculeStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useSubscriptionStore } from '../stores/useSubscriptionStore';
import { formatEuros } from '../utils/formatting';
import { getMonthRange, formatMonthYear } from '../utils/dateUtils';
import type { TabParamList } from '../types/navigation';

const MOIS_COURTS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

export function RapportsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<BottomTabNavigationProp<TabParamList>>();
  const { vehicules, loadVehicules } = useVehiculeStore();
  const { userName, companyName } = useSettingsStore();
  const refreshSubscriptionStatus = useSubscriptionStore((s) => s.refreshStatus);
  const {
    filters,
    reportData,
    isGenerating,
    setFilters,
    generateReport,
    exportPDF,
    exportExcel,
    shareFile,
  } = useReportStore();

  const [isExporting, setIsExporting] = useState(false);
  const [showPeriodPicker, setShowPeriodPicker] = useState(false);
  const [showVehiclePicker, setShowVehiclePicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(parseInt(filters.date_debut.substring(0, 4)));

  useEffect(() => {
    loadVehicules();
  }, [loadVehicules]);

  useFocusEffect(
    useCallback(() => {
      refreshSubscriptionStatus();
    }, [refreshSubscriptionStatus])
  );

  const currentYearMonth = filters.date_debut.substring(0, 7);
  const selectedMonthIndex = parseInt(filters.date_debut.substring(5, 7)) - 1;
  const selectedVehicule = vehicules.find(v => v.id === filters.vehicule_id) ?? null;

  const handleOpenPeriodPicker = () => {
    setPickerYear(parseInt(filters.date_debut.substring(0, 4)));
    setShowPeriodPicker(true);
  };

  const handleSelectMonth = (monthIndex: number) => {
    const ym = `${pickerYear}-${String(monthIndex + 1).padStart(2, '0')}`;
    const { start, end } = getMonthRange(ym);
    setFilters({ date_debut: start, date_fin: end });
    setShowPeriodPicker(false);
  };

  const handleSelectVehicle = (id: number | null) => {
    setFilters({ vehicule_id: id });
    setShowVehiclePicker(false);
  };

  const handleGenerate = useCallback(async () => {
    try {
      await generateReport();
    } catch {
      Alert.alert('Erreur', 'Impossible de générer le rapport.');
    }
  }, [generateReport]);

  const ensurePremiumAccess = useCallback(async () => {
    const hasActiveSubscription = await refreshSubscriptionStatus();
    if (hasActiveSubscription) {
      return true;
    }

    navigation.navigate('Parametres', { screen: 'Paywall' });
    return false;
  }, [navigation, refreshSubscriptionStatus]);

  const handleExportPDF = useCallback(async () => {
    const canExport = await ensurePremiumAccess();
    if (!canExport) {
      return;
    }

    setIsExporting(true);
    try {
      const uri = await exportPDF();
      await shareFile(uri);
    } catch (error: any) {
      if (error?.code === PREMIUM_REQUIRED_ERROR_CODE) {
        navigation.navigate('Parametres', { screen: 'Paywall' });
        return;
      }
      Alert.alert('Erreur', 'Impossible de générer le PDF.');
    } finally {
      setIsExporting(false);
    }
  }, [ensurePremiumAccess, exportPDF, navigation, shareFile]);

  const handleExportExcel = useCallback(async () => {
    const canExport = await ensurePremiumAccess();
    if (!canExport) {
      return;
    }

    setIsExporting(true);
    try {
      const uri = await exportExcel();
      await shareFile(uri);
    } catch (error: any) {
      if (error?.code === PREMIUM_REQUIRED_ERROR_CODE) {
        navigation.navigate('Parametres', { screen: 'Paywall' });
        return;
      }
      Alert.alert('Erreur', 'Impossible de générer le fichier Excel.');
    } finally {
      setIsExporting(false);
    }
  }, [ensurePremiumAccess, exportExcel, navigation, shareFile]);

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
      >
        {/* Header */}
        <View style={styles.headerSection}>
          <Text style={[styles.heading, { color: colors.text }]}>
            Générer un rapport
          </Text>
          <Text style={[styles.subtitle, { color: colors.text }]}>
            Filtrez et exportez vos trajets
          </Text>
        </View>

        {/* Filters */}
        <View style={styles.filtersSection}>
          {/* Période */}
          <View style={styles.filterField}>
            <Text style={[styles.filterLabel, { color: colors.text }]}>PÉRIODE</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleOpenPeriodPicker}
              style={[styles.filterInput, { backgroundColor: colors.separator }]}
            >
              <Text style={[styles.filterInputText, { color: colors.text }]}>
                {formatMonthYear(currentYearMonth)}
              </Text>
              <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Véhicule */}
          <View style={styles.filterField}>
            <Text style={[styles.filterLabel, { color: colors.text }]}>VÉHICULE</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowVehiclePicker(true)}
              style={[styles.filterInput, { backgroundColor: colors.separator }]}
            >
              <Text style={[styles.filterInputText, { color: colors.text }]}>
                {selectedVehicule ? selectedVehicule.nom : 'Tous les véhicules'}
              </Text>
              <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Generate button */}
          <TouchableOpacity
            onPress={handleGenerate}
            disabled={isGenerating}
            activeOpacity={0.8}
            style={styles.generateButton}
          >
            <View style={styles.generateGradient}>
              {isGenerating ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.generateText}>Générer le rapport</Text>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Report results */}
        {reportData && (
          <View style={styles.resultsSection}>
            <Text style={[styles.resultsHeading, { color: colors.text }]}>
              APERÇU DU RAPPORT
            </Text>

            <View style={[styles.reportCard, { backgroundColor: colors.surfaceSecondary }]}>
              {/* Summary info */}
              <View style={styles.reportBadgeRow}>
                <View style={styles.reportBadge}>
                  <Text style={styles.reportBadgeText}>
                    {formatMonthYear(currentYearMonth)}
                  </Text>
                </View>
              </View>
              <Text style={[styles.reportName, { color: colors.text }]}>
                {userName || 'Utilisateur'}
              </Text>
              {companyName ? (
                <Text style={[styles.reportCompany, { color: colors.text }]}>
                  {companyName}
                </Text>
              ) : null}
              {reportData.horodatages.length > 0 ? (
                <Text style={[styles.reportCompany, { color: colors.textSecondary }]}>
                  {reportData.horodatages.length} horodatage(s) kilométriques inclus
                </Text>
              ) : null}

              {/* Stats grid */}
              <View style={styles.statsGrid}>
                <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.statCardLabel, { color: colors.text }]}>TRAJETS</Text>
                  <Text style={[styles.statCardValue, { color: colors.text }]}>
                    {reportData.trajets.length}
                  </Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.statCardLabel, { color: colors.text }]}>DISTANCE</Text>
                  <Text style={[styles.statCardValue, { color: colors.text }]}>
                    {Math.round(reportData.total_km)}
                  </Text>
                  <Text style={[styles.statCardUnit, { color: colors.text }]}>km</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.statCardLabel, { color: colors.text }]}>MONTANT</Text>
                  <Text style={[styles.statCardValue, { color: '#0058BC' }]}>
                    {formatEuros(reportData.total_eur)}
                  </Text>
                </View>
              </View>

              {/* Export buttons */}
              <View style={styles.exportRow}>
                <TouchableOpacity
                  style={styles.exportPdfButton}
                  onPress={handleExportPDF}
                  disabled={isExporting}
                >
                  <Ionicons name="document-text-outline" size={14} color="#BA1A1A" />
                  <Text style={styles.exportPdfText}>Exporter PDF</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.exportExcelButton}
                  onPress={handleExportExcel}
                  disabled={isExporting}
                >
                  <Ionicons name="grid-outline" size={14} color="#006B27" />
                  <Text style={styles.exportExcelText}>Exporter Excel</Text>
                </TouchableOpacity>
              </View>
            </View>

            {isExporting && (
              <ActivityIndicator
                style={{ marginTop: 16 }}
                color={colors.primary}
              />
            )}
          </View>
        )}

        {/* Empty history placeholder */}
        {!reportData && (
          <View style={styles.emptyHistory}>
            <Ionicons name="time-outline" size={24} color={colors.textMuted} />
            <Text style={[styles.emptyHistoryText, { color: colors.text }]}>
              HISTORIQUE DES RAPPORTS
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Period Picker Modal */}
      <Modal
        visible={showPeriodPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPeriodPicker(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowPeriodPicker(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: colors.surface }]} onPress={() => {}}>
            <View style={styles.yearRow}>
              <TouchableOpacity onPress={() => setPickerYear(y => y - 1)} style={styles.yearArrow}>
                <Ionicons name="chevron-back" size={22} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.yearText, { color: colors.text }]}>{pickerYear}</Text>
              <TouchableOpacity onPress={() => setPickerYear(y => y + 1)} style={styles.yearArrow}>
                <Ionicons name="chevron-forward" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.monthGrid}>
              {MOIS_COURTS.map((mois, index) => {
                const isSelected =
                  pickerYear === parseInt(filters.date_debut.substring(0, 4)) &&
                  index === selectedMonthIndex;
                return (
                  <TouchableOpacity
                    key={index}
                    style={[styles.monthCell, isSelected && styles.monthCellSelected]}
                    onPress={() => handleSelectMonth(index)}
                  >
                    <Text style={[styles.monthCellText, { color: isSelected ? '#FFFFFF' : colors.text }]}>
                      {mois}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Vehicle Picker Modal */}
      <Modal
        visible={showVehiclePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowVehiclePicker(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowVehiclePicker(false)}>
          <Pressable style={[styles.vehicleSheet, { backgroundColor: colors.surface }]} onPress={() => {}}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Choisir un véhicule</Text>

            <TouchableOpacity
              style={[styles.vehicleRow, filters.vehicule_id === null && styles.vehicleRowSelected]}
              onPress={() => handleSelectVehicle(null)}
            >
              <Text style={[styles.vehicleRowText, { color: colors.text }]}>Tous les véhicules</Text>
              {filters.vehicule_id === null && (
                <Ionicons name="checkmark" size={18} color="#0058BC" />
              )}
            </TouchableOpacity>

            {vehicules.map(v => (
              <TouchableOpacity
                key={v.id}
                style={[styles.vehicleRow, filters.vehicule_id === v.id && styles.vehicleRowSelected]}
                onPress={() => handleSelectVehicle(v.id)}
              >
                <View>
                  <Text style={[styles.vehicleRowText, { color: colors.text }]}>{v.nom}</Text>
                  <Text style={[styles.vehicleRowSub, { color: colors.textSecondary }]}>{v.immatriculation}</Text>
                </View>
                {filters.vehicule_id === v.id && (
                  <Ionicons name="checkmark" size={18} color="#0058BC" />
                )}
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 120,
  },
  headerSection: {
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 8,
  },
  heading: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.75,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
  },
  filtersSection: {
    paddingHorizontal: 24,
    paddingTop: 32,
    gap: 24,
  },
  filterField: {
    gap: 8,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.275,
    textTransform: 'uppercase',
    marginLeft: 4,
  },
  filterInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 10,
  },
  filterInputText: {
    fontSize: 16,
    fontWeight: '500',
  },
  generateButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: 'rgba(0,88,188,0.1)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 5,
  },
  generateGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#0058BC',
  },
  generateText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  resultsSection: {
    paddingHorizontal: 24,
    paddingTop: 40,
    gap: 16,
  },
  resultsHeading: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    opacity: 0.7,
  },
  reportCard: {
    borderRadius: 16,
    padding: 24,
    gap: 24,
  },
  reportBadgeRow: {
    flexDirection: 'row',
  },
  reportBadge: {
    backgroundColor: '#D8E2FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  reportBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#004493',
    textTransform: 'uppercase',
  },
  reportName: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  reportCompany: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: -16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    gap: 4,
  },
  statCardLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statCardValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statCardUnit: {
    fontSize: 12,
    fontWeight: '700',
  },
  exportRow: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 8,
  },
  exportPdfButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: 'rgba(186,26,26,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(186,26,26,0.1)',
  },
  exportPdfText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#BA1A1A',
  },
  exportExcelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: 'rgba(0,107,39,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0,107,39,0.1)',
  },
  exportExcelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#006B27',
  },
  emptyHistory: {
    marginHorizontal: 24,
    marginTop: 32,
    height: 128,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(193,198,215,0.2)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(243,243,248,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyHistoryText: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  // Modal shared
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Period picker
  modalCard: {
    width: 320,
    borderRadius: 20,
    padding: 24,
    gap: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  yearArrow: {
    padding: 8,
  },
  yearText: {
    fontSize: 20,
    fontWeight: '700',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monthCell: {
    width: '30%',
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  monthCellSelected: {
    backgroundColor: '#0058BC',
  },
  monthCellText: {
    fontSize: 15,
    fontWeight: '500',
  },
  // Vehicle picker (bottom sheet)
  vehicleSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 24,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  vehicleRowSelected: {
    backgroundColor: 'rgba(0,88,188,0.06)',
  },
  vehicleRowText: {
    fontSize: 16,
    fontWeight: '500',
  },
  vehicleRowSub: {
    fontSize: 13,
    fontWeight: '400',
    marginTop: 2,
  },
});
