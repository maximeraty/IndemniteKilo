import React from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
}: ButtonProps) {
  const { colors } = useTheme();

  if (variant === 'primary') {
    return (
      <TouchableOpacity
        style={[
          styles.button,
          styles.primaryButton,
          { opacity: disabled || loading ? 0.5 : 1 },
          style,
        ]}
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.primaryText}>{title}</Text>
        )}
      </TouchableOpacity>
    );
  }

  const bgColor = variant === 'danger' ? colors.error : 'transparent';
  const textColor = variant === 'secondary' ? colors.primary : '#FFFFFF';
  const borderColor = variant === 'secondary' ? colors.border : 'transparent';

  return (
    <TouchableOpacity
      style={[
        styles.button,
        styles.flatButton,
        {
          backgroundColor: bgColor,
          borderColor,
          borderWidth: variant === 'secondary' ? 1 : 0,
          opacity: disabled || loading ? 0.5 : 1,
        },
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.text, { color: textColor }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: 'rgba(0,88,188,0.1)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 5,
  },
  primaryButton: {
    backgroundColor: '#0058BC',
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  flatButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  primaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});
