import React, { useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Switch,
  View,
  Text,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useVehiculeStore } from '../stores/useVehiculeStore';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import type { AjoutVehiculeScreenProps } from '../types/navigation';

export function AjoutVehiculeScreen({
  navigation,
  route,
}: AjoutVehiculeScreenProps) {
  const { colors } = useTheme();
  const { vehicules, addVehicule, editVehicule } = useVehiculeStore();

  const editingId = route.params?.vehiculeId;
  const existing = editingId
    ? vehicules.find((v) => v.id === editingId)
    : null;

  const [nom, setNom] = useState(existing?.nom ?? '');
  const [puissanceStr, setPuissanceStr] = useState(
    existing ? existing.puissance_fiscale.toString() : ''
  );
  const [isElectrique, setIsElectrique] = useState(
    existing?.is_electrique ?? false
  );
  const [isSaving, setIsSaving] = useState(false);

  const puissance = useMemo(() => {
    const val = parseInt(puissanceStr, 10);
    return isNaN(val) ? null : val;
  }, [puissanceStr]);

  const isValid = nom.trim().length > 0 && puissance !== null && puissance > 0;

  const handleSave = useCallback(async () => {
    if (!isValid || puissance === null) return;
    setIsSaving(true);
    try {
      const data = {
        nom: nom.trim(),
        immatriculation: '',
        puissance_fiscale: puissance,
        is_electrique: isElectrique,
      };

      if (editingId) {
        await editVehicule(editingId, data);
      } else {
        await addVehicule(data);
      }
      navigation.goBack();
    } catch {
      Alert.alert('Erreur', 'Impossible de sauvegarder le véhicule.');
    } finally {
      setIsSaving(false);
    }
  }, [
    isValid, puissance, nom, isElectrique,
    editingId, addVehicule, editVehicule, navigation,
  ]);

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
        <Input
          label="Nom du véhicule"
          value={nom}
          onChangeText={setNom}
          placeholder="Ex: Renault Clio"
        />

        <Input
          label="Chevaux fiscaux"
          value={puissanceStr}
          onChangeText={setPuissanceStr}
          placeholder="Ex: 5"
          keyboardType="number-pad"
        />

        <View
          style={[
            styles.switchCard,
            { backgroundColor: colors.surfaceSecondary },
          ]}
        >
          <View style={styles.switchTextBlock}>
            <Text style={[styles.switchTitle, { color: colors.text }]}>
              Véhicule électrique
            </Text>
            <Text style={[styles.switchHint, { color: colors.textSecondary }]}>
              Majoration automatique de 20 % du barème URSSAF
            </Text>
          </View>
          <Switch
            value={isElectrique}
            onValueChange={setIsElectrique}
            trackColor={{ true: '#0070EB', false: '#E2E2E7' }}
            thumbColor="#FFFFFF"
          />
        </View>

        <Button
          title={editingId ? 'Modifier' : 'Ajouter'}
          onPress={handleSave}
          disabled={!isValid}
          loading={isSaving}
          style={{ marginTop: 32 }}
        />
      </ScrollView>
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
  },
  switchCard: {
    marginTop: 20,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  switchTextBlock: {
    flex: 1,
    gap: 4,
  },
  switchTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  switchHint: {
    fontSize: 13,
    lineHeight: 18,
  },
});
