import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';

export type TrajetsStackParamList = {
  TrajetsList: undefined;
  AjoutTrajet: { trajetId?: number } | undefined;
  AjoutHorodatage: { horodatageId?: number } | undefined;
  Paywall: undefined;
};

export type ParametresStackParamList = {
  ParametresMain: undefined;
  Vehicules: undefined;
  AjoutVehicule: { vehiculeId?: number } | undefined;
  Paywall: undefined;
};

export type TabParamList = {
  Trajets: NavigatorScreenParams<TrajetsStackParamList>;
  Rapports: undefined;
  Parametres: NavigatorScreenParams<ParametresStackParamList>;
};

export type TrajetsScreenProps = CompositeScreenProps<
  NativeStackScreenProps<TrajetsStackParamList, 'TrajetsList'>,
  BottomTabScreenProps<TabParamList>
>;

export type AjoutTrajetScreenProps = NativeStackScreenProps<
  TrajetsStackParamList,
  'AjoutTrajet'
>;

export type AjoutHorodatageScreenProps = NativeStackScreenProps<
  TrajetsStackParamList,
  'AjoutHorodatage'
>;

export type ParametresScreenProps = CompositeScreenProps<
  NativeStackScreenProps<ParametresStackParamList, 'ParametresMain'>,
  BottomTabScreenProps<TabParamList>
>;

export type VehiculesScreenProps = NativeStackScreenProps<
  ParametresStackParamList,
  'Vehicules'
>;

export type AjoutVehiculeScreenProps = NativeStackScreenProps<
  ParametresStackParamList,
  'AjoutVehicule'
>;
