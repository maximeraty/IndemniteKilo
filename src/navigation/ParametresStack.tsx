import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { ParametresScreen } from '../screens/ParametresScreen';
import { VehiculesScreen } from '../screens/VehiculesScreen';
import { AjoutVehiculeScreen } from '../screens/AjoutVehiculeScreen';
import { PaywallScreen } from '../screens/PaywallScreen';
import type { ParametresStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<ParametresStackParamList>();

export function ParametresStack() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.primary,
        headerTitleStyle: {
          color: colors.text,
          fontWeight: '700',
          fontSize: 20,
        },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="ParametresMain"
        component={ParametresScreen}
        options={{
          title: 'KiloTrack',
          headerLargeTitle: false,
        }}
      />
      <Stack.Screen
        name="Vehicules"
        component={VehiculesScreen}
        options={{ title: 'Mes véhicules' }}
      />
      <Stack.Screen
        name="AjoutVehicule"
        component={AjoutVehiculeScreen}
        options={({ route }) => ({
          title: route.params?.vehiculeId ? 'Modifier le véhicule' : 'Nouveau véhicule',
          presentation: 'modal',
        })}
      />
      <Stack.Screen
        name="Paywall"
        component={PaywallScreen}
        options={{
          presentation: 'modal',
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}
