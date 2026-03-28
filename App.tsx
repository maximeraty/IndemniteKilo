import "./global.css";
import React, { useEffect } from 'react';
import { ActivityIndicator, View, Text, AppState } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { TabNavigator } from './src/navigation/TabNavigator';
import { LoginScreen } from './src/screens/LoginScreen';
import { useDatabase } from './src/hooks/useDatabase';
import { useVehiculeStore } from './src/stores/useVehiculeStore';
import { useAuthStore } from './src/stores/useAuthStore';
import { useSubscriptionStore } from './src/stores/useSubscriptionStore';

function AppContent() {
  const { isReady, error } = useDatabase();
  const { colors } = useTheme();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const loadVehicules = useVehiculeStore((s) => s.loadVehicules);
  const initializeSubscription = useSubscriptionStore((s) => s.initialize);
  const refreshSubscriptionStatus = useSubscriptionStore((s) => s.refreshStatus);

  useEffect(() => {
    if (isReady) {
      loadVehicules();
      initializeSubscription();
    }
  }, [isReady, loadVehicules, initializeSubscription]);

  useEffect(() => {
    if (!isReady || !isAuthenticated) {
      return;
    }

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        refreshSubscriptionStatus();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, isReady, refreshSubscriptionStatus]);

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text style={{ color: colors.error, fontSize: 16 }}>
          Erreur d'initialisation de la base de donnees
        </Text>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <NavigationContainer>
        <TabNavigator />
      </NavigationContainer>
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
