import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export function Input({
  label,
  error,
  containerStyle,
  ...textInputProps
}: InputProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={[styles.label, { color: colors.text }]}>
        {label.toUpperCase()}
      </Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.surfaceSecondary,
            color: colors.text,
            borderColor: error ? colors.error : 'transparent',
            borderWidth: error ? 1 : 0,
          },
        ]}
        placeholderTextColor={colors.textMuted}
        {...textInputProps}
      />
      {error && (
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.55,
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    fontSize: 16,
    fontWeight: '500',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 10,
    minHeight: 56,
  },
  error: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});
