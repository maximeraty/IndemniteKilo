import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { TrajetsScreen } from '../screens/TrajetsScreen';
import { AjoutTrajetScreen } from '../screens/AjoutTrajetScreen';
import { AjoutHorodatageScreen } from '../screens/AjoutHorodatageScreen';
import { PaywallScreen } from '../screens/PaywallScreen';
import type { TrajetsStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<TrajetsStackParamList>();

export function TrajetsStack() {
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
        name="TrajetsList"
        component={TrajetsScreen}
        options={{
          title: 'KiloTrack',
          headerLargeTitle: false,
        }}
      />
      <Stack.Screen
        name="AjoutTrajet"
        component={AjoutTrajetScreen}
        options={({ route }) => ({
          title: route.params?.trajetId ? 'Modifier le trajet' : 'Nouveau trajet',
          presentation: 'modal',
          headerBackVisible: false,
          headerTitleStyle: {
            color: colors.text,
            fontWeight: '700',
            fontSize: 17,
          },
        })}
      />
      <Stack.Screen
        name="AjoutHorodatage"
        component={AjoutHorodatageScreen}
        options={({ route }) => ({
          title: route.params?.horodatageId ? 'Modifier le relevé' : 'Nouvel horodatage',
          presentation: 'modal',
          headerBackVisible: false,
          headerTitleStyle: {
            color: colors.text,
            fontWeight: '700',
            fontSize: 17,
          },
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
