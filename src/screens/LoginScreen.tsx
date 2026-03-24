import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../stores/useAuthStore';

type AuthMode = 'welcome' | 'login' | 'signup';

export function LoginScreen() {
  const login = useAuthStore((s) => s.login);
  const [mode, setMode] = useState<AuthMode>('welcome');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleGoogleLogin = useCallback(() => {
    Alert.alert(
      'Google Sign-In',
      'La connexion Google necessite une configuration EAS Build avec un client ID Google Cloud. Cette fonctionnalite sera disponible prochainement.'
    );
  }, []);

  const handleEmailSubmit = useCallback(() => {
    if (!email.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer votre adresse email.');
      return;
    }
    if (!password.trim() || password.length < 6) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caracteres.');
      return;
    }
    if (mode === 'signup' && !name.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer votre nom.');
      return;
    }

    login({
      id: email.toLowerCase(),
      email: email.toLowerCase(),
      name: mode === 'signup' ? name.trim() : email.split('@')[0],
      provider: 'email',
    });
  }, [email, password, name, mode, login]);

  if (mode === 'login' || mode === 'signup') {
    return (
      <KeyboardAvoidingView
        style={styles.formRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.formScroll}
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formHeader}>
            <Pressable
              onPress={() => setMode('welcome')}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={20} color="#414755" />
            </Pressable>

            <Text style={styles.formTitle}>
              {mode === 'login' ? 'Content de vous revoir' : 'Créer un compte'}
            </Text>
            <Text style={styles.formSubtitle}>
              {mode === 'login'
                ? 'Connectez-vous pour retrouver vos données'
                : 'Inscrivez-vous pour commencer à suivre vos trajets'}
            </Text>
          </View>

          <View style={styles.formBody}>
            {mode === 'signup' && (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>NOM</Text>
                <View style={styles.fieldInput}>
                  <Ionicons name="person-outline" size={18} color="#94A3B8" />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Votre nom complet"
                    placeholderTextColor="#94A3B8"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                  />
                </View>
              </View>
            )}

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>EMAIL</Text>
              <View style={styles.fieldInput}>
                <Ionicons name="mail-outline" size={18} color="#94A3B8" />
                <TextInput
                  style={styles.textInput}
                  placeholder="votre@email.com"
                  placeholderTextColor="#94A3B8"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>MOT DE PASSE</Text>
              <View style={styles.fieldInput}>
                <Ionicons name="lock-closed-outline" size={18} color="#94A3B8" />
                <TextInput
                  style={styles.textInput}
                  placeholder="Minimum 6 caractères"
                  placeholderTextColor="#94A3B8"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#94A3B8"
                  />
                </Pressable>
              </View>
            </View>

            <Pressable
              onPress={handleEmailSubmit}
              style={styles.submitButton}
            >
              <Text style={styles.submitButtonText}>
                {mode === 'login' ? 'Se connecter' : "S'inscrire"}
              </Text>
            </Pressable>

            <View style={styles.switchModeRow}>
              <Text style={styles.switchModeText}>
                {mode === 'login' ? 'Pas encore de compte ?' : 'Déjà un compte ?'}
              </Text>
              <Pressable onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}>
                <Text style={styles.switchModeLink}>
                  {mode === 'login' ? "S'inscrire" : 'Se connecter'}
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Welcome screen
  return (
    <View style={styles.welcomeRoot}>
      {/* Decorative blurs */}
      <View style={styles.decorBlurTopLeft} />
      <View style={styles.decorBlurBottomRight} />

      {/* Top branding */}
      <View style={styles.brandingSection}>
        <View style={styles.logoGlow} />
        <View style={styles.logoBox}>
          <Ionicons name="car" size={40} color="#0058BC" />
          <View style={styles.logoPinBadge}>
            <Ionicons name="location" size={12} color="#FF3B30" />
          </View>
        </View>

        <Text style={styles.brandTitle}>KiloTrack</Text>
        <Text style={styles.brandSubtitle}>
          Gérez vos indemnités{'\n'}kilométriques
        </Text>
      </View>

      {/* Bottom auth section */}
      <View style={styles.authSection}>
        {/* Google Sign-In */}
        <Pressable
          onPress={handleGoogleLogin}
          style={styles.googleButton}
        >
          <Ionicons name="logo-google" size={20} color="#4285F4" />
          <Text style={styles.googleButtonText}>Se connecter avec Google</Text>
        </Pressable>

        {/* Email Sign-In */}
        <Pressable
          onPress={() => setMode('login')}
          style={styles.emailButton}
        >
          <Ionicons name="mail-outline" size={20} color="#1A1C1F" />
          <Text style={styles.emailButtonText}>Se connecter avec un e-mail</Text>
        </Pressable>

        {/* Privacy footer */}
        <View style={styles.privacyRow}>
          <Ionicons name="lock-closed" size={12} color="rgba(65,71,85,0.6)" />
          <Text style={styles.privacyText}>
            Vos données restent sur votre appareil
          </Text>
        </View>
        <Text style={styles.legalText}>
          En continuant, vous acceptez nos Conditions{'\n'}
          d'utilisation et notre Politique de confidentialité.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Welcome screen
  welcomeRoot: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingTop: 64,
    paddingBottom: 64,
  },
  decorBlurTopLeft: {
    position: 'absolute',
    top: -96,
    left: -96,
    width: 384,
    height: 384,
    borderRadius: 192,
    backgroundColor: 'rgba(0,88,188,0.05)',
  },
  decorBlurBottomRight: {
    position: 'absolute',
    bottom: -96,
    right: -96,
    width: 384,
    height: 384,
    borderRadius: 192,
    backgroundColor: 'rgba(83,225,111,0.1)',
  },
  brandingSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoGlow: {
    position: 'absolute',
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: 'rgba(0,88,188,0.05)',
  },
  logoBox: {
    width: 96,
    height: 96,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(0,88,188,0.1)',
    shadowOffset: { width: 0, height: 25 },
    shadowOpacity: 1,
    shadowRadius: 50,
    elevation: 8,
    marginBottom: 32,
  },
  logoPinBadge: {
    position: 'absolute',
    top: 16,
    right: 12,
  },
  brandTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1A1C1F',
    textAlign: 'center',
    letterSpacing: -0.9,
    marginBottom: 7,
  },
  brandSubtitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#414755',
    textAlign: 'center',
    lineHeight: 22.5,
  },
  authSection: {
    gap: 16,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    height: 56,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C1C6D7',
    gap: 12,
  },
  googleButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1C1F',
    letterSpacing: -0.45,
  },
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    height: 56,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#717786',
    gap: 12,
  },
  emailButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1C1F',
    letterSpacing: -0.45,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
  },
  privacyText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(65,71,85,0.6)',
  },
  legalText: {
    fontSize: 11,
    color: 'rgba(65,71,85,0.4)',
    textAlign: 'center',
    lineHeight: 17.88,
  },

  // Form screen (login/signup)
  formRoot: {
    flex: 1,
    backgroundColor: '#F9F9FE',
  },
  formScroll: {
    flex: 1,
  },
  formHeader: {
    paddingHorizontal: 24,
    paddingTop: 64,
  },
  backButton: {
    marginBottom: 24,
    height: 40,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#F3F3F8',
  },
  formTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#1A1C1F',
    letterSpacing: -0.75,
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 16,
    color: '#414755',
    marginBottom: 32,
  },
  formBody: {
    paddingHorizontal: 24,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#414755',
    letterSpacing: 0.55,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  fieldInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F3F8',
    borderRadius: 10,
    paddingHorizontal: 16,
    height: 56,
    gap: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1C1F',
  },
  submitButton: {
    height: 56,
    borderRadius: 12,
    backgroundColor: '#0058BC',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: 'rgba(0,88,188,0.1)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  switchModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  switchModeText: {
    fontSize: 14,
    color: '#414755',
  },
  switchModeLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0058BC',
    marginLeft: 4,
  },
});
