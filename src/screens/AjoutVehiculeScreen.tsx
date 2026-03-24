import React, { useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
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
  const [immatriculation, setImmatriculation] = useState(
    existing?.immatriculation ?? ''
  );
  const [tarifStr, setTarifStr] = useState(
    existing ? existing.tarif_km.toString() : ''
  );
  const [puissanceStr, setPuissanceStr] = useState(
    existing ? existing.puissance_fiscale.toString() : ''
  );
  const [isSaving, setIsSaving] = useState(false);

  const tarif = useMemo(() => {
    const val = parseFloat(tarifStr.replace(',', '.'));
    return isNaN(val) ? null : val;
  }, [tarifStr]);

  const puissance = useMemo(() => {
    const val = parseInt(puissanceStr, 10);
    return isNaN(val) ? null : val;
  }, [puissanceStr]);

  const isValid =
    nom.trim().length > 0 && tarif !== null && tarif > 0;

  const handleSave = useCallback(async () => {
    if (!isValid || tarif === null) return;
    setIsSaving(true);
    try {
      const data = {
        nom: nom.trim(),
        immatriculation: immatriculation.trim(),
        tarif_km: tarif,
        puissance_fiscale: puissance ?? 0,
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
    isValid, tarif, puissance, nom, immatriculation,
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
          label="Immatriculation (optionnel)"
          value={immatriculation}
          onChangeText={setImmatriculation}
          placeholder="Ex: AB-123-CD"
          autoCapitalize="characters"
        />

        <Input
          label="Tarif (EUR/km)"
          value={tarifStr}
          onChangeText={setTarifStr}
          placeholder="Ex: 0,603"
          keyboardType="decimal-pad"
        />

        <Input
          label="Puissance fiscale (CV, optionnel)"
          value={puissanceStr}
          onChangeText={setPuissanceStr}
          placeholder="Ex: 5"
          keyboardType="number-pad"
        />

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
});
